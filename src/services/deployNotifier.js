const { pool } = require("../db/pool");

function shortSha(sha) {
  if (!sha) return null;
  return String(sha).slice(0, 7);
}

function commitUrl() {
  const owner = process.env.RAILWAY_GIT_REPO_OWNER;
  const repo = process.env.RAILWAY_GIT_REPO_NAME;
  const sha = process.env.RAILWAY_GIT_COMMIT_SHA;
  if (!owner || !repo || !sha) return null;
  return `https://github.com/${owner}/${repo}/commit/${sha}`;
}

function envName() {
  return (
    process.env.RAILWAY_ENVIRONMENT_NAME ||
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.NODE_ENV ||
    "unknown"
  );
}

function nodeVersion() {
  return process.version || "unknown";
}

function nowTs() {
  return Math.floor(Date.now() / 1000);
}

async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS deploy_channels (
      guild_id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
}

async function getDeployChannels() {
  await ensureTables();
  const res = await pool.query("SELECT guild_id, channel_id FROM deploy_channels");
  return res.rows || [];
}

async function getLastSentSha() {
  await ensureTables();
  const { rows } = await pool.query("SELECT value FROM app_state WHERE key='last_deploy_sha' LIMIT 1");
  return rows?.[0]?.value || null;
}

async function setLastSentSha(sha) {
  await ensureTables();
  await pool.query(
    `INSERT INTO app_state (key, value)
     VALUES ('last_deploy_sha', $1)
     ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value`,
    [sha || ""]
  );
}

function buildDeployMessage() {
  const sha = process.env.RAILWAY_GIT_COMMIT_SHA;
  const shaShort = shortSha(sha) || "unknown";
  const msg = process.env.RAILWAY_GIT_COMMIT_MESSAGE || "not available";
  const author = process.env.RAILWAY_GIT_COMMIT_AUTHOR || "not available";
  const url = commitUrl() || "not available";
  const node = nodeVersion();
  const ts = nowTs();

  return [
    "New Deploy Detected",
    "",
    `Environment     **${envName()}**`,
    `Commit          **${shaShort}**`,
    `Change          **${msg}**`,
    `Author          **${author}**`,
    `GitHub          **${url}**`,
    `Node            **${node}**`,
    `Time            <t:${ts}:F> (<t:${ts}:R>)`,
  ].join("\n");
}

async function sendDeployNotices(client) {
  const rows = await getDeployChannels();
  if (!rows.length) return;

  const sha = process.env.RAILWAY_GIT_COMMIT_SHA || "";
  const last = await getLastSentSha();

  // If we've already sent for this commit hash in this DB, skip
  if (sha && last === sha) return;

  const text = buildDeployMessage();

  let sentAny = false;
  for (const r of rows) {
    const ch = await client.channels.fetch(r.channel_id).catch(() => null);
    if (!ch || !ch.isTextBased()) continue;
    await ch.send({ content: text, allowedMentions: { parse: [] } }).catch(() => null);
    sentAny = true;
  }

  if (sentAny) await setLastSentSha(sha);
}

module.exports = { sendDeployNotices };
