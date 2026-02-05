const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { resolveUsername, getPresence, getPlaceDetails, getGameIcon } = require("./robloxApi");

function presenceLabel(t) {
  if (t === 0) return "🔴 Offline";
  if (t === 1) return "🟡 Online";
  if (t === 2) return "🟢 In Game";
  if (t === 3) return "🟣 In Studio";
  return "❔ Unknown";
}

async function getRobloxEmbed(username) {
  const user = await resolveUsername(username);
  const p = await getPresence(user.userId);

  let placeName = null;
  let universeId = p.universeId || null;

  if (p.placeId) {
    const place = await getPlaceDetails(p.placeId).catch(() => null);
    if (place) {
      placeName = place.name;
      universeId = universeId || place.universeId;
    }
  }

  const iconUrl = universeId ? await getGameIcon(universeId).catch(() => null) : null;

  const embed = new EmbedBuilder()
    .setTitle("🎮 Roblox Presence")
    .addFields(
      { name: "Account", value: `${user.name} (id: ${user.userId})`, inline: false },
      { name: "Status", value: presenceLabel(p.presenceType), inline: true },
      { name: "Location", value: p.lastLocation || "—", inline: true },
    )
    .setTimestamp(new Date());

  if (placeName) embed.addFields({ name: "Experience", value: placeName, inline: false });
  if (iconUrl) embed.setThumbnail(iconUrl);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("roblox:refresh").setLabel("Refresh").setStyle(ButtonStyle.Secondary).setEmoji("🔄")
  );

  return { embed, components: [row], presenceType: p.presenceType, placeId: p.placeId, lastLocation: p.lastLocation };
}

module.exports = { getRobloxEmbed };
