const { pool } = require("../db/pool");

async function ensureUserStatsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_stats (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      messages BIGINT NOT NULL DEFAULT 0,
      xp_earned_today BIGINT NOT NULL DEFAULT 0,
      xp_earned_week BIGINT NOT NULL DEFAULT 0,
      commands_used BIGINT NOT NULL DEFAULT 0,
      levels_gained INT NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (guild_id, user_id)
    );
  `);
}

async function incrementMessages(guildId, userId) {
  await ensureUserStatsTable();
  await pool.query(
    `INSERT INTO user_stats (guild_id, user_id, messages, updated_at)
     VALUES ($1, $2, 1, NOW())
     ON CONFLICT (guild_id, user_id) DO UPDATE SET messages=user_stats.messages+1, updated_at=NOW()`,
    [guildId, userId]
  );
}

async function addXpStats(guildId, userId, xp, levelsGained = 0) {
  await ensureUserStatsTable();
  await pool.query(
    `INSERT INTO user_stats (guild_id, user_id, xp_earned_today, xp_earned_week, levels_gained, updated_at)
     VALUES ($1, $2, $3, $3, $4, NOW())
     ON CONFLICT (guild_id, user_id) DO UPDATE SET
       xp_earned_today=user_stats.xp_earned_today+$3,
       xp_earned_week=user_stats.xp_earned_week+$3,
       levels_gained=user_stats.levels_gained+$4,
       updated_at=NOW()`,
    [guildId, userId, Math.max(0, Number(xp) || 0), Math.max(0, Number(levelsGained) || 0)]
  );
}

async function incrementCommands(guildId, userId) {
  await ensureUserStatsTable();
  if (!guildId || !userId) return;
  await pool.query(
    `INSERT INTO user_stats (guild_id, user_id, commands_used, updated_at)
     VALUES ($1, $2, 1, NOW())
     ON CONFLICT (guild_id, user_id) DO UPDATE SET commands_used=user_stats.commands_used+1, updated_at=NOW()`,
    [guildId, userId]
  );
}

async function getUserStats(guildId, userId) {
  await ensureUserStatsTable();
  const res = await pool.query(`SELECT * FROM user_stats WHERE guild_id=$1 AND user_id=$2`, [guildId, userId]);
  return res.rows[0] || { messages: 0, xp_earned_today: 0, xp_earned_week: 0, commands_used: 0, levels_gained: 0 };
}

module.exports = { ensureUserStatsTable, incrementMessages, addXpStats, incrementCommands, getUserStats };
