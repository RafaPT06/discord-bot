const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { resetFeedChannel } = require("../services/feed");
const { successEmbed } = require("../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reset_feed_channel")
    .setDescription("Reset the bot feed channel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    await resetFeedChannel(interaction.guildId);
    const embed = successEmbed("Feed Channel", "Feed channel reset.");
    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
