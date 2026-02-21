const { EmbedBuilder } = require("discord.js");

function buildFunText() {
  return [
    "**Fun / Social**",
    "• `/compliment [user]` — send a random compliment",
    "• `/roast [user]` — roast someone",
    "• `/mimic <text>` — alternating case",
    "• `/cat` — random cat",
    "• `/crazy` — classic copypasta",
    "",
    "**Public Status**",
    "• `/status` — uptime + ping + runtime info",
    "• `/ping` — bot latency",
    "",
    "**Help Tabs**",
    "• Use the buttons below to view Admin/Owner pages (restricted).",
  ].join("\n");
}

function buildAdminText() {
  return [
    "**Admin Page (Restricted)**",
    "These commands require Manage Server / configured permissions.",
    "",
    "**Diagnostics**",
    "• `/diag` — health checks",
    "• `/sys` — full system panel",
    "",
    "**Setup**",
    "• `/setup_channels` — create bot category + channels (includes backups + feed)",
    "• `/set_backup_channel` / `/show_backup_channel` / `/reset_backup_channel` / `/test_backup`",
    "• `/set_feed_channel` / `/show_feed_channel` / `/reset_feed_channel` / `/feed_level` / `/feed_test`",
    "• `/set_roblox_alert_channel` / `/show_roblox_alert_channel` / `/reset_roblox_alert_channel`",
    "• `/set_error_alert_channel` / `/show_error_alert_channel` / `/reset_error_alert_channel` / `/test_error_alert`",
    "",
    "**Content**",
    "• `/add_compliment <text>` — add a compliment",
    "• `/add_roast <text>` — add a roast",
    "• `/list_compliments [page]` — list compliments",
    "• `/list_roasts [page]` — list roasts",
    "• `/remove_compliment <id>` — remove a compliment",
    "• `/remove_roast <id>` — remove a roast",
    "",
    "**TODOs**",
    "• `/todo_add <text>` — add a TODO",
    "• `/todo_list [all]` — list TODOs",
    "• `/todo_done <id>` — mark TODO done",
    "",
    "**Permissions**",
    "• `/perm_set` — set a command permission",
    "• `/perm_add_role` — add role to command permission",
    "• `/perm_show` — show a command permission",
    "• `/perm_list` — list all permissions",
    "• `/perm_clear` — clear a permission override",
  ].join("\n");
}

function buildOwnerText() {
  return [
    "**Owner Page (Restricted)**",
    "Owner-only commands.",
    "",
    "**Maintenance**",
    "• `/maintenance <on|off|status>` — maintenance mode",
    "",
    "**Simulation Tools**",
    "• `/simulate_deploy` — simulate deploy notification",
    "• `/simulate_error` — simulate error alert",
    "• `/simulate_backup` — trigger backup post",
    "• `/simulate_roblox <status>` — simulate Roblox alert",
    "• `/simulate_feed <level> [title]` — simulate feed event",
  ].join("\n");
}

function buildHelpEmbed(page) {
  const p = (page || "fun").toLowerCase();
  const embed = new EmbedBuilder().setTitle("Commands");
  if (p === "admin") {
    embed.setTitle("Commands — Admin");
    embed.setDescription(buildAdminText());
  } else if (p === "owner") {
    embed.setTitle("Commands — Owner");
    embed.setDescription(buildOwnerText());
  } else {
    embed.setTitle("Commands — Fun");
    embed.setDescription(buildFunText());
  }
  return embed;
}

module.exports = { buildHelpEmbed };
