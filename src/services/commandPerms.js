const { pool } = require("../db/pool");

// Always allowed to everyone
const PUBLIC_COMMANDS = new Set([
  "maintenance",
  "help",
    "ping",
  "sys",
  "compliment",
  "roast",
  "mimic",
  "cat",
  "crazy",
]);

// Owner-only by default, but can be overridden per-server via /perm_set
const PROTECTED_COMMANDS = new Set([
    "roblox_status",
  "set_roblox_alert_channel",
  "show_roblox_alert_channel",
  "reset_roblox_alert_channel",
  "set_error_alert_channel",
  "show_error_alert_channel",
  "reset_error_alert_channel",
  "test_error_alert",
  "setup_channels",
  // Backups
  "set_backup_channel",
  "show_backup_channel",
  "reset_backup_channel",
  "test_backup",
]);

function isOwner(interaction) {
  return interaction.user?.id === process.env.OWNER_ID;
}

function hasManageGuild(interaction) {
  return Boolean(interaction.memberPermissions?.has("ManageGuild"));
}

function memberRoleIds(interaction) {
  const roles = interaction.member?.roles;
  if (roles?.cache) return [...roles.cache.keys()];
  return [];
}

async function canRunCommand(interaction, commandName) {
  // Public commands bypass everything
  if (PUBLIC_COMMANDS.has(commandName)) return true;

  // DMs: keep non-public commands locked to owner
  if (!interaction.guildId) return isOwner(interaction);

  // Owner always allowed
  if (isOwner(interaction)) return true;

  // If a custom rule exists for this guild+command, enforce it
  const { rows } = await pool.query(
    `SELECT allowed_role_ids, allow_manage_guild
     FROM command_permissions
     WHERE guild_id=$1 AND command_name=$2`,
    [interaction.guildId, commandName]
  );

  if (rows.length) {
    const allowedRoles = rows[0].allowed_role_ids || [];
    const allowManageGuild = rows[0].allow_manage_guild !== false;

    if (allowManageGuild && hasManageGuild(interaction)) return true;
    if (!allowedRoles.length) return false;

    const myRoles = new Set(memberRoleIds(interaction));
    return allowedRoles.some((rid) => myRoles.has(rid));
  }

  // No custom rule:
  // - Protected commands are owner-only by default (until you /perm_set them)
  if (PROTECTED_COMMANDS.has(commandName)) return false;

  // - Everything else stays open by default (keeps your current behavior)
  return true;
}

module.exports = { canRunCommand, PUBLIC_COMMANDS, PROTECTED_COMMANDS };
