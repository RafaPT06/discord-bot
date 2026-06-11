const { SlashCommandBuilder } = require("discord.js");
const { resetGoodbyeChannel } = require("../services/welcome");
const { canManageSettings } = require("../utils/perms");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reset_goodbye_channel")
    .setDescription("Disable goodbye image messages."),
  async execute(interaction) {
    if (!interaction.guildId) return interaction.reply({ content: "Server only.", ephemeral: true });
    if (!canManageSettings(interaction)) return interaction.reply({ content: "Requires Manage Server or Owner.", ephemeral: true });

    await resetGoodbyeChannel(interaction.guildId);
    return interaction.reply({ content: "Goodbye messages disabled.", ephemeral: true });
  },
};
