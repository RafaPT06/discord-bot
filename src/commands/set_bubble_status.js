const { SlashCommandBuilder } = require("discord.js");
const { setBubbleText } = require("../services/presenceManager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("set_bubble_status")
    .setDescription("Owner: set the bot's custom bubble status text.")
    .addStringOption((option) =>
      option
        .setName("text")
        .setDescription("The custom status text to display.")
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(128),
    ),

  async execute(interaction, client) {
    if (interaction.user?.id !== process.env.OWNER_ID) {
      return interaction.reply({
        content: "Error: This command is restricted to the bot owner.",
        ephemeral: true,
      });
    }

    const text = interaction.options.getString("text", true);
    await interaction.deferReply({ ephemeral: true });
    const bubbleText = await setBubbleText(client, text);

    return interaction.editReply({
      content: `Bubble status updated to:\n${bubbleText}`,
      allowedMentions: { parse: [] },
    });
  },
};
