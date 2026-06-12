const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getPrefix, getAllCardBackgrounds } = require("../services/config");
const { getLevelSettings } = require("../services/leveling");
const { getWelcomeSettings } = require("../services/welcome");

module.exports = {
  data: new SlashCommandBuilder().setName("config").setDescription("Show the bot configuration for this server."),
  async execute(interaction) {
    if (!interaction.guildId) return interaction.reply({ content: "Server only.", ephemeral: true });
    const prefix = await getPrefix(interaction.guildId);
    const level = await getLevelSettings(interaction.guildId).catch(() => ({}));
    const welcome = await getWelcomeSettings(interaction.guildId).catch(() => ({}));
    const backgrounds = await getAllCardBackgrounds(interaction.guildId).catch(() => []);
    const bgText = backgrounds.length ? backgrounds.map((b) => `**${b.card_type}:** set`).join("\n") : "None";
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("Bot Configuration")
      .addFields(
        { name: "Prefix", value: `\`${prefix}\``, inline: true },
        { name: "Level-up", value: level.channel_id ? `<#${level.channel_id}>` : "Not set", inline: true },
        { name: "Welcome", value: welcome.welcome_channel_id ? `<#${welcome.welcome_channel_id}>` : "Not set", inline: true },
        { name: "Goodbye", value: welcome.goodbye_channel_id ? `<#${welcome.goodbye_channel_id}>` : "Not set", inline: true },
        { name: "Card Backgrounds", value: bgText, inline: false }
      )
      .setTimestamp();
    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
