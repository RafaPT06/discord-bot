const { pool } = require("./pool");

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS roasts (
      id BIGSERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS compliments (
      id BIGSERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS roasts_guild_text_uidx ON roasts (guild_id, text);`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS compliments_guild_text_uidx ON compliments (guild_id, text);`);

  await pool.query(`CREATE INDEX IF NOT EXISTS roasts_guild_id_idx ON roasts (guild_id, id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS compliments_guild_id_idx ON compliments (guild_id, id);`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS todos (
      id BIGSERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      text TEXT NOT NULL,
      done BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      done_at TIMESTAMPTZ
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS todos_guild_done_idx ON todos (guild_id, done, id);`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS roblox_alert_settings (
      guild_id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS deploy_channel_settings (
      guild_id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
      CREATE TABLE IF NOT EXISTS command_usage (
          id BIGSERIAL PRIMARY KEY,
              guild_id TEXT,
                  user_id TEXT,
                      command_name TEXT NOT NULL,
                          ok BOOLEAN NOT NULL DEFAULT TRUE,
                              error TEXT,
                                  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                                    );
                                    `);

                                    await pool.query(`CREATE INDEX IF NOT EXISTS command_usage_guild_idx ON command_usage (guild_id, created_at DESC);`);
                                    await pool.query(`CREATE INDEX IF NOT EXISTS command_usage_cmd_idx ON command_usage (command_name, created_at DESC);`);

await pool.query(`
  CREATE TABLE IF NOT EXISTS command_permissions (
    guild_id TEXT NOT NULL,
    command_name TEXT NOT NULL,
    allowed_role_ids TEXT[] NOT NULL DEFAULT '{}',
    allow_manage_guild BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (guild_id, command_name)
  );
`);



await pool.query(`
  CREATE TABLE IF NOT EXISTS app_state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`);

}

module.exports = { initDb };
