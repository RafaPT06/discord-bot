const { getRobloxEmbed } = require("../services/robloxEmbed");

async function handleRobloxRefresh(interaction) {
  // Ack the button click fast so Discord doesn't time out
  await interaction.deferUpdate().catch(() => {});

  const username = process.env.ROBLOX_USERNAME || "qxR4F4";

  try {
    const data = await getRobloxEmbed(username);

    // Update the SAME message (no new message)
    return interaction.editReply({
      embeds: [data.embed],
      components: data.components,
      content: "", // clear any old text if there was any
    }).catch(() => {});
  } catch (err) {
    const msg = err?.message ? String(err.message).slice(0, 180) : "Unknown error";
    // Still edits the same message
    return interaction.editReply({
      content: `Error: ${msg}`,
      embeds: [],
      components: [],
    }).catch(() => {});
  }
}

module.exports = { handleRobloxRefresh };
