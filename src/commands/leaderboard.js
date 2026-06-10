const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getLeaderboard } = require("../services/leveling");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Show the server XP leaderboard."),
  async execute(interaction) {
    if (!interaction.guildId) return interaction.reply({ content: "Server only.", ephemeral: true });

    const rows = await getLeaderboard(interaction.guildId, 10);
    const lines = rows.length
      ? rows.map((row, index) => {
          const medal = index === 0 ? "1." : index === 1 ? "2." : index === 2 ? "3." : `${index + 1}.`;
          return `${medal} <@${row.user_id}> — **Level ${row.level}** · ${Number(row.total_xp || 0).toLocaleString()} XP`;
        })
      : ["No XP yet. Start chatting to appear here."];

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("Level Leaderboard")
      .setDescription(lines.join("\n"))
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  },
};
