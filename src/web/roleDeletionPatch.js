const express = require('express');
const { PermissionFlagsBits } = require('discord.js');
const { listLevelRewards, deleteLevelReward } = require('../services/leveling');

let installed = false;
let listenPatched = false;
let activeClient = null;

function tokenAllowed(req) {
  const token = process.env.BOT_API_TOKEN || null;
  if (!token) return true;
  return req.headers.authorization === `Bearer ${token}`;
}

function normalizeRoleId(value) {
  const roleId = String(value || '').trim();
  if (!/^\d{15,25}$/.test(roleId)) {
    const error = new Error('Invalid Discord role ID.');
    error.statusCode = 400;
    throw error;
  }
  return roleId;
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

async function deleteDashboardRole(req, res) {
  if (!tokenAllowed(req)) return res.status(401).json({ ok: false, error: 'Unauthorized' });

  try {
    const guild = activeClient?.guilds?.cache?.get(String(req.params.guildId || ''));
    if (!guild) return res.status(404).json({ ok: false, error: 'Guild not found.' });

    const me = guild.members.me || await guild.members.fetchMe().catch(() => null);
    if (!me?.permissions?.has(PermissionFlagsBits.ManageRoles)) {
      return res.status(403).json({ ok: false, error: 'Meowz needs Manage Roles permission to delete reward roles.' });
    }

    try { await guild.roles.fetch(); } catch {}

    const roleId = normalizeRoleId(req.params.roleId);
    const role = guild.roles.cache.get(roleId) || await guild.roles.fetch(roleId).catch(() => null);
    if (!role) return res.status(404).json({ ok: false, error: 'Discord role not found.' });

    const payload = rolePayload(guild, role);
    if (!payload.editable) {
      return res.status(403).json({ ok: false, error: 'Meowz cannot delete this role. Move the Meowz role above it and make sure it is not managed by an integration.' });
    }

    const expectedName = String(req.body?.expectedName || '').trim();
    if (!expectedName || expectedName !== role.name) {
      return res.status(400).json({ ok: false, error: 'The role name confirmation does not match.' });
    }

    const rewards = await listLevelRewards(guild.id);
    const affectedRewards = rewards.filter((reward) => String(reward.roleId) === role.id);
    const deletedBy = String(req.body?.deletedBy || '').trim();
    const reason = deletedBy
      ? `Deleted from the Meowz dashboard by Discord user ${deletedBy}`
      : 'Deleted from the Meowz dashboard';

    await role.delete(reason);

    const cleanupResults = await Promise.allSettled(
      affectedRewards.map((reward) => deleteLevelReward(guild.id, reward.level)),
    );
    const removedRewardLevels = affectedRewards
      .filter((_, index) => cleanupResults[index]?.status === 'fulfilled')
      .map((reward) => Number(reward.level));
    const cleanupErrors = cleanupResults
      .map((result, index) => ({ result, reward: affectedRewards[index] }))
      .filter(({ result }) => result?.status === 'rejected')
      .map(({ result, reward }) => ({
        level: Number(reward.level),
        error: result.reason?.message || 'Could not remove the reward mapping.',
      }));

    return res.json({
      ok: cleanupErrors.length === 0,
      deleted: true,
      guildId: guild.id,
      role: payload,
      affectedRewardLevels: affectedRewards.map((reward) => Number(reward.level)),
      removedRewardLevels,
      cleanupErrors,
      message: cleanupErrors.length
        ? `Deleted @${payload.name}, but some reward mappings could not be cleaned up.`
        : `Deleted @${payload.name}${removedRewardLevels.length ? ` and removed ${removedRewardLevels.length} reward mapping${removedRewardLevels.length === 1 ? '' : 's'}` : ''}.`,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      ok: false,
      error: err.message || 'Could not delete the Discord role.',
    });
  }
}

function patchExpressListen(client) {
  activeClient = client;
  if (listenPatched) return;
  listenPatched = true;

  const originalListen = express.application.listen;
  express.application.listen = function meowzListenWithRoleDeletion(...args) {
    if (!this.locals.meowzRoleDeletionRoute) {
      this.locals.meowzRoleDeletionRoute = true;
      this.delete('/api/guilds/:guildId/roles/:roleId', deleteDashboardRole);
    }
    return originalListen.apply(this, args);
  };
}

function install() {
  if (installed) return;
  installed = true;

  const api = require('./api');
  const originalStartBotApi = api.startBotApi;
  api.startBotApi = function startBotApiWithRoleDeletion(client) {
    patchExpressListen(client);
    return originalStartBotApi(client);
  };
}

module.exports = { install };
