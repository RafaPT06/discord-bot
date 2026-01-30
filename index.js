require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const express = require("express");
const { Pool } = require("pg");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

process.on("unhandledRejection", (reason) => console.error("UnhandledRejection:", reason));
process.on("uncaughtException", (err) => console.error("UncaughtException:", err));

// =======================
// WEB SERVER (keep-alive)
// =======================
const app = express();
const PORT = Number(process.env.PORT || 8080);

app.get("/", (req, res) => res.status(200).send("Bot is alive! 🤖"));
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Web server running on port ${PORT}`);
});

// =======================
// CONFIG
// =======================
const OWNER_ID = process.env.OWNER_ID;
const CHANNEL_ID = process.env.CHANNEL_ID; // fallback if DB not set
const TZ = process.env.TZ || "Europe/Lisbon";
const ownerDisplay = "Rafa (atuaprima_)";
const ownerDisplayId = `Rafa (<@${OWNER_ID}>)`;

// =======================
// FILES

// =======================
// DATABASE (PostgreSQL) - per server deploy channel
// =======================
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes("localhost")
        ? false
        : { rejectUnauthorized: false },
    })
  : null;

async function initDb() {
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
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Add last_used_at for no-repeat mode (safe migration)
  await pool.query(
    `ALTER TABLE content_items ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;`
  );

  // Legacy per-server TODO table (kept for backward compatibility; no longer used)
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
}


async function dbSetDeployChannel(guildId, channelId) {
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
}

async function dbGetDeployChannel(guildId) {
  if (!pool) return null;
  const res = await pool.query(
    `SELECT deploy_channel_id FROM guild_settings WHERE guild_id = $1`,
    [guildId]
  );
  return res.rows[0]?.deploy_channel_id ?? null;
}

async function dbResetDeployChannel(guildId) {
  if (!pool) return;
  await pool.query(
    `UPDATE guild_settings SET deploy_channel_id = NULL WHERE guild_id = $1`,
    [guildId]
  );
}

async function dbGetAllDeployChannels() {
  if (!pool) return [];
  const res = await pool.query(
    `SELECT deploy_channel_id FROM guild_settings WHERE deploy_channel_id IS NOT NULL`
  );
  return res.rows;
}


async function dbAddTodo(text, userId) {
  if (!pool) return null;
  const res = await pool.query(
    `INSERT INTO app_todos (text, created_by)
     VALUES ($1,$2)
     RETURNING id`,
    [text, userId]
  );
  return res.rows[0]?.id ?? null;
}

async function dbListTodos(includeDone = false, limit = 20) {
  if (!pool) return [];
  const res = await pool.query(
    `SELECT id, text, is_done FROM app_todos
     WHERE ($1 OR is_done = FALSE)
     ORDER BY is_done ASC, id DESC
     LIMIT $2`,
    [includeDone, limit]
  );
  return res.rows;
}

async function dbDoneTodo(id) {
  if (!pool) return false;
  const res = await pool.query(
    `UPDATE app_todos SET is_done=TRUE
     WHERE id=$1`,
    [id]
  );
  return (res.rowCount ?? 0) > 0;
}


async function dbAddContent(guildId, type, text, userId) {
  if (!pool) return null;
  const res = await pool.query(
    `INSERT INTO content_items (guild_id, type, text, created_by)
     VALUES ($1,$2,$3,$4)
     RETURNING id`,
    [guildId, type, text, userId]
  );
  return res.rows[0]?.id ?? null;
}

async function dbListContent(guildId, type, limit = 25, offset = 0) {
  if (!pool) return [];
  const res = await pool.query(
    `SELECT id, text FROM content_items
     WHERE guild_id=$1 AND type=$2
     ORDER BY id DESC
     LIMIT $3 OFFSET $4`,
    [guildId, type, limit, offset]
  );
  return res.rows;
}

async function dbCountContent(guildId, type) {
  if (!pool) return 0;
  const res = await pool.query(
    `SELECT COUNT(*)::int AS count FROM content_items WHERE guild_id = $1 AND type = $2`,
    [guildId, type]
  );
  return res.rows[0]?.count ?? 0;
}


async function dbGetRandomContent(guildId, type) {
  if (!pool) return null;
  const res = await pool.query(
    `SELECT text FROM content_items
     WHERE guild_id=$1 AND type=$2
     ORDER BY RANDOM()
     LIMIT 1`,
    [guildId, type]
  );
  return res.rows[0]?.text ?? null;
}

async function kvGet(key) {
  if (!pool) return null;
  const res = await pool.query(`SELECT value FROM kv_store WHERE key=$1`, [key]);
  return res.rows[0]?.value ?? null;
}

async function kvSet(key, value) {
  if (!pool) return;
  await pool.query(
    `INSERT INTO kv_store (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [key, value]
  );
}

function isOwner(interaction) {
  return OWNER_ID && interaction.user.id === OWNER_ID;
}

async function dbGetRandomContentNoRepeat(guildId, type) {
  if (!pool) return null;

  // If nothing unused remains, reset last_used_at then pick again.
  const unused = await pool.query(
    `SELECT id, text FROM content_items
     WHERE guild_id=$1 AND type=$2 AND last_used_at IS NULL
     ORDER BY RANDOM()
     LIMIT 1`,
    [guildId, type]
  );

  let chosen = unused.rows[0];

  if (!chosen) {
    // reset cycle
    await pool.query(
      `UPDATE content_items SET last_used_at = NULL
       WHERE guild_id=$1 AND type=$2`,
      [guildId, type]
    );

    const again = await pool.query(
      `SELECT id, text FROM content_items
       WHERE guild_id=$1 AND type=$2 AND last_used_at IS NULL
       ORDER BY RANDOM()
       LIMIT 1`,
      [guildId, type]
    );
    chosen = again.rows[0];
  }

  if (!chosen) return null;

  await pool.query(
    `UPDATE content_items SET last_used_at = NOW()
     WHERE id=$1`,
    [chosen.id]
  );

  return chosen.text ?? null;
}

function canManageTodos(interaction) {
  if (!interaction.inGuild()) return false;
  return (
    isOwner(interaction) ||
    interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)
  );
}

function canManageContent(interaction) {
  if (!interaction.inGuild()) return false;
  return (
    isOwner(interaction) ||
    interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)
  );
}

// =======================
// DEPLOY INFO (GitHub commit)
// =======================
function getRailwayEnvName() {
  return (
    process.env.RAILWAY_ENVIRONMENT_NAME ||
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.RAILWAY_ENV_NAME ||
    "unknown"
  );
}

async function getCommitInfo(sha) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO; // e.g. "username/repo"
  if (!token || !repo) return null;

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/commits/${sha}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "railway-discord-bot",
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      message: data.commit.message.split("\n")[0],
      author: data.commit.author.name,
      url: data.html_url,
    };
  } catch {
    return null;
  }
}

async function notifyOnDeploy() {
  const sha = process.env.RAILWAY_GIT_COMMIT_SHA;
  const ts = Math.floor(Date.now() / 1000);

  const envName = getRailwayEnvName();

  // Deduplicate deploy messages (Railway restarts can spam)
  if (pool && sha) {
    try {
      const kvKey = `last_deploy_sha:${envName}`;
      const last = await kvGet(kvKey);
      if (last === sha) return;
      await kvSet(kvKey, sha);
    } catch (e) {
      console.error("kv deploy dedupe failed:", e);
    }
  }
  const shortSha = sha ? sha.slice(0, 7) : null;
  const commitInfo = sha ? await getCommitInfo(sha) : null;

  const message =
    `🚀 **New deploy detected!**\n` +
    `• **Env:** \`${envName}\`\n` +
    (shortSha ? `• **Commit:** \`${shortSha}\`\n` : "") +
    (commitInfo
      ? `• **Change:** ${commitInfo.message}\n` +
        `• **Author:** ${commitInfo.author}\n` +
        `• **GitHub:** ${commitInfo.url}\n`
      : "") +
    `• **Node:** \`${process.version}\`\n` +
    `• **Time:** <t:${ts}:F> (<t:${ts}:R>)`;

  // Prefer DB (per server)
  if (pool) {
    try {
      const rows = await dbGetAllDeployChannels();
      for (const row of rows) {
        const ch = await client.channels.fetch(row.deploy_channel_id).catch(() => null);
        if (ch?.isTextBased()) await ch.send(message);
      }
    } catch (e) {
      console.error("Deploy notify (DB) failed:", e);
    }
    return;
  }

  // Fallback to env channel
  if (CHANNEL_ID) {
    const ch = await client.channels.fetch(CHANNEL_ID).catch(() => null);
    if (ch?.isTextBased()) await ch.send(message);
  }
}

// =======================
// HELPERS
// =======================

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function toSpongeCase(text) {
  return text
    .split("")
    .map((char, i) => (i % 2 === 0 ? char.toLowerCase() : char.toUpperCase()))
    .join("");
}

// =======================
// COOLDOWNS + CRAZY PACK
// =======================
const complimentCooldown = new Map();
const COMPLIMENT_COOLDOWN_MS = 10_000;

const crazyCooldown = new Map();
const CRAZY_COOLDOWN_MS = 15_000;
const CRAZY_MAX_TIMES = 3;
const CRAZY_MAX_TOTAL_LINES = 25;

function getCrazyPack() {
  return [
    "That's crazy...",
    "Crazy?",
    "I was crazy once.",
    "They locked me in a room.",
    "A rubber room.",
    "A rubber room with rats.",
    "And rats make me crazy.",
  ];
}

const roasts = [
  "I’d agree with you but then we’d both be wrong.",
  "I’m not saying I hate you, but I’d unplug your life support to charge my phone.",
  "You're like a cloud. When you disappear, it's a beautiful day.",
  "I treasure the time I spend with you, but I treasure my sanity more.",
  "You have the perfect face for radio.",
];

// =======================
// LIST PAGINATION HELPERS (roasts/compliments)
// =======================
const CONTENT_PAGE_SIZE = 10;

function buildContentListPayload({ kind, page, totalPages, items, userId }) {
  const title = kind === "roast" ? "🔥 Saved Roasts" : "✨ Saved Compliments";
  const lines = items.map((i) => `• **#${i.id}** — ${i.text}`);

  const embed = new EmbedBuilder()
    .setTitle(`${title} (page ${page}/${Math.max(totalPages, 1)})`)
    .setDescription(lines.join("\n"));

  const prevBtn = new ButtonBuilder()
    .setCustomId(`contentlist_${kind}_${page - 1}_${userId}`)
    .setLabel("Prev")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(page <= 1);

  const nextBtn = new ButtonBuilder()
    .setCustomId(`contentlist_${kind}_${page + 1}_${userId}`)
    .setLabel("Next")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(page >= totalPages);

  const row = new ActionRowBuilder().addComponents(prevBtn, nextBtn);

  return { embeds: [embed], components: totalPages > 1 ? [row] : [], ephemeral: true };
}

async function fetchContentPage(guildId, kind, page) {
  const limit = CONTENT_PAGE_SIZE;
  const offset = (page - 1) * limit;

  const [total, items] = await Promise.all([
    dbCountContent(guildId, kind),
    dbListContent(guildId, kind, limit, offset),
  ]);

  const totalPages = Math.max(1, Math.ceil((total || 0) / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);

  // If page was out of range, refetch items for the clamped page
  if (safePage !== page) {
    const offset2 = (safePage - 1) * limit;
    const items2 = await dbListContent(guildId, kind, limit, offset2);
    return { totalPages, page: safePage, items: items2 };
  }

  return { totalPages, page: safePage, items };
}


// =======================
// INTERACTIONS
// =======================
client.on(Events.InteractionCreate, async (interaction) => {
  // -------- Slash commands --------
  if (interaction.isChatInputCommand()) {
    // OWNER-ONLY deploy commands
    if (interaction.commandName === "set_deploy_channel") {
      if (!interaction.inGuild()) {
        return interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
      }
      if (!isOwner(interaction)) {
        return interaction.reply({ content: "You can’t use this command.", ephemeral: true });
      }

      let ch = interaction.options.getChannel("channel");

      if (!ch) {
        const first = interaction.options.data?.find((o) => o.type === 7); // 7 = CHANNEL
        if (first?.value) ch = await client.channels.fetch(first.value).catch(() => null);
      }

      if (!ch?.id) {
        const debug = interaction.options.data?.map((o) => ({
          name: o.name, type: o.type, value: o.value
        })) ?? [];

        return interaction.reply({
          content:
            "❌ I didn’t receive a valid channel id from Discord.\n" +
            "Debug (send this to Dinis):\n" +
            "```json\n" + JSON.stringify(debug, null, 2) + "\n```",
          ephemeral: true,
        });

      }

      // ensure bot can post there
      const me = interaction.guild.members.me;
      const perms = me ? ch.permissionsFor(me) : null;
      if (!perms?.has(["ViewChannel", "SendMessages"])) {
        return interaction.reply({
          content:
            "⚠️ I don’t have permission to post in that channel.\n" +
            "Give me **View Channel** + **Send Messages**, then try again.",
          ephemeral: true,
        });

      }

      await dbSetDeployChannel(interaction.guildId, ch.id);
      return interaction.reply({
        content: `✅ Deployment updates channel set to <#${ch.id}>`,
        ephemeral: true,
      });
    }

    if (interaction.commandName === "show_deploy_channel") {
      if (!interaction.inGuild()) {
        return interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
      }
      if (!isOwner(interaction)) {
        return interaction.reply({ content: "You can’t use this command.", ephemeral: true });
      }

      const saved = await dbGetDeployChannel(interaction.guildId);
      return interaction.reply({
        content: saved ? `📌 Deployment updates channel: <#${saved}>` : "📌 No deployment updates channel set.",
        ephemeral: true,
      });
    }

    if (interaction.commandName === "reset_deploy_channel") {
      if (!interaction.inGuild()) {
        return interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
      }
      if (!isOwner(interaction)) {
        return interaction.reply({ content: "You can’t use this command.", ephemeral: true });
      }

      await dbResetDeployChannel(interaction.guildId);
      return interaction.reply({ content: "✅ Deployment updates channel reset.", ephemeral: true });
    }

    // TODO COMMANDS (global across all servers)
    if (interaction.commandName === "todo_add") {
      if (!interaction.inGuild() && !isOwner(interaction)) {
        return interaction.reply({ content: "❌ Only the owner can use TODOs in DMs.", ephemeral: true });
      }
      if (interaction.inGuild() && !canManageTodos(interaction)) {
        return interaction.reply({ content: "❌ You need **Manage Server** (or be the owner) to manage TODOs.", ephemeral: true });
      }

      const text = interaction.options.getString("text", true).trim();
      if (!text) return interaction.reply({ content: "❌ TODO text is required.", ephemeral: true });

      const id = await dbAddTodo(text, interaction.user.id);
      if (!id) return interaction.reply({ content: "⚠️ Database not available (DATABASE_URL missing).", ephemeral: true });

      return interaction.reply({ content: `✅ Added TODO **#${id}** — ${text}`, ephemeral: false });
    }

    if (interaction.commandName === "todo_list") {
      if (!interaction.inGuild() && !isOwner(interaction)) {
        return interaction.reply({ content: "❌ Only the owner can use TODOs in DMs.", ephemeral: true });
      }
      if (interaction.inGuild() && !canManageTodos(interaction)) {
        return interaction.reply({ content: "❌ You need **Manage Server** (or be the owner) to manage TODOs.", ephemeral: true });
      }

      const includeDone = interaction.options.getBoolean("all") ?? false;
      const items = await dbListTodos(includeDone, 25);

      if (!items.length) return interaction.reply({ content: "📭 No TODOs yet.", ephemeral: false });

      const lines = items.map((i) => `${i.is_done ? "✅" : "🟨"} **#${i.id}** — ${i.text}`);
      return interaction.reply({ content: `📝 **Global TODOs**\n${lines.join("\n")}`, ephemeral: false });
    }

    if (interaction.commandName === "todo_done") {
      if (!interaction.inGuild() && !isOwner(interaction)) {
        return interaction.reply({ content: "❌ Only the owner can use TODOs in DMs.", ephemeral: true });
      }
      if (interaction.inGuild() && !canManageTodos(interaction)) {
        return interaction.reply({ content: "❌ You need **Manage Server** (or be the owner) to manage TODOs.", ephemeral: true });
      }

      const id = interaction.options.getInteger("id", true);
      const ok = await dbDoneTodo(id);

      return interaction.reply({ content: ok ? `✅ Marked TODO **#${id}** as done.` : `❌ TODO **#${id}** not found.`, ephemeral: false });
    }

    // CONTENT MANAGEMENT (Manage Server / Owner) - server-only
    if (interaction.commandName === "add_compliment") {
      if (!interaction.inGuild()) {
        return interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
      }
      if (!canManageContent(interaction)) {
        return interaction.reply({ content: "❌ You need **Manage Server** (or be the owner) to do that.", ephemeral: true });
      }

      const text = interaction.options.getString("text", true).trim();
      if (!text) return interaction.reply({ content: "❌ Text is required.", ephemeral: true });

      const id = await dbAddContent(interaction.guildId, "compliment", text, interaction.user.id);
      if (!id) return interaction.reply({ content: "⚠️ Database not available (DATABASE_URL missing).", ephemeral: true });

      return interaction.reply({ content: `✅ Added compliment **#${id}**.`, ephemeral: true });
    }

    if (interaction.commandName === "add_roast") {
      if (!interaction.inGuild()) {
        return interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
      }
      if (!canManageContent(interaction)) {
        return interaction.reply({ content: "❌ You need **Manage Server** (or be the owner) to do that.", ephemeral: true });
      }

      const text = interaction.
