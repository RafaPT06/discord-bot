const express = require('express');
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

function patchExpressListen(client) {
  activeClient = client;
  if (listenPatched) return;
  listenPatched = true;
  const originalListen = express.application.listen;
  express.application.listen = function meowzListenWithServerLayoutDashboard(...args) {
    if (!this.locals.meowzServerLayoutRoutes) {
      this.locals.meowzServerLayoutRoutes = true;
      this.get('/api/guilds/:guildId/layout', getLayout);
      this.get('/api/guilds/:guildId/layout/snapshots', listSnapshots);
      this.post('/api/guilds/:guildId/layout/snapshots', createSnapshot);
      this.get('/api/guilds/:guildId/layout/snapshots/:snapshotId', getSnapshot);
      this.get('/api/guilds/:guildId/layout/snapshots/:snapshotId/diff', getSnapshotDiff);
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
