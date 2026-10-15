const { AttachmentBuilder, EmbedBuilder } = require("discord.js");
const { pool } = require("../db/pool");
const { BRAND_COLORS } = require("../utils/brandColors");
const { dumpAllTables } = require("./backupDump");

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS backup_channel_settings (
      guild_id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      last_sent_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function setBackupChannel(guildId, channelId) {
  await ensureTables();
  await pool.query(
    `INSERT INTO backup_channel_settings (guild_id, channel_id, enabled, created_at, updated_at)
     VALUES ($1,$2,TRUE,NOW(),NOW())
     ON CONFLICT (guild_id)
     DO UPDATE SET channel_id=EXCLUDED.channel_id, enabled=TRUE, updated_at=NOW()` ,
    [guildId, channelId],
  );
}

async function setBackupSettings(guildId, { channelId, enabled = true } = {}) {
  await ensureTables();
  const cleanChannelId = String(channelId || '').trim();

  if (!cleanChannelId) {
    if (enabled) {
      const error = new Error('A backup channel is required when backups are enabled.');
      error.statusCode = 400;
      throw error;
    }
    await resetBackupChannel(guildId);
    return null;
  }

  await pool.query(
    `INSERT INTO backup_channel_settings (guild_id, channel_id, enabled, created_at, updated_at)
     VALUES ($1,$2,$3,NOW(),NOW())
     ON CONFLICT (guild_id)
     DO UPDATE SET channel_id=EXCLUDED.channel_id, enabled=EXCLUDED.enabled, updated_at=NOW()`,
    [guildId, cleanChannelId, Boolean(enabled)],
  );

  return getBackupSetting(guildId);
}

async function getBackupSetting(guildId) {
  await ensureTables();
  const res = await pool.query(
    "SELECT guild_id, channel_id, enabled, last_sent_at FROM backup_channel_settings WHERE guild_id=$1",
    [guildId],
  );
  return res.rows?.[0] || null;
}

async function resetBackupChannel(guildId) {
  await ensureTables();
  await pool.query("DELETE FROM backup_channel_settings WHERE guild_id=$1", [guildId]);
}

async function listEnabledBackupChannels() {
  await ensureTables();
  const res = await pool.query(
    "SELECT guild_id, channel_id, enabled, last_sent_at FROM backup_channel_settings WHERE enabled=TRUE",
  );
  return res.rows || [];
}

function buildBackupEmbed(filename, tablesCount) {
  return new EmbedBuilder()
    .setTitle("Database Backup")
    .setColor(BRAND_COLORS.backup)
    .setDescription(
      [
        `File: **${filename}**`,
        `Tables: **${tablesCount}**`,
        `Time: <t:${Math.floor(Date.now() / 1000)}:F> (<t:${Math.floor(Date.now() / 1000)}:R>)`,
      ].join("\n"),
    );
}

async function sendBackupToChannel(client, channelId, reason = "scheduled") {
  const dump = await dumpAllTables();
  const date = new Date().toISOString().slice(0, 10);
  const filename = `backup-${date}.json`;
  const buf = Buffer.from(JSON.stringify(dump, null, 2));

  const ch = await client.channels.fetch(channelId).catch(() => null);
  if (!ch || !ch.isTextBased()) return false;

  const embed = buildBackupEmbed(filename, dump.meta?.tables?.length || 0);
  embed.setFooter({ text: `Reason: ${reason}` });

  const file = new AttachmentBuilder(buf, { name: filename });
  await ch.send({ embeds: [embed], files: [file] });
  return true;
}

async function markSent(guildId) {
  await ensureTables();
  await pool.query(
    "UPDATE backup_channel_settings SET last_sent_at=NOW(), updated_at=NOW() WHERE guild_id=$1",
    [guildId],
  );
}

function msSince(date) {
  if (!date) return Infinity;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return Infinity;
  return Date.now() - d.getTime();
}

function getNextDueAt(setting) {
  if (!setting?.enabled || !setting?.channel_id) return null;
  if (!setting.last_sent_at) return new Date().toISOString();
  const last = new Date(setting.last_sent_at);
  if (Number.isNaN(last.getTime())) return new Date().toISOString();
  return new Date(last.getTime() + WEEK_MS).toISOString();
}

async function getBackupStatus(guildId) {
  const setting = await getBackupSetting(guildId);
  return {
    configured: Boolean(setting?.channel_id),
    enabled: Boolean(setting?.enabled),
    channelId: setting?.channel_id ? String(setting.channel_id) : null,
    lastSentAt: setting?.last_sent_at ? new Date(setting.last_sent_at).toISOString() : null,
    nextDueAt: getNextDueAt(setting),
    intervalDays: 7,
  };
}

async function runBackupNow(client, guildId, reason = 'dashboard-manual') {
  const setting = await getBackupSetting(guildId);
  if (!setting?.channel_id) {
    const error = new Error('No backup channel is configured for this server.');
    error.statusCode = 400;
    throw error;
  }

  const ok = await sendBackupToChannel(client, setting.channel_id, reason);
  if (!ok) {
    const error = new Error('Backup could not be sent. Check the channel and bot permissions.');
    error.statusCode = 502;
    throw error;
  }

  await markSent(guildId);
  return getBackupStatus(guildId);
}

async function tick(client) {
  const rows = await listEnabledBackupChannels();
  if (!rows.length) return;

  for (const r of rows) {
    if (msSince(r.last_sent_at) >= WEEK_MS) {
      const ok = await sendBackupToChannel(client, r.channel_id, "scheduled").catch(() => false);
      if (ok) await markSent(r.guild_id).catch(() => {});
    }
  }
}

let started = false;
function startBackupScheduler(client) {
  if (started) return;
  started = true;

  setTimeout(() => tick(client).catch(() => {}), 30_000);
  setInterval(() => tick(client).catch(() => {}), 60 * 60 * 1000);
}

module.exports = {
  startBackupScheduler,
  setBackupChannel,
  setBackupSettings,
  getBackupSetting,
  getBackupStatus,
  getNextDueAt,
  resetBackupChannel,
  sendBackupToChannel,
  runBackupNow,
};
