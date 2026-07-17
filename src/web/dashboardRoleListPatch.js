const express = require('express');
const { PermissionFlagsBits } = require('discord.js');
const {
  backfillDashboardRolesFromAuditLog,
  listDashboardRoleRecords,
  pruneDashboardRoleRecords,
} = require('../services/dashboardRoles');

let installed = false;
let listenPatched = false;
let activeClient = null;

function tokenAllowed(req) {
  const token = process.env.BOT_API_TOKEN || null;
  if (!token) return true;
  return req.headers.authorization === `Bearer ${token}`;
}

function rolePayload(guild, role, record) {
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
    createdByMeowz: true,
    dashboardCreatedAt: record?.created_at || null,
    dashboardCreatedBy: record?.created_by || null,
  };
}

async function listDashboardRoles(req, res) {
  if (!tokenAllowed(req)) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  try {
    const guild = activeClient?.guilds?.cache?.get(String(req.params.guildId || ''));
    if (!guild) return res.status(404).json({ ok: false, error: 'Guild not found.' });

    try { await guild.roles.fetch(); } catch {}
    await backfillDashboardRolesFromAuditLog(guild, activeClient?.user?.id);

    const records = await listDashboardRoleRecords(guild.id);
    const existingIds = [...guild.roles.cache.keys()];
    await pruneDashboardRoleRecords(guild.id, existingIds);

    const roles = records
      .map((record) => {
        const role = guild.roles.cache.get(String(record.role_id));
        return role ? rolePayload(guild, role, record) : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.position - a.position || String(a.name).localeCompare(String(b.name)));

    return res.json({
      ok: true,
      guildId: guild.id,
      roles,
      total: roles.length,
      filtered: 'meowz-created',
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      ok: false,
      error: error.message || 'Could not load Meowz-created roles.',
    });
  }
}

function patchExpressListen(client) {
  activeClient = client;
  if (listenPatched) return;
  listenPatched = true;
  const originalListen = express.application.listen;
  express.application.listen = function meowzListenWithDashboardRoleList(...args) {
    if (!this.locals.meowzDashboardRoleListRoute) {
      this.locals.meowzDashboardRoleListRoute = true;
      this.get('/api/guilds/:guildId/dashboard-roles', listDashboardRoles);
    }
    return originalListen.apply(this, args);
  };
}

function install() {
  if (installed) return;
  installed = true;
  const api = require('./api');
  const originalStartBotApi = api.startBotApi;
  api.startBotApi = function startBotApiWithDashboardRoleList(client) {
    patchExpressListen(client);
    return originalStartBotApi(client);
  };
}

module.exports = { install };
