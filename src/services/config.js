const { pool } = require("../db/pool");

async function ensureConfigTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS card_backgrounds (
      guild_id TEXT NOT NULL,
      card_type TEXT NOT NULL,
      background_url TEXT NOT NULL,
      updated_by TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (guild_id, card_type)
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS prefix_settings (
      guild_id TEXT PRIMARY KEY,
      prefix TEXT NOT NULL DEFAULT '.',
      updated_by TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function getPrefix(guildId) {
  await ensureConfigTables();
  const res = await pool.query(`SELECT prefix FROM prefix_settings WHERE guild_id=$1`, [guildId]);
  return res.rows[0]?.prefix || ".";
}

async function setPrefix(guildId, prefix, userId) {
  await ensureConfigTables();
  await pool.query(
    `INSERT INTO prefix_settings (guild_id, prefix, updated_by, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (guild_id) DO UPDATE SET prefix=EXCLUDED.prefix, updated_by=EXCLUDED.updated_by, updated_at=NOW()`,
    [guildId, prefix, userId || null]
  );
}

async function getCardBackground(guildId, cardType) {
  await ensureConfigTables();
  const res = await pool.query(
    `SELECT background_url FROM card_backgrounds WHERE guild_id=$1 AND card_type=$2`,
    [guildId, cardType]
  );
  return res.rows[0]?.background_url || null;
}

async function setCardBackground(guildId, cardType, backgroundUrl, userId) {
  await ensureConfigTables();
  await pool.query(
    `INSERT INTO card_backgrounds (guild_id, card_type, background_url, updated_by, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (guild_id, card_type) DO UPDATE SET background_url=EXCLUDED.background_url, updated_by=EXCLUDED.updated_by, updated_at=NOW()`,
    [guildId, cardType, backgroundUrl, userId || null]
  );
}

async function resetCardBackground(guildId, cardType) {
  await ensureConfigTables();
  await pool.query(`DELETE FROM card_backgrounds WHERE guild_id=$1 AND card_type=$2`, [guildId, cardType]);
}

async function getAllCardBackgrounds(guildId) {
  await ensureConfigTables();
  const res = await pool.query(`SELECT card_type, background_url FROM card_backgrounds WHERE guild_id=$1 ORDER BY card_type`, [guildId]);
  return res.rows;
}

module.exports = {
  ensureConfigTables,
  getPrefix,
  setPrefix,
  getCardBackground,
  setCardBackground,
  resetCardBackground,
  getAllCardBackgrounds,
};
