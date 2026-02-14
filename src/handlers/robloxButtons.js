const { isOwner } = require("../utils/perms");
const { getRobloxBlock } = require("../services/robloxEmbed");

async function handleRobloxRefresh(interaction) {
  // Keep refresh owner-only to avoid spam (command itself can be public)
  if (!isOwner(interaction)) return interaction.reply({ content: "Error: Owner only.", ephemeral: true });

  await interaction.deferUpdate().catch(() => {});
  const username = process.env.ROBLOX_USERNAME || "qxR4F4";
  const data = await getRobloxBlock(username);
  return interaction.editReply({ content: data.text, components: data.components }).catch(() => {});
}

module.exports = { handleRobloxRefresh };
