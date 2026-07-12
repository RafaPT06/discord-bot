const { pool } = require('../db/pool');

async function ensureWarningsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS moderation_warnings (
      id BIGSERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS moderation_warnings_guild_user_idx
      ON moderation_warnings (guild_id, user_id, created_at DESC);
  `);
}

function normalizeReason(value) {
  const reason = String(value || '').trim().replace(/\s+/g, ' ');
  if (!reason) {
    const error = new Error('A warning reason is required.');
    error.statusCode = 400;
    throw error;
  }
  return reason.slice(0, 500);
}

async function addWarning(guildId, userId, moderatorId, reason) {
  await ensureWarningsTable();
  const { rows } = await pool.query(
    `INSERT INTO moderation_warnings (guild_id, user_id, moderator_id, reason)
     VALUES ($1, $2, $3, $4)
     RETURNING id, guild_id, user_id, moderator_id, reason, created_at`,
    [String(guildId), String(userId), String(moderatorId), normalizeReason(reason)]
  );
  return rows[0];
}

async function listWarnings(guildId, userId, limit = 10) {
  await ensureWarningsTable();
  const safeLimit = Math.max(1, Math.min(25, Number(limit) || 10));
  const { rows } = await pool.query(
    `SELECT id, guild_id, user_id, moderator_id, reason, created_at
     FROM moderation_warnings
     WHERE guild_id = $1 AND user_id = $2
     ORDER BY created_at DESC
     LIMIT $3`,
    [String(guildId), String(userId), safeLimit]
  );
  return rows;
}

async function countWarnings(guildId, userId) {
  await ensureWarningsTable();
  const { rows } = await pool.query(
    `SELECT COUNT(*)::INTEGER AS count
     FROM moderation_warnings
     WHERE guild_id = $1 AND user_id = $2`,
    [String(guildId), String(userId)]
  );
  return Number(rows[0]?.count || 0);
}

async function clearWarnings(guildId, userId) {
  await ensureWarningsTable();
  const result = await pool.query(
    `DELETE FROM moderation_warnings WHERE guild_id = $1 AND user_id = $2`,
    [String(guildId), String(userId)]
  );
  return Number(result.rowCount || 0);
}

async function removeWarning(guildId, warningId) {
  await ensureWarningsTable();
  const id = Number(warningId);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  const { rows } = await pool.query(
    `DELETE FROM moderation_warnings
     WHERE guild_id = $1 AND id = $2
     RETURNING id, guild_id, user_id, moderator_id, reason, created_at`,
    [String(guildId), id]
  );
  return rows[0] || null;
}

module.exports = {
  ensureWarningsTable,
  addWarning,
  listWarnings,
  countWarnings,
  clearWarnings,
  removeWarning,
};
