const { SlashCommandBuilder } = require("discord.js");
const { attachErrorAlerts } = require("../services/errorAlerts");

module.exports = {
  data: new SlashCommandBuilder().setName("test_error_alert").setDescription("Send a test error alert (owner only)."),
  async execute(interaction, client) {
    const ownerId = process.env.OWNER_ID;
    if (interaction.user.id !== ownerId) return interaction.reply({ content: "❌ Owner only.", ephemeral: true });

    // trigger a handled fake error via promise rejection
    Promise.reject(new Error("Test error alert: this is a simulated unhandledRejection"));
    return interaction.reply({ content: "✅ Triggered a test error. Check your error alert channel.", ephemeral: true });
  },
};
