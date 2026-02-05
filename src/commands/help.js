const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder().setName("help").setDescription("Shows a list of commands."),
  async execute(interaction) {
    const lines = [
      "**Commands**",
      "/status",
      "/add_roast, /add_compliment",
      "/list_roasts, /list_compliments",
      "/remove_roast, /remove_compliment",
      "/roblox_status",
      "/set_roblox_alert_channel, /show_roblox_alert_channel, /reset_roblox_alert_channel",
      "/set_error_alert_channel, /show_error_alert_channel, /reset_error_alert_channel, /test_error_alert",
    ];
    return interaction.reply({ content: lines.join("\n"), ephemeral: true });
  },
};
