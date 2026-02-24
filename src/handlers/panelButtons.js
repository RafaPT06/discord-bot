const { buildPanelEmbed } = require("../utils/panelPages");
const panelCmd = require("../commands/panel");

async function handlePanelButton(interaction, client) {
  const parts = String(interaction.customId || "").split(":");
  const page = (parts[1] || "overview").toLowerCase();

  await interaction.deferUpdate().catch(() => {});

  try {
    const built = await buildPanelEmbed(client, interaction.guildId, page);
    const embed = built?.embed ?? built;

    const nav = typeof panelCmd.rows === "function" ? panelCmd.rows(page) : [];
    const act = typeof panelCmd.actionRows === "function" ? panelCmd.actionRows(page) : [];
    const components = [...(Array.isArray(nav)?nav:[nav].filter(Boolean)), ...(Array.isArray(act)?act:[act].filter(Boolean))];

    return interaction.editReply({
      embeds: [embed],
      components,
    }).catch(() => {});
  } catch (err) {
    console.error("panel button error:", err);
    return interaction.editReply({
      content: `Error: ${err?.message || String(err)}`,
      embeds: [],
      components: [],
    }).catch(() => {});
  }
}

module.exports = { handlePanelButton };
