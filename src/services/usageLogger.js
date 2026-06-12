const { pool } = require("../db/pool");
const { incrementCommands } = require("./userStats");

async function logCommandUsage({ guildId, userId, commandName, ok, error, durationMs }) {
  try {
    await incrementCommands(guildId, userId).catch(() => {});
    await pool.query(
      `INSERT INTO command_usage (guild_id, user_id, command_name, ok, error, duration_ms)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        guildId || null,
        userId || null,
        String(commandName),
        Boolean(ok),
        error ? String(error).slice(0, 400) : null,
        Number.isFinite(Number(durationMs)) ? Math.max(0, Math.round(Number(durationMs))) : null,
      ]
    );
  } catch {
    // never crash the bot because analytics failed
  }
}

module.exports = { logCommandUsage };
