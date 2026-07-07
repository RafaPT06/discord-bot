const { pool } = require('../db/pool');

function normalizeChannelId(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const clean = String(value).trim();
  if (!clean) return null;
  if (!/^\d{15,25}$/.test(clean)) {
    const err = new Error('Invalid channel ID.');
    err.statusCode = 400;
    throw err;
  }
  return clean;
}

function boolOr(current, value) {
  return typeof value === 'boolean' ? value : Boolean(current);
}

async function ensureLogTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS log_settings (
      guild_id TEXT PRIMARY KEY,
      enabled BOOLEAN NOT NULL DEFAULT FALSE,
      channel_id TEXT,
      message_events BOOLEAN NOT NULL DEFAULT TRUE,
      member_events BOOLEAN NOT NULL DEFAULT TRUE,
      moderation_events BOOLEAN NOT NULL DEFAULT TRUE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function getLogSettings(guildId) {
  await ensureLogTables();
  const res = await pool.query('SELECT * FROM log_settings WHERE guild_id=$1', [guildId]);
  return res.rows[0] || {
    guild_id: guildId,
    enabled: false,
    channel_id: null,
    message_events: true,
    member_events: true,
    moderation_events: true,
    updated_at: null,
  };
}

async function updateLogSettings(guildId, settings = {}) {
  await ensureLogTables();
  const current = await getLogSettings(guildId);
  const channelId = settings.channelId !== undefined ? normalizeChannelId(settings.channelId) : current.channel_id;
  const enabled = typeof settings.enabled === 'boolean' ? settings.enabled : current.enabled === true;
  const messageEvents = boolOr(current.message_events, settings.messageEvents);
  const memberEvents = boolOr(current.member_events, settings.memberEvents);
  const moderationEvents = boolOr(current.moderation_events, settings.moderationEvents);

  const res = await pool.query(
    `INSERT INTO log_settings (guild_id, enabled, channel_id, message_events, member_events, moderation_events, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (guild_id) DO UPDATE SET
       enabled=EXCLUDED.enabled,
       channel_id=EXCLUDED.channel_id,
       message_events=EXCLUDED.message_events,
       member_events=EXCLUDED.member_events,
       moderation_events=EXCLUDED.moderation_events,
       updated_at=NOW()
     RETURNING *`,
    [guildId, enabled, channelId, messageEvents, memberEvents, moderationEvents]
  );
  return res.rows[0] || getLogSettings(guildId);
}

async function ensureModerationTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS moderation_settings (
      guild_id TEXT PRIMARY KEY,
      enabled BOOLEAN NOT NULL DEFAULT FALSE,
      warnings_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      automod_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      mod_log_channel_id TEXT,
      blocked_words TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function getModerationSettings(guildId) {
  await ensureModerationTables();
  const res = await pool.query('SELECT * FROM moderation_settings WHERE guild_id=$1', [guildId]);
  return res.rows[0] || {
    guild_id: guildId,
    enabled: false,
    warnings_enabled: true,
    automod_enabled: false,
    mod_log_channel_id: null,
    blocked_words: '',
    updated_at: null,
  };
}

async function updateModerationSettings(guildId, settings = {}) {
  await ensureModerationTables();
  const current = await getModerationSettings(guildId);
  const modLogChannelId = settings.modLogChannelId !== undefined ? normalizeChannelId(settings.modLogChannelId) : current.mod_log_channel_id;
  const enabled = typeof settings.enabled === 'boolean' ? settings.enabled : current.enabled === true;
  const warningsEnabled = boolOr(current.warnings_enabled, settings.warningsEnabled);
  const automodEnabled = boolOr(current.automod_enabled, settings.automodEnabled);
  const blockedWords = settings.blockedWords !== undefined
    ? String(settings.blockedWords || '').trim().slice(0, 2000)
    : current.blocked_words;

  const res = await pool.query(
    `INSERT INTO moderation_settings (guild_id, enabled, warnings_enabled, automod_enabled, mod_log_channel_id, blocked_words, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (guild_id) DO UPDATE SET
       enabled=EXCLUDED.enabled,
       warnings_enabled=EXCLUDED.warnings_enabled,
       automod_enabled=EXCLUDED.automod_enabled,
       mod_log_channel_id=EXCLUDED.mod_log_channel_id,
       blocked_words=EXCLUDED.blocked_words,
       updated_at=NOW()
     RETURNING *`,
    [guildId, enabled, warningsEnabled, automodEnabled, modLogChannelId, blockedWords]
  );
  return res.rows[0] || getModerationSettings(guildId);
}

module.exports = {
  getLogSettings,
  updateLogSettings,
  getModerationSettings,
  updateModerationSettings,
};
