const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { getBackupSetting, runBackupNow } = require("../services/backupScheduler");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("test_backup")
    .setDescription("Send a backup right now to the configured backup channel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true }).catch(() => {});
    const s = await getBackupSetting(interaction.guildId);
    if (!s) {
      const embed = new EmbedBuilder().setTitle("Backup").setDescription("No backup channel is set. Use /set_backup_channel first.");
      return interaction.editReply({ embeds: [embed] });
    }

    const status = await runBackupNow(client, interaction.guildId, "manual-test").catch(() => null);
    const embed = new EmbedBuilder()
      .setTitle("Backup")
      .setDescription(status ? `Backup sent to <#${s.channel_id}>.` : "Failed to send backup (missing perms or channel not accessible)." );

    return interaction.editReply({ embeds: [embed] });
  },
};
