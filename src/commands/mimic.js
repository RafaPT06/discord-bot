const { SlashCommandBuilder, InteractionContextType } = require("discord.js");
const { mimicCase } = require("../utils/text");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mimic")
    .setDescription("SpOnGeBoB cAsE")
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    )
    .addStringOption(o => o.setName("text").setDescription("Text to mimic").setRequired(true)),
  async execute(interaction) {
    const t = interaction.options.getString("text", true);
    return interaction.reply({ content: mimicCase(t), ephemeral: false });
  },
};
