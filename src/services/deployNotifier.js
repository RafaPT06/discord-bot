const { pool } = require("../db/pool");
const { EmbedBuilder } = require("discord.js");
const { BRAND_COLORS } = require("../utils/brandColors");

function sha() {
  return process.env.RAILWAY_GIT_COMMIT_SHA || process.env.GITHUB_SHA || "";
}

function shortSha(s) {
  return s ? String(s).slice(0, 7) : "unknown";
}

function branch() {
  return process.env.RAILWAY_GIT_BRANCH || process.env.GITHUB_REF_NAME || "unknown";
}

function author() {
  return process.env.RAILWAY_GIT_COMMIT_AUTHOR || process.env.GITHUB_ACTOR || "unknown";
}

function message() {
  return process.env.RAILWAY_GIT_COMMIT_MESSAGE || "No commit message";
}

function envName() {
  return process.env.RAILWAY_ENVIRONMENT_NAME || process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV || "unknown";
}

function nodeVersion() {
  return process.version || "unknown";
}

function nowTs() {
  return Math.floor(Date.now() / 1000);
}

function embedColor(type = "deploy") {
  if (type === "restart") return BRAND_COLORS.restart;
  const env = String(envName()).toLowerCase();
  return env.includes("prod") ? BRAND_COLORS.deploy : BRAND_COLORS.primaryLight;
}

function repoInfo() {
  const owner =
    process.env.RAILWAY_GIT_REPO_OWNER ||
    (process.env.GITHUB_REPOSITORY ? process.env.GITHUB_REPOSITORY.split("/")[0] : null);

  const repo =
    process.env.RAILWAY_GIT_REPO_NAME ||
    (process.env.GITHUB_REPOSITORY ? process.env.GITHUB_REPOSITORY.split("/")[1] : null);

  return { owner, repo };
}

function commitUrl() {
  const { owner, repo } = repoInfo();
  const s = sha();
  if (!owner || !repo || !s) return null;
  return `https://github.com/${owner}/${repo}/commit/${s}`;
}

async function ensureStateTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // backward-compatible: optional updated_at
  await pool.query(`
    ALTER TABLE app_state
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()
  `);
}

async function getState(key) {
  await ensureStateTable();
  const res = await pool.query("SELECT value FROM app_state WHERE key=$1 LIMIT 1", [key]);
  return res.rows?.[0]?.value ?? null;
}

async function setState(key, value) {
  await ensureStateTable();
  await pool.query(
    `INSERT INTO app_state (key, value)
     VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value`,
    [key, value]
  );

  // best effort updated_at
  try {
    await pool.query("UPDATE app_state SET updated_at=NOW() WHERE key=$1", [key]);
  } catch {}
}

async function getDeployChannels() {
  // table is created by initDb
  const res = await pool.query(
    "SELECT guild_id, channel_id FROM deploy_channel_settings WHERE enabled=TRUE"
  );
  return res.rows || [];
}

function buildDeployEmbed(type = "deploy") {
  const s = sha();
  const ts = nowTs();

  const title = type === "restart" ? "Bot Restart Detected" : "New Deploy Detected";
  const url = commitUrl();
  const msg = message();

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(embedColor(type))
    .addFields(
      { name: "Environment", value: envName(), inline: true },
      { name: "Branch", value: branch(), inline: true },
      { name: "Commit", value: `\`${shortSha(s)}\``, inline: true },
      { name: "Author", value: author(), inline: true },
      { name: "Node", value: `\`${nodeVersion()}\``, inline: true },
      { name: "Time", value: `<t:${ts}:F> (<t:${ts}:R>)`, inline: true },
      { name: "Change", value: String(msg).slice(0, 1024), inline: false }
    );

  if (url) embed.addFields({ name: "GitHub", value: url, inline: false });

  return embed;
}

async function sendDeployNotices(client, type = "deploy") {
  const rows = await getDeployChannels();
  if (!rows.length) return;

  const currentSha = sha();
  const lastSha = await getState("last_deploy_sha");

  // If SHA changed => deploy
  if (currentSha && lastSha !== currentSha) {
    const embed = buildDeployEmbed("deploy");
    let sent = false;

    for (const r of rows) {
      const ch = await client.channels.fetch(r.channel_id).catch(() => null);
      if (!ch || !ch.isTextBased()) continue;
      await ch.send({ embeds: [embed] }).catch(() => {});
      sent = true;
    }

    if (sent) await setState("last_deploy_sha", currentSha);
    return;
  }

  // Same SHA (or missing SHA) => restart (rate-limited)
  const now = Date.now();
  const lastRestart = Number(await getState("last_restart_at_ms") || "0") || 0;
  const minGapMs = 6 * 60 * 60 * 1000; // 6 hours
  if (lastRestart && now - lastRestart < minGapMs) return;

  const embed = buildDeployEmbed("restart");
  let sent = false;

  for (const r of rows) {
    const ch = await client.channels.fetch(r.channel_id).catch(() => null);
    if (!ch || !ch.isTextBased()) continue;
    await ch.send({ embeds: [embed] }).catch(() => {});
    sent = true;
  }

  if (sent) await setState("last_restart_at_ms", String(now));
}

module.exports = { sendDeployNotices, buildDeployEmbed };
