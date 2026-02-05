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
  // If Railway env name isn't present, fall back to NODE_ENV then "production"
  return (
    process.env.RAILWAY_ENVIRONMENT_NAME ||
    process.env.NODE_ENV ||
    "production"
  );
}

async function sendDeployNotices(client) {
  try {
    const { rows } = await pool.query(
      "SELECT channel_id FROM deploy_channel_settings WHERE enabled=TRUE"
    );

    if (!rows.length) return;

    const sha = process.env.RAILWAY_GIT_COMMIT_SHA || null;
    const shaShort = shortSha(sha) || "unknown";
    const msg = (process.env.RAILWAY_GIT_COMMIT_MESSAGE || "Deploy").trim();
    const author = (process.env.RAILWAY_GIT_AUTHOR || "unknown").trim();
    const url = commitUrl();
    const node = process.version;
    const ts = Math.floor(Date.now() / 1000);

    const lines = [
      "🚀 **New deploy detected!**",
      `• **Env:** \`${envName()}\``,
      `• **Commit:** \`${shaShort}\``,
      `• **Change:** ${msg}`,
      `• **Author:** ${author}`,
      `• **GitHub:** ${url || "not available"}`,
      `• **Node:** \`${node}\``,
      `• **Time:** <t:${ts}:F> (<t:${ts}:R>)`,
    ].join("\n");

    for (const r of rows) {
      const ch = await client.channels.fetch(r.channel_id).catch(() => null);
      if (!ch || !ch.isTextBased()) continue;
      await ch.send(lines).catch(() => {});
    }
  } catch (e) {
    console.error("Deploy notifier error:", e?.message || e);
  }
}

module.exports = { sendDeployNotices };
