const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { resolveUsername, getPresence, getPlaceDetails, getGameIcon } = require("./robloxApi");

function presenceLabel(t) {
  if (t === 0) return "Offline";
  if (t === 1) return "Online";
  if (t === 2) return "In Game";
  if (t === 3) return "In Studio";
  return "Unknown";
}

async function getRobloxEmbed(username) {
  const user = await resolveUsername(username);
  const p = await getPresence(user.userId);

  let placeName = null;
  let universeId = p.universeId || null;

  if (p.placeId) {
    try {
      const details = await getPlaceDetails(p.placeId);
      placeName = details?.name || null;
      universeId = details?.universeId || universeId;
    } catch (_) {}
  }

  const status = presenceLabel(p.userPresenceType);
  const location = placeName || (p.lastLocation ? String(p.lastLocation) : "Website");

  const embed = new EmbedBuilder()
    .setTitle("Roblox Presence")
    .setDescription(
      [
        "Account",
        `${user.name} (id: ${user.userId})`,
        "",
        "Status",
        status,
        "",
        "Location",
        location,
      ].join("\n")
    );

  // Optional icon (only if in-game + available)
  try {
    if (universeId) {
      const iconUrl = await getGameIcon(universeId);
      if (iconUrl) embed.setThumbnail(iconUrl);
    }
  } catch (_) {}

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`roblox:refresh:${user.userId}`)
      .setLabel("Refresh")
      .setStyle(ButtonStyle.Secondary)
  );

  return { embed, row, userId: user.userId, username: user.name };
}

module.exports = { getRobloxEmbed };
