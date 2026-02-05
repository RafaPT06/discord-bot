const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { pool } = require("../db/pool");

const LIMIT = 10;

function tableFor(type) {
  return type === "roast" ? "roasts" : "compliments";
}

function labelFor(type) {
  return type === "roast" ? "Roasts" : "Compliments";
}

async function fetchPage(guildId, type, offset) {
  const table = tableFor(type);
  const { rows } = await pool.query(
    `SELECT id, text FROM ${table} WHERE guild_id=$1 ORDER BY id ASC LIMIT $2 OFFSET $3`,
    [guildId, LIMIT, offset]
  );
  const { rows: cnt } = await pool.query(`SELECT COUNT(*)::int AS c FROM ${table} WHERE guild_id=$1`, [guildId]);
  return { rows, total: cnt[0]?.c || 0 };
}

function pager(type, offset, total) {
  const prevOffset = Math.max(0, offset - LIMIT);
  const nextOffset = offset + LIMIT;

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`list:${type}:${prevOffset}`).setLabel("Prev").setStyle(ButtonStyle.Secondary).setDisabled(offset === 0),
    new ButtonBuilder().setCustomId(`list:${type}:${nextOffset}`).setLabel("Next").setStyle(ButtonStyle.Secondary).setDisabled(nextOffset >= total),
  );
}

async function handleListButton(interaction, type, offset) {
  if (!interaction.guildId) return interaction.reply({ content: "❌ Server only.", ephemeral: true });
  await interaction.deferReply({ ephemeral: true }).catch(() => {});
  const { rows, total } = await fetchPage(interaction.guildId, type, offset);

  const header = `**${labelFor(type)}** — showing ${Math.min(offset + 1, total)}–${Math.min(offset + rows.length, total)} of ${total}`;
  const body = rows.length ? rows.map((r, i) => `\`${offset + i + 1}.\` **#${r.id}** — ${r.text}`).join("\n") : "_No entries yet._";

  await interaction.editReply({ content: `${header}\n\n${body}`, components: [pager(type, offset, total)] }).catch(() => {});
}

module.exports = { handleListButton };
