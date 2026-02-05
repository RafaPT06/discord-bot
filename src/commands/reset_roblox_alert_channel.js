const { isOwner } = require("../utils/permissions");

module.exports = {
  name: "reset_roblox_alert_channel",
  async execute(interaction, ctx) {
    const { db, config } = ctx;

    if (!interaction.inGuild()) {
      return interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    }
    if (!isOwner(interaction, config.OWNER_ID)) {
      return interaction.reply({ content: "Only the bot owner can use this command.", ephemeral: true });
    }

    await db.resetRobloxAlertChannel(interaction.guildId);

    return interaction.reply({ content: "✅ Roblox alert channel cleared for this server.", ephemeral: true });
  },
};
