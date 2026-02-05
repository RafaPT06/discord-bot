const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { pool } = require("../db/pool");

async function listContent(guildId, type, offset, limit=10) {
  const { rows } = await pool.query(
    `
    SELECT id, text,
      (row_number() OVER (ORDER BY id) + $3) AS display_id
    FROM content_items
    WHERE guild_id = $1 AND type = $2
    ORDER BY id ASC
    LIMIT $4 OFFSET $3
    `,
    [guildId, type, offset, limit]
  );
  const { rows: cntRows } = await pool.query(
    "SELECT COUNT(*)::int AS c FROM content_items WHERE guild_id=$1 AND type=$2",
    [guildId, type]
  );
  const total = cntRows[0]?.c || 0;
  return { rows, total };
}

function buildRow(type, offset, total, limit=10) {
  const prevOffset = Math.max(0, offset - limit);
  const nextOffset = offset + limit;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`list:${type}:${prevOffset}`)
      .setLabel("Prev")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(offset === 0),
    new ButtonBuilder()
      .setCustomId(`list:${type}:${nextOffset}`)
      .setLabel("Next")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(nextOffset >= total)
  );
  return row;
}

async function handleListButton(interaction, type, offset) {
  const guildId = interaction.guildId;
  if (!guildId) return interaction.reply({ content: "❌ This only works in servers.", ephemeral: true });

  await interaction.deferUpdate().catch(() => {});
  const { rows, total } = await listContent(guildId, type, offset);
  const label = type === "roast" ? "Roasts" : "Compliments";

  const lines = rows.length
    ? rows.map(r => `#${r.display_id} (id: ${r.id}) — ${r.text}`).join("\n")
    : "_No entries._";

  await interaction.editReply({
    content: `**${label}** (showing ${Math.min(offset+1, total)}–${Math.min(offset+rows.length, total)} of ${total})\n\n${lines}`,
    components: [buildRow(type, offset, total)],
  }).catch(() => {});
}

module.exports = { handleListButton };
