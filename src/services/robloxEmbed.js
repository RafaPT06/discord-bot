const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { resolveUsername, getPresence, getPlaceDetails } = require("./robloxApi");

function presenceText(t) {
  if (t === 0) return "Offline";
  if (t === 1) return "Online";
  if (t === 2) return "In Game";
  if (t === 3) return "In Studio";
  return "Unknown";
}

function padRight(str, len) {
  return str + " ".repeat(Math.max(0, len - str.length));
}

function block(title, rows) {
  const longest = Math.max(...rows.map(r => r.label.length));
  const lines = rows.map(r => `${padRight(r.label, longest + 2)}**${r.value}**`);
  return [title, "", ...lines].join("\n");
}

function joinUrl(placeId) {
  if (!placeId) return null;
  return `https://www.roblox.com/games/${placeId}`;
}

async function getRobloxBlock(username) {
  const user = await resolveUsername(username);
  const p = await getPresence(user.userId);

  let placeName = null;
  let placeId = p.placeId || null;

  if (placeId) {
    const place = await getPlaceDetails(placeId).catch(() => null);
    if (place?.name) placeName = place.name;
  }

  const status = presenceText(p.presenceType);
  const location = p.lastLocation || "—";
  const game = placeName || (placeId ? `Place ${placeId}` : "—");

  // Helpful hint when always offline due to privacy
  const note = (p.presenceType === 0)
    ? "If you're online but this shows Offline, your Roblox privacy settings may hide presence."
    : null;

  const text = block("Roblox Status", [
    { label: "Account", value: `${user.name} (id: ${user.userId})` },
    { label: "Status", value: status },
    { label: "Location", value: location },
    { label: "Game", value: game },
  ]) + (note ? `\n\n${note}` : "");

  const rows = [];
  const buttons = [];

  // Refresh
  buttons.push(
    new ButtonBuilder()
      .setCustomId("roblox:refresh")
      .setLabel("Refresh")
      .setStyle(ButtonStyle.Secondary)
  );

  // Join URL (only if in game and placeId known)
  const url = (p.presenceType === 2 && placeId) ? joinUrl(placeId) : null;
  if (url) {
    buttons.push(
      new ButtonBuilder()
        .setLabel("Open Game")
        .setStyle(ButtonStyle.Link)
        .setURL(url)
    );
  }

  rows.push(new ActionRowBuilder().addComponents(buttons));

  return {
    presenceType: p.presenceType,
    lastLocation: p.lastLocation || null,
    placeId: placeId,
    text,
    components: rows,
  };
}

module.exports = { getRobloxBlock };
