const { pool } = require("../db/pool");

async function randomRow(table, guildId) {
  const { rows } = await pool.query(
    `SELECT id, text FROM ${table} WHERE guild_id=$1 ORDER BY RANDOM() LIMIT 1`,
    [guildId]
  );
  return rows[0] || null;
}

async function insertUnique(table, guildId, text) {
  const { rows } = await pool.query(
    `INSERT INTO ${table} (guild_id, text) VALUES ($1, $2)
     ON CONFLICT (guild_id, text) DO NOTHING
     RETURNING id`,
    [guildId, text]
  );
  return rows[0]?.id || null;
}

async function removeById(table, guildId, id) {
  const { rowCount } = await pool.query(
    `DELETE FROM ${table} WHERE guild_id=$1 AND id=$2`,
    [guildId, id]
  );
  return rowCount;
}

async function measureDbLatency() {
  const start = Date.now();
  await pool.query("SELECT 1");
  return Date.now() - start;
}

module.exports = { randomRow, insertUnique, removeById, measureDbLatency };
