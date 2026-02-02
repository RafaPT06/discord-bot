const { toSpongeCase } = require("../utils/text");

module.exports = {
  name: "mimic",
  async execute(interaction) {
    const text = interaction.options.getString("text", true);
    return interaction.reply({ content: toSpongeCase(text), ephemeral: false });
  },
};
