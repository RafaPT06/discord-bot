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
const pkg = require("./package.json");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

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
// FILES
// =======================
const COMPLIMENTS_FILE = path.join(__dirname, "compliments.txt");
const USED_FILE = path.join(__dirname, "used.json");
const DEPLOY_FILE = path.join(__dirname, "last_deploy.json");

// =======================
// DEPLOY HELPERS
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
    const res = await fetch(
      `https://api.github.com/repos/${repo}/commits/${sha}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "railway-discord-bot",
        },
      }
    );

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
    `• **Time:** <t:${ts}:F> (<t:${ts}:R>)\n`;

  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    if (channel?.isTextBased()) await channel.send(message);
  } catch (e) {
    console.error("Deploy notify failed:", e);
  }
}

// =======================
// READY
// =======================
client.once(Events.ClientReady, async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  await notifyOnDeploy();

  // Enable if you want daily message
  // cron.schedule(
  //   DAILY_CRON,
  //   () => sendDailyCompliment().catch(console.error),
  //   { timezone: TZ }
  // );
});

// =======================
// LOGIN
// =======================
client.login(process.env.BOT_TOKEN);
