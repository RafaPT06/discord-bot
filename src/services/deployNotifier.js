function getRailwayEnvName() {
  return (
    process.env.RAILWAY_ENVIRONMENT_NAME ||
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.RAILWAY_ENV_NAME ||
    "unknown"
  );
}

async function getCommitInfo({ sha, githubToken, githubRepo }) {
  if (!sha || !githubToken || !githubRepo) return null;
  try {
    const res = await fetch(`https://api.github.com/repos/${githubRepo}/commits/${sha}`, {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        "User-Agent": "railway-discord-bot",
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      message: String(data.commit?.message || "").split("\n")[0],
      author: data.commit?.author?.name,
      url: data.html_url,
    };
  } catch {
    return null;
  }
}

async function notifyOnDeploy({ client, db, config }) {
  const sha = process.env.RAILWAY_GIT_COMMIT_SHA;
  const ts = Math.floor(Date.now() / 1000);
  const envName = getRailwayEnvName();

  // Deduplicate deploy messages (Railway restarts can spam)
  if (db?.enabled && sha) {
    try {
      const kvKey = `last_deploy_sha:${envName}`;
      const last = await db.kvGet(kvKey);
      if (last === sha) return;
      await db.kvSet(kvKey, sha);
    } catch (e) {
      console.error("kv deploy dedupe failed:", e);
    }
  }

  const shortSha = sha ? sha.slice(0, 7) : null;
  const commitInfo = await getCommitInfo({
    sha,
    githubToken: config.GITHUB_TOKEN,
    githubRepo: config.GITHUB_REPO,
  });

  const message =
    `🚀 **New deploy detected!**\n` +
    `• **Env:** \`${envName}\`\n` +
    (shortSha ? `• **Commit:** \`${shortSha}\`\n` : "") +
    (commitInfo
      ? `• **Change:** ${commitInfo.message}\n` +
        (commitInfo.author ? `• **Author:** ${commitInfo.author}\n` : "") +
        (commitInfo.url ? `• **GitHub:** ${commitInfo.url}\n` : "")
      : "") +
    `• **Node:** \`${process.version}\`\n` +
    `• **Time:** <t:${ts}:F> (<t:${ts}:R>)`;

  // Prefer DB (per server)
  if (db?.enabled) {
    try {
      const rows = await db.getAllDeployChannels();
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
  if (config.CHANNEL_ID) {
    const ch = await client.channels.fetch(config.CHANNEL_ID).catch(() => null);
    if (ch?.isTextBased()) await ch.send(message);
  }
}

module.exports = { notifyOnDeploy };
