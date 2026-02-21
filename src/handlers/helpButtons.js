const { buildHelpEmbed } = require("../utils/helpPages");
const helpCmd = require("../commands/help");

async function handleHelpButton(interaction) {
  const parts = String(interaction.customId || "").split(":");
  const page = parts[1] || "fun";
  const embed = buildHelpEmbed(page);
  const row = typeof helpCmd.helpRow === "function" ? helpCmd.helpRow(page) : undefined;

  // Update without creating a new message
  await interaction.deferUpdate().catch(() => {});
  return interaction.editReply({
    embeds: [embed],
    components: row ? [row] : [],
  }).catch(() => {});
}

module.exports = { handleHelpButton };
