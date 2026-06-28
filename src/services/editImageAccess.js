const { pool } = require('../db/pool');

async function ensureEditImageAccessTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS edit_image_access_users (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      added_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (guild_id, user_id)
    );
  `);
}

async function listEditImageAccessUsers(guildId) {
  await ensureEditImageAccessTable();
  const { rows } = await pool.query(
    `SELECT guild_id, user_id, added_by, created_at
     FROM edit_image_access_users
     WHERE guild_id = $1
     ORDER BY created_at DESC`,
    [guildId]
  );
  return rows;
}

async function addEditImageAccessUser(guildId, userId, addedBy = null) {
  await ensureEditImageAccessTable();
  const { rows } = await pool.query(
    `INSERT INTO edit_image_access_users (guild_id, user_id, added_by)
     VALUES ($1, $2, $3)
     ON CONFLICT (guild_id, user_id)
     DO UPDATE SET added_by = EXCLUDED.added_by
     RETURNING guild_id, user_id, added_by, created_at`,
    [guildId, userId, addedBy]
  );
  return rows[0];
}

async function removeEditImageAccessUser(guildId, userId) {
  await ensureEditImageAccessTable();
  const result = await pool.query(
    `DELETE FROM edit_image_access_users WHERE guild_id = $1 AND user_id = $2`,
    [guildId, userId]
  );
  return result.rowCount > 0;
}

async function isUserAllowedForEditImage(guildId, userId) {
  await ensureEditImageAccessTable();
  const { rows } = await pool.query(
    `SELECT 1 FROM edit_image_access_users WHERE guild_id = $1 AND user_id = $2 LIMIT 1`,
    [guildId, userId]
  );
  return rows.length > 0;
}

module.exports = {
  ensureEditImageAccessTable,
  listEditImageAccessUsers,
  addEditImageAccessUser,
  removeEditImageAccessUser,
  isUserAllowedForEditImage,
};
