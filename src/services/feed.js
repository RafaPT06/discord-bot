const { pool } = require("../db/pool");

// In-memory cache: guildId -> { setting, ts }
const CACHE_MS = 60_000;
const cache = new Map();

// Simple per-guild rate limit: guildId -> lastSentMs
const SEND_COOLDOWN_MS = 1500;
const lastSent = new Map();

async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS feed_channel_settings (
      guild_id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      level INT NOT NULL DEFAULT 2,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function setFeedChannel(guildId, channelId) {
  await ensureTables();
  await pool.query(
    `INSERT INTO feed_channel_settings (guild_id, channel_id, enabled, level, created_at, updated_at)
     VALUES ($1,$2,TRUE,2,NOW(),NOW())
     ON CONFLICT (guild_id)
     DO UPDATE SET channel_id=EXCLUDED.channel_id, enabled=TRUE, updated_at=NOW()`,
    [guildId, channelId],
  );
  cache.delete(guildId);
}

async function getFeedSetting(guildId) {
  await ensureTables();

  const hit = cache.get(guildId);
  const now = Date.now();
  if (hit && (now - hit.ts) < CACHE_MS) return hit.setting;

  const res = await pool.query(
    "SELECT guild_id, channel_id, enabled, level FROM feed_channel_settings WHERE guild_id=$1",
    [guildId],
  );
  const setting = res.rows?.[0] || null;
  cache.set(guildId, { setting, ts: now });
  return setting;
}

async function resetFeedChannel(guildId) {
  await ensureTables();
  await pool.query("DELETE FROM feed_channel_settings WHERE guild_id=$1", [guildId]);
  cache.delete(guildId);
}

async function setFeedLevel(guildId, level) {
  await ensureTables();
  await pool.query(
    `UPDATE feed_channel_settings SET level=$2, updated_at=NOW() WHERE guild_id=$1`,
    [guildId, level],
  );
  cache.delete(guildId);
}

function canSendNow(guildId) {
  const now = Date.now();
  const prev = lastSent.get(guildId) || 0;
  if (now - prev < SEND_COOLDOWN_MS) return false;
  lastSent.set(guildId, now);
  return true;
}

/**
 * Send an embed to the configured feed channel if enabled and level allows.
 * Levels:
 * 1 = Critical
 * 2 = System
 * 3 = Activity
 */
async function sendFeed(client, guildId, level, embed) {
  if (!guildId) return;
  if (!client) return;
  if (!embed) return;

  const setting = await getFeedSetting(guildId);
  if (!setting || !setting.enabled) return;

  const configured = Number(setting.level || 2);
  if (Number(level) > configured) return;

  if (!canSendNow(guildId)) return;

  const ch = await client.channels.fetch(setting.channel_id).catch(() => null);
  if (!ch || !ch.isTextBased()) return;

  await ch.send({ embeds: [embed] }).catch(() => null);
}

module.exports = {
  ensureFeedTables: ensureTables,
  setFeedChannel,
  getFeedSetting,
  resetFeedChannel,
  setFeedLevel,
  sendFeed,
};
