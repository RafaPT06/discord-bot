const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { pool } = require("../db/pool");

function buildRow(offset, total, limit=10) {
  const prevOffset = Math.max(0, offset - limit);
  const nextOffset = offset + limit;
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`list:roast:${prevOffset}`).setLabel("Prev").setStyle(ButtonStyle.Secondary).setDisabled(offset===0),
    new ButtonBuilder().setCustomId(`list:roast:${nextOffset}`).setLabel("Next").setStyle(ButtonStyle.Secondary).setDisabled(nextOffset>=total)
  );
}

module.exports = {
  data: new SlashCommandBuilder().setName("list_roasts").setDescription("List roasts (paged)."),
  async execute(interaction) {
    if (!interaction.guildId) return interaction.reply({ content: "❌ Server only.", ephemeral: true });
    const offset = 0;
    const limit = 10;

    const { rows } = await pool.query(
      `
      SELECT id, text,
        row_number() OVER (ORDER BY id) AS display_id
      FROM content_items
      WHERE guild_id=$1 AND type='roast'
      ORDER BY id ASC
      LIMIT $2 OFFSET $3
      `,
      [interaction.guildId, limit, offset]
    );
    const { rows: cnt } = await pool.query(
      "SELECT COUNT(*)::int AS c FROM content_items WHERE guild_id=$1 AND type='roast'",
      [interaction.guildId]
    );
    const total = cnt[0]?.c || 0;

    const lines = rows.length
      ? rows.map(r => `#${r.display_id} (id: ${r.id}) — ${r.text}`).join("\n")
      : "_No roasts yet._";

    return interaction.reply({
      content: `**Roasts** (showing ${Math.min(offset+1,total)}–${Math.min(offset+rows.length,total)} of ${total})\n\n${lines}`,
      components: [buildRow(offset, total, limit)],
      ephemeral: false,
    });
  },
};
