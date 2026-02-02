const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");

const CONTENT_PAGE_SIZE = 10;

function buildContentListPayload({ kind, page, totalPages, items, userId }) {
  const title = kind === "roast" ? "🔥 Saved Roasts" : "✨ Saved Compliments";
  const lines = items.map((i) => `• **#${i.id}** — ${i.text}`);

  const embed = new EmbedBuilder()
    .setTitle(`${title} (page ${page}/${Math.max(totalPages, 1)})`)
    .setDescription(lines.join("\n"));

  const prevBtn = new ButtonBuilder()
    .setCustomId(`contentlist_${kind}_${page - 1}_${userId}`)
    .setLabel("Prev")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(page <= 1);

  const nextBtn = new ButtonBuilder()
    .setCustomId(`contentlist_${kind}_${page + 1}_${userId}`)
    .setLabel("Next")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(page >= totalPages);

  const row = new ActionRowBuilder().addComponents(prevBtn, nextBtn);

  return { embeds: [embed], components: totalPages > 1 ? [row] : [], ephemeral: true };
}

async function fetchContentPage(db, guildId, kind, page) {
  const limit = CONTENT_PAGE_SIZE;
  const offset = (page - 1) * limit;

  const [total, items] = await Promise.all([
    db.countContent(guildId, kind),
    db.listContent(guildId, kind, limit, offset),
  ]);

  const totalPages = Math.max(1, Math.ceil((total || 0) / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);

  if (safePage !== page) {
    const offset2 = (safePage - 1) * limit;
    const items2 = await db.listContent(guildId, kind, limit, offset2);
    return { totalPages, page: safePage, items: items2 };
  }

  return { totalPages, page: safePage, items };
}

module.exports = { buildContentListPayload, fetchContentPage, CONTENT_PAGE_SIZE };
