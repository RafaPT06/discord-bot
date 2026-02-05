const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "help",
  description: "Show all available commands",

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle("🤖 Bot Help")
      .setDescription("Overview of commands, grouped by feature.\n\n🔒 = Owner only")
      .setColor(0x2f3136)

      .addFields(
        {
          name: "🧭 General",
          value:
            "`/help` – show this message\n" +
            "`/status` – bot status & uptime",
        },
        {
          name: "📦 Roasts & Compliments",
          value:
            "🔒 `/add_roast text`\n" +
            "🔒 `/add_compliment text`\n" +
            "`/list_roasts`\n" +
            "`/list_compliments`\n" +
            "🔒 `/remove_roast id`\n" +
            "🔒 `/remove_compliment id`",
        },
        {
          name: "🎮 Roblox",
          value:
            "🔒 `/roblox_status`\n" +
            "_Check Roblox presence (with refresh button)_",
        },
        {
          name: "🔔 Roblox Alerts",
          value:
            "🔒 `/set_roblox_alert_channel`\n" +
            "🔒 `/show_roblox_alert_channel`\n" +
            "🔒 `/reset_roblox_alert_channel`\n" +
            "_Alerts when presence changes_",
        },
        {
          name: "🚨 Error Alerts",
          value:
            "🔒 `/set_error_alert_channel`\n" +
            "🔒 `/show_error_alert_channel`\n" +
            "🔒 `/reset_error_alert_channel`\n" +
            "🔒 `/test_error_alert`\n" +
            "_Notifies on crashes & errors_",
        }
      )

      .setFooter({
        text: "Owner-only commands require OWNER_ID",
      });

    await interaction.reply({
      embeds: [embed],
      ephemeral: false,
    });
  },
};
