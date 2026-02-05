const { SlashCommandBuilder } = require("discord.js");
const { isOwner } = require("../utils/perms");

module.exports = {
  data: new SlashCommandBuilder().setName("test_error_alert").setDescription("Send a test error alert (Owner)."),
  async execute(interaction) {
    if (!isOwner(interaction)) return interaction.reply({ content: "❌ Owner only.", ephemeral: true });
    // intentionally trigger an unhandled rejection to test the alert pipeline
    Promise.reject(new Error("Test error alert (requested by owner)"));
    return interaction.reply({ content: "✅ Triggered test error. Check your error-alert channel.", ephemeral: true });
  }
};
