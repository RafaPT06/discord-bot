const { SlashCommandBuilder } = require("discord.js");
const { clampInt } = require("../utils/text");

const CRAZY = "I am not crazy! I know he swapped those numbers!";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("crazy")
    .setDescription("The crazy copypasta (1–3)")
    .addIntegerOption(o => o.setName("times").setDescription("Repeat 1–3").setRequired(false)),
  async execute(interaction) {
    const times = clampInt(interaction.options.getInteger("times") ?? 1, 1, 3);
    const out = Array.from({ length: times }, () => CRAZY).join("\n\n");
    return interaction.reply({ content: out, ephemeral: false });
  }
};
