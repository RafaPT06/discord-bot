const express = require('express');
const { PermissionFlagsBits } = require('discord.js');

let installed = false;
let listenPatched = false;
let activeClient = null;

function normalizeRoleName(value) {
  const name = String(value || '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!name || name.length > 100) {
    const error = new Error('Role name must be between 1 and 100 characters.');
    error.statusCode = 400;
    throw error;
  }

  if (name.toLowerCase() === '@everyone') {
    const error = new Error('The @everyone role cannot be created or replaced.');
    error.statusCode = 400;
    throw error;
  }

  return name;
}

function rolePayload(guild, role) {
  const me = guild.members.me;
  const editable = Boolean(
    role
    && !role.managed
    && role.id !== guild.id
    && me?.permissions?.has(PermissionFlagsBits.ManageRoles)
    && role.comparePositionTo(me.roles.highest) < 0
  );

  return {
    id: role.id,
    name: role.name,
    color: role.hexColor || null,
    position: role.position || 0,
    managed: Boolean(role.managed),
    editable,
  };
}

function tokenAllowed(req) {
  const token = process.env.BOT_API_TOKEN || null;
  if (!token) return true;
  return req.headers.authorization === `Bearer ${token}`;
}

async function createDashboardRole(req, res) {
  if (!tokenAllowed(req)) return res.status(401).json({ ok: false, error: 'Unauthorized' });

  try {
    const client = activeClient;
    const guild = client?.guilds?.cache?.get(String(req.params.guildId || ''));
    if (!guild) return res.status(404).json({ ok: false, error: 'Guild not found.' });

    const me = guild.members.me || await guild.members.fetchMe().catch(() => null);
    if (!me?.permissions?.has(PermissionFlagsBits.ManageRoles)) {
      return res.status(403).json({ ok: false, error: 'Meowz needs Manage Roles permission to create reward roles.' });
    }

    try { await guild.roles.fetch(); } catch {}

    const name = normalizeRoleName(req.body?.name);
    const duplicate = guild.roles.cache.find((role) => !role.managed && role.name.toLowerCase() === name.toLowerCase());
    if (duplicate) {
      const role = rolePayload(guild, duplicate);
      if (!role.editable) {
        return res.status(409).json({ ok: false, error: 'A role with this name already exists but Meowz cannot manage it.' });
      }
      return res.json({
        ok: true,
        created: false,
        existing: true,
        guildId: guild.id,
        role,
        message: 'An editable role with this name already exists and was selected.',
        updatedAt: new Date().toISOString(),
      });
    }

    const createdBy = String(req.body?.createdBy || '').trim();
    const reason = createdBy
      ? `Created from the Meowz dashboard by Discord user ${createdBy}`
      : 'Created from the Meowz dashboard for a level reward';

    const createdRole = await guild.roles.create({ name, reason });
    const role = rolePayload(guild, createdRole);

    return res.status(201).json({
      ok: true,
      created: true,
      existing: false,
      guildId: guild.id,
      role,
      message: `Created @${role.name}.`,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      ok: false,
      error: err.message || 'Could not create the Discord role.',
    });
  }
}

function patchExpressListen(client) {
  activeClient = client;
  if (listenPatched) return;
  listenPatched = true;

  const originalListen = express.application.listen;
  express.application.listen = function meowzListenWithRoleCreation(...args) {
    if (!this.locals.meowzRoleCreationRoute) {
      this.locals.meowzRoleCreationRoute = true;
      this.post('/api/guilds/:guildId/roles', createDashboardRole);
    }
    return originalListen.apply(this, args);
  };
}

function install() {
  if (installed) return;
  installed = true;

  const api = require('./api');
  const originalStartBotApi = api.startBotApi;
  api.startBotApi = function startBotApiWithRoleCreation(client) {
    patchExpressListen(client);
    return originalStartBotApi(client);
  };
}

module.exports = { install };
