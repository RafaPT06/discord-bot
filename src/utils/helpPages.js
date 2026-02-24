const { EmbedBuilder } = require("discord.js");

function buildFunText() {
  return [
    "**Fun / Social**",
    "• `/compliment [user]` — send a random compliment",
    "• `/roast [user]` — roast someone",
    "• `/mimic <text>` — alternating case",
    "• `/cat` — random cat",
    "• `/crazy` — classic copypasta",
    "• `/ping` — bot latency",
    "",
    "**System (Restricted)**",
    "• `/panel` — control panel (Manage Server / Owner)",
    "",
    "Use the buttons below to view Admin/Owner pages.",
  ].join("\n");
}

function buildAdminText() {
  return [
    "**Admin Page (Restricted)**",
    "Default: requires Manage Server (or a custom `/perm_set`).",
    "",
    "**System**",
    "• `/panel` — control panel + diagnostics + logs",
    "• `/setup_channels` — create bot category + channels",
    "",
    "**Channels / Settings**",
    "• `/set_deploy_channel` / `/show_deploy_channel` / `/reset_deploy_channel`",
    "• `/set_backup_channel` / `/show_backup_channel` / `/reset_backup_channel` / `/test_backup`",
    "• `/set_feed_channel` / `/show_feed_channel` / `/reset_feed_channel` / `/feed_level` / `/feed_test`",
    "• `/set_roblox_alert_channel` / `/show_roblox_alert_channel` / `/reset_roblox_alert_channel`",
    "• `/set_error_alert_channel` / `/show_error_alert_channel` / `/reset_error_alert_channel` / `/test_error_alert`",
    "",
    "**Content**",
    "• `/add_compliment` / `/remove_compliment` / `/list_compliments`",
    "• `/add_roast` / `/remove_roast` / `/list_roasts`",
    "",
    "**TODOs**",
    "• `/todo_add` / `/todo_list` / `/todo_done`",
    "",
    "**Permissions**",
    "• `/perm_set` / `/perm_add_role` / `/perm_show` / `/perm_list` / `/perm_clear`",
    "",
    "**Deploy**",
    "• `/deploy_test` — test deploy notification",
  ].join("\n");
}

function buildOwnerText() {
  return [
    "**Owner Page (Restricted)**",
    "",
    "**Owner Controls**",
    "• `/maintenance <on|off|status>` — maintenance mode",
    "• `/roblox_status` — Roblox status (owner-only by default)",
    "",
    "**Simulation Tools**",
    "• `/simulate_deploy`",
    "• `/simulate_error`",
    "• `/simulate_backup`",
    "• `/simulate_roblox`",
    "• `/simulate_feed`",
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
