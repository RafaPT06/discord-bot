const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { pool } = require('../db/pool');
const { request } = require('undici');

const INTERVAL_MS = 300_000;
let started = false;
let running = false;

async function json(url) {
  const response = await request(url, { headers: { accept: 'application/json' }, headersTimeout: 10000, bodyTimeout: 10000 });
  const body = await response.body.json();
  if (response.statusCode !== 200) throw new Error('Roblox API status ' + response.statusCode);
  return body;
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}

function normalizeAvatar(data) {
  return {
    assets: (data.assets || []).map(a => ({ id: String(a.id), type: a.assetType?.id || null })).sort((a,b) => a.id.localeCompare(b.id)),
    bodyColors: data.bodyColors || {},
    scales: data.scales || {},
    playerAvatarType: data.playerAvatarType || null,
    defaultShirtApplied: !!data.defaultShirtApplied,
    defaultPantsApplied: !!data.defaultPantsApplied,
    emotes: data.emotes || [],
  };
}

async function getAvatar(userId) {
  return normalizeAvatar(await json('https://avatar.roblox.com/v1/users/' + encodeURIComponent(userId) + '/avatar'));
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function getThumbnailBuffer(userId) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const data = await json('https://thumbnails.roblox.com/v1/users/avatar?userIds=' + encodeURIComponent(userId) + '&size=420x420&format=Png&isCircular=false');
    const entry = data?.data?.[0];
    if (entry?.state === 'Completed' && entry.imageUrl) {
      const response = await request(entry.imageUrl, { headersTimeout: 10000, bodyTimeout: 10000 });
      if (response.statusCode === 200 && String(response.headers['content-type'] || '').startsWith('image/')) {
        const bytes = Buffer.from(await response.body.arrayBuffer());
        if (bytes.length > 0 && bytes.length < 5_000_000) return bytes;
      } else {
        await response.body.dump();
      }
    }
    if (attempt < 2) await sleep(1500);
  }
  return null;
}

async function tick(client) {
  if (running) return;
  running = true;
  try {
    const { rows } = await pool.query('SELECT * FROM roblox_avatar_trackers WHERE enabled=TRUE');
    const cache = new Map();
    for (const row of rows) {
      try {
        const id = String(row.roblox_user_id);
        if (!cache.has(id)) cache.set(id, await getAvatar(id));
        const current = cache.get(id);
        const serialized = JSON.stringify(canonical(current));
        const previous = row.avatar_snapshot ? JSON.stringify(canonical(row.avatar_snapshot)) : null;
        if (!previous) {
          const image = await getThumbnailBuffer(id).catch(() => null);
          await pool.query('UPDATE roblox_avatar_trackers SET avatar_snapshot=$3::jsonb, avatar_image=$4, updated_at=NOW() WHERE guild_id=$1 AND roblox_user_id=$2 AND avatar_snapshot IS NULL', [row.guild_id,id,serialized,image]);
          continue;
        }
        if (previous === serialized) {
          if (!row.avatar_image) {
            const image = await getThumbnailBuffer(id).catch(() => null);
            if (image) await pool.query('UPDATE roblox_avatar_trackers SET avatar_image=$3 WHERE guild_id=$1 AND roblox_user_id=$2 AND avatar_image IS NULL', [row.guild_id,id,image]);
          }
          continue;
        }
        const channel = await client.channels.fetch(row.channel_id).catch(() => null);
        if (!channel?.isTextBased?.() || channel.guild?.id !== row.guild_id) continue;
        const image = await getThumbnailBuffer(id).catch(() => null);
        const embed = new EmbedBuilder().setTitle('Roblox avatar changed')
          .setDescription('**' + row.roblox_username + '** updated their avatar.\\n[View profile](https://www.roblox.com/users/' + id + '/profile)')
          .setColor(0x5865f2).setTimestamp();
        const files = [];
        if (row.avatar_image) {
          files.push(new AttachmentBuilder(row.avatar_image, { name: 'before.png' }));
          embed.addFields({ name: 'Before', value: 'Previous avatar attached below.' });
        }
        if (image) {
          files.push(new AttachmentBuilder(image, { name: 'after.png' }));
          embed.setImage('attachment://after.png');
          if (row.avatar_image) embed.addFields({ name: 'After', value: 'Updated avatar shown above.' });
        } else {
          embed.addFields({ name: 'Avatar image', value: 'Roblox is still processing the new thumbnail.' });
        }
        await channel.send({ embeds: [embed], files, allowedMentions: { parse: [] } });
        await pool.query('UPDATE roblox_avatar_trackers SET avatar_snapshot=$3::jsonb, avatar_image=$4, updated_at=NOW() WHERE guild_id=$1 AND roblox_user_id=$2', [row.guild_id,id,serialized,image]);
      } catch (error) { console.error('Avatar tracker:', row.guild_id, row.roblox_user_id, error.message); }
    }
  } finally { running = false; }
}

function startAvatarTracker(client) {
  if (started) return;
  started = true;
  tick(client).catch(console.error);
  setInterval(() => tick(client).catch(console.error), INTERVAL_MS).unref?.();
}

module.exports = { normalizeAvatar, getAvatar, tick, startAvatarTracker };
