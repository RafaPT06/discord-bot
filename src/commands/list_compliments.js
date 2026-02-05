const { SlashCommandBuilder } = require("discord.js");
const { handleListButton } = require("../handlers/listButtons");

module.exports = {
  data: new SlashCommandBuilder().setName("list_compliments").setDescription("List saved compliments (Admin)."),
  async execute(interaction) {
    return handleListButton(interaction, "compliment", 0);
  },
};
