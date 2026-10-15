const express = require('express');
const { ChannelType } = require('discord.js');
const { getSettings, setSettings, disable } = require('../services/starboard');

let installed = false;
let listenPatched = false;
let activeClient = null;

function tokenAllowed(req) {
  const token = process.env.BOT_API_TOKEN || null;
  if (!token) return true;
  return req.headers.authorization === `Bearer ${token}`;
}

function normalizeThreshold(value) {
  const threshold = Number(value ?? 3);
  if (!Number.isInteger(threshold) || threshold < 1 || threshold > 50) {
    const error = new Error('Starboard threshold must be a whole number between 1 and 50.');
    error.statusCode = 400;
    throw error;
  }
  return threshold;
}

function normalizeEmoji(value) {
  const raw = String(value || '⭐').trim();
  if (!raw || raw.length > 64) {
    const error = new Error('Starboard emoji must be between 1 and 64 characters.');
    error.statusCode = 400;
    throw error;
  }

  const custom = raw.match(/^<a?:([A-Za-z0-9_]{2,32}):\d{15,25}>$/);
  return custom ? custom[1] : raw;
}

function normalizeSettings(settings = null) {
  return {
    enabled: Boolean(settings?.enabled),
    channelId: settings?.channel_id ? String(settings.channel_id) : null,
    threshold: Number(settings?.threshold || 3),
    emoji: String(settings?.emoji || '⭐'),
  };
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

async function getStarboardSettings(req, res) {
  try {
    const guild = await resolveGuild(req, res);
    if (!guild) return;
    const settings = normalizeSettings(await getSettings(guild.id));
    return res.json({ ok: true, guildId: guild.id, settings, updatedAt: new Date().toISOString() });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ ok: false, error: err.message || 'Could not load starboard settings.' });
  }
}

async function updateStarboardSettings(req, res) {
  try {
    const guild = await resolveGuild(req, res);
    if (!guild) return;

    const enabled = Boolean(req.body?.enabled);
    if (!enabled) {
      await disable(guild.id);
      return res.json({
        ok: true,
        guildId: guild.id,
        settings: normalizeSettings(await getSettings(guild.id)),
        updatedAt: new Date().toISOString(),
      });
    }

    const channelId = String(req.body?.channelId || '').trim();
    if (!/^\d{15,25}$/.test(channelId)) {
      return res.status(400).json({ ok: false, error: 'Choose a valid starboard channel.' });
    }

    const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
    if (!channel || channel.type !== ChannelType.GuildText) {
      return res.status(400).json({ ok: false, error: 'Starboard must use a text channel in this server.' });
    }

    const threshold = normalizeThreshold(req.body?.threshold);
    const emoji = normalizeEmoji(req.body?.emoji);
    await setSettings(guild.id, channel.id, threshold, emoji);

    return res.json({
      ok: true,
      guildId: guild.id,
      settings: normalizeSettings(await getSettings(guild.id)),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ ok: false, error: err.message || 'Could not save starboard settings.' });
  }
}

function patchExpressListen(client) {
  activeClient = client;
  if (listenPatched) return;
  listenPatched = true;

  const originalListen = express.application.listen;
  express.application.listen = function meowzListenWithStarboardDashboard(...args) {
    if (!this.locals.meowzStarboardDashboardRoutes) {
      this.locals.meowzStarboardDashboardRoutes = true;
      this.get('/api/guilds/:guildId/starboard', getStarboardSettings);
      this.put('/api/guilds/:guildId/starboard', updateStarboardSettings);
    }
    return originalListen.apply(this, args);
  };
}

function install() {
  if (installed) return;
  installed = true;

  const api = require('./api');
  const originalStartBotApi = api.startBotApi;
  api.startBotApi = function startBotApiWithStarboardDashboard(client) {
    patchExpressListen(client);
    return originalStartBotApi(client);
  };
}

module.exports = {
  install,
  normalizeEmoji,
  normalizeSettings,
  normalizeThreshold,
};
