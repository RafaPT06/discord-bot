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

async function getDeployChannels() {
  // This table is created in db init (src/db/index.js)
  const res = await pool.query(
    "SELECT guild_id, channel_id FROM deploy_channel_settings WHERE enabled=TRUE"
  );
  return res.rows || [];
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
    "New deploy detected",
    "",
    `Environment     \`${envName()}\``,
    `Commit          \`${shaShort}\``,
    `Change          \`${msg}\``,
    `Author          \`${author}\``,
    `GitHub          ${url}`,
    `Node            \`${node}\``,
    `Time            <t:${ts}:F> (<t:${ts}:R>)`,
  ].join("\n");
}

async function sendDeployNotices(client) {
  const rows = await getDeployChannels();
  if (!rows.length) return;

  const text = buildDeployMessage();

  for (const r of rows) {
    const ch = await client.channels.fetch(r.channel_id).catch(() => null);
    if (!ch || !ch.isTextBased()) continue;
    await ch.send({ content: text }).catch(() => null);
  }
}

module.exports = { sendDeployNotices };
