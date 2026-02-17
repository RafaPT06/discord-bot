const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getBackupSetting } = require("../services/backupScheduler");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("show_backup_channel")
    .setDescription("Show the current backup channel (if any)."),

  async execute(interaction) {
    const s = await getBackupSetting(interaction.guildId);
    const embed = new EmbedBuilder().setTitle("Backup Channel");

    if (!s) {
      embed.setDescription("No backup channel is set.");
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const last = s.last_sent_at
      ? `<t:${Math.floor(new Date(s.last_sent_at).getTime() / 1000)}:F> (<t:${Math.floor(new Date(s.last_sent_at).getTime() / 1000)}:R>)`
      : "never";

    embed.setDescription([`Channel: <#${s.channel_id}>`, `Enabled: **${s.enabled}**`, `Last backup: **${last}**`].join("\n"));

    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
