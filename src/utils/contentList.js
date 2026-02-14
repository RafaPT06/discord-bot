const { pool } = require("../db/pool");

/**
 * Used by list commands + pagination buttons.
 * Returns { total, rows }.
 */
async function fetchContentPage(opts) {
  const guildId = opts?.guildId;
  const type = opts?.type;
  const limit = opts?.limit ?? 10;
  const offset = opts?.offset ?? 0;

  const lim = Math.max(1, Math.min(25, Number(limit) || 10));
  const off = Math.max(0, Number(offset) || 0);

  const totalRes = await pool.query(
    "SELECT COUNT(*)::int AS count FROM content_items WHERE guild_id=$1 AND type=$2",
    [guildId, type]
  );
  const total = totalRes.rows?.[0]?.count ?? 0;

  const res = await pool.query(
    "SELECT id, text, created_at FROM content_items WHERE guild_id=$1 AND type=$2 ORDER BY id ASC LIMIT $3 OFFSET $4",
    [guildId, type, lim, off]
  );

  return { total, rows: res.rows || [] };
}

module.exports = { fetchContentPage };
