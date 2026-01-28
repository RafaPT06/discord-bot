require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const cron = require("node-cron");
const fs = require("fs");
const path = require("path");
const express = require("express");
const { Pool } = require("pg");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// =======================
// WEB SERVER (keep-alive)
// =======================
const app = express();
const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => res.send("Bot is alive! 🤖"));
app.listen(PORT, "0.0.0.0", () =>
  console.log(`🌐 Web server running on port ${PORT}`)
);

// =======================
// CONFIG
// =======================
const OWNER_ID = process.env.OWNER_ID;
const CHANNEL_ID = process.env.CHANNEL_ID;
const TZ = process.env.TZ || "Europe/Lisbon";

// =======================
// FILES
// =======================
const COMPLIMENTS_FILE = path.join(__dirname, "compliments.txt");
const USED_FILE = path.join(__dirname, "used.json");

// =======================
// DATABASE (PostgreSQL)
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
}

const db = {
  async set(guildId, channelId) {
    if (!pool) return;
    await pool.query(
      `INSERT INTO guild_settings (guild_id, deploy_channel_id)
       VALUES ($1,$2)
       ON CONFLICT (guild_id)
       DO UPDATE SET deploy_channel_id = EXCLUDED.deploy_channel_id`,
      [guildId, channelId]
    );
  },
  async get(guildId) {
    if (!pool) return null;
    const r = await pool.query(
      `SELECT deploy_channel_id FROM guild_settings WHERE guild_id=$1`,
      [guildId]
    );
    return r.rows[0]?.deploy_channel_id ?? null;
  },
  async reset(guildId) {
    if (!pool) return;
    await pool.query(
      `UPDATE guild_settings SET deploy_channel_id=NULL WHERE guild_id=$1`,
      [guildId]
    );
  },
  async all() {
    if (!pool) return [];
    const r = await pool.query(
      `SELECT deploy_channel_id FROM guild_settings WHERE deploy_channel_id IS NOT NULL`
    );
    return r.rows;
  },
};

const isOwner = (i) => OWNER_ID && i.user.id === OWNER_ID;

// =======================
// DEPLOY INFO (GitHub)
// =======================
function getEnvName() {
  return (
    process.env.RAILWAY_ENVIRONMENT_NAME ||
    process.env.RAILWAY_ENVIRONMENT ||
    "unknown"
  );
}

async function getCommitInfo(sha) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) return null;

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/commits/${sha}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "railway-bot",
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      msg: data.commit.message.split("\n")[0],
      author: data.commit.author.name,
      url: data.html_url,
    };
  } catch {
    return null;
  }
}

async function notifyOnDeploy() {
  const sha = process.env.RAILWAY_GIT_COMMIT_SHA;
  if (!sha) return;

  const info = await getCommitInfo(sha);
  const ts = Math.floor(Date.now() / 1000);

  const message =
    `🚀 **New deploy detected!**\n` +
    `• **Env:** \`${getEnvName()}\`\n` +
    `• **Commit:** \`${sha.slice(0, 7)}\`\n` +
    (info
      ? `• **Change:** ${info.msg}\n• **Author:** ${info.author}\n• **GitHub:** ${info.url}\n`
      : "") +
    `• **Node:** \`${process.version}\`\n` +
    `• **Time:** <t:${ts}:F> (<t:${ts}:R>)`;

  if (pool) {
    const rows = await db.all();
    for (const r of rows) {
      const ch = await client.channels.fetch(r.deploy_channel_id).catch(() => null);
      if (ch?.isTextBased()) await ch.send(message);
    }
    return;
  }

  if (CHANNEL_ID) {
    const ch = await client.channels.fetch(CHANNEL_ID).catch(() => null);
    if (ch?.isTextBased()) await ch.send(message);
  }
}

// =======================
// INTERACTIONS
// =======================
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "set_deploy_channel") {
    if (!interaction.inGuild() || !isOwner(interaction))
      return interaction.reply({ content: "You can’t use this command.", ephemeral: true });
    const ch = interaction.options.getChannel("channel", true);
    await db.set(interaction.guildId, ch.id);
    return interaction.reply({ content: `✅ Deploy updates set to <#${ch.id}>`, ephemeral: true });
  }

  if (interaction.commandName === "show_deploy_channel") {
    if (!interaction.inGuild() || !isOwner(interaction))
      return interaction.reply({ content: "You can’t use this command.", ephemeral: true });
    const id = await db.get(interaction.guildId);
    return interaction.reply({
      content: id ? `📌 Deploy channel: <#${id}>` : "📌 No deploy channel set.",
      ephemeral: true,
    });
  }

  if (interaction.commandName === "reset_deploy_channel") {
    if (!interaction.inGuild() || !isOwner(interaction))
      return interaction.reply({ content: "You can’t use this command.", ephemeral: true });
    await db.reset(interaction.guildId);
    return interaction.reply({ content: "✅ Deploy channel reset.", ephemeral: true });
  }
});

// =======================
// READY
// =======================
client.once(Events.ClientReady, async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  await initDb();
  await notifyOnDeploy();
});

client.login(process.env.BOT_TOKEN);
