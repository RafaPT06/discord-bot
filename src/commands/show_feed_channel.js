const { SlashCommandBuilder } = require("discord.js");
const { getFeedSetting } = require("../services/feed");
const { infoEmbed } = require("../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("show_feed_channel")
    .setDescription("Show the current bot feed channel."),
  async execute(interaction) {
    const s = await getFeedSetting(interaction.guildId);
    if (!s) {
      const embed = infoEmbed("Feed Channel", "No feed channel set.");
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    const embed = infoEmbed(
      "Feed Channel",
      `Channel: <#${s.channel_id}>\nEnabled: ${s.enabled ? "true" : "false"}\nLevel: ${s.level || 2}`
    );
    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
