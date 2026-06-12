const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require("discord.js");
const { getLeaderboard } = require("../services/leveling");
const { createLeaderboardCardBuffer } = require("../utils/levelCard");
const { getCardBackground } = require("../services/config");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Show the server XP leaderboard."),

  async execute(interaction) {
    if (!interaction.guildId) {
      return interaction.reply({ content: "Server only.", ephemeral: true });
    }

    await interaction.deferReply();

    const rows = await getLeaderboard(interaction.guildId, 10);

    if (!rows.length) {
      return interaction.editReply("No XP yet. Start chatting to appear here.");
    }

    try {
      const entries = await Promise.all(
        rows.map(async (row, index) => {
          const user = await interaction.client.users.fetch(row.user_id).catch(() => null);
          const member = await interaction.guild.members.fetch(row.user_id).catch(() => null);

          return {
            rank: index + 1,
            userId: row.user_id,
            username: user?.username || `User ${row.user_id}`,
            displayName: member?.displayName || user?.username || `User ${row.user_id}`,
            avatarUrl: user?.displayAvatarURL({ extension: "png", size: 128 }) || null,
            level: Number(row.level || 0),
            totalXp: Number(row.total_xp || 0),
          };
        })
      );

      const image = await createLeaderboardCardBuffer({
        guildName: interaction.guild.name,
        entries,
        accentColor: interaction.guild.members.me?.displayColor || 0x7c3aed,
        backgroundUrl: await getCardBackground(interaction.guildId, "leaderboard"),
      });

      const attachment = new AttachmentBuilder(image, { name: "leaderboard.png" });
      return interaction.editReply({ files: [attachment] });
    } catch (err) {
      console.error("Failed to build leaderboard card:", err);

      const lines = rows.map((row, index) => {
        return `${index + 1}. <@${row.user_id}> — **Level ${row.level}** · ${Number(row.total_xp || 0).toLocaleString()} XP`;
      });

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("Level Leaderboard")
        .setDescription(lines.join("\n"))
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }
  },
};
