const { pool } = require("../db/pool");

async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS panel_events (
      id BIGSERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      level INT NOT NULL DEFAULT 2,
      kind TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS panel_events_guild_created_idx
    ON panel_events (guild_id, created_at DESC)
  `);
}

async function addPanelEvent(guildId, { level = 2, kind = "system", message = "" } = {}) {
  if (!guildId) return;
  await ensureTables();
  const msg = String(message || "").slice(0, 1500);
  await pool.query(
    "INSERT INTO panel_events (guild_id, level, kind, message) VALUES ($1,$2,$3,$4)",
    [guildId, Number(level) || 2, String(kind || "system"), msg]
  );
}

async function listPanelEvents(guildId, limit = 10) {
  await ensureTables();
  const n = Math.max(1, Math.min(50, Number(limit) || 10));
  const { rows } = await pool.query(
    "SELECT id, level, kind, message, created_at FROM panel_events WHERE guild_id=$1 ORDER BY created_at DESC LIMIT $2",
    [guildId, n]
  );
  return rows || [];
}

async function clearPanelEvents(guildId) {
  await ensureTables();
  await pool.query("DELETE FROM panel_events WHERE guild_id=$1", [guildId]);
}

module.exports = { addPanelEvent, listPanelEvents, clearPanelEvents };
