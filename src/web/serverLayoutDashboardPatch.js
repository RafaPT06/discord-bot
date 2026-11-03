const express = require('express');
const music = require('../services/musicPlayback');
const { listVoiceChannels, currentVoiceState, joinSelectedChannel, disconnectVoice } = require('../services/musicVoiceControl');
const { preflightRestore } = require('../services/serverLayoutRestorePreflight');
const {
  captureServerLayout,
  createLayoutSnapshot,
  listLayoutSnapshots,
  getLayoutSnapshot,
  diffLayoutSnapshot,
} = require('../services/serverLayout');

let installed = false;
let listenPatched = false;
let activeClient = null;

function tokenAllowed(req) {
  const token = process.env.BOT_API_TOKEN;
  // Fail closed: a missing API secret must never expose guild layout data.
  if (!token || !token.trim()) return false;
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

function normalizeText(value, maxLength) {
  const text = String(value || '').trim();
  return text ? text.slice(0, maxLength) : null;
}

async function getLayout(req, res) {
  try {
    const guild = await resolveGuild(req, res);
    if (!guild) return;
    const layout = await captureServerLayout(guild);
    return res.json({ ok: true, guildId: guild.id, layout });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message || 'Could not capture server layout.' });
  }
}

async function listSnapshots(req, res) {
  try {
    const guild = await resolveGuild(req, res);
    if (!guild) return;
    const snapshots = await listLayoutSnapshots(guild.id);
    return res.json({ ok: true, guildId: guild.id, snapshots });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message || 'Could not list server layout snapshots.' });
  }
}

async function createSnapshot(req, res) {
  try {
    const guild = await resolveGuild(req, res);
    if (!guild) return;
    const snapshot = await createLayoutSnapshot(guild, {
      name: normalizeText(req.body?.name, 100),
      reason: normalizeText(req.body?.reason, 500),
      createdBy: normalizeText(req.body?.createdBy, 30),
    });
    return res.status(201).json({ ok: true, guildId: guild.id, snapshot });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message || 'Could not create server layout snapshot.' });
  }
}

async function getSnapshot(req, res) {
  try {
    const guild = await resolveGuild(req, res);
    if (!guild) return;
    const snapshot = await getLayoutSnapshot(guild.id, req.params.snapshotId);
    if (!snapshot) return res.status(404).json({ ok: false, error: 'Snapshot not found.' });
    return res.json({ ok: true, guildId: guild.id, snapshot });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message || 'Could not load server layout snapshot.' });
  }
}

async function getSnapshotDiff(req, res) {
  try {
    const guild = await resolveGuild(req, res);
    if (!guild) return;
    const snapshot = await getLayoutSnapshot(guild.id, req.params.snapshotId);
    if (!snapshot) return res.status(404).json({ ok: false, error: 'Snapshot not found.' });
    const diff = await diffLayoutSnapshot(guild, snapshot);
    return res.json({ ok: true, guildId: guild.id, diff });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message || 'Could not compare server layout snapshot.' });
  }
}

async function getRestorePreflight(req, res) {
  try {
    const guild = await resolveGuild(req, res);
    if (!guild) return;
    const snapshot = await getLayoutSnapshot(guild.id, req.params.snapshotId);
    if (!snapshot) return res.status(404).json({ ok: false, error: 'Snapshot not found.' });
    await Promise.all([guild.roles.fetch(), guild.channels.fetch(), guild.members.fetchMe()]);
    const mode = String(req.query.mode || 'merge').toLowerCase();
    const preflight = preflightRestore(guild, snapshot, mode);
    return res.json({ ok: true, guildId: guild.id, preflight });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message || 'Could not validate restore preflight.' });
  }
}

async function getVoiceChannels(req, res) {
  try {
    const guild = await resolveGuild(req, res);
    if (!guild) return;
    await Promise.all([guild.channels.fetch(), guild.members.fetchMe()]);
    return res.json({ ok: true, guildId: guild.id, channels: listVoiceChannels(guild), voice: currentVoiceState(guild) });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Could not load voice channels.' });
  }
}

async function joinVoice(req, res) {
  try {
    const guild = await resolveGuild(req, res);
    if (!guild) return;
    const channelId = String(req.body?.channelId || '');
    if (!/^\d{16,22}$/.test(channelId)) return res.status(400).json({ ok: false, error: 'Invalid voice channel ID.' });
    await guild.channels.fetch();
    const voice = await joinSelectedChannel(guild, channelId);
    return res.json({ ok: true, guildId: guild.id, voice });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ ok: false, error: err.message || 'Could not join voice channel.' });
  }
}

async function leaveVoice(req, res) {
  try {
    const guild = await resolveGuild(req, res);
    if (!guild) return;
    music.cleanup(guild.id);
    return res.json({ ok: true, guildId: guild.id, voice: disconnectVoice(guild) });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ ok: false, error: err.message || 'Could not disconnect voice.' });
  }
}

async function musicState(req, res) {
  const guild = await resolveGuild(req, res);
  if (!guild) return;
  return res.json({ ok: true, music: music.state(guild.id) });
}
async function musicEnqueue(req, res) {
  const guild = await resolveGuild(req, res);
  if (!guild) return;
  try { return res.json({ ok: true, music: music.enqueue(guild.id, String(req.body?.trackId || '')) }); }
  catch (err) { return res.status(err.statusCode || 500).json({ ok: false, error: err.message }); }
}
async function musicControl(req, res) {
  const guild = await resolveGuild(req, res);
  if (!guild) return;
  try { return res.json({ ok: true, music: music.control(guild.id, String(req.body?.action || '')) }); }
  catch (err) { return res.status(err.statusCode || 500).json({ ok: false, error: err.message }); }
}

function patchExpressListen(client) {
  activeClient = client;
  if (listenPatched) return;
  listenPatched = true;
  const originalListen = express.application.listen;
  express.application.listen = function meowzListenWithServerLayoutDashboard(...args) {
    if (!this.locals.meowzServerLayoutRoutes) {
      this.locals.meowzServerLayoutRoutes = true;
      this.get('/api/guilds/:guildId/music/player', musicState);
      this.post('/api/guilds/:guildId/music/player/queue', musicEnqueue);
      this.post('/api/guilds/:guildId/music/player/control', musicControl);
      this.get('/api/guilds/:guildId/music/voice', getVoiceChannels);
      this.post('/api/guilds/:guildId/music/voice/join', joinVoice);
      this.post('/api/guilds/:guildId/music/voice/leave', leaveVoice);
      this.get('/api/guilds/:guildId/layout', getLayout);
      this.get('/api/guilds/:guildId/layout/snapshots', listSnapshots);
      this.post('/api/guilds/:guildId/layout/snapshots', createSnapshot);
      this.get('/api/guilds/:guildId/layout/snapshots/:snapshotId', getSnapshot);
      this.get('/api/guilds/:guildId/layout/snapshots/:snapshotId/diff', getSnapshotDiff);
      this.get('/api/guilds/:guildId/layout/snapshots/:snapshotId/restore-preflight', getRestorePreflight);
    }
    return originalListen.apply(this, args);
  };
}

function install() {
  if (installed) return;
  installed = true;
  const api = require('./api');
  const originalStartBotApi = api.startBotApi;
  api.startBotApi = function startBotApiWithServerLayout(client) {
    patchExpressListen(client);
    return originalStartBotApi(client);
  };
}

module.exports = { install };
