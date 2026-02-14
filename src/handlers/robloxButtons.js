const { getRobloxEmbed } = require("../services/robloxEmbed");

async function handleRobloxRefresh(interaction) {
  const username = process.env.ROBLOX_USERNAME || "qxR4F4";
  const data = await getRobloxEmbed(username);

  // Refresh button should not create a new message
  if (interaction.deferred || interaction.replied) {
    return interaction.editReply({ embeds: [data.embed], components: data.components }).catch(() => {});
  }
  await interaction.deferUpdate().catch(() => {});
  return interaction.editReply({ embeds: [data.embed], components: data.components }).catch(() => {});
}

module.exports = { handleRobloxRefresh };
