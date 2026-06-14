const { SlashCommandBuilder, ChannelType } = require("discord.js");
const { setWelcomeChannel } = require("../services/welcome");
const { canManageSettings } = require("../utils/perms");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("set_welcome_channel")
    .setDescription("Set the channel for welcome image messages.")
    .addChannelOption((o) =>
      o.setName("channel")
        .setDescription("Welcome channel")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(true)
    ),
  async execute(interaction) {
    if (!interaction.guildId) return interaction.reply({ content: "Server only.", ephemeral: true });
    if (!canManageSettings(interaction)) return interaction.reply({ content: "Requires Manage Server or Owner.", ephemeral: true });

    const channel = interaction.options.getChannel("channel", true);
    await setWelcomeChannel(interaction.guildId, channel.id);
    return interaction.reply({ content: `Welcome messages set to ${channel}.`, ephemeral: true });
  },
};
