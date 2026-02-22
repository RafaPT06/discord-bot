const { SlashCommandBuilder } = require("discord.js");
const { getBackupSetting, sendBackupToChannel } = require("../services/backupScheduler");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("simulate_backup")
    .setDescription("Owner: trigger a backup post (uses configured backup channel)."),
  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true }).catch(() => {});
    if (interaction.user.id !== process.env.OWNER_ID) {
      return interaction.editReply({ content: "Error: Owner only." }).catch(() => {});
    }
    const s = await getBackupSetting(interaction.guildId).catch(() => null);
    if (!s?.channel_id) {
      return interaction.editReply({ content: "No backup channel set. Use `/set_backup_channel` first." }).catch(() => {});
    }
    await sendBackupToChannel(client, s.channel_id, "simulate").catch(() => {});
    return interaction.editReply({ content: "Backup sent to backup channel." }).catch(() => {});
  },
};
