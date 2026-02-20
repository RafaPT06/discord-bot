const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help_admin")
    .setDescription("Show admin/setup commands (restricted)."),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle("Admin Commands")
      .setDescription(
        [
          "**TODOs (Global)**",
          "• `/todo_add <text>` — add a TODO",
          "• `/todo_list [all]` — list global TODOs",
          "• `/todo_done <id>` — mark a TODO done",
          "",
          "**Content**",
          "• `/add_compliment <text>` — add a compliment",
          "• `/add_roast <text>` — add a roast",
          "• `/list_compliments [page]` — list saved compliments",
          "• `/list_roasts [page]` — list saved roasts",
          "• `/remove_compliment <id>` — remove a compliment",
          "• `/remove_roast <id>` — remove a roast",
          "",
          "**Diagnostics**",
"• `/diag` — health checks",

"**Setup**",
          "• `/setup_channels [category]` — create system channels + auto-configure (includes backups + feed)",
          "",
          "**Channels**",
          "• `/set_deploy_channel` / `/show_deploy_channel` / `/reset_deploy_channel`",
          "• `/set_roblox_alert_channel` / `/show_roblox_alert_channel` / `/reset_roblox_alert_channel`",
          "• `/set_error_alert_channel` / `/show_error_alert_channel` / `/reset_error_alert_channel`",
          "• `/set_backup_channel` / `/show_backup_channel` / `/reset_backup_channel` / `/test_backup`",
          "",
          "**Permissions**",
          "• `/perm_set` / `/perm_add_role` / `/perm_show` / `/perm_list` / `/perm_clear`",
        ].join("\n")
      );

    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
