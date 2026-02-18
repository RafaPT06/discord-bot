const { SlashCommandBuilder } = require("discord.js");
const { randomRow } = require("../utils/dbHelpers");

const FALLBACK = [
  "you're genuinely amazing.",
  "you make things better just by being here.",
  "your vibe is elite.",
  "you’re a walking W.",
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("compliment")
    .setDescription("Send a random compliment.")
    .addUserOption(o => o.setName("user").setDescription("Who to compliment").setRequired(true)),
  async execute(interaction) {
    const user = interaction.options.getUser("user", true);
        const row = interaction.guildId
      ? await randomRow("compliments", interaction.guildId).catch(() => null)
      : null;
    const text = row?.text || FALLBACK[Math.floor(Math.random() * FALLBACK.length)];
    return interaction.reply({ content: ` <@${user.id}>, ${text}`, allowedMentions: { users: [user.id] } });
  },
};
