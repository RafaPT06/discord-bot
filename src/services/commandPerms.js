const { pool } = require("../db/pool");

// Always allowed to everyone (Guild + DMs)
const PUBLIC_COMMANDS = new Set([
  "help",
  "ping",
  "compliment",
  "roast",
  "mimic",
  "cat",
  "crazy",
]);

// Default: requires Manage Server (unless overridden via /perm_set)
const MANAGE_GUILD_COMMANDS = new Set([
  // Panel / setup
  "panel",
  "setup_channels",

  // Channels / settings
  "set_deploy_channel",
  "show_deploy_channel",
  "reset_deploy_channel",
  "set_roblox_alert_channel",
  "show_roblox_alert_channel",
  "reset_roblox_alert_channel",
  "set_error_alert_channel",
  "show_error_alert_channel",
  "reset_error_alert_channel",
  "set_backup_channel",
  "show_backup_channel",
  "reset_backup_channel",
  "set_feed_channel",
  "show_feed_channel",
  "reset_feed_channel",
  "feed_level",
  "feed_test",

  // Content
  "add_compliment",
  "add_roast",
  "list_compliments",
  "list_roasts",
  "remove_compliment",
  "remove_roast",

  // TODOs
  "todo_add",
  "todo_list",
  "todo_done",

  // Permissions system
  "perm_set",
  "perm_add_role",
  "perm_show",
  "perm_list",
  "perm_clear",

  // Tests (still restricted)
  "deploy_test",
  "test_error_alert",
  "test_backup",
]);

// Owner-only by default (unless overridden via /perm_set)
const OWNER_COMMANDS = new Set([
  "maintenance",
  "roblox_status",
  "simulate_deploy",
  "simulate_error",
  "simulate_backup",
  "simulate_roblox",
  "simulate_feed",
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

  // No custom rule: apply defaults
  if (OWNER_COMMANDS.has(commandName)) return false;
  if (MANAGE_GUILD_COMMANDS.has(commandName)) return hasManageGuild(interaction);

  // Everything else open by default
  return true;
}

module.exports = { canRunCommand, PUBLIC_COMMANDS, MANAGE_GUILD_COMMANDS, OWNER_COMMANDS };
