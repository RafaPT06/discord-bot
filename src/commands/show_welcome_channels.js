const { SlashCommandBuilder } = require("discord.js");
const { getWelcomeSettings } = require("../services/welcome");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("show_welcome_channels")
    .setDescription("Show configured welcome and goodbye channels."),
  async execute(interaction) {
    if (!interaction.guildId) return interaction.reply({ content: "Server only.", ephemeral: true });

    const settings = await getWelcomeSettings(interaction.guildId);
    const welcome = settings.welcome_channel_id ? `<#${settings.welcome_channel_id}>` : "not configured";
    const goodbye = settings.goodbye_channel_id ? `<#${settings.goodbye_channel_id}>` : "not configured";

    return interaction.reply({
      content: `Welcome: ${welcome}\nGoodbye: ${goodbye}`,
      ephemeral: true,
    });
  },
};
