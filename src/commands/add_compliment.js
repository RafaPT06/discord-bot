const { canManage } = require("../utils/permissions");

module.exports = {
  name: "add_compliment",
  async execute(interaction, ctx) {
    const { db, config } = ctx;
    if (!interaction.inGuild()) {
      return interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    }
    if (!canManage(interaction, config.OWNER_ID)) {
      return interaction.reply({ content: "❌ You need **Manage Server** (or be the owner) to do that.", ephemeral: true });
    }

    const text = interaction.options.getString("text", true).trim();
    if (!text) return interaction.reply({ content: "❌ Text is required.", ephemeral: true });
    if (!db.enabled) return interaction.reply({ content: "⚠️ Database not available (DATABASE_URL missing).", ephemeral: true });

    const id = await db.addContent(interaction.guildId, "compliment", text, interaction.user.id);
    return interaction.reply({ content: `✅ Added compliment **#${id}**.`, ephemeral: true });
  },
};
