const { ChannelType } = require("discord.js");
const { isOwner } = require("../utils/permissions");

module.exports = {
  name: "set_roblox_alert_channel",
  async execute(interaction, ctx) {
    const { db, config } = ctx;

    if (!interaction.inGuild()) {
      return interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    }
    if (!isOwner(interaction, config.OWNER_ID)) {
      return interaction.reply({ content: "Only the bot owner can use this command.", ephemeral: true });
    }

    const channel = interaction.options.getChannel("channel", true);

    if (![ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(channel.type)) {
      return interaction.reply({ content: "Please pick a text channel.", ephemeral: true });
    }

    await db.setRobloxAlertChannel(interaction.guildId, channel.id);

    return interaction.reply({
      content: `✅ Roblox presence alerts will be sent to <#${channel.id}>.`,
      ephemeral: true,
    });
  },
};
