const { pool } = require("../db/pool");

const PUBLIC_COMMANDS = new Set([
  "help",
  "status",
  "ping",
  "compliment",
  "roast",
  "mimic",
  "cat",
  "crazy",
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
  if (PUBLIC_COMMANDS.has(commandName)) return true;

  if (!interaction.guildId) return isOwner(interaction);

  if (isOwner(interaction)) return true;

  const { rows } = await pool.query(
    `SELECT allowed_role_ids, allow_manage_guild
     FROM command_permissions
     WHERE guild_id=$1 AND command_name=$2`,
    [interaction.guildId, commandName]
  );

  if (!rows.length) return true;

  const allowedRoles = rows[0].allowed_role_ids || [];
  const allowManageGuild = rows[0].allow_manage_guild !== false;

  if (allowManageGuild && hasManageGuild(interaction)) return true;

  if (!allowedRoles.length) return false;

  const myRoles = new Set(memberRoleIds(interaction));
  return allowedRoles.some((rid) => myRoles.has(rid));
}

module.exports = { canRunCommand, PUBLIC_COMMANDS };
