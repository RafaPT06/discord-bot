const { canManage } = require("../utils/permissions");

module.exports = {
  name: "remove_roast",
  async execute(interaction, ctx) {
    const { db, config } = ctx;

    if (!interaction.inGuild()) {
      return interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    }

    if (!canManage(interaction, config.OWNER_ID)) {
      return interaction.reply({
        content: "❌ You need **Manage Server** (or be the owner) to do that.",
        ephemeral: true,
      });
    }

    if (!db.enabled) {
      return interaction.reply({ content: "⚠️ Database not available (DATABASE_URL missing).", ephemeral: true });
    }

    const id = interaction.options.getInteger("id", true);

    const ok = await db.removeContentById(interaction.guildId, "roast", id);
    if (!ok) {
      return interaction.reply({ content: `❌ Roast with id **${id}** not found.`, ephemeral: true });
    }

    return interaction.reply({ content: `🗑️ Removed roast with id **${id}**.`, ephemeral: true });
  },
};
