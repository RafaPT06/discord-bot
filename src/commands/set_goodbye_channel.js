const { SlashCommandBuilder, ChannelType } = require("discord.js");
const { setGoodbyeChannel } = require("../services/welcome");
const { canManageSettings } = require("../utils/perms");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("set_goodbye_channel")
    .setDescription("Set the channel for goodbye image messages.")
    .addChannelOption((o) =>
      o.setName("channel")
        .setDescription("Goodbye channel")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(true)
    ),
  async execute(interaction) {
    if (!interaction.guildId) return interaction.reply({ content: "Server only.", ephemeral: true });
    if (!canManageSettings(interaction)) return interaction.reply({ content: "Requires Manage Server or Owner.", ephemeral: true });

    const channel = interaction.options.getChannel("channel", true);
    await setGoodbyeChannel(interaction.guildId, channel.id);
    return interaction.reply({ content: `Goodbye messages set to ${channel}.`, ephemeral: true });
  },
};
