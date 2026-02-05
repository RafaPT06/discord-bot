const { pool } = require("./pool");

async function initDb() {
  // Core content table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS content_items (
      id BIGSERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('roast','compliment')),
      text TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Settings for Roblox alerts
  await pool.query(`
    CREATE TABLE IF NOT EXISTS roblox_alert_settings (
      guild_id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Settings for Error alerts
  await pool.query(`
    CREATE TABLE IF NOT EXISTS error_alert_settings (
      guild_id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      mention_owner BOOLEAN NOT NULL DEFAULT TRUE,
      min_interval_seconds INT NOT NULL DEFAULT 120,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Ensure uniqueness for ON CONFLICT targets (handles existing DBs too)
  await pool.query(`
    DELETE FROM content_items a
    USING content_items b
    WHERE a.id > b.id
      AND a.guild_id = b.guild_id
      AND a.type = b.type
      AND a.text = b.text;
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS content_items_guild_type_text_uidx
    ON content_items (guild_id, type, text);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS content_items_guild_type_id_idx
    ON content_items (guild_id, type, id);
  `);
}

module.exports = { initDb };
