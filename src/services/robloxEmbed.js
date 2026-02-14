const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
const { resolveUsername, getPresence, getPlaceDetails, getGameIcon } = require("./robloxApi");

function presenceLabel(presenceType) {
  // 0: Offline, 1: Online, 2: In Game, 3: In Studio
  if (presenceType === 2) return "🟢 In Game";
  if (presenceType === 3) return "🟡 In Studio";
  if (presenceType === 1) return "🔵 Online";
  return "⚫ Offline";
}

async function getRobloxEmbed(username) {
  const who = await resolveUsername(username);
  const p = await getPresence(who.userId);

  let place = null;
  if (p.placeId) place = await getPlaceDetails(p.placeId);

  const status = presenceLabel(p.presenceType);
  const location =
    p.lastLocation ||
    (p.presenceType === 0 ? null : "Website");

  const embed = new EmbedBuilder()
    .setTitle("Roblox Status")
    .addFields(
      { name: "Account", value: `${who.name} (id: ${who.userId})`, inline: false },
      { name: "Status", value: status, inline: true },
      { name: "Location", value: location || "n/a", inline: true }
    );

  if (place?.name) {
    embed.addFields({ name: "Game", value: place.name, inline: false });
  }

  const icon = await getGameIcon(p.universeId || place?.universeId || null).catch(() => null);
  if (icon) embed.setThumbnail(icon);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("roblox:refresh")
      .setLabel("Refresh")
      .setStyle(ButtonStyle.Secondary)
  );

  return { embed, components: [row] };
}

// Back-compat (older code used .text)
async function getRobloxBlock(username) {
  const data = await getRobloxEmbed(username);
  return { text: "", components: data.components, embed: data.embed };
}

module.exports = { getRobloxEmbed, getRobloxBlock };
