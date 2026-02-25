const { SlashCommandBuilder, InteractionContextType } = require("discord.js");
const { pool } = require("../db/pool");
const { randomRow } = require("../utils/dbHelpers");

const FALLBACK = [
  "you have the confidence of someone who never read the instructions.",
  "you’re not lazy… you’re on energy-saving mode.",
  "if there was an award for almost, you’d get second place.",
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("roast")
    .setDescription("Roast someone ")
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    )
    .addUserOption(o => o.setName("user").setDescription("Who to roast").setRequired(true)),
  async execute(interaction) {
    const user = interaction.options.getUser("user", true);
    const row = interaction.guildId
      ? await randomRow("roasts", interaction.guildId).catch(() => null)
      : null;

    // Same idea as compliments: if we had to use fallback, persist it so lists aren't empty.
    let text = row?.text;
    if (!text) {
      text = FALLBACK[Math.floor(Math.random() * FALLBACK.length)];
      if (interaction.guildId) {
        await pool
          .query(
            "INSERT INTO roasts (guild_id, text) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            [interaction.guildId, text]
          )
          .catch(() => {});
      }
    }

    return interaction.reply({
      content: ` <@${user.id}>, ${text}`,
      allowedMentions: { users: [user.id] },
    });
  },
};
