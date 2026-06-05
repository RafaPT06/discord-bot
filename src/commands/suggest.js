const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { pool } = require('../db/pool');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Submit or manage suggestions.')
    .addSubcommand(s => s.setName('add').setDescription('Submit a suggestion.').addStringOption(o => o.setName('text').setDescription('Your suggestion').setRequired(true).setMaxLength(1000)))
    .addSubcommand(s => s.setName('list').setDescription('List recent pending suggestions.'))
    .addSubcommand(s => s.setName('approve').setDescription('Approve a suggestion.').addIntegerOption(o => o.setName('id').setDescription('Suggestion ID').setRequired(true)).addStringOption(o => o.setName('note').setDescription('Optional staff note')))
    .addSubcommand(s => s.setName('reject').setDescription('Reject a suggestion.').addIntegerOption(o => o.setName('id').setDescription('Suggestion ID').setRequired(true)).addStringOption(o => o.setName('note').setDescription('Optional staff note'))),
  async execute(interaction) {
    if (!interaction.guildId) return interaction.reply({ content: 'Server only.', ephemeral: true });
    const sub = interaction.options.getSubcommand();
    if (sub === 'add') {
      const text = interaction.options.getString('text', true);
      const { rows } = await pool.query('INSERT INTO suggestions (guild_id,user_id,text) VALUES ($1,$2,$3) RETURNING id', [interaction.guildId, interaction.user.id, text]);
      const embed = new EmbedBuilder().setTitle(`Suggestion #${rows[0].id}`).setDescription(text).addFields({ name: 'Status', value: 'pending', inline: true }, { name: 'User', value: `<@${interaction.user.id}>`, inline: true }).setTimestamp();
      const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
      await msg.react('👍').catch(() => {}); await msg.react('👎').catch(() => {});
      return;
    }
    if (sub === 'list') {
      if (!interaction.memberPermissions?.has('ManageGuild')) return interaction.reply({ content: 'Manage Server required.', ephemeral: true });
      const { rows } = await pool.query('SELECT id,user_id,text,created_at FROM suggestions WHERE guild_id=$1 AND status=$2 ORDER BY id DESC LIMIT 10', [interaction.guildId, 'pending']);
      const text = rows.length ? rows.map(r => `#${r.id} by <@${r.user_id}> — ${r.text.slice(0,120)}`).join('\n') : 'No pending suggestions.';
      return interaction.reply({ content: text, ephemeral: false });
    }
    if (!interaction.memberPermissions?.has('ManageGuild')) return interaction.reply({ content: 'Manage Server required.', ephemeral: true });
    const id = interaction.options.getInteger('id', true);
    const note = interaction.options.getString('note') || null;
    const status = sub === 'approve' ? 'approved' : 'rejected';
    const { rowCount } = await pool.query('UPDATE suggestions SET status=$1, staff_id=$2, staff_note=$3, updated_at=NOW() WHERE guild_id=$4 AND id=$5', [status, interaction.user.id, note, interaction.guildId, id]);
    return interaction.reply({ content: rowCount ? `Suggestion #${id} ${status}.` : `Suggestion #${id} not found.`, ephemeral: false });
  },
};
