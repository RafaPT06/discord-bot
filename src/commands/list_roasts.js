const { SlashCommandBuilder } = require("discord.js");
const { handleListButton } = require("../handlers/listButtons");

module.exports = {
  data: new SlashCommandBuilder().setName("list_roasts").setDescription("List saved roasts (Admin)."),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false }).catch(() => {});
    return handleListButton(interaction, "roast", 0);
  },
};
