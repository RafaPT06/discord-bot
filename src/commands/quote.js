const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { pool } = require('../db/pool');

function parseMessageLink(link) {
  const m = String(link || '').match(/discord(?:app)?\.com\/channels\/(\d+)\/(\d+)\/(\d+)/);
  return m ? { guildId: m[1], channelId: m[2], messageId: m[3] } : null;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quote')
    .setDescription('Save and view server quotes.')
    .addSubcommand(s => s.setName('save').setDescription('Save a quote.').addStringOption(o => o.setName('text').setDescription('Quote text, or leave empty with message_link.').setMaxLength(1500)).addStringOption(o => o.setName('message_link').setDescription('Discord message link to quote.')))
    .addSubcommand(s => s.setName('random').setDescription('Show a random quote.'))
    .addSubcommand(s => s.setName('list').setDescription('List recent quotes.'))
    .addSubcommand(s => s.setName('remove').setDescription('Remove a quote.').addIntegerOption(o => o.setName('id').setDescription('Quote ID').setRequired(true))),
  async execute(interaction, client) {
    if (!interaction.guildId) return interaction.reply({ content: 'Server only.', ephemeral: true });
    const sub = interaction.options.getSubcommand();
    if (sub === 'save') {
      let text = interaction.options.getString('text');
      const link = interaction.options.getString('message_link');
      let authorId = null;
      if (!text && link) {
        const parsed = parseMessageLink(link);
        if (!parsed || parsed.guildId !== interaction.guildId) return interaction.reply({ content: 'Invalid message link for this server.', ephemeral: true });
        const channel = await client.channels.fetch(parsed.channelId).catch(() => null);
        const msg = await channel?.messages?.fetch(parsed.messageId).catch(() => null);
        if (!msg) return interaction.reply({ content: 'Could not fetch that message.', ephemeral: true });
        text = msg.content || '[No text content]';
        authorId = msg.author?.id || null;
      }
      if (!text) return interaction.reply({ content: 'Provide text or a message link.', ephemeral: true });
      const { rows } = await pool.query('INSERT INTO quotes (guild_id,user_id,author_id,text,source_url) VALUES ($1,$2,$3,$4,$5) RETURNING id', [interaction.guildId, interaction.user.id, authorId, text, link || null]);
      return interaction.reply({ content: `Saved quote #${rows[0].id}.`, ephemeral: false });
    }
    if (sub === 'random') {
      const { rows } = await pool.query('SELECT * FROM quotes WHERE guild_id=$1 ORDER BY RANDOM() LIMIT 1', [interaction.guildId]);
      if (!rows.length) return interaction.reply({ content: 'No quotes saved yet.', ephemeral: false });
      const q = rows[0];
      const embed = new EmbedBuilder().setTitle(`Quote #${q.id}`).setDescription(q.text).setTimestamp(q.created_at);
      if (q.author_id) embed.addFields({ name: 'Author', value: `<@${q.author_id}>`, inline: true });
      if (q.source_url) embed.addFields({ name: 'Source', value: `[Jump](${q.source_url})`, inline: true });
      return interaction.reply({ embeds: [embed], ephemeral: false });
    }
    if (sub === 'list') {
      const { rows } = await pool.query('SELECT id,text FROM quotes WHERE guild_id=$1 ORDER BY id DESC LIMIT 10', [interaction.guildId]);
      return interaction.reply({ content: rows.length ? rows.map(q => `#${q.id} — ${q.text.slice(0,120)}`).join('\n') : 'No quotes saved yet.', ephemeral: false });
    }
    if (!interaction.memberPermissions?.has('ManageGuild')) return interaction.reply({ content: 'Manage Server required.', ephemeral: true });
    const id = interaction.options.getInteger('id', true);
    const { rowCount } = await pool.query('DELETE FROM quotes WHERE guild_id=$1 AND id=$2', [interaction.guildId, id]);
    return interaction.reply({ content: rowCount ? `Removed quote #${id}.` : `Quote #${id} not found.`, ephemeral: false });
  },
};
