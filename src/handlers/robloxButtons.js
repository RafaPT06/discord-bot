const { getRobloxEmbed } = require("../services/robloxEmbed");

async function handleRobloxRefresh(interaction) {
  const ownerId = process.env.OWNER_ID;
  if (interaction.user.id !== ownerId) {
    return interaction.reply({ content: "❌ Owner only.", ephemeral: true });
  }
  await interaction.deferUpdate().catch(() => {});
  const username = process.env.ROBLOX_USERNAME || "qxR4F4";
  const data = await getRobloxEmbed(username);
  await interaction.editReply({ embeds: [data.embed], components: data.components }).catch(() => {});
}

module.exports = { handleRobloxRefresh };
