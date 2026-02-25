const { SlashCommandBuilder, InteractionContextType } = require("discord.js");
const { pool } = require("../db/pool");
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
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    )
    .addUserOption(o => o.setName("user").setDescription("Who to compliment").setRequired(true)),
  async execute(interaction) {
    const user = interaction.options.getUser("user", true);
    const row = interaction.guildId
      ? await randomRow("compliments", interaction.guildId).catch(() => null)
      : null;

    // If there are no saved compliments yet, we still reply using a fallback…
    // but we also persist that fallback into the DB so it appears in /list_compliments.
    let text = row?.text;
    if (!text) {
      text = FALLBACK[Math.floor(Math.random() * FALLBACK.length)];
      if (interaction.guildId) {
        await pool
          .query(
            "INSERT INTO compliments (guild_id, text) VALUES ($1, $2) ON CONFLICT DO NOTHING",
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
