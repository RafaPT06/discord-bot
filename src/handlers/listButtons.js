const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
const { pool } = require("../db/pool");

const LIMIT = 10;

// Make list output clean + safe for Discord
function cleanText(s, maxLen = 140) {
  if (!s) return "-";
  // collapse newlines/tabs/multi spaces
  let out = String(s).replace(/\s+/g, " ").trim();
  if (out.length > maxLen) out = out.slice(0, maxLen - 1) + "…";
  return out;
}

function tableFor(type) {
  return type === "roast" ? "roasts" : "compliments";
}

function labelFor(type) {
  return type === "roast" ? "Roasts" : "Compliments";
}

async function fetchPage(guildId, type, offset) {
  const table = tableFor(type);

  const { rows } = await pool.query(
    `SELECT id, text
     FROM ${table}
     WHERE guild_id=$1
     ORDER BY id ASC
     LIMIT $2 OFFSET $3`,
    [guildId, LIMIT, offset]
  );

  const { rows: cnt } = await pool.query(
    `SELECT COUNT(*)::int AS c FROM ${table} WHERE guild_id=$1`,
    [guildId]
  );

  return { rows, total: cnt[0]?.c || 0 };
}

function pager(type, offset, total) {
  const prevOffset = Math.max(0, offset - LIMIT);
  const nextOffset = offset + LIMIT;

  return new ActionRowBuilder().addComponents(
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
}

async function handleListButton(interaction, type, offset) {
  if (!interaction.guildId) {
    return interaction.reply({ content: "Error: Server only.", ephemeral: true });
  }

  // Works for both initial slash command + button presses
  if (interaction.isButton?.()) await interaction.deferUpdate().catch(() => {});
  else await interaction.deferReply({ ephemeral: false }).catch(() => {});

  const { rows, total } = await fetchPage(interaction.guildId, type, offset);

  const embed = new EmbedBuilder().setTitle(`${labelFor(type)} (${total} total)`);

  if (total === 0) {
    embed.setDescription("*No entries yet.*");
    return interaction
      .editReply({ embeds: [embed], components: [], content: "" })
      .catch(() => {});
  }

  const start = offset + 1;
  const end = Math.min(offset + rows.length, total);

  const body = rows
    .map((r, i) => `**${offset + i + 1}.**  **#${r.id}**  ${cleanText(r.text)}`)
    .join("\n");

  embed.setDescription(body);
  embed.setFooter({ text: `Showing ${start}–${end} • remove by ID using /remove_${type}` });

  const components = total > LIMIT ? [pager(type, offset, total)] : [];

  return interaction
    .editReply({ embeds: [embed], components, content: "" })
    .catch(() => {});
}

module.exports = { handleListButton };
