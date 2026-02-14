const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
const { resolveUsername, getPresence } = require("./robloxApi");

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

  const status = presenceLabel(p.presenceType);

  // Only show location if Roblox provides something real
  const lastLoc = (p.lastLocation && String(p.lastLocation).trim()) ? String(p.lastLocation).trim() : null;

  const embed = new EmbedBuilder()
    .setTitle("Roblox Status")
    .addFields(
      { name: "Account", value: `${who.name} (id: ${who.userId})`, inline: false },
      { name: "Status", value: status, inline: true }
    );

  if (lastLoc) {
    embed.addFields({ name: "Location", value: lastLoc, inline: true });
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("roblox:refresh")
      .setLabel("Refresh")
      .setStyle(ButtonStyle.Secondary)
  );

  return { embed, components: [row] };
}

// Back-compat
async function getRobloxBlock(username) {
  const data = await getRobloxEmbed(username);
  return { text: "", components: data.components, embed: data.embed };
}

module.exports = { getRobloxEmbed, getRobloxBlock };
