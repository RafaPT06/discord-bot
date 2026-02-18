const { SlashCommandBuilder } = require("discord.js");
const { getRobloxEmbed } = require("../services/robloxEmbed");

function normalizeComponents(components) {
  if (!components) return [];
  return components.map(c => (typeof c?.toJSON === "function" ? c.toJSON() : c));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("roblox_status")
    .setDescription("Roblox online/in-game status."),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false }).catch(() => {});
    const username = process.env.ROBLOX_USERNAME || "qxR4F4";
    const data = await getRobloxEmbed(username);
    return interaction.editReply({
      embeds: [data.embed],
      components: normalizeComponents(data.components),
    }).catch(() => {});
  },
};
