const { EmbedBuilder } = require('discord.js');
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
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  }
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

async function getThumbnail(userId) {
  const data = await json('https://thumbnails.roblox.com/v1/users/avatar?userIds=' + encodeURIComponent(userId) + '&size=420x420&format=Png&isCircular=false');
  return data?.data?.[0]?.imageUrl || null;
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
          await pool.query('UPDATE roblox_avatar_trackers SET avatar_snapshot=$3::jsonb, updated_at=NOW() WHERE guild_id=$1 AND roblox_user_id=$2 AND avatar_snapshot IS NULL', [row.guild_id,id,serialized]);
          continue;
        }
        if (previous === serialized) continue;
        const channel = await client.channels.fetch(row.channel_id).catch(() => null);
        if (!channel?.isTextBased?.() || channel.guild?.id !== row.guild_id) continue;
        const embed = new EmbedBuilder().setTitle('Roblox avatar changed')
          .setDescription('**' + row.roblox_username + '** updated their avatar.\n[View profile](https://www.roblox.com/users/' + id + '/profile)')
          .setColor(0x5865f2).setTimestamp();
        const thumbnail = await getThumbnail(id).catch(() => null);
        if (thumbnail) embed.setImage(thumbnail);
        await channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
        await pool.query('UPDATE roblox_avatar_trackers SET avatar_snapshot=$3::jsonb, updated_at=NOW() WHERE guild_id=$1 AND roblox_user_id=$2', [row.guild_id,id,serialized]);
      } catch (error) {
        console.error('Avatar tracker:', row.guild_id, row.roblox_user_id, error.message);
      }
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
