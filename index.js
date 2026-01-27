require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} = require("discord.js");
const cron = require("node-cron");
const fs = require("fs");
const path = require("path");
const express = require("express");
const pkg = require("./package.json");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// -----------------------
// Crash + graceful shutdown
// -----------------------
process.on("unhandledRejection", (reason) =>
  console.error("UnhandledRejection:", reason)
);
process.on("uncaughtException", (err) =>
  console.error("UncaughtException:", err)
);

let isShuttingDown = false;
async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`🛑 Received ${signal}. Closing Discord client...`);
  try {
    await client.destroy();
  } catch (e) {
    console.error("Error during client.destroy():", e);
  } finally {
    process.exit(0);
  }
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// =======================
// WEB SERVER (keep-alive)
// =======================
const app = express();
const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.send("Bot is alive! 🤖");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Web server running on port ${PORT}`);
});

// =======================
// CONFIG
// =======================
const TARGET_USER_ID = process.env.TARGET_USER_ID;
const CHANNEL_ID = process.env.CHANNEL_ID;
const TZ = process.env.TZ || "Europe/Lisbon";
const DAILY_CRON = "10 9 * * *";

// =======================
// FILES (compliments)
// =======================
const COMPLIMENTS_FILE = path.join(__dirname, "compliments.txt");
const USED_FILE = path.join(__dirname, "used.json");
const DEPLOY_FILE = path.join(__dirname, "last_deploy.json");

// -----------------------
// Compliments helpers
// -----------------------
function loadCompliments() {
  try {
    return fs
      .readFileSync(COMPLIMENTS_FILE, "utf8")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  } catch {
    console.error("❌ Could not read compliments.txt");
    return [];
  }
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// =======================
// DAILY good morning sender (optional)
// =======================
let lastSentDate = null;
async function sendDailyGoodMorning() {
  if (!TARGET_USER_ID || !CHANNEL_ID) return;

  const today = new Date().toISOString().slice(0, 10);
  if (lastSentDate === today) return;

  const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
  if (!channel || !channel.isTextBased()) return;

  await channel.send(
    `☀️ Good morning <@${TARGET_USER_ID}>! Hope you have a great day 💛`
  );

  lastSentDate = today;
}

// =======================
// DEPLOY HELPERS (notify channel on deploy)
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
  const repo = process.env.GITHUB_REPO;
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
  if (!sha || !CHANNEL_ID) return;

  let lastSha = null;
  try {
    lastSha = JSON.parse(fs.readFileSync(DEPLOY_FILE, "utf8")).sha;
  } catch {}

  if (lastSha === sha) return;

  fs.writeFileSync(DEPLOY_FILE, JSON.stringify({ sha }, null, 2));

  const envName = getRailwayEnvName();
  const ts = Math.floor(Date.now() / 1000);
  const shortSha = sha.slice(0, 7);
  const version = pkg.version ?? "unknown";
  const commitInfo = await getCommitInfo(sha);

  const message =
    `🚀 **New deploy detected!**\n` +
    `• **Env:** \`${envName}\`\n` +
    `• **Version:** \`${version}\`\n` +
    `• **Commit:** \`${shortSha}\`\n` +
    (commitInfo
      ? `• **Change:** ${commitInfo.message}\n` +
        `• **Author:** ${commitInfo.author}\n` +
        `• **GitHub:** ${commitInfo.url}\n`
      : "") +
    `• **Node:** \`${process.version}\`\n` +
    `• **Time:** <t:${ts}:F> (<t:${ts}:R>)`;

  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    if (channel?.isTextBased()) await channel.send(message);
  } catch (e) {
    console.error("Deploy notify failed:", e);
  }
}

// =======================
// Cooldowns
// =======================
const crazyCooldown = new Map();
const CRAZY_COOLDOWN_MS = 15_000;
const CRAZY_MAX_TIMES = 3;
const CRAZY_MAX_TOTAL_LINES = 25;

const complimentCooldown = new Map();
const COMPLIMENT_COOLDOWN_MS = 10_000;

// =======================
// CRAZY pack
// =======================
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

// =======================
// INTERACTIONS (THIS WAS MISSING)
// =======================
client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    // /help
    if (interaction.commandName === "help") {
      const helpMessage = [
        "**Commands:**",
        "• `/help`",
        "• `/status` (uptime)",
        "• `/ping`",
        "• `/crazy [times]`",
        "• `/compliment [user]`",
      ].join("\n");
      return interaction.reply({ content: helpMessage });
    }

    // /status (auto-updating uptime)
    if (interaction.commandName === "status") {
      const startedAt = Math.floor(
        (Date.now() - process.uptime() * 1000) / 1000
      );

      const msg =
        `⏱️ **Uptime:** <t:${startedAt}:R>\n` +
        `👨‍💻 **Made by:** Rafa @(atuaprima_)`;

      return interaction.reply({ content: msg });
    }

    // /ping
    if (interaction.commandName === "ping") {
      return interaction.reply({ content: `📡 **Ping:** ${client.ws.ping}ms` });
    }

    // /compliment (DM + guild)
    if (interaction.commandName === "compliment") {
      const now = Date.now();
      const prev = complimentCooldown.get(interaction.user.id) ?? 0;
      if (now - prev < COMPLIMENT_COOLDOWN_MS) {
        return interaction.reply({ content: "⏳ Cooldown — wait a bit.", ephemeral: true });
      }
      complimentCooldown.set(interaction.user.id, now);

      const fromFile = loadCompliments();
      const fallback = [
        "You’ve got really good vibes.",
        "You’re doing better than you think.",
        "You make things feel easier for people.",
      ];
      const pool = fromFile.length ? fromFile : fallback;

      const target = interaction.options.getUser("user");

      // DM: just compliment the invoker
      if (!interaction.inGuild()) {
        return interaction.reply({ content: `✨ ${pickRandom(pool)}` });
      }

      const who = target ?? interaction.user;
      return interaction.reply({
        content: `Hey <@${who.id}> — ${pickRandom(pool)} ✨`,
      });
    }

    // /crazy (works in DMs)
    if (interaction.commandName === "crazy") {
      const now = Date.now();
      const prev = crazyCooldown.get(interaction.user.id) ?? 0;
      if (now - prev < CRAZY_COOLDOWN_MS) {
        return interaction.reply({ content: "⏳ Cooldown — wait a bit.", ephemeral: true });
      }
      crazyCooldown.set(interaction.user.id, now);

      const timesRaw = interaction.options.getInteger("times") ?? 1;
      const times = Math.max(1, Math.min(timesRaw, CRAZY_MAX_TIMES));

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`crazy_go_${times}_${interaction.user.id}`)
          .setLabel("Go Crazy")
          .setStyle(ButtonStyle.Danger)
      );

      // IMPORTANT: don't use ephemeral in DMs
      const payload = { content: `Ready? Times: **${times}**`, components: [row] };
      if (interaction.inGuild()) payload.ephemeral = true;

      return interaction.reply(payload);
    }
  }

  // Buttons for crazy
  if (interaction.isButton()) {
    const [tag, action, timesStr, ownerId] = interaction.customId.split("_");
    if (tag !== "crazy") return;

    if (interaction.user.id !== ownerId) {
      const deny = { content: "Not your buttons 🙂" };
      if (interaction.inGuild()) deny.ephemeral = true;
      return interaction.reply(deny);
    }

    const times = Math.max(1, Math.min(parseInt(timesStr, 10) || 1, CRAZY_MAX_TIMES));
    const lines = getCrazyPack();

    const ack = { content: `Sending x${times}...` };
    if (interaction.inGuild()) ack.ephemeral = true;
    await interaction.reply(ack);

    const outChannel = interaction.channel ?? (await interaction.user.createDM());

    let sent = 0;
    for (let t = 0; t < times; t++) {
      for (const line of lines) {
        if (sent >= CRAZY_MAX_TOTAL_LINES) return;
        await outChannel.send(line).catch(() => null);
        sent++;
      }
    }
  }
});

// =======================
// READY
// =======================
client.once(Events.ClientReady, async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  await notifyOnDeploy();

  // Enable if you want daily message
  // cron.schedule(
  //   DAILY_CRON,
  //   () => sendDailyGoodMorning().catch(console.error),
  //   { timezone: TZ }
  // );
});

// =======================
// LOGIN
// =======================
client.login(process.env.BOT_TOKEN);
