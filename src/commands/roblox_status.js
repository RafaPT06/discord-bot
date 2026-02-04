const { EmbedBuilder } = require("discord.js");
const { isOwner } = require("../utils/permissions");
const { resolveUsername, getPresence, getPlaceDetails, presenceLabel } = require("../services/robloxService");

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
      const { userId } = await resolveUsername(username);
      const presence = await getPresence(userId);

      let experience = undefined;
      if (presence.placeId) {
        const details = await getPlaceDetails(presence.placeId).catch(() => ({}));
        experience = details?.name;
      }

      const embed = new EmbedBuilder()
        .setTitle("🎮 Roblox Presence")
        .addFields(
          { name: "Account", value: `${username} (id: ${userId})`, inline: false },
          { name: "Status", value: presenceLabel(presence.presenceType), inline: true }
        );

      if (presence.lastLocation) {
        embed.addFields({ name: "Location", value: presence.lastLocation, inline: true });
      }
      if (presence.placeId) {
        embed.addFields({ name: "Place ID", value: String(presence.placeId), inline: true });
      }
      if (experience) {
        embed.addFields({ name: "Experience", value: experience, inline: false });
      }

      return interaction.editReply({ embeds: [embed] });
    } catch (e) {
      console.error("roblox_status error:", e);
      return interaction.editReply({ content: "❌ Couldn't fetch Roblox presence right now." });
    }
  },
};
