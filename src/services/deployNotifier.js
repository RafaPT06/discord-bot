const { pool } = require("../db/pool");
const { EmbedBuilder } = require("discord.js");

function shortSha(sha) {
  if (!sha) return "unknown";
  return String(sha).slice(0, 7);
}

function commitUrl() {
  const owner =
    process.env.RAILWAY_GIT_REPO_OWNER ||
    process.env.GITHUB_REPOSITORY?.split("/")[0];

  const repo =
    process.env.RAILWAY_GIT_REPO_NAME ||
    process.env.GITHUB_REPOSITORY?.split("/")[1];

  const sha =
    process.env.RAILWAY_GIT_COMMIT_SHA ||
    process.env.GITHUB_SHA;

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

function commitAuthor() {
  return (
    process.env.RAILWAY_GIT_COMMIT_AUTHOR ||
    process.env.GITHUB_ACTOR ||
    "unknown"
  );
}

async function getDeployChannels() {
  const res = await pool.query(
    "SELECT guild_id, channel_id FROM deploy_channel_settings WHERE enabled=TRUE"
  );
  return res.rows || [];
}

function buildDeployEmbed() {
  const sha =
    process.env.RAILWAY_GIT_COMMIT_SHA ||
    process.env.GITHUB_SHA;

  const shaShort = shortSha(sha);

  const msg =
    process.env.RAILWAY_GIT_COMMIT_MESSAGE ||
    "No commit message";

  const author = commitAuthor();
  const url = commitUrl();
  const node = nodeVersion();
  const ts = nowTs();

  const embed = new EmbedBuilder()
    .setTitle("New Deploy Detected")
    .addFields(
      { name: "Environment", value: envName(), inline: true },
      { name: "Commit", value: `\`${shaShort}\``, inline: true },
      { name: "Author", value: author, inline: true },
      { name: "Change", value: msg.slice(0, 1024), inline: false },
      { name: "Node", value: `\`${node}\``, inline: true },
      { name: "Time", value: `<t:${ts}:F> (<t:${ts}:R>)`, inline: true }
    );

  if (url) {
    embed.addFields({ name: "GitHub", value: url, inline: false });
  }

  return embed;
}

async function sendDeployNotices(client) {
  const rows = await getDeployChannels();
  if (!rows.length) return;

  const embed = buildDeployEmbed();

  for (const r of rows) {
    const ch = await client.channels.fetch(r.channel_id).catch(() => null);
    if (!ch || !ch.isTextBased()) continue;

    await ch.send({ embeds: [embed] }).catch(() => {});
  }
}

module.exports = { sendDeployNotices };
