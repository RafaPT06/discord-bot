const { isOwner } = require("../utils/permissions");

module.exports = {
  name: "show_roblox_alert_channel",
  async execute(interaction, ctx) {
    const { db, config } = ctx;

    if (!interaction.inGuild()) {
      return interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    }
    if (!isOwner(interaction, config.OWNER_ID)) {
      return interaction.reply({ content: "Only the bot owner can use this command.", ephemeral: true });
    }

    const channelId = await db.getRobloxAlertChannel(interaction.guildId);

    if (!channelId) {
      return interaction.reply({ content: "ℹ️ No Roblox alert channel is set for this server.", ephemeral: true });
    }

    return interaction.reply({ content: `📣 Roblox presence alerts channel: <#${channelId}>`, ephemeral: true });
  },
};
