const { SlashCommandBuilder } = require("discord.js");
const { randomRow } = require("../utils/dbHelpers");

const FALLBACK = [
  "you have the confidence of someone who never read the instructions.",
  "you’re not lazy… you’re on energy-saving mode.",
  "if there was an award for almost, you’d get second place.",
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("roast")
    .setDescription("Roast someone 🔥")
    .addUserOption(o => o.setName("user").setDescription("Who to roast").setRequired(true)),
  async execute(interaction) {
    if (!interaction.guildId) return interaction.reply({ content: "❌ Server only.", ephemeral: true });

    const user = interaction.options.getUser("user", true);
    const row = await randomRow("roasts", interaction.guildId).catch(() => null);
    const text = row?.text || FALLBACK[Math.floor(Math.random() * FALLBACK.length)];
    return interaction.reply({ content: `🔥 <@${user.id}>, ${text}`, allowedMentions: { users: [user.id] } });
  },
};
