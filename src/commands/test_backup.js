const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { getBackupSetting, sendBackupToChannel } = require("../services/backupScheduler");

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

    const ok = await sendBackupToChannel(client, s.channel_id, "manual-test").catch(() => false);
    const embed = new EmbedBuilder()
      .setTitle("Backup")
      .setDescription(ok ? `Backup sent to <#${s.channel_id}>.` : "Failed to send backup (missing perms or channel not accessible)." );

    return interaction.editReply({ embeds: [embed] });
  },
};
