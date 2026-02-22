const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require("discord.js");
const { setFeedChannel } = require("../services/feed");
const { successEmbed } = require("../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("set_feed_channel")
    .setDescription("Set the bot feed channel (Level 1-3).")
    .addChannelOption(o =>
      o.setName("channel")
        .setDescription("Target channel")
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const ch = interaction.options.getChannel("channel", true);
    await setFeedChannel(interaction.guildId, ch.id);

    const embed = successEmbed("Feed Channel", `Feed events will be posted in ${ch}.`);
    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
