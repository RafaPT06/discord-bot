const { SlashCommandBuilder, ChannelType, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { setBackupChannel } = require("../services/backupScheduler");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("set_backup_channel")
    .setDescription("Set the channel where weekly DB backups will be posted.")
    .addChannelOption((o) =>
      o
        .setName("channel")
        .setDescription("Target channel")
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const ch = interaction.options.getChannel("channel", true);
    await setBackupChannel(interaction.guildId, ch.id);

    const embed = new EmbedBuilder()
      .setTitle("Backup Channel")
      .setDescription(`Weekly backups will be posted in ${ch}.`);

    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
