const { SlashCommandBuilder } = require("discord.js");
const { resetWelcomeChannel } = require("../services/welcome");
const { canManageSettings } = require("../utils/perms");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reset_welcome_channel")
    .setDescription("Disable welcome image messages."),
  async execute(interaction) {
    if (!interaction.guildId) return interaction.reply({ content: "Server only.", ephemeral: true });
    if (!canManageSettings(interaction)) return interaction.reply({ content: "Requires Manage Server or Owner.", ephemeral: true });

    await resetWelcomeChannel(interaction.guildId);
    return interaction.reply({ content: "Welcome messages disabled.", ephemeral: true });
  },
};
