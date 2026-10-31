const express = require('express');
const {
  captureServerLayout,
  createLayoutSnapshot,
  listLayoutSnapshots,
  getLayoutSnapshot,
  diffLayoutSnapshot,
} = require('../services/serverLayout');
const { restoreServerLayout } = require('../services/serverLayoutRestore');

let installed = false;
let listenPatched = false;
let activeClient = null;
const restoreLocks = new Set();

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

async function restoreSnapshot(req, res) {
  const guild = await resolveGuild(req, res);
  if (!guild) return;
  if (restoreLocks.has(guild.id)) return res.status(409).json({ ok: false, error: 'A Server Layout restore is already running for this server.' });
  const mode = String(req.body?.mode || 'merge').toLowerCase() === 'replace' ? 'replace' : 'merge';
  if (mode === 'replace' && String(req.body?.confirmServerName || '') !== guild.name) {
    return res.status(400).json({ ok: false, error: 'Replace mode requires the exact current server name as confirmation.' });
  }
  restoreLocks.add(guild.id);
  try {
    const snapshot = await getLayoutSnapshot(guild.id, req.params.snapshotId);
    if (!snapshot) return res.status(404).json({ ok: false, error: 'Snapshot not found.' });
    const result = await restoreServerLayout(guild, snapshot, {
      mode,
      actorId: normalizeText(req.body?.actorId, 30),
    });
    return res.json({ ok: true, guildId: guild.id, result });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message || 'Could not restore server layout.' });
  } finally {
    restoreLocks.delete(guild.id);
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
      this.post('/api/guilds/:guildId/layout/snapshots/:snapshotId/restore', restoreSnapshot);
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
