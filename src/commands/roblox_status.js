const { SlashCommandBuilder } = require("discord.js");
const { getRobloxBlock } = require("../services/robloxEmbed");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("roblox_status")
    .setDescription("Roblox online/in-game status."),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false }).catch(() => {});
    const username = process.env.ROBLOX_USERNAME || "qxR4F4";
    const data = await getRobloxBlock(username);
    return interaction.editReply({ content: data.text, components: data.components }).catch(() => {});
  },
};
