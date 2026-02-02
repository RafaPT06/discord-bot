const { isOwner, canManage } = require("../utils/permissions");

module.exports = {
  name: "todo_done",
  async execute(interaction, ctx) {
    const { db, config } = ctx;

    if (!interaction.inGuild() && !isOwner(interaction, config.OWNER_ID)) {
      return interaction.reply({ content: "❌ Only the owner can use TODOs in DMs.", ephemeral: true });
    }
    if (interaction.inGuild() && !canManage(interaction, config.OWNER_ID)) {
      return interaction.reply({ content: "❌ You need **Manage Server** (or be the owner) to manage TODOs.", ephemeral: true });
    }

    if (!db.enabled) {
      return interaction.reply({ content: "⚠️ Database not available (DATABASE_URL missing).", ephemeral: true });
    }

    const id = interaction.options.getInteger("id", true);
    const ok = await db.doneTodo(id);
    return interaction.reply({ content: ok ? `✅ Marked TODO **#${id}** as done.` : `❌ TODO **#${id}** not found.`, ephemeral: false });
  },
};
