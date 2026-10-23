const { pool } = require('../db/pool');

// Kept as a compatibility export. The moderation_bypass_users table is
// initialized centrally by initDb() before the bot API and event handlers start.
async function ensureModerationBypassTable() {
  return true;
}

async function listModerationBypassUsers(guildId) {
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
  const result = await pool.query(
    `DELETE FROM moderation_bypass_users WHERE guild_id = $1 AND user_id = $2`,
    [guildId, userId]
  );
  return result.rowCount > 0;
}

async function isUserModerationBypassed(guildId, userId) {
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
