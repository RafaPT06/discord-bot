const { SlashCommandBuilder } = require("discord.js");

const CAT_LINES = [
  "🐱 *meow* (menacingly)",
  "🐈💨 zoomies activated!",
  "😼 chaos. pure chaos.",
  "🐾 your keyboard is mine now.",
  "🐱✨ purrfection detected.",
  "🧶 the yarn must be destroyed.",
];

module.exports = {
  data: new SlashCommandBuilder().setName("cat").setDescription("Random chaotic cat 🐱"),
  async execute(interaction) {
    const line = CAT_LINES[Math.floor(Math.random() * CAT_LINES.length)];
    return interaction.reply({ content: line, ephemeral: false });
  },
};
