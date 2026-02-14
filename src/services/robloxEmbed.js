const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { resolveUsername, getPresence, getPlaceDetails } = require("./robloxApi");

function presenceLabel(t) {
  if (t === 0) return "Offline";
  if (t === 1) return "Online";
  if (t === 2) return "In Game";
  if (t === 3) return "In Studio";
  return "Unknown";
}

function padAligned(rows) {
  const longest = Math.max(...rows.map(r => r.label.length));
  return rows.map(r => `${r.label.padEnd(longest + 2)}**${r.value}**`);
}

async function getRobloxBlock(username) {
  const user = await resolveUsername(username);
  const p = await getPresence(user.userId); // { presenceType, lastLocation, placeId, universeId }

  let placeName = null;
  let universeId = p.universeId || null;

  if (p.placeId) {
    try {
      const details = await getPlaceDetails(p.placeId);
      placeName = details?.name || null;
      universeId = details?.universeId || universeId;
    } catch (_) {}
  }

  const status = presenceLabel(p.presenceType);
  const location = placeName || (p.lastLocation ? String(p.lastLocation) : "Website");

  const lines = padAligned([
    { label: "Account", value: `${user.name} (id: ${user.userId})` },
    { label: "Status", value: status },
    { label: "Location", value: location },
  ]);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`roblox:refresh:${user.userId}:${user.name}`)
      .setLabel("Refresh")
      .setStyle(ButtonStyle.Secondary)
  );

  return {
    text: ["Roblox Status", "", ...lines].join("\n"),
    components: [row],
    presenceType: p.presenceType,
    lastLocation: p.lastLocation || null,
    placeId: p.placeId || null,
    universeId,
    userId: user.userId,
    username: user.name,
  };
}

module.exports = { getRobloxBlock };
