const { pool } = require('../db/pool');

async function ensureEditImageAccessTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS edit_image_allowed_users (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      added_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (guild_id, user_id)
    );
  `);
}

async function addAllowedUser(guildId, userId, addedBy) {
  await ensureEditImageAccessTable();
  await pool.query(
    `INSERT INTO edit_image_allowed_users (guild_id, user_id, added_by)
     VALUES ($1, $2, $3)
     ON CONFLICT (guild_id, user_id)
     DO UPDATE SET added_by=EXCLUDED.added_by`,
    [guildId, userId, addedBy]
  );
}

async function removeAllowedUser(guildId, userId) {
  await ensureEditImageAccessTable();
  const { rowCount } = await pool.query(
    `DELETE FROM edit_image_allowed_users WHERE guild_id=$1 AND user_id=$2`,
    [guildId, userId]
  );
  return rowCount > 0;
}

async function listAllowedUsers(guildId) {
  await ensureEditImageAccessTable();
  const { rows } = await pool.query(
    `SELECT user_id, added_by, created_at
     FROM edit_image_allowed_users
     WHERE guild_id=$1
     ORDER BY created_at ASC`,
    [guildId]
  );
  return rows;
}

async function isUserAllowedForEditImage(guildId, userId) {
  if (!guildId || !userId) return false;
  if (userId === process.env.OWNER_ID) return true;
  await ensureEditImageAccessTable();
  const { rowCount } = await pool.query(
    `SELECT 1 FROM edit_image_allowed_users WHERE guild_id=$1 AND user_id=$2 LIMIT 1`,
    [guildId, userId]
  );
  return rowCount > 0;
}

module.exports = {
  ensureEditImageAccessTable,
  addAllowedUser,
  removeAllowedUser,
  listAllowedUsers,
  isUserAllowedForEditImage,
};
