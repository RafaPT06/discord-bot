const { ChannelType, OverwriteType } = require('discord.js');
const { createLayoutSnapshot } = require('./serverLayout');

const asArray = (value) => Array.isArray(value) ? value : [];
const sid = (value) => String(value || '');
const byPosition = (a, b) => Number(a.position || 0) - Number(b.position || 0);

function roleOptions(role) {
  return {
    name: role.name,
    color: Number(role.color || 0),
    hoist: Boolean(role.hoist),
    permissions: BigInt(role.permissions || '0'),
    mentionable: Boolean(role.mentionable),
    reason: 'Meowz Server Layout restore',
  };
}

function channelOptions(channel, parentId = null) {
  const options = {
    name: channel.name,
    type: Number(channel.type),
    parent: parentId || null,
    reason: 'Meowz Server Layout restore',
  };
  for (const key of ['topic','nsfw','rateLimitPerUser','bitrate','userLimit','rtcRegion','videoQualityMode','defaultAutoArchiveDuration','defaultThreadRateLimitPerUser','defaultSortOrder','defaultForumLayout']) {
    if (channel[key] !== undefined && channel[key] !== null) options[key] = channel[key];
  }
  if (Array.isArray(channel.availableTags)) options.availableTags = channel.availableTags;
  return options;
}

function remapOverwrites(overwrites, roleMap, guild) {
  return asArray(overwrites).map((overwrite) => {
    const oldId = sid(overwrite.id);
    const mappedRole = roleMap.get(oldId);
    const id = mappedRole || (oldId === sid(guild.id) ? guild.id : oldId);
    return {
      id,
      type: Number(overwrite.type) === 1 ? OverwriteType.Member : OverwriteType.Role,
      allow: BigInt(overwrite.allow || '0'),
      deny: BigInt(overwrite.deny || '0'),
    };
  });
}

async function restoreServerLayout(guild, snapshot, { mode = 'merge', actorId = null } = {}) {
  if (!guild || !snapshot?.layout) throw new Error('A guild and saved layout snapshot are required.');
  const restoreMode = mode === 'replace' ? 'replace' : 'merge';
  const saved = snapshot.layout;
  const safetySnapshot = await createLayoutSnapshot(guild, {
    name: `Auto backup before restore ${snapshot.id}`,
    reason: `Automatic safety snapshot before ${restoreMode} restore`,
    createdBy: actorId,
  });

  await Promise.all([guild.roles.fetch(), guild.channels.fetch()]);
  const roleMap = new Map();
  const channelMap = new Map();
  const created = { roles: [], channels: [] };
  const updated = { roles: [], channels: [] };
  const removed = { roles: [], channels: [] };
  const skipped = [];

  const savedRoles = asArray(saved.roles).filter((role) => !role.managed).sort(byPosition);
  for (const roleData of savedRoles) {
    const oldId = sid(roleData.id);
    let role = guild.roles.cache.get(oldId);
    if (role?.managed) { skipped.push({ kind: 'role', id: oldId, name: roleData.name, reason: 'Managed role' }); continue; }
    if (role) {
      await role.edit(roleOptions(roleData));
      updated.roles.push({ oldId, id: role.id, name: role.name });
    } else {
      role = await guild.roles.create(roleOptions(roleData));
      created.roles.push({ oldId, id: role.id, name: role.name });
    }
    roleMap.set(oldId, role.id);
  }

  const categories = asArray(saved.channels).filter((channel) => Number(channel.type) === ChannelType.GuildCategory).sort(byPosition);
  const children = asArray(saved.channels).filter((channel) => Number(channel.type) !== ChannelType.GuildCategory).sort(byPosition);
  for (const channelData of [...categories, ...children]) {
    const oldId = sid(channelData.id);
    const parentId = channelData.parentId ? (channelMap.get(sid(channelData.parentId)) || sid(channelData.parentId)) : null;
    let channel = guild.channels.cache.get(oldId);
    if (channel && Number(channel.type) !== Number(channelData.type)) {
      skipped.push({ kind: 'channel', id: oldId, name: channelData.name, reason: 'Channel type changed; automatic conversion is unsafe' });
      continue;
    }
    if (channel) {
      await channel.edit(channelOptions(channelData, parentId));
      updated.channels.push({ oldId, id: channel.id, name: channel.name });
    } else {
      channel = await guild.channels.create(channelOptions(channelData, parentId));
      created.channels.push({ oldId, id: channel.id, name: channel.name });
    }
    channelMap.set(oldId, channel.id);
    if (channel.permissionOverwrites && asArray(channelData.permissionOverwrites).length) {
      await channel.permissionOverwrites.set(remapOverwrites(channelData.permissionOverwrites, roleMap, guild), 'Meowz Server Layout restore');
    }
  }

  const rolePositions = {};
  for (const roleData of savedRoles) {
    const currentId = roleMap.get(sid(roleData.id));
    if (currentId) rolePositions[currentId] = Number(roleData.position || 0);
  }
  if (Object.keys(rolePositions).length) await guild.roles.setPositions(rolePositions).catch(() => null);

  const channelPositions = [];
  for (const channelData of asArray(saved.channels)) {
    const currentId = channelMap.get(sid(channelData.id));
    if (currentId) channelPositions.push({ channel: currentId, position: Number(channelData.position || 0) });
  }
  if (channelPositions.length) await guild.channels.setPositions(channelPositions).catch(() => null);

  if (restoreMode === 'replace') {
    const keepChannels = new Set(asArray(saved.channels).map((item) => channelMap.get(sid(item.id)) || sid(item.id)));
    const extraChannels = [...guild.channels.cache.values()].filter((channel) => !keepChannels.has(channel.id));
    for (const channel of extraChannels) {
      try { await channel.delete('Meowz Server Layout replace restore'); removed.channels.push({ id: channel.id, name: channel.name }); }
      catch (error) { skipped.push({ kind: 'channel', id: channel.id, name: channel.name, reason: error.message }); }
    }
    const keepRoles = new Set(savedRoles.map((item) => roleMap.get(sid(item.id)) || sid(item.id)));
    const extraRoles = [...guild.roles.cache.values()].filter((role) => role.id !== guild.id && !role.managed && !keepRoles.has(role.id));
    for (const role of extraRoles) {
      try { await role.delete('Meowz Server Layout replace restore'); removed.roles.push({ id: role.id, name: role.name }); }
      catch (error) { skipped.push({ kind: 'role', id: role.id, name: role.name, reason: error.message }); }
    }
  }

  return {
    ok: true,
    mode: restoreMode,
    snapshotId: sid(snapshot.id),
    safetySnapshotId: sid(safetySnapshot.id),
    created,
    updated,
    removed,
    skipped,
    idMap: { roles: Object.fromEntries(roleMap), channels: Object.fromEntries(channelMap) },
  };
}

module.exports = { restoreServerLayout };
