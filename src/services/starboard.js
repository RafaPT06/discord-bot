const { EmbedBuilder } = require('discord.js');
const { pool } = require('../db/pool');

async function getSettings(guildId) {
  const { rows } = await pool.query('SELECT * FROM starboard_settings WHERE guild_id=$1', [guildId]);
  return rows[0] || null;
}

async function setSettings(guildId, channelId, threshold = 3, emoji = '⭐') {
  await pool.query(`
    INSERT INTO starboard_settings (guild_id, channel_id, threshold, emoji, enabled, updated_at)
    VALUES ($1,$2,$3,$4,TRUE,NOW())
    ON CONFLICT (guild_id) DO UPDATE SET channel_id=$2, threshold=$3, emoji=$4, enabled=TRUE, updated_at=NOW()
  `, [guildId, channelId, threshold, emoji]);
}

async function disable(guildId) {
  await pool.query(`UPDATE starboard_settings SET enabled=FALSE, updated_at=NOW() WHERE guild_id=$1`, [guildId]);
}

async function handleStarboardReaction(client, reaction, user) {
  if (user?.bot) return;
  if (reaction.partial) await reaction.fetch().catch(() => null);
  const message = reaction.message;
  if (!message?.guildId || !message.guild) return;

  const settings = await getSettings(message.guildId);
  if (!settings?.enabled) return;
  if (String(reaction.emoji.name) !== String(settings.emoji)) return;
  if (message.channelId === settings.channel_id) return;

  const count = reaction.count || 0;
  if (count < Number(settings.threshold || 3)) return;

  const existing = await pool.query('SELECT starboard_message_id FROM starboard_posts WHERE guild_id=$1 AND source_message_id=$2', [message.guildId, message.id]);
  if (existing.rows.length) return;

  const channel = await client.channels.fetch(settings.channel_id).catch(() => null);
  if (!channel?.isTextBased?.()) return;

  const embed = new EmbedBuilder()
    .setTitle(`${settings.emoji} Starboard`)
    .setDescription(message.content?.slice(0, 3900) || '[No text content]')
    .addFields(
      { name: 'Author', value: `<@${message.author?.id}>`, inline: true },
      { name: 'Source', value: `[Jump to message](${message.url})`, inline: true },
      { name: 'Stars', value: String(count), inline: true },
    )
    .setTimestamp(message.createdAt || new Date());

  const image = message.attachments?.find(a => a.contentType?.startsWith('image/'));
  if (image?.url) embed.setImage(image.url);

  const sent = await channel.send({ embeds: [embed] });
  await pool.query(`INSERT INTO starboard_posts (guild_id, source_message_id, starboard_message_id, channel_id) VALUES ($1,$2,$3,$4)`, [message.guildId, message.id, sent.id, message.channelId]);
}

module.exports = { getSettings, setSettings, disable, handleStarboardReaction };
