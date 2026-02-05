const { pool } = require("../db/pool");

async function sendDeployNotices(client) {
  try {
    const { rows } = await pool.query("SELECT channel_id FROM deploy_channel_settings WHERE enabled=TRUE");
    for (const r of rows) {
      const ch = await client.channels.fetch(r.channel_id).catch(() => null);
      if (!ch || !ch.isTextBased()) continue;
      await ch.send(`✅ **Bot started / redeployed** — <t:${Math.floor(Date.now()/1000)}:F>`).catch(() => {});
    }
  } catch (e) {
    console.error("Deploy notifier error:", e?.message || e);
  }
}

module.exports = { sendDeployNotices };
