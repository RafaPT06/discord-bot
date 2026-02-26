const { pool } = require("../db/pool");
const { sendFeed } = require("./feed");
const { EmbedBuilder } = require("discord.js");

// Balanced defaults
const DEFAULTS = {
  enabled: false,
  spike_multiplier: 2.5,      // spike if current rate > baseline * multiplier
  window_seconds: 60,          // count messages in last 60s
  baseline_minutes: 10,        // baseline EMA over ~10 min
  idle_minutes: 20,            // idle alert if no messages for 20m
  min_alert_interval_seconds: 180, // don't spam feed
};

const mem = new Map(); // guildId -> runtime state

async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_settings (
      guild_id TEXT PRIMARY KEY,
      enabled BOOLEAN NOT NULL DEFAULT FALSE,
      spike_multiplier DOUBLE PRECISION NOT NULL DEFAULT ${DEFAULTS.spike_multiplier},
      window_seconds INT NOT NULL DEFAULT ${DEFAULTS.window_seconds},
      baseline_minutes INT NOT NULL DEFAULT ${DEFAULTS.baseline_minutes},
      idle_minutes INT NOT NULL DEFAULT ${DEFAULTS.idle_minutes},
      min_alert_interval_seconds INT NOT NULL DEFAULT ${DEFAULTS.min_alert_interval_seconds},
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_stats (
      guild_id TEXT PRIMARY KEY,
      baseline_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
      last_message_at TIMESTAMPTZ,
      last_alert_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getSettings(guildId) {
  await ensureTables();
  const { rows } = await pool.query("SELECT * FROM ai_settings WHERE guild_id=$1", [guildId]);
  if (rows.length) return rows[0];

  await pool.query(
    `INSERT INTO ai_settings (guild_id, enabled) VALUES ($1, $2) ON CONFLICT (guild_id) DO NOTHING`,
    [guildId, false]
  );
  const { rows: rows2 } = await pool.query("SELECT * FROM ai_settings WHERE guild_id=$1", [guildId]);
  return rows2[0];
}

async function setEnabled(guildId, enabled) {
  await ensureTables();
  await pool.query(
    `INSERT INTO ai_settings (guild_id, enabled, updated_at)
     VALUES ($1,$2,NOW())
     ON CONFLICT (guild_id) DO UPDATE SET enabled=EXCLUDED.enabled, updated_at=NOW()`,
    [guildId, !!enabled]
  );
  // reset runtime state
  mem.delete(guildId);
}

async function getStats(guildId) {
  await ensureTables();
  const { rows } = await pool.query("SELECT * FROM ai_stats WHERE guild_id=$1", [guildId]);
  if (rows.length) return rows[0];
  await pool.query(
    `INSERT INTO ai_stats (guild_id, updated_at) VALUES ($1, NOW()) ON CONFLICT (guild_id) DO NOTHING`,
    [guildId]
  );
  const { rows: rows2 } = await pool.query("SELECT * FROM ai_stats WHERE guild_id=$1", [guildId]);
  return rows2[0];
}

function nowMs() { return Date.now(); }

function state(guildId) {
  if (!mem.has(guildId)) {
    mem.set(guildId, {
      times: [], // message timestamps ms, for sliding window
      lastCheckMs: 0,
    });
  }
  return mem.get(guildId);
}

async function maybeAlert(client, guildId, kind, title, lines, level=2) {
  const settings = await getSettings(guildId);
  const stats = await getStats(guildId);

  const minInterval = Number(settings.min_alert_interval_seconds || DEFAULTS.min_alert_interval_seconds);
  const lastAlert = stats.last_alert_at ? new Date(stats.last_alert_at).getTime() : 0;
  if (lastAlert && (nowMs() - lastAlert) < minInterval * 1000) return;

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(lines.join("\n"));

  await sendFeed(client, guildId, level, embed).catch(() => {});

  await pool.query(
    `UPDATE ai_stats SET last_alert_at=NOW(), updated_at=NOW() WHERE guild_id=$1`,
    [guildId]
  );
}

async function onMessage(client, message) {
  try {
    if (!message?.guildId) return;
    if (message.author?.bot) return;

    const guildId = message.guildId;
    const settings = await getSettings(guildId);
    if (!settings.enabled) return;

    const st = state(guildId);
    const windowSec = Number(settings.window_seconds || DEFAULTS.window_seconds);
    const cutoff = nowMs() - windowSec * 1000;

    st.times.push(nowMs());
    while (st.times.length && st.times[0] < cutoff) st.times.shift();

    // update last_message_at
    await ensureTables();
    await pool.query(
      `INSERT INTO ai_stats (guild_id, last_message_at, updated_at)
       VALUES ($1, NOW(), NOW())
       ON CONFLICT (guild_id) DO UPDATE SET last_message_at=NOW(), updated_at=NOW()`,
      [guildId]
    );

    // check at most once per 10s to keep DB light
    if (nowMs() - st.lastCheckMs < 10_000) return;
    st.lastCheckMs = nowMs();

    const currentRate = st.times.length / windowSec; // msgs/sec
    const stats = await getStats(guildId);

    // baseline EMA
    const baseline = Number(stats.baseline_rate || 0);
    const baselineMinutes = Number(settings.baseline_minutes || DEFAULTS.baseline_minutes);
    const alpha = 2 / (baselineMinutes * 60 + 1); // approximate smoothing
    const nextBaseline = baseline === 0 ? currentRate : (alpha * currentRate + (1 - alpha) * baseline);

    await pool.query(
      `UPDATE ai_stats SET baseline_rate=$2, updated_at=NOW() WHERE guild_id=$1`,
      [guildId, nextBaseline]
    );

    const mult = Number(settings.spike_multiplier || DEFAULTS.spike_multiplier);
    if (baseline > 0 && currentRate > baseline * mult) {
      await maybeAlert(
        client,
        guildId,
        "spike",
        "AI Monitor: Activity Spike",
        [
          `Window: ${windowSec}s`,
          `Current: ${(currentRate*60).toFixed(1)} msgs/min`,
          `Baseline: ${(baseline*60).toFixed(1)} msgs/min`,
          `Multiplier: ${mult}x`,
        ],
        2
      );
    }
  } catch (e) {
    // swallow (never break bot)
  }
}

async function periodicIdleCheck(client) {
  // loop over enabled guilds and check idle; called every minute from src/index
  try {
    await ensureTables();
    const { rows } = await pool.query(
      `SELECT s.guild_id, s.idle_minutes, st.last_message_at
       FROM ai_settings s
       LEFT JOIN ai_stats st ON st.guild_id = s.guild_id
       WHERE s.enabled = TRUE`
    );

    const now = Date.now();
    for (const r of rows) {
      const guildId = r.guild_id;
      const idleMin = Number(r.idle_minutes || DEFAULTS.idle_minutes);
      const last = r.last_message_at ? new Date(r.last_message_at).getTime() : 0;
      if (!last) continue;
      if (now - last < idleMin * 60_000) continue;

      await maybeAlert(
        client,
        guildId,
        "idle",
        "AI Monitor: Server Idle",
        [
          `No messages detected for ${idleMin} minutes.`,
          `Last activity: <t:${Math.floor(last/1000)}:R>`,
        ],
        2
      );
    }
  } catch {}
}

module.exports = { getSettings, setEnabled, getStats, onMessage, periodicIdleCheck };
