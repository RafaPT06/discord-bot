const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getUserLevel, progressBar } = require("../services/leveling");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("level")
    .setDescription("Show your level and XP progress.")
    .addUserOption((o) =>
      o.setName("user")
        .setDescription("User to check")
        .setRequired(false)
    ),
  async execute(interaction) {
    if (!interaction.guildId) return interaction.reply({ content: "Server only.", ephemeral: true });

    const user = interaction.options.getUser("user") || interaction.user;
    const data = await getUserLevel(interaction.guildId, user.id);
    const progress = data.progress;

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`${user.username}'s Level`)
      .setThumbnail(user.displayAvatarURL({ size: 128 }))
      .addFields(
        { name: "Level", value: `${data.level || 0}`, inline: true },
        { name: "Total XP", value: `${Number(data.total_xp || 0).toLocaleString()} XP`, inline: true },
        { name: "Next level", value: `${progress.current}/${progress.needed} XP (${progress.percent}%)\n${progressBar(progress.current, progress.needed)}`, inline: false }
      )
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  },
};
