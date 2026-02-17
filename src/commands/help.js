const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show all commands grouped."),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle("Commands")
      .setDescription(
        [
          "**Fun / Social**",
          "• `/compliment [user]` — send a random compliment",
          "• `/roast [user]` — roast someone",
          "• `/mimic <text>` — alternating case",
          "• `/cat` — random cat",
          "• `/crazy` — the classic copypasta",
          "",
          "**Status**",
          "• `/status` — uptime + ping + runtime info",
          "• `/ping` — bot latency",
          "• `/maintenance <on|off|status>` — maintenance mode (Owner for on/off)",
          "• `/roblox_status` — Roblox online/in-game status (restricted)",
          "• `/bot_stats` — bot stats (restricted)",
          "",
          "**TODOs (Global)**",
          "• `/todo_add <text>` — add a TODO (Manage Server / Owner)",
          "• `/todo_list [all]` — list global TODOs (Manage Server / Owner)",
          "• `/todo_done <id>` — mark a TODO done (Manage Server / Owner)",
          "",
          "**Content (Admin)**",
          "• `/add_compliment <text>` — add a compliment (Manage Server / Owner)",
          "• `/add_roast <text>` — add a roast (Manage Server / Owner)",
          "• `/list_compliments [page]` — list saved compliments (Admin)",
          "• `/list_roasts [page]` — list saved roasts (Admin)",
          "• `/remove_compliment <id>` — remove a compliment (Manage Server / Owner)",
          "• `/remove_roast <id>` — remove a roast (Manage Server / Owner)",
          "",
          "**Deploy Updates (Restricted)**",
          "• `/set_deploy_channel #channel` — set deploy updates channel",
          "• `/show_deploy_channel` — show current deploy channel",
          "• `/reset_deploy_channel` — reset deploy channel",
          "",
          "**Roblox Alerts (Restricted)**",
          "• `/set_roblox_alert_channel #channel` — set Roblox alerts channel",
          "• `/show_roblox_alert_channel` — show current Roblox alerts channel",
          "• `/reset_roblox_alert_channel` — reset Roblox alerts channel",
          "",
          "**Error Alerts (Restricted)**",
          "• `/set_error_alert_channel #channel` — set error alerts channel",
          "• `/show_error_alert_channel` — show current error alerts channel",
          "• `/reset_error_alert_channel` — reset error alerts channel",
          "• `/test_error_alert` — send a test alert",
          "",
          "**Backups (Restricted)**",
          "• `/set_backup_channel #channel` — set weekly backup channel",
          "• `/show_backup_channel` — show current backup channel",
          "• `/reset_backup_channel` — reset backup channel",
          "• `/test_backup` — send a backup now",
          "",
          "**Permissions (Manage Server / Owner)**",
          "• `/perm_set` — set a command permission",
          "• `/perm_add_role` — add a role to a command permission",
          "• `/perm_show` — show a command permission",
          "• `/perm_list` — list all permissions",
          "• `/perm_clear` — remove a command permission override",
        ].join("\n")
      );

    return interaction.reply({ embeds: [embed], ephemeral: false });
  },
};
