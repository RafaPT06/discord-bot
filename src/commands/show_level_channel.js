const { SlashCommandBuilder } = require("discord.js");
const { getLevelSettings } = require("../services/leveling");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("show_level_channel")
    .setDescription("Show the configured level-up channel."),
  async execute(interaction) {
    if (!interaction.guildId) return interaction.reply({ content: "Server only.", ephemeral: true });
    const settings = await getLevelSettings(interaction.guildId);
    return interaction.reply({ content: settings.channel_id ? `Level-up channel: <#${settings.channel_id}>` : "No level-up channel configured.", ephemeral: true });
  },
};
