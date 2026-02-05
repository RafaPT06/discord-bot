const { isOwner } = require("../utils/perms");
const { getRobloxEmbed } = require("../services/robloxEmbed");

async function handleRobloxRefresh(interaction) {
  if (!isOwner(interaction)) return interaction.reply({ content: "❌ Owner only.", ephemeral: true });
  await interaction.deferUpdate().catch(() => {});
  const username = process.env.ROBLOX_USERNAME || "qxR4F4";
  const data = await getRobloxEmbed(username);
  return interaction.editReply({ embeds: [data.embed], components: data.components }).catch(() => {});
}

module.exports = { handleRobloxRefresh };
