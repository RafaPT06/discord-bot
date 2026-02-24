const { EmbedBuilder } = require("discord.js");
const os = require("os");
const { pool } = require("../db/pool");
const { getMaintenanceEnabled } = require("../services/maintenance");
const { listPanelEvents } = require("../services/panelEvents");

function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}

function formatBytes(bytes) {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

async function dbLatencyMs() {
  const t0 = Date.now();
  await pool.query("SELECT 1");
  return Date.now() - t0;
}

async function getChannelSetting(table, guildId) {
  // tables like deploy_channel_settings have guild_id, channel_id, enabled
  const { rows } = await pool.query(`SELECT channel_id, enabled FROM ${table} WHERE guild_id=$1`, [guildId]);
  return rows?.[0] || null;
}

async function getBackupSetting(guildId) {
  const { rows } = await pool.query("SELECT channel_id, enabled, interval_days FROM backup_channel_settings WHERE guild_id=$1", [guildId]);
  return rows?.[0] || null;
}

async function getFeedSetting(guildId) {
  const { rows } = await pool.query("SELECT channel_id, enabled, level FROM feed_channel_settings WHERE guild_id=$1", [guildId]);
  return rows?.[0] || null;
}

async function getPermCount(guildId) {
  const { rows } = await pool.query("SELECT COUNT(*)::int AS n FROM command_permissions WHERE guild_id=$1", [guildId]);
  return rows?.[0]?.n ?? 0;
}

function base(title, pageLabel, pageNo, pageTotal) {
  return new EmbedBuilder()
    .setTitle(title)
    .setFooter({ text: `Panel • ${pageLabel} • Page ${pageNo}/${pageTotal}` })
    .setTimestamp(new Date());
}

async function buildPanelEmbed(client, guildId, page) {
  const p = (page || "overview").toLowerCase();
  const pages = ["overview","channels","diag","feed","perms","sim","logs"];
  const idx = Math.max(0, pages.indexOf(p));
  const pageName = pages[idx] || "overview";
  const pageNo = idx + 1;
  const pageTotal = pages.length;

  if (pageName === "channels") {
    const deploy = await getChannelSetting("deploy_channel_settings", guildId).catch(()=>null);
    const roblox = await getChannelSetting("roblox_alert_settings", guildId).catch(()=>null);
    const err = await getChannelSetting("error_alert_settings", guildId).catch(()=>null);
    const backup = await getBackupSetting(guildId).catch(()=>null);
    const feed = await getFeedSetting(guildId).catch(()=>null);

    const e = base("Control Panel — Channels", "Channels", pageNo, pageTotal);
    const fmt = (r) => r ? `<#${r.channel_id}> (enabled: ${r.enabled ? "true":"false"})` : "not set";
    e.setDescription(
      [
        `Deploy: ${fmt(deploy)}`,
        `Roblox Alerts: ${fmt(roblox)}`,
        `Error Alerts: ${fmt(err)}`,
        `Backups: ${backup ? `<#${backup.channel_id}> (enabled: ${backup.enabled ? "true":"false"}, interval_days: ${backup.interval_days || "7"})` : "not set"}`,
        `Feed: ${feed ? `<#${feed.channel_id}> (enabled: ${feed.enabled ? "true":"false"}, level: ${feed.level || 2})` : "not set"}`,
        "",
        "Use the existing `/set_*_channel` commands to change these.",
      ].join("\n")
    );
    return e;
  }

  if (pageName === "diag") {
    const e = base("Control Panel — Diagnostics", "Diagnostics", pageNo, pageTotal);

    // Env checks (only show missing names)
    const required = ["BOT_TOKEN", "OWNER_ID", "DATABASE_URL"];
    const missing = required.filter((k) => !process.env[k]);

    // Bot permissions in guild
    let permsText = "n/a";
    try {
      const g = client.guilds.cache.get(guildId);
      const me = g?.members?.me;
      if (me) {
        const perms = me.permissions;
        const need = [
          ["View Channels", "ViewChannel"],
          ["Send Messages", "SendMessages"],
          ["Embed Links", "EmbedLinks"],
          ["Manage Channels", "ManageChannels"],
        ];
        const missingPerms = need
          .filter(([_, f]) => !perms.has(f))
          .map(([n]) => n);
        permsText = missingPerms.length ? `Missing: ${missingPerms.join(", ")}` : "OK";
      }
    } catch {}

    // Channel config checks (best-effort)
    const checks = [];
    async function checkSetting(label, sql) {
      try {
        const { rows } = await pool.query(sql, [guildId]);
        const chId = rows?.[0]?.channel_id;
        checks.push(`${label}: ${chId ? `set (${chId})` : "not set"}`);
      } catch {
        checks.push(`${label}: n/a`);
      }
    }

    await checkSetting("Deploy channel", "SELECT channel_id FROM deploy_channel_settings WHERE guild_id=$1 AND enabled=TRUE LIMIT 1");
    await checkSetting("Roblox alerts", "SELECT channel_id FROM roblox_alert_settings WHERE guild_id=$1 AND enabled=TRUE LIMIT 1");
    await checkSetting("Error alerts", "SELECT channel_id FROM error_alert_settings WHERE guild_id=$1 AND enabled=TRUE LIMIT 1");
    await checkSetting("Backup channel", "SELECT channel_id FROM backup_channel_settings WHERE guild_id=$1 AND enabled=TRUE LIMIT 1");
    await checkSetting("Feed channel", "SELECT channel_id FROM feed_channel_settings WHERE guild_id=$1 AND enabled=TRUE LIMIT 1");

    e.addFields(
      { name: "Env", value: missing.length ? `Missing: ${missing.join(", ")}` : "OK", inline: false },
      { name: "Commands Loaded", value: String(client.commands?.size || 0), inline: true },
      { name: "Bot Permissions", value: permsText, inline: false },
      { name: "Channel Config", value: checks.join("\n"), inline: false },
    );

    return e;
  }


  if (pageName === "feed") {
    const feed = await getFeedSetting(guildId).catch(()=>null);
    const e = base("Control Panel — Feed", "Feed", pageNo, pageTotal);
    e.setDescription(
      [
        "**Feed Levels**",
        "1 = Critical",
        "2 = System",
        "3 = Activity",
        "",
        `Current: ${feed ? `<#${feed.channel_id}> (enabled: ${feed.enabled ? "true":"false"}, level: ${feed.level || 2})` : "not set"}`,
        "",
        "Commands:",
        "• `/set_feed_channel`",
        "• `/feed_level`",
        "• `/feed_test`",
        "• `/simulate_feed` (Owner)",
      ].join("\n")
    );
    return e;
  }

  if (pageName === "perms") {
    const n = await getPermCount(guildId).catch(()=>null);
    const e = base("Control Panel — Permissions", "Permissions", pageNo, pageTotal);
    e.setDescription(
      [
        `Overrides configured: **${n === null ? "n/a" : n}**`,
        "",
        "Commands:",
        "• `/perm_list`",
        "• `/perm_show`",
        "• `/perm_set`",
        "• `/perm_add_role`",
        "• `/perm_clear`",
      ].join("\n")
    );
    return e;
  }

  
  if (pageName === "logs") {
    const e = base("Control Panel — Logs", "Logs", pageNo, pageTotal);
    const rows = await listPanelEvents(guildId, 12).catch(()=>[]);
    if (!rows.length) {
      e.setDescription("No events logged yet.");
      return e;
    }

    const fmt = (r) => {
      const ts = Math.floor(new Date(r.created_at).getTime()/1000);
      return `[#${r.id}] [L${r.level}] ${r.kind} — ${r.message}\n<t:${ts}:R>`;
    };

    e.setDescription(rows.map(fmt).join("\n\n"));
    e.setFooter({ text: `Panel • Logs • Page ${pageNo}/${pageTotal} • Showing ${rows.length}` });
    return e;
  }

if (pageName === "sim") {
    const e = base("Control Panel — Simulation", "Simulation", pageNo, pageTotal);
    e.setDescription(
      [
        "Owner-only test tools:",
        "• `/simulate_deploy`",
        "• `/simulate_error`",
        "• `/simulate_backup`",
        "• `/simulate_roblox`",
        "• `/simulate_feed`",
      ].join("\n")
    );
    return e;
  }

  // overview
  const uptime = Math.floor(process.uptime());
  const mem = process.memoryUsage();
  const node = process.version;
  const env = process.env.NODE_ENV || "unknown";
  const maintenance = await getMaintenanceEnabled().catch(()=>false);

  // Quick config (best-effort)
  let deployCh = null, backupCh = null, feedCh = null, feedLevel = 2, errCh = null, robloxCh = null;
  try {
    const deploy = await getChannelSetting("deploy_channel_settings", guildId).catch(()=>null);
    if (deploy?.enabled && deploy?.channel_id) deployCh = `<#${deploy.channel_id}>`;
  } catch {}
  try {
    const backup = await getBackupSetting(guildId).catch(()=>null);
    if (backup?.enabled && backup?.channel_id) backupCh = `<#${backup.channel_id}>`;
  } catch {}
  try {
    const feed = await getFeedSetting(guildId).catch(()=>null);
    if (feed?.enabled && feed?.channel_id) feedCh = `<#${feed.channel_id}>`;
    if (feed?.level) feedLevel = feed.level;
  } catch {}
  try {
    const err = await getChannelSetting("error_alert_settings", guildId).catch(()=>null);
    if (err?.enabled && err?.channel_id) errCh = `<#${err.channel_id}>`;
  } catch {}
  try {
    const roblox = await getChannelSetting("roblox_alert_settings", guildId).catch(()=>null);
    if (roblox?.enabled && roblox?.channel_id) robloxCh = `<#${roblox.channel_id}>`;
  } catch {}


  let latency = "n/a";
  try { latency = `${await dbLatencyMs()}ms`; } catch {}

  const e = base("Control Panel — Overview", "Overview", pageNo, pageTotal);
  e.addFields(
    { name: "Servers", value: String(client.guilds.cache.size), inline: true },
    { name: "Uptime", value: formatUptime(uptime), inline: true },
    { name: "Ping", value: `${client.ws.ping}ms`, inline: true },
    { name: "Memory RSS", value: formatBytes(mem.rss), inline: true },
    { name: "DB Latency", value: latency, inline: true },
    { name: "Maintenance", value: maintenance ? "ON" : "OFF", inline: true },
    { name: "Node", value: node, inline: true },
    { name: "Environment", value: env, inline: true },
    { name: "Platform", value: `${os.platform()} ${os.arch()}`, inline: true },
  );
  e.setDescription([
    "Use the buttons to navigate.",
    "",
    "**Quick Status**",
    `Deploy channel: ${deployCh || "not set"}`,
    `Backup channel: ${backupCh || "not set"}`,
    `Feed channel: ${feedCh || "not set"} (level: ${feedLevel})`,
    `Error alerts: ${errCh || "not set"}`,
    `Roblox alerts: ${robloxCh || "not set"}`,
    "",
    "Tip: Check **Logs** for recent events.",
  ].join("\n"));
  return e;
}

module.exports = { buildPanelEmbed };
