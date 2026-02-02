/**
 * DB layer (Postgres).
 *
 * This wraps all SQL in one place so later we can change schema without
 * touching command handlers.
 */

async function initDb(pool) {
  if (!pool) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS guild_settings (
      guild_id TEXT PRIMARY KEY,
      deploy_channel_id TEXT
    );
  `);

  // Global TODOs (shared across all servers)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_todos (
      id BIGSERIAL PRIMARY KEY,
      text TEXT NOT NULL,
      is_done BOOLEAN NOT NULL DEFAULT FALSE,
      created_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Per-server content storage (roasts/compliments)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS content_items (
      id BIGSERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('compliment','roast')),
      text TEXT NOT NULL,
      created_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_used_at TIMESTAMPTZ
    );
  `);

  // Backward compatibility: legacy table (no longer used)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS todo_items (
      id BIGSERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      text TEXT NOT NULL,
      is_done BOOLEAN NOT NULL DEFAULT FALSE,
      created_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Global bot key/value state (deploy dedupe, etc.)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS kv_store (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}

function makeDb(pool) {
  const enabled = Boolean(pool);

  return {
    enabled,
    async setDeployChannel(guildId, channelId) {
      if (!pool) return;
      await pool.query(
        `
        INSERT INTO guild_settings (guild_id, deploy_channel_id)
        VALUES ($1, $2)
        ON CONFLICT (guild_id)
        DO UPDATE SET deploy_channel_id = EXCLUDED.deploy_channel_id;
        `,
        [guildId, channelId]
      );
    },
    async getDeployChannel(guildId) {
      if (!pool) return null;
      const res = await pool.query(
        `SELECT deploy_channel_id FROM guild_settings WHERE guild_id = $1`,
        [guildId]
      );
      return res.rows[0]?.deploy_channel_id ?? null;
    },
    async resetDeployChannel(guildId) {
      if (!pool) return;
      await pool.query(
        `UPDATE guild_settings SET deploy_channel_id = NULL WHERE guild_id = $1`,
        [guildId]
      );
    },
    async getAllDeployChannels() {
      if (!pool) return [];
      const res = await pool.query(
        `SELECT deploy_channel_id FROM guild_settings WHERE deploy_channel_id IS NOT NULL`
      );
      return res.rows;
    },

    // Global TODOs
    async addTodo(text, userId) {
      if (!pool) return null;
      const res = await pool.query(
        `INSERT INTO app_todos (text, created_by) VALUES ($1,$2) RETURNING id`,
        [text, userId]
      );
      return res.rows[0]?.id ?? null;
    },
    async listTodos(includeDone = false, limit = 25) {
      if (!pool) return [];
      const res = await pool.query(
        `
        SELECT id, text, is_done FROM app_todos
        WHERE ($1 OR is_done = FALSE)
        ORDER BY is_done ASC, id DESC
        LIMIT $2
        `,
        [includeDone, limit]
      );
      return res.rows;
    },
    async doneTodo(id) {
      if (!pool) return false;
      const res = await pool.query(`UPDATE app_todos SET is_done=TRUE WHERE id=$1`, [id]);
      return (res.rowCount ?? 0) > 0;
    },

    // Content
    async addContent(guildId, type, text, userId) {
      if (!pool) return null;
      const res = await pool.query(
        `INSERT INTO content_items (guild_id, type, text, created_by) VALUES ($1,$2,$3,$4) RETURNING id`,
        [guildId, type, text, userId]
      );
      return res.rows[0]?.id ?? null;
    },
    async listContent(guildId, type, limit = 10, offset = 0) {
      if (!pool) return [];
      const res = await pool.query(
        `
        SELECT id, text FROM content_items
        WHERE guild_id=$1 AND type=$2
        ORDER BY id DESC
        LIMIT $3 OFFSET $4
        `,
        [guildId, type, limit, offset]
      );
      return res.rows;
    },
    async countContent(guildId, type) {
      if (!pool) return 0;
      const res = await pool.query(
        `SELECT COUNT(*)::int AS count FROM content_items WHERE guild_id=$1 AND type=$2`,
        [guildId, type]
      );
      return res.rows[0]?.count ?? 0;
    },
    async getRandomContentNoRepeat(guildId, type) {
      if (!pool) return null;

      const unused = await pool.query(
        `
        SELECT id, text FROM content_items
        WHERE guild_id=$1 AND type=$2 AND last_used_at IS NULL
        ORDER BY RANDOM()
        LIMIT 1
        `,
        [guildId, type]
      );

      let chosen = unused.rows[0];

      if (!chosen) {
        await pool.query(
          `UPDATE content_items SET last_used_at = NULL WHERE guild_id=$1 AND type=$2`,
          [guildId, type]
        );

        const again = await pool.query(
          `
          SELECT id, text FROM content_items
          WHERE guild_id=$1 AND type=$2 AND last_used_at IS NULL
          ORDER BY RANDOM()
          LIMIT 1
          `,
          [guildId, type]
        );
        chosen = again.rows[0];
      }

      if (!chosen) return null;

      await pool.query(`UPDATE content_items SET last_used_at = NOW() WHERE id=$1`, [chosen.id]);
      return chosen.text ?? null;
    },

    // Key/value
    async kvGet(key) {
      if (!pool) return null;
      const res = await pool.query(`SELECT value FROM kv_store WHERE key=$1`, [key]);
      return res.rows[0]?.value ?? null;
    },
    async kvSet(key, value) {
      if (!pool) return;
      await pool.query(
        `INSERT INTO kv_store (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [key, value]
      );
    },
  };
}

module.exports = { initDb, makeDb };
