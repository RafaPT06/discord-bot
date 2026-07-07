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
    CREATE TABLE IF NOT EXISTS backup_channel_settings (
      guild_id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      last_sent_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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

  await pool.query(
    `CREATE INDEX IF NOT EXISTS command_usage_guild_idx ON command_usage (guild_id, created_at DESC);`,
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS command_usage_cmd_idx ON command_usage (command_name, created_at DESC);`,
  );

  await pool.query(`
    ALTER TABLE command_usage
    ADD COLUMN IF NOT EXISTS duration_ms INT;
  `);

  await pool.query(
    `CREATE INDEX IF NOT EXISTS command_usage_guild_duration_idx ON command_usage (guild_id, duration_ms DESC);`,
  );

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
    value TEXT NOT NULL
  );
`);

  // Backward-compatible schema upgrade (older DBs may not have this column)
  await pool.query(`
    ALTER TABLE app_state
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  `);


  await pool.query(`
    CREATE TABLE IF NOT EXISTS starboard_settings (
      guild_id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      threshold INT NOT NULL DEFAULT 3,
      emoji TEXT NOT NULL DEFAULT '⭐',
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS starboard_posts (
      guild_id TEXT NOT NULL,
      source_message_id TEXT NOT NULL,
      starboard_message_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (guild_id, source_message_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS suggestions (
      id BIGSERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      text TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      staff_id TEXT,
      staff_note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS suggestions_guild_status_idx ON suggestions (guild_id, status, id DESC);`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS quotes (
      id BIGSERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      user_id TEXT,
      author_id TEXT,
      text TEXT NOT NULL,
      source_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS quotes_guild_id_idx ON quotes (guild_id, id DESC);`);


  await pool.query(`
    CREATE TABLE IF NOT EXISTS level_settings (
      guild_id TEXT PRIMARY KEY,
      channel_id TEXT,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      xp_min INT NOT NULL DEFAULT 15,
      xp_max INT NOT NULL DEFAULT 25,
      cooldown_seconds INT NOT NULL DEFAULT 60,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_levels (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      total_xp BIGINT NOT NULL DEFAULT 0,
      level INT NOT NULL DEFAULT 0,
      last_xp_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (guild_id, user_id)
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS user_levels_guild_level_idx ON user_levels (guild_id, level DESC, total_xp DESC);`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS level_role_rewards (
      guild_id TEXT NOT NULL,
      level INT NOT NULL,
      role_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (guild_id, level)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS edit_image_access_users (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      added_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (guild_id, user_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS moderation_bypass_users (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      added_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (guild_id, user_id)
    );
  `);


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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS achievement_unlocks (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      achievement_id TEXT NOT NULL,
      unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (guild_id, user_id, achievement_id)
    );
  `);

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

module.exports = { initDb };
