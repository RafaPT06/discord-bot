const { pool } = require('../db/pool');

async function ensureModerationBypassTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS moderation_bypass_users (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      added_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (guild_id, user_id)
    );
  `);
}

async function listModerationBypassUsers(guildId) {
  await ensureModerationBypassTable();
  const { rows } = await pool.query(
    `SELECT guild_id, user_id, added_by, created_at
     FROM moderation_bypass_users
     WHERE guild_id = $1
     ORDER BY created_at DESC`,
    [guildId]
  );
  return rows;
}

async function addModerationBypassUser(guildId, userId, addedBy = null) {
  await ensureModerationBypassTable();
  const { rows } = await pool.query(
    `INSERT INTO moderation_bypass_users (guild_id, user_id, added_by)
     VALUES ($1, $2, $3)
     ON CONFLICT (guild_id, user_id)
     DO UPDATE SET added_by = EXCLUDED.added_by
     RETURNING guild_id, user_id, added_by, created_at`,
    [guildId, userId, addedBy]
  );
  return rows[0];
}

async function removeModerationBypassUser(guildId, userId) {
  await ensureModerationBypassTable();
  const result = await pool.query(
    `DELETE FROM moderation_bypass_users WHERE guild_id = $1 AND user_id = $2`,
    [guildId, userId]
  );
  return result.rowCount > 0;
}

async function isUserModerationBypassed(guildId, userId) {
  await ensureModerationBypassTable();
  const { rows } = await pool.query(
    `SELECT 1 FROM moderation_bypass_users WHERE guild_id = $1 AND user_id = $2 LIMIT 1`,
    [guildId, userId]
  );
  return rows.length > 0;
}

module.exports = {
  ensureModerationBypassTable,
  listModerationBypassUsers,
  addModerationBypassUser,
  removeModerationBypassUser,
  isUserModerationBypassed,
};
