const { buildPanelEmbed } = require("../utils/panelPages");
const panelCmd = require("../commands/panel");

async function handlePanelButton(interaction, client) {
  const parts = String(interaction.customId || "").split(":");
  const page = parts[1] || "overview";

  await interaction.deferUpdate().catch(() => {});
  const embed = await buildPanelEmbed(client, interaction.guildId, page).catch(() => null);
  const row = typeof panelCmd.row === "function" ? panelCmd.row(page) : null;

  if (!embed) return;

  return interaction.editReply({
    embeds: [embed],
    components: row ? [row] : [],
  }).catch(() => {});
}

module.exports = { handlePanelButton };
