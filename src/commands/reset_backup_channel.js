const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { resetBackupChannel } = require("../services/backupScheduler");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reset_backup_channel")
    .setDescription("Remove/disable weekly backups for this server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    await resetBackupChannel(interaction.guildId);
    const embed = new EmbedBuilder().setTitle("Backup Channel").setDescription("Backup channel cleared.");
    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
