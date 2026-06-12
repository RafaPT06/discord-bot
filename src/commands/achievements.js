const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { ACHIEVEMENTS, getUnlockedAchievements } = require("../services/achievements");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("achievements")
    .setDescription("Show a user's achievements.")
    .addUserOption((o) => o.setName("user").setDescription("User to check").setRequired(false)),

  async execute(interaction) {
    if (!interaction.guildId) return interaction.reply({ content: "Server only.", ephemeral: true });
    const user = interaction.options.getUser("user") || interaction.user;
    const unlocked = await getUnlockedAchievements(interaction.guildId, user.id);
    const lines = ACHIEVEMENTS.map((a) => `${unlocked.has(a.id) ? "✓" : "✗"} **${a.name}** — ${a.description}`);
    const embed = new EmbedBuilder()
      .setColor(0xfbbf24)
      .setTitle(`${user.username}'s Achievements`)
      .setDescription(lines.join("\n"))
      .setFooter({ text: `${unlocked.size}/${ACHIEVEMENTS.length} unlocked` })
      .setTimestamp();
    return interaction.reply({ embeds: [embed] });
  },
};
