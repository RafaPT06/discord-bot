const { EmbedBuilder } = require("discord.js");
const os = require("os");
const { performance } = require("perf_hooks");
const { pool } = require("../db/pool");
const { getMaintenanceEnabled } = require("../services/maintenance");
const { listPanelEvents } = require("../services/panelEvents");

const PAGES = ["overview", "channels", "diag", "system", "usage", "backups", "feed", "perms", "sim", "logs"];

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (d) return `${d}d ${h}h ${m}m`;
  if (h) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

function formatBytes(bytes) {
  const mb = Number(bytes || 0) / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

function fmtTs(value, fallback = "never") {
  if (!value) return fallback;
  const t = Math.floor(new Date(value).getTime() / 1000);
  if (!Number.isFinite(t)) return fallback;
  return `<t:${t}:F> (<t:${t}:R>)`;
}

async function dbLatencyMs() {
  const t0 = performance.now();
  await pool.query("SELECT 1");
  return Math.round(performance.now() - t0);
}

async function eventLoopLagMs() {
  const start = performance.now();
  await new Promise((resolve) => setImmediate(resolve));
  return Math.max(0, Math.round(performance.now() - start));
}

async function getChannelSetting(table, guildId) {
  const { rows } = await pool.query(`SELECT channel_id, enabled FROM ${table} WHERE guild_id=$1`, [guildId]);
  return rows?.[0] || null;
}

async function getBackupSetting(guildId) {
  const { rows } = await pool.query("SELECT channel_id, enabled, last_sent_at, created_at, updated_at FROM backup_channel_settings WHERE guild_id=$1", [guildId]);
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

async function buildChannelsPage(guildId, pageNo, pageTotal) {
  const deploy = await getChannelSetting("deploy_channel_settings", guildId).catch(() => null);
  const roblox = await getChannelSetting("roblox_alert_settings", guildId).catch(() => null);
  const err = await getChannelSetting("error_alert_settings", guildId).catch(() => null);
  const backup = await getBackupSetting(guildId).catch(() => null);
  const feed = await getFeedSetting(guildId).catch(() => null);

  const e = base("Control Panel — Channels", "Channels", pageNo, pageTotal);
  const fmt = (r) => r ? `<#${r.channel_id}> (enabled: ${r.enabled ? "true" : "false"})` : "not set";
  e.setDescription([
    `Deploy: ${fmt(deploy)}`,
    `Roblox Alerts: ${fmt(roblox)}`,
    `Error Alerts: ${fmt(err)}`,
    `Backups: ${backup ? `<#${backup.channel_id}> (enabled: ${backup.enabled ? "true" : "false"})` : "not set"}`,
    `Feed: ${feed ? `<#${feed.channel_id}> (enabled: ${feed.enabled ? "true" : "false"}, level: ${feed.level || 2})` : "not set"}`,
    "",
    "Use the existing `/set_*_channel` commands to change these.",
  ].join("\n"));
  return e;
}

async function buildSystemPage(client, guildId, pageNo, pageTotal) {
  const e = base("Control Panel — System", "System", pageNo, pageTotal);
  const mem = process.memoryUsage();
  const cpu = process.cpuUsage();
  const load = os.loadavg().map((n) => n.toFixed(2)).join(" / ");
  const dbLatency = await dbLatencyMs().then((n) => `${n}ms`).catch(() => "n/a");
  const loopLag = await eventLoopLagMs().then((n) => `${n}ms`).catch(() => "n/a");
  const maintenance = await getMaintenanceEnabled().catch(() => false);

  e.addFields(
    { name: "Uptime", value: formatUptime(process.uptime()), inline: true },
    { name: "Ping", value: `${client.ws.ping}ms`, inline: true },
    { name: "DB Latency", value: dbLatency, inline: true },
    { name: "RSS", value: formatBytes(mem.rss), inline: true },
    { name: "Heap Used", value: formatBytes(mem.heapUsed), inline: true },
    { name: "Heap Total", value: formatBytes(mem.heapTotal), inline: true },
    { name: "External", value: formatBytes(mem.external), inline: true },
    { name: "Array Buffers", value: formatBytes(mem.arrayBuffers), inline: true },
    { name: "Event Loop Lag", value: loopLag, inline: true },
    { name: "CPU User", value: `${Math.round(cpu.user / 1000)}ms`, inline: true },
    { name: "CPU System", value: `${Math.round(cpu.system / 1000)}ms`, inline: true },
    { name: "Load Avg", value: load, inline: true },
    { name: "Node", value: process.version, inline: true },
    { name: "Platform", value: `${os.platform()} ${os.arch()}`, inline: true },
    { name: "Maintenance", value: maintenance ? "ON" : "OFF", inline: true },
  );

  return e;
}

async function buildDiagnosticsPage(client, guildId, pageNo, pageTotal) {
  const e = base("Control Panel — Diagnostics", "Diagnostics", pageNo, pageTotal);
  const required = ["BOT_TOKEN", "OWNER_ID", "DATABASE_URL"];
  const missing = required.filter((k) => !process.env[k]);

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
        ["Attach Files", "AttachFiles"],
        ["Manage Channels", "ManageChannels"],
      ];
      const missingPerms = need.filter(([_, f]) => !perms.has(f)).map(([n]) => n);
      permsText = missingPerms.length ? `Missing: ${missingPerms.join(", ")}` : "OK";
    }
  } catch {}

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

async function buildUsagePage(guildId, pageNo, pageTotal) {
  const e = base("Control Panel — Usage", "Usage", pageNo, pageTotal);

  const [topCommands, topUsers, slowCommands, recentErrors] = await Promise.all([
    pool.query(`SELECT command_name, COUNT(*)::int AS uses, SUM(CASE WHEN ok THEN 0 ELSE 1 END)::int AS failures
                FROM command_usage WHERE guild_id=$1 GROUP BY command_name ORDER BY uses DESC, command_name ASC LIMIT 10`, [guildId]).then((r) => r.rows).catch(() => []),
    pool.query(`SELECT user_id, COUNT(*)::int AS uses
                FROM command_usage WHERE guild_id=$1 AND user_id IS NOT NULL GROUP BY user_id ORDER BY uses DESC LIMIT 10`, [guildId]).then((r) => r.rows).catch(() => []),
    pool.query(`SELECT command_name, ROUND(AVG(duration_ms))::int AS avg_ms, MAX(duration_ms)::int AS max_ms, COUNT(*)::int AS samples
                FROM command_usage WHERE guild_id=$1 AND duration_ms IS NOT NULL GROUP BY command_name ORDER BY avg_ms DESC NULLS LAST LIMIT 8`, [guildId]).then((r) => r.rows).catch(() => []),
    pool.query(`SELECT command_name, error, created_at FROM command_usage WHERE guild_id=$1 AND ok=FALSE ORDER BY created_at DESC LIMIT 5`, [guildId]).then((r) => r.rows).catch(() => []),
  ]);

  const fmtTopCommands = topCommands.length
    ? topCommands.map((r, i) => `${i + 1}. /${r.command_name} — ${r.uses} use${r.uses === 1 ? "" : "s"}${r.failures ? `, ${r.failures} failed` : ""}`).join("\n")
    : "No command usage logged yet.";

  const fmtTopUsers = topUsers.length
    ? topUsers.map((r, i) => `${i + 1}. <@${r.user_id}> — ${r.uses}`).join("\n")
    : "No users logged yet.";

  const fmtSlow = slowCommands.length
    ? slowCommands.map((r) => `/${r.command_name} — avg ${r.avg_ms || 0}ms, max ${r.max_ms || 0}ms (${r.samples})`).join("\n")
    : "No duration samples yet.";

  const fmtErrors = recentErrors.length
    ? recentErrors.map((r) => `/${r.command_name}: ${(r.error || "unknown").slice(0, 80)}\n${fmtTs(r.created_at)}`).join("\n\n")
    : "No recent command errors.";

  e.addFields(
    { name: "Top Commands", value: fmtTopCommands.slice(0, 1024), inline: false },
    { name: "Top Users", value: fmtTopUsers.slice(0, 1024), inline: false },
    { name: "Slowest Commands", value: fmtSlow.slice(0, 1024), inline: false },
    { name: "Recent Errors", value: fmtErrors.slice(0, 1024), inline: false },
  );
  return e;
}

async function buildBackupsPage(guildId, pageNo, pageTotal) {
  const e = base("Control Panel — Backups", "Backups", pageNo, pageTotal);
  const setting = await getBackupSetting(guildId).catch(() => null);

  let tableCount = "n/a";
  let rowCount = "n/a";
  try {
    const tables = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
    tableCount = String(tables.rows.length);
    let total = 0;
    for (const row of tables.rows) {
      const safe = String(row.tablename).replace(/\"/g, '\"\"');
      const c = await pool.query(`SELECT COUNT(*)::int AS n FROM "${safe}"`);
      total += c.rows?.[0]?.n || 0;
    }
    rowCount = String(total);
  } catch {}

  let nextBackup = "not scheduled";
  if (setting?.last_sent_at) {
    const next = new Date(new Date(setting.last_sent_at).getTime() + 7 * 24 * 60 * 60 * 1000);
    nextBackup = fmtTs(next);
  } else if (setting?.enabled) {
    nextBackup = "not sent yet; scheduler will send on next check";
  }

  e.addFields(
    { name: "Channel", value: setting?.channel_id ? `<#${setting.channel_id}>` : "not set", inline: true },
    { name: "Enabled", value: setting?.enabled ? "yes" : "no", inline: true },
    { name: "Interval", value: "7 days", inline: true },
    { name: "Last Backup", value: fmtTs(setting?.last_sent_at), inline: false },
    { name: "Next Backup", value: nextBackup, inline: false },
    { name: "Database Snapshot Size", value: `Tables: ${tableCount}\nRows: ${rowCount}`, inline: false },
    { name: "Actions", value: "Use the panel **Backup Now** button or `/test_backup` to send a fresh JSON backup.", inline: false },
  );
  return e;
}

async function buildPanelEmbed(client, guildId, page) {
  const p = (page || "overview").toLowerCase();
  const idx = Math.max(0, PAGES.indexOf(p));
  const pageName = PAGES[idx] || "overview";
  const pageNo = idx + 1;
  const pageTotal = PAGES.length;

  if (pageName === "channels") return buildChannelsPage(guildId, pageNo, pageTotal);
  if (pageName === "system") return buildSystemPage(client, guildId, pageNo, pageTotal);
  if (pageName === "diag") return buildDiagnosticsPage(client, guildId, pageNo, pageTotal);
  if (pageName === "usage") return buildUsagePage(guildId, pageNo, pageTotal);
  if (pageName === "backups") return buildBackupsPage(guildId, pageNo, pageTotal);

  if (pageName === "feed") {
    const feed = await getFeedSetting(guildId).catch(() => null);
    const e = base("Control Panel — Feed", "Feed", pageNo, pageTotal);
    e.setDescription([
      "**Feed Levels**",
      "1 = Critical",
      "2 = System",
      "3 = Activity",
      "",
      `Current: ${feed ? `<#${feed.channel_id}> (enabled: ${feed.enabled ? "true" : "false"}, level: ${feed.level || 2})` : "not set"}`,
      "",
      "Commands:",
      "• `/set_feed_channel`",
      "• `/feed_level`",
      "• `/feed_test`",
      "• `/simulate_feed` (Owner)",
    ].join("\n"));
    return e;
  }

  if (pageName === "perms") {
    const n = await getPermCount(guildId).catch(() => null);
    const e = base("Control Panel — Permissions", "Permissions", pageNo, pageTotal);
    e.setDescription([
      `Overrides configured: **${n === null ? "n/a" : n}**`,
      "",
      "Commands:",
      "• `/permissions_check`",
      "• `/perm_list`",
      "• `/perm_show`",
      "• `/perm_set`",
      "• `/perm_add_role`",
      "• `/perm_clear`",
    ].join("\n"));
    return e;
  }

  if (pageName === "logs") {
    const e = base("Control Panel — Logs", "Logs", pageNo, pageTotal);
    const rows = await listPanelEvents(guildId, 12).catch(() => []);
    if (!rows.length) {
      e.setDescription("No events logged yet.");
      return e;
    }
    e.setDescription(rows.map((r) => `[#${r.id}] [L${r.level}] ${r.kind} — ${r.message}\n${fmtTs(r.created_at)}`).join("\n\n"));
    e.setFooter({ text: `Panel • Logs • Page ${pageNo}/${pageTotal} • Showing ${rows.length}` });
    return e;
  }

  if (pageName === "sim") {
    const e = base("Control Panel — Simulation", "Simulation", pageNo, pageTotal);
    e.setDescription([
      "Owner-only test tools:",
      "• `/simulate_deploy`",
      "• `/simulate_error`",
      "• `/simulate_backup`",
      "• `/simulate_roblox`",
      "• `/simulate_feed`",
    ].join("\n"));
    return e;
  }

  const uptime = Math.floor(process.uptime());
  const mem = process.memoryUsage();
  const maintenance = await getMaintenanceEnabled().catch(() => false);
  const latency = await dbLatencyMs().then((n) => `${n}ms`).catch(() => "n/a");

  let deployCh = null, backupCh = null, feedCh = null, feedLevel = 2, errCh = null, robloxCh = null;
  try { const deploy = await getChannelSetting("deploy_channel_settings", guildId); if (deploy?.enabled && deploy?.channel_id) deployCh = `<#${deploy.channel_id}>`; } catch {}
  try { const backup = await getBackupSetting(guildId); if (backup?.enabled && backup?.channel_id) backupCh = `<#${backup.channel_id}>`; } catch {}
  try { const feed = await getFeedSetting(guildId); if (feed?.enabled && feed?.channel_id) feedCh = `<#${feed.channel_id}>`; if (feed?.level) feedLevel = feed.level; } catch {}
  try { const err = await getChannelSetting("error_alert_settings", guildId); if (err?.enabled && err?.channel_id) errCh = `<#${err.channel_id}>`; } catch {}
  try { const roblox = await getChannelSetting("roblox_alert_settings", guildId); if (roblox?.enabled && roblox?.channel_id) robloxCh = `<#${roblox.channel_id}>`; } catch {}

  const e = base("Control Panel — Overview", "Overview", pageNo, pageTotal);
  e.addFields(
    { name: "Servers", value: String(client.guilds.cache.size), inline: true },
    { name: "Uptime", value: formatUptime(uptime), inline: true },
    { name: "Ping", value: `${client.ws.ping}ms`, inline: true },
    { name: "Memory RSS", value: formatBytes(mem.rss), inline: true },
    { name: "DB Latency", value: latency, inline: true },
    { name: "Maintenance", value: maintenance ? "ON" : "OFF", inline: true },
    { name: "Node", value: process.version, inline: true },
    { name: "Environment", value: process.env.NODE_ENV || "unknown", inline: true },
    { name: "Platform", value: `${os.platform()} ${os.arch()}`, inline: true },
  );

  const ev = await listPanelEvents(guildId, 3).catch(() => []);
  e.setDescription([
    "Use the menu to navigate.",
    "",
    "**Quick Status**",
    `Deploy channel: ${deployCh || "not set"}`,
    `Backup channel: ${backupCh || "not set"}`,
    `Feed channel: ${feedCh || "not set"} (level: ${feedLevel})`,
    `Error alerts: ${errCh || "not set"}`,
    `Roblox alerts: ${robloxCh || "not set"}`,
    "",
    "Tip: Check **System**, **Usage**, and **Backups** for deeper diagnostics.",
    "",
    "**Recent Events**",
    ev.length ? ev.map((r) => `• ${r.kind}: ${r.message} (${fmtTs(r.created_at, "recently")})`).join("\n") : "(none yet)",
  ].join("\n"));
  return e;
}

module.exports = { buildPanelEmbed, PAGES };
