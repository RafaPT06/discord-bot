const express = require('express');
const { ChannelType } = require('discord.js');
const {
  getBackupStatus,
  setBackupSettings,
  runBackupNow,
} = require('../services/backupScheduler');

let installed = false;
let listenPatched = false;
let activeClient = null;

function tokenAllowed(req) {
  const token = process.env.BOT_API_TOKEN || null;
  if (!token) return true;
  return req.headers.authorization === `Bearer ${token}`;
}

async function resolveGuild(req, res) {
  if (!tokenAllowed(req)) {
    res.status(401).json({ ok: false, error: 'Unauthorized' });
    return null;
  }

  const guild = activeClient?.guilds?.cache?.get(String(req.params.guildId || ''));
  if (!guild) {
    res.status(404).json({ ok: false, error: 'Guild not found.' });
    return null;
  }
  return guild;
}

async function validateBackupChannel(guild, channelId, enabled) {
  const clean = String(channelId || '').trim();
  if (!clean) {
    if (enabled) {
      const error = new Error('Choose a backup channel before enabling scheduled backups.');
      error.statusCode = 400;
      throw error;
    }
    return null;
  }

  if (!/^\d{15,25}$/.test(clean)) {
    const error = new Error('Choose a valid backup channel.');
    error.statusCode = 400;
    throw error;
  }

  const channel = guild.channels.cache.get(clean) || await guild.channels.fetch(clean).catch(() => null);
  if (!channel || channel.type !== ChannelType.GuildText) {
    const error = new Error('Backups must use a text channel in this server.');
    error.statusCode = 400;
    throw error;
  }

  return channel.id;
}

async function getBackups(req, res) {
  try {
    const guild = await resolveGuild(req, res);
    if (!guild) return;
    const status = await getBackupStatus(guild.id);
    return res.json({ ok: true, guildId: guild.id, settings: status, updatedAt: new Date().toISOString() });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ ok: false, error: err.message || 'Could not load backup settings.' });
  }
}

async function updateBackups(req, res) {
  try {
    const guild = await resolveGuild(req, res);
    if (!guild) return;

    const enabled = Boolean(req.body?.enabled);
    const channelId = await validateBackupChannel(guild, req.body?.channelId, enabled);
    await setBackupSettings(guild.id, { channelId, enabled });
    const status = await getBackupStatus(guild.id);

    return res.json({ ok: true, guildId: guild.id, settings: status, updatedAt: new Date().toISOString() });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ ok: false, error: err.message || 'Could not save backup settings.' });
  }
}

async function runBackup(req, res) {
  try {
    const guild = await resolveGuild(req, res);
    if (!guild) return;

    const status = await runBackupNow(activeClient, guild.id, 'dashboard-manual');
    return res.json({
      ok: true,
      guildId: guild.id,
      settings: status,
      message: `Backup sent to <#${status.channelId}>.`,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ ok: false, error: err.message || 'Could not run backup.' });
  }
}

function patchExpressListen(client) {
  activeClient = client;
  if (listenPatched) return;
  listenPatched = true;

  const originalListen = express.application.listen;
  express.application.listen = function meowzListenWithBackupDashboard(...args) {
    if (!this.locals.meowzBackupDashboardRoutes) {
      this.locals.meowzBackupDashboardRoutes = true;
      this.get('/api/guilds/:guildId/backups', getBackups);
      this.put('/api/guilds/:guildId/backups', updateBackups);
      this.post('/api/guilds/:guildId/backups/run', runBackup);
    }
    return originalListen.apply(this, args);
  };
}

function install() {
  if (installed) return;
  installed = true;

  const api = require('./api');
  const originalStartBotApi = api.startBotApi;
  api.startBotApi = function startBotApiWithBackupDashboard(client) {
    patchExpressListen(client);
    return originalStartBotApi(client);
  };
}

module.exports = { install, validateBackupChannel };
