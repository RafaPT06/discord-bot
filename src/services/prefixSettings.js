const { pool } = require("../db/pool");

const DEFAULT_PREFIX = ".";

async function getGuildPrefix(guildId) {
  if (!guildId) return DEFAULT_PREFIX;
  const { rows } = await pool.query(
    "SELECT prefix FROM prefix_settings WHERE guild_id=$1",
    [guildId]
  ).catch(() => ({ rows: [] }));
  return rows?.[0]?.prefix || DEFAULT_PREFIX;
}

async function setGuildPrefix(guildId, prefix) {
  const clean = String(prefix || DEFAULT_PREFIX).trim();
  if (!guildId) throw new Error("Guild ID is required");
  if (!clean || clean.length > 5) throw new Error("Prefix must be 1-5 characters.");
  await pool.query(
    `INSERT INTO prefix_settings (guild_id, prefix, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (guild_id)
     DO UPDATE SET prefix=$2, updated_at=NOW()`,
    [guildId, clean]
  );
  return clean;
}

module.exports = { DEFAULT_PREFIX, getGuildPrefix, setGuildPrefix };
