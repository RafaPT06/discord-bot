const { buildPanelEmbed } = require("../utils/panelPages");
const panelCmd = require("../commands/panel");
const { addPanelEvent } = require("../services/panelEvents");

async function handlePanelSelect(interaction, client) {
  const guildId = interaction.guildId;
  if (!guildId) return;

  const page = String(interaction.values?.[0] || "overview").toLowerCase();

  await interaction.deferUpdate().catch(() => {});

  try {
    const built = await buildPanelEmbed(client, guildId, page);
    const embed = built?.embed ?? built;

    const components =
      typeof panelCmd.buildComponents === "function"
        ? panelCmd.buildComponents(page)
        : [];

    return interaction.editReply({
      embeds: [embed],
      components,
    }).catch(() => {});
  } catch (err) {
    console.error("panel select error:", err);
    await addPanelEvent(guildId, { level: 1, kind: "error", message: `Panel select failed (${page}): ${err?.message || String(err)}` }).catch(()=>{});
    return interaction.editReply({
      content: `Error: ${err?.message || String(err)}`,
      embeds: [],
      components: [],
    }).catch(() => {});
  }
}

module.exports = { handlePanelSelect };
