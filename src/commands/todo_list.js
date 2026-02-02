const { isOwner, canManage } = require("../utils/permissions");

module.exports = {
  name: "todo_list",
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

    const includeDone = interaction.options.getBoolean("all") ?? false;
    const items = await db.listTodos(includeDone, 25);
    if (!items.length) return interaction.reply({ content: "📭 No TODOs yet.", ephemeral: false });
    const lines = items.map((i) => `${i.is_done ? "✅" : "🟨"} **#${i.id}** — ${i.text}`);
    return interaction.reply({ content: `📝 **Global TODOs**\n${lines.join("\n")}`, ephemeral: false });
  },
};
