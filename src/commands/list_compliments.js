const { canManage } = require("../utils/permissions");
const { buildContentListPayload, fetchContentPage } = require("../utils/contentList");

module.exports = {
  name: "list_compliments",
  async execute(interaction, ctx) {
    const { db, config } = ctx;
    if (!interaction.inGuild()) {
      return interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    }
    if (!canManage(interaction, config.OWNER_ID)) {
      return interaction.reply({ content: "❌ You need **Manage Server** (or be the owner) to do that.", ephemeral: true });
    }
    if (!db.enabled) {
      return interaction.reply({ content: "⚠️ Database not available (DATABASE_URL missing).", ephemeral: true });
    }

    const page = Math.max(1, interaction.options.getInteger("page") ?? 1);

    await interaction.deferReply({ ephemeral: false });
    try {
      const data = await fetchContentPage(db, interaction.guildId, "compliment", page);
      if (!data.items.length) {
        return interaction.editReply(page === 1 ? "✨ No compliments saved yet." : "✨ No more compliments.");
      }
      const payload = buildContentListPayload({
        kind: "compliment",
        page: data.page,
        totalPages: data.totalPages,
        items: data.items,
        userId: interaction.user.id,
      });
      return interaction.editReply(payload);
    } catch (e) {
      console.error("list_compliments failed:", e);
      return interaction.editReply("❌ Something went wrong while listing compliments. Check Railway logs.");
    }
  },
};
