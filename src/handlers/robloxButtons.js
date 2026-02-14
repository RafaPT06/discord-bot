const { getRobloxEmbed } = require("../services/robloxEmbed");

async function handleRobloxRefresh(interaction) {
  const username = process.env.ROBLOX_USERNAME || null;
  if (!username) {
    await interaction.reply({ content: "Error: ROBLOX_USERNAME is not set.", ephemeral: true }).catch(() => null);
    return;
  }

  try {
    await interaction.deferUpdate();
    const { embed, row } = await getRobloxEmbed(username);
    await interaction.editReply({ embeds: [embed], components: [row] });
  } catch (e) {
    await interaction.followUp({ content: `Error: ${String(e?.message || e)}`, ephemeral: true }).catch(() => null);
  }
}

module.exports = { handleRobloxRefresh };
