const { ChannelType, PermissionFlagsBits } = require('discord.js');
const {
  VoiceConnectionStatus,
  entersState,
  getVoiceConnection,
  joinVoiceChannel,
} = require('@discordjs/voice');
const { pool } = require('../db/pool');

const reconnectTimers = new Map();
const reconnectAttempts = new Map();
const intentionalDisconnects = new Set();
const MAX_RECONNECT_DELAY_MS = 60_000;

async function getPersistentVoiceSetting(guildId) {
  const { rows } = await pool.query(
    `SELECT guild_id, channel_id, enabled, updated_by, updated_at
     FROM persistent_voice_settings
     WHERE guild_id = $1
     LIMIT 1`,
    [guildId]
  );
  return rows[0] || null;
}

async function listPersistentVoiceSettings() {
  const { rows } = await pool.query(
    `SELECT guild_id, channel_id, enabled, updated_by, updated_at
     FROM persistent_voice_settings
     WHERE enabled = TRUE
     ORDER BY guild_id`
  );
  return rows;
}

async function savePersistentVoiceSetting(guildId, channelId, updatedBy = null) {
  const { rows } = await pool.query(
    `INSERT INTO persistent_voice_settings (guild_id, channel_id, enabled, updated_by, updated_at)
     VALUES ($1, $2, TRUE, $3, NOW())
     ON CONFLICT (guild_id)
     DO UPDATE SET channel_id = EXCLUDED.channel_id,
                   enabled = TRUE,
                   updated_by = EXCLUDED.updated_by,
                   updated_at = NOW()
     RETURNING guild_id, channel_id, enabled, updated_by, updated_at`,
    [guildId, channelId, updatedBy]
  );
  return rows[0];
}

async function disablePersistentVoice(guildId, updatedBy = null) {
  await pool.query(
    `UPDATE persistent_voice_settings
     SET enabled = FALSE, updated_by = $2, updated_at = NOW()
     WHERE guild_id = $1`,
    [guildId, updatedBy]
  );
}

function clearReconnectTimer(guildId) {
  const timer = reconnectTimers.get(guildId);
  if (timer) clearTimeout(timer);
  reconnectTimers.delete(guildId);
}

function validateVoiceChannel(guild, channel) {
  if (!channel || channel.guildId !== guild.id) throw new Error('Voice channel not found.');
  if (![ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(channel.type)) {
    throw new Error('That channel is not a voice channel.');
  }

  const me = guild.members.me;
  const permissions = channel.permissionsFor(me);
  if (!permissions?.has(PermissionFlagsBits.ViewChannel) || !permissions.has(PermissionFlagsBits.Connect)) {
    throw new Error(`Meowz cannot connect to ${channel.name}. Give it View Channel and Connect permissions.`);
  }
}

async function connectPersistentVoice(client, guildId, channelId, options = {}) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) throw new Error('Guild is not available to Meowz.');

  const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
  validateVoiceChannel(guild, channel);

  clearReconnectTimer(guildId);
  intentionalDisconnects.delete(guildId);

  const existing = getVoiceConnection(guildId);
  if (existing?.joinConfig?.channelId === channelId) return { connection: existing, channel };
  if (existing) existing.destroy();

  const connection = joinVoiceChannel({
    channelId,
    guildId,
    adapterCreator: guild.voiceAdapterCreator,
    selfDeaf: true,
    selfMute: false,
  });

  attachConnectionRecovery(client, guildId, connection);

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, options.timeoutMs || 20_000);
    reconnectAttempts.set(guildId, 0);
  } catch (err) {
    connection.destroy();
    throw new Error(`Could not establish the voice connection: ${err.message || err}`);
  }

  return { connection, channel };
}

function scheduleReconnect(client, guildId) {
  if (intentionalDisconnects.has(guildId) || reconnectTimers.has(guildId)) return;

  const attempt = (reconnectAttempts.get(guildId) || 0) + 1;
  reconnectAttempts.set(guildId, attempt);
  const delay = Math.min(MAX_RECONNECT_DELAY_MS, 2_000 * (2 ** Math.min(attempt - 1, 5)));

  const timer = setTimeout(async () => {
    reconnectTimers.delete(guildId);
    try {
      const setting = await getPersistentVoiceSetting(guildId);
      if (!setting?.enabled) return;
      await connectPersistentVoice(client, guildId, setting.channel_id);
      console.log(`Persistent voice reconnected in guild ${guildId}.`);
    } catch (err) {
      console.warn(`Persistent voice reconnect failed for guild ${guildId}:`, err.message || err);
      scheduleReconnect(client, guildId);
    }
  }, delay);
  timer.unref?.();
  reconnectTimers.set(guildId, timer);
}

function attachConnectionRecovery(client, guildId, connection) {
  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    if (intentionalDisconnects.has(guildId)) return;
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
      ]);
    } catch {
      try { connection.destroy(); } catch {}
      scheduleReconnect(client, guildId);
    }
  });

  connection.on(VoiceConnectionStatus.Destroyed, () => {
    if (!intentionalDisconnects.has(guildId)) scheduleReconnect(client, guildId);
  });

  connection.on('error', (err) => {
    console.warn(`Persistent voice error for guild ${guildId}:`, err.message || err);
  });
}

async function enablePersistentVoice(client, guildId, channelId, updatedBy = null) {
  const result = await connectPersistentVoice(client, guildId, channelId);
  try {
    await savePersistentVoiceSetting(guildId, channelId, updatedBy);
  } catch (err) {
    intentionalDisconnects.add(guildId);
    clearReconnectTimer(guildId);
    try { result.connection.destroy(); } catch {}
    throw err;
  }
  return result;
}

async function leavePersistentVoice(guildId, updatedBy = null) {
  intentionalDisconnects.add(guildId);
  clearReconnectTimer(guildId);
  reconnectAttempts.delete(guildId);
  await disablePersistentVoice(guildId, updatedBy);
  const connection = getVoiceConnection(guildId);
  if (connection) connection.destroy();
}

async function restorePersistentVoiceConnections(client) {
  const settings = await listPersistentVoiceSettings();
  if (!settings.length) return;

  const results = await Promise.allSettled(settings.map(async (setting) => {
    try {
      await connectPersistentVoice(client, setting.guild_id, setting.channel_id);
      console.log(`Persistent voice restored for guild ${setting.guild_id}.`);
    } catch (err) {
      console.warn(`Persistent voice restore failed for guild ${setting.guild_id}:`, err.message || err);
      scheduleReconnect(client, setting.guild_id);
      throw err;
    }
  }));

  const restored = results.filter((result) => result.status === 'fulfilled').length;
  console.log(`Persistent voice: restored ${restored}/${settings.length} configured connection(s).`);
}

module.exports = {
  enablePersistentVoice,
  getPersistentVoiceSetting,
  leavePersistentVoice,
  restorePersistentVoiceConnections,
};
