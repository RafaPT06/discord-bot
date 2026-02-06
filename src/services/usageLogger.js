const { pool } = require("../db/pool");

async function logCommandUsage({ guildId, userId, commandName, ok, error }) {
  try {
    await pool.query(
      `INSERT INTO command_usage (guild_id, user_id, command_name, ok, error)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        guildId || null,
        userId || null,
        String(commandName),
        Boolean(ok),
        error ? String(error).slice(0, 400) : null,
      ]
    );
  } catch {
    // never crash the bot because analytics failed
  }
}

module.exports = { logCommandUsage };
