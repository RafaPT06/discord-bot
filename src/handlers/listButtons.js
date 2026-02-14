const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
const { fetchContentPage } = require("../utils/contentList");

function buildRow(type, offset, pageSize, total) {
  const prevOffset = Math.max(0, offset - pageSize);
  const nextOffset = offset + pageSize;
  const canPrev = offset > 0;
  const canNext = nextOffset < total;

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`list:${type}:${prevOffset}`)
      .setLabel("Prev")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!canPrev),
    new ButtonBuilder()
      .setCustomId(`list:${type}:${nextOffset}`)
      .setLabel("Next")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!canNext)
  );
}

function titleFor(type) {
  return type === "compliment" ? "Compliments" : "Roasts";
}

async function handleListButton(interaction, type, offset) {
  try {
    // public by default (user asked that lists should not be "only you can see")
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ ephemeral: false }).catch(() => {});
    }

    const pageSize = 10;
    const { total, rows } = await fetchContentPage({
      guildId: interaction.guildId,
      type,
      offset,
      limit: pageSize,
    });

    const start = total === 0 ? 0 : offset + 1;
    const end = Math.min(offset + pageSize, total);

    let description;
    if (!rows.length) {
      description = "_No entries yet._";
    } else {
      description = rows
        .map((r, i) => {
          const num = offset + i + 1;
          const text = String(r.text || "").replace(/\s+/g, " ").trim();
          const safe = text.length > 180 ? text.slice(0, 177) + "..." : text;
          return `**#${num}**  ${safe}`;
        })
        .join("\n");
    }

    const embed = new EmbedBuilder()
      .setTitle(`${titleFor(type)} (${total} total)`)
      .setDescription(description);

    if (total > 0) {
      embed.setFooter({ text: `Showing ${start}-${end}` });
    }

    const row = buildRow(type, offset, pageSize, total);
    return interaction.editReply({ embeds: [embed], components: total > pageSize ? [row] : [] }).catch(() => {});
  } catch (err) {
    return interaction.editReply({ content: `Error: ${err?.message || String(err)}`, components: [] }).catch(() => {});
  }
}

module.exports = { handleListButton };
