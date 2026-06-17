const { pool } = require("../db/pool");
const { isUserAllowedForEditImage } = require("./editImageAccess");

// Always allowed to everyone (Guild + DMs)
const PUBLIC_COMMANDS = new Set([
  "help",
  "ping",
  "compliment",
  "roast",
  "mimic",
  "cat",
  "crazy",
  "poll",
  "quote",
  "suggest",
  "8ball",
  "would_you_rather",
  "fact",
  "trivia",
  "roblox_profile",
  "roblox_avatar",
  "roblox_game",
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
  "permissions_check",
  "edit_image_access",
  "starboard",

  // Tests (still restricted)
  "deploy_test",
  "test_error_alert",
  "test_backup",
]);

// Owner-only by default (unless overridden via /perm_set)
const OWNER_COMMANDS = new Set([
  "edit_image",
  "maintenance",
  "presence",
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

async function explainCommandPermission(interaction, commandName, targetMember = null) {
  const inGuild = Boolean(interaction.guildId);
  const targetUser = targetMember?.user || interaction.user;
  const targetId = targetUser?.id || interaction.user?.id;
  const targetRoles = targetMember?.roles?.cache
    ? [...targetMember.roles.cache.keys()]
    : memberRoleIds(interaction);
  const targetHasManageGuild = targetMember?.permissions
    ? Boolean(targetMember.permissions.has("ManageGuild"))
    : hasManageGuild(interaction);
  const targetIsOwner = targetId === process.env.OWNER_ID;

  const reasons = [];
  const result = (allowed, source) => ({
    allowed,
    commandName,
    source,
    targetId,
    targetIsOwner,
    hasManageGuild: targetHasManageGuild,
    roleIds: targetRoles,
    reasons,
  });

  if (!inGuild) {
    reasons.push(PUBLIC_COMMANDS.has(commandName) ? "Public command is allowed in DMs." : "Only public commands are allowed in DMs.");
    return result(PUBLIC_COMMANDS.has(commandName), "dm");
  }

  if (PUBLIC_COMMANDS.has(commandName)) {
    reasons.push("This command is public.");
    return result(true, "public");
  }

  if (targetIsOwner) {
    reasons.push("Bot owner bypass applies.");
    return result(true, "owner");
  }

  if (commandName === "edit_image") {
    const allowedForImageEdit = await isUserAllowedForEditImage(interaction.guildId, targetId);
    reasons.push(allowedForImageEdit
      ? "Allowed by the /edit_image access list."
      : "Not listed in the /edit_image access list.");
    return result(allowedForImageEdit, allowedForImageEdit ? "edit_image_user" : "edit_image_denied");
  }

  const { rows } = await pool.query(
    `SELECT allowed_role_ids, allow_manage_guild
     FROM command_permissions
     WHERE guild_id=$1 AND command_name=$2`,
    [interaction.guildId, commandName]
  );

  if (rows.length) {
    const allowedRoles = rows[0].allowed_role_ids || [];
    const allowManageGuild = rows[0].allow_manage_guild !== false;

    reasons.push("Custom permission override exists.");
    if (allowManageGuild && targetHasManageGuild) {
      reasons.push("Allowed because Manage Server is enabled for this command and the user has it.");
      return result(true, "custom_manage_guild");
    }

    if (!allowedRoles.length) {
      reasons.push(allowManageGuild ? "No allowed roles matched." : "Manage Server is disabled and no allowed roles are configured.");
      return result(false, "custom_denied");
    }

    const myRoles = new Set(targetRoles);
    const matched = allowedRoles.filter((rid) => myRoles.has(rid));
    if (matched.length) {
      reasons.push(`Allowed by role override: ${matched.map((id) => `<@&${id}>`).join(", ")}.`);
      return result(true, "custom_role");
    }

    reasons.push(`Required role override did not match: ${allowedRoles.map((id) => `<@&${id}>`).join(", ")}.`);
    return result(false, "custom_denied");
  }

  if (OWNER_COMMANDS.has(commandName)) {
    reasons.push("Default rule: owner-only command.");
    return result(false, "default_owner_only");
  }

  if (MANAGE_GUILD_COMMANDS.has(commandName)) {
    reasons.push("Default rule: requires Manage Server.");
    return result(targetHasManageGuild, "default_manage_guild");
  }

  reasons.push("No restriction matched, so the command is open by default.");
  return result(true, "default_open");
}

async function canRunCommand(interaction, commandName) {
  const info = await explainCommandPermission(interaction, commandName);
  return info.allowed;
}

module.exports = { canRunCommand, explainCommandPermission, PUBLIC_COMMANDS, MANAGE_GUILD_COMMANDS, OWNER_COMMANDS };
