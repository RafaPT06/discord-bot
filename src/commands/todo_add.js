const { isOwner, canManage } = require("../utils/permissions");

module.exports = {
  name: "todo_add",
  async execute(interaction, ctx) {
    const { db, config } = ctx;

    if (!interaction.inGuild() && !isOwner(interaction, config.OWNER_ID)) {
      return interaction.reply({ content: "❌ Only the owner can use TODOs in DMs.", ephemeral: true });
    }
    if (interaction.inGuild() && !canManage(interaction, config.OWNER_ID)) {
      return interaction.reply({ content: "❌ You need **Manage Server** (or be the owner) to manage TODOs.", ephemeral: true });
    }

    const text = interaction.options.getString("text", true).trim();
    if (!text) return interaction.reply({ content: "❌ TODO text is required.", ephemeral: true });
    if (!db.enabled) return interaction.reply({ content: "⚠️ Database not available (DATABASE_URL missing).", ephemeral: true });

    const id = await db.addTodo(text, interaction.user.id);
    return interaction.reply({ content: `✅ Added TODO **#${id}** — ${text}`, ephemeral: false });
  },
};
