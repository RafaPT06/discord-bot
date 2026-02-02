const { isOwner } = require("../utils/permissions");

module.exports = {
  name: "reset_deploy_channel",
  async execute(interaction, ctx) {
    const { db, config } = ctx;
    if (!interaction.inGuild()) {
      return interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    }
    if (!isOwner(interaction, config.OWNER_ID)) {
      return interaction.reply({ content: "You can’t use this command.", ephemeral: true });
    }

    if (!db.enabled) {
      return interaction.reply({ content: "⚠️ Database not available (DATABASE_URL missing).", ephemeral: true });
    }

    await db.resetDeployChannel(interaction.guildId);
    return interaction.reply({ content: "✅ Deployment updates channel reset.", ephemeral: true });
  },
};
