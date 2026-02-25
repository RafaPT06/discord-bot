const { SlashCommandBuilder, InteractionContextType } = require("discord.js");
const CRAZY_LINES = [
  "That's crazy…",
  "                o    o",
  "               /\\   /\\",
  "               / \\  / \\",
  "--------------------------------",
  "      o    o  Crazy?",
  "     /\\   /\\",
  "     / \\  / \\",
  "--------------------------------",
  "      o    o  I was crazy once.",
  "     /\\   /\\",
  "     / \\  / \\",
  "--------------------------------",
  "      o    o  They locked me in a room.",
  "     /\\   /\\",
  "     / \\  / \\",
  "--------------------------------",
  "      o    o  A rubber room.",
  "     /\\   /\\",
  "     / \\  / \\",
  "--------------------------------",
  "      o    o  A rubber room with rats.",
  "     /\\   /\\",
  "     / \\  / \\",
  "--------------------------------",
  "      o    o  And rats make me crazy.",
  "     /\\   /\\",
  "     / \\  / \\",
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("crazy")
    .setDescription("The classic 'crazy' copypasta (rats version)")
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    ),
  async execute(interaction) {
    // public command
    return interaction.reply({
      content: "```\n" + CRAZY_LINES.join("\n") + "\n```",
      ephemeral: false,
    });
  },
};
