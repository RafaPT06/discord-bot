const { SlashCommandBuilder } = require("discord.js");
const { mimicCase } = require("../utils/text");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mimic")
    .setDescription("SpOnGeBoB cAsE")
    .addStringOption(o => o.setName("text").setDescription("Text to mimic").setRequired(true)),
  async execute(interaction) {
    const t = interaction.options.getString("text", true);
    return interaction.reply({ content: mimicCase(t), ephemeral: false });
  },
};
