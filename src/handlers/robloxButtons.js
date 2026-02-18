const { getRobloxEmbed } = require("../services/robloxEmbed");

function normalizeComponents(components) {
  if (!components) return [];
  return components.map(c => (typeof c?.toJSON === "function" ? c.toJSON() : c));
}

async function handleRobloxRefresh(interaction) {
  await interaction.deferUpdate().catch(() => {});
  const username = process.env.ROBLOX_USERNAME || "qxR4F4";

  try {
    const data = await getRobloxEmbed(username);
    return interaction.editReply({
      embeds: [data.embed],
      components: normalizeComponents(data.components),
      content: "",
    }).catch(() => {});
  } catch (err) {
    const msg = err?.message ? String(err.message).slice(0, 180) : "Unknown error";
    return interaction.editReply({
      content: `Error: ${msg}`,
      embeds: [],
      components: [],
    }).catch(() => {});
  }
}

module.exports = { handleRobloxRefresh };
