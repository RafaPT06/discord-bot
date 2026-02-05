/**
 * DB layer (Postgres).
 *
 * This wraps all SQL in one place so later we can change schema without
 * touching command handlers.
 */

// Global defaults that will be copied into a guild the first time it needs content.
const DEFAULT_COMPLIMENTS = [
  "You’ve got really good vibes.",
  "You’re doing better than you think.",
  "You make things feel easier for people.",
];

const DEFAULT_ROASTS = [
  "I’d agree with you but then we’d both be wrong.",
  "I’m not saying I hate you, but I’d unplug your life support to charge my phone.",
  "You're like a cloud. When you disappear, it's a beautiful day.",
  "I treasure the time I spend with you, but I treasure my sanity more.",
  "You have the perfect face for radio.",
];

async function initDb(pool) {
  if (!pool) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS guild_settings (
      guild_id TEXT PRIMARY KEY,
      deploy_channel_id TEXT
    );
  `);
  // Migration: add Roblox alert channel column for older DBs
  await pool.query(`ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS roblox_alert_channel_id TEXT;`);


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

  // Global content templates (seed once, copied into each guild on-demand)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS global_content_items (
      id BIGSERIAL PRIMARY KEY,
      type TEXT NOT NULL CHECK (type IN ('compliment','roast')),
      text TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (type, text)
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
      last_used_at TIMESTAMPTZ,
      UNIQUE (guild_id, type, text)
    );
  `);

  // Ensure uniqueness exists even if tables were created earlier without constraints.
  // Required for ON CONFLICT (cols...) to work on older databases.
  await pool.query(`
    DELETE FROM content_items a
    USING content_items b
    WHERE a.id > b.id
      AND a.guild_id = b.guild_id
      AND a.type = b.type
      AND a.text = b.text;
  `);
  await pool.query(`
    DELETE FROM global_content_items a
    USING global_content_items b
    WHERE a.id > b.id
      AND a.type = b.type
      AND a.text = b.text;
  `);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS content_items_guild_type_text_uidx ON content_items (guild_id, type, text);`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS global_content_items_type_text_uidx ON global_content_items (type, text);`);

  // Helpful indexes
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_content_items_guild_type ON content_items (guild_id, type);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_content_items_last_used ON content_items (guild_id, type, last_used_at);`);

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

  // Seed global content once (idempotent)
  const seedRows = [
    ...DEFAULT_COMPLIMENTS.map((t) => ({ type: "compliment", text: t })),
    ...DEFAULT_ROASTS.map((t) => ({ type: "roast", text: t })),
  ];

  for (const row of seedRows) {
    await pool.query(
      `INSERT INTO global_content_items (type, text) VALUES ($1,$2) ON CONFLICT (type, text) DO NOTHING`,
      [row.type, row.text]
    );
  }
}

function makeDb(pool) {
  const enabled = Boolean(pool);

  async function ensureGuildSeed(guildId, type) {
    if (!pool) return;

    const existing = await pool.query(
      `SELECT 1 FROM content_items WHERE guild_id=$1 AND type=$2 LIMIT 1`,
      [guildId, type]
    );
    if (existing.rowCount && existing.rowCount > 0) return;

    // Copy global defaults into this guild
    await pool.query(
      `
      INSERT INTO content_items (guild_id, type, text)
      SELECT $1, type, text
      FROM global_content_items
      WHERE type = $2
      ON CONFLICT (guild_id, type, text) DO NOTHING
      `,
      [guildId, type]
    );
  }

  return {
    enabled,

    // ---- Deploy channel settings ----
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
      await pool.query(`UPDATE guild_settings SET deploy_channel_id = NULL WHERE guild_id = $1`, [guildId]);
    },

    // ---- Roblox presence alert channel ----
    async setRobloxAlertChannel(guildId, channelId) {
      if (!pool) return;
      await pool.query(
        `
        INSERT INTO guild_settings (guild_id, roblox_alert_channel_id)
        VALUES ($1, $2)
        ON CONFLICT (guild_id)
        DO UPDATE SET roblox_alert_channel_id = EXCLUDED.roblox_alert_channel_id;
        `,
        [guildId, channelId]
      );
    },
    async getRobloxAlertChannel(guildId) {
      if (!pool) return null;
      const res = await pool.query(
        `SELECT roblox_alert_channel_id FROM guild_settings WHERE guild_id = $1`,
        [guildId]
      );
      return res.rows[0]?.roblox_alert_channel_id ?? null;
    },
    async resetRobloxAlertChannel(guildId) {
      if (!pool) return;
      await pool.query(
        `UPDATE guild_settings SET roblox_alert_channel_id = NULL WHERE guild_id = $1`,
        [guildId]
      );
    },
    async listRobloxAlertGuilds() {
      if (!pool) return [];
      const res = await pool.query(
        `SELECT guild_id, roblox_alert_channel_id FROM guild_settings WHERE roblox_alert_channel_id IS NOT NULL`,
        []
      );
      return res.rows;
    },
    async getAllDeployChannels() {
      if (!pool) return [];
      const res = await pool.query(
        `SELECT deploy_channel_id FROM guild_settings WHERE deploy_channel_id IS NOT NULL`
      );
      return res.rows;
    },

    // ---- Global TODOs ----
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

    // ---- Content ----
    async addContent(guildId, type, text, userId) {
      if (!pool) return null;
      const res = await pool.query(
        `INSERT INTO content_items (guild_id, type, text, created_by) VALUES ($1,$2,$3,$4)
         ON CONFLICT (guild_id, type, text) DO NOTHING
         RETURNING id`,
        [guildId, type, text, userId]
      );
      return res.rows[0]?.id ?? null;
    },
    async removeContentById(guildId, type, id) {
      if (!pool) return false;
      const res = await pool.query(
        `DELETE FROM content_items WHERE guild_id=$1 AND type=$2 AND id=$3 RETURNING id`,
        [guildId, type, id]
      );
      return (res.rowCount ?? 0) > 0;
    },
    async listContent(guildId, type, limit = 10, offset = 0) {
      if (!pool) return [];
      await ensureGuildSeed(guildId, type);
      const res = await pool.query(
        `
        SELECT id, text FROM content_items
        WHERE guild_id=$1 AND type=$2
        ORDER BY id ASC
        LIMIT $3 OFFSET $4
        `,
        [guildId, type, limit, offset]
      );
      return res.rows;
    },
    async countContent(guildId, type) {
      if (!pool) return 0;
      await ensureGuildSeed(guildId, type);
      const res = await pool.query(
        `SELECT COUNT(*)::int AS count FROM content_items WHERE guild_id=$1 AND type=$2`,
        [guildId, type]
      );
      return res.rows[0]?.count ?? 0;
    },
    async getRandomContentNoRepeat(guildId, type) {
      if (!pool) return null;

      await ensureGuildSeed(guildId, type);

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

    // ---- Key/value ----
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
