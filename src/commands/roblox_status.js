const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { isOwner } = require("../utils/permissions");
const { getPresenceSummary, presenceLabel } = require("../services/robloxService");

function buildRefreshRow(ownerId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`rbx_refresh_${ownerId}`)
      .setLabel("Refresh")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("🔄")
  );
}

function buildEmbed(summary) {
  const embed = new EmbedBuilder()
    .setTitle("🎮 Roblox Presence")
    .addFields(
      { name: "Account", value: `${summary.username} (id: ${summary.userId})`, inline: false },
      { name: "Status", value: presenceLabel(summary.presenceType), inline: true }
    )
    .setTimestamp(new Date());

  if (summary.lastLocation) embed.addFields({ name: "Location", value: summary.lastLocation, inline: true });
  if (summary.placeId) embed.addFields({ name: "Place ID", value: String(summary.placeId), inline: true });
  if (summary.experienceName) embed.addFields({ name: "Experience", value: summary.experienceName, inline: false });

  if (summary.iconUrl) embed.setThumbnail(summary.iconUrl);

  return embed;
}

module.exports = {
  name: "roblox_status",
  /** @param {import('discord.js').ChatInputCommandInteraction} interaction */
  async execute(interaction, ctx) {
    const { config } = ctx;

    if (!isOwner(interaction, config.OWNER_ID)) {
      return interaction.reply({ content: "❌ Owner only.", ephemeral: true });
    }

    const username = config.ROBLOX_USERNAME || "qxR4F4";

    await interaction.deferReply({ ephemeral: false }).catch(() => null);

    try {
      const summary = await getPresenceSummary(username);
      const embed = buildEmbed(summary);
      return interaction.editReply({ embeds: [embed], components: [buildRefreshRow(interaction.user.id)] });
    } catch (e) {
      console.error("roblox_status error:", e);
      return interaction.editReply({ content: "❌ Couldn't fetch Roblox presence right now." });
    }
  },
};

// Export helpers for button handler reuse
module.exports._roblox = { buildEmbed, buildRefreshRow };
