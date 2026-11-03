const { PermissionsBitField } = require('discord.js');

const VALID_MODES = new Set(['merge', 'replace']);
const REQUIRED_PERMISSIONS = ['ManageGuild', 'ManageRoles', 'ManageChannels'];

function normalizeId(value) {
  return typeof value === 'string' && /^\\d{16,22}$/.test(value) ? value : null;
}

function validateCollection(items, label, errors) {
  if (!Array.isArray(items)) {
    errors.push(`Snapshot ${label} must be an array.`);
    return [];
  }
  const ids = new Set();
  for (const item of items) {
    const id = normalizeId(item?.id);
    if (!id || ids.has(id)) errors.push(`Snapshot ${label} contains an invalid or duplicate ID.`);
    if (id) ids.add(id);
  }
  return items;
}

function preflightRestore(guild, snapshot, mode = 'merge') {
  const errors = [];
  const warnings = [];
  if (!VALID_MODES.has(mode)) errors.push('Invalid restore mode.');
  const layout = snapshot?.layout;
  if (!layout || typeof layout !== 'object' || Array.isArray(layout)) errors.push('Snapshot layout is missing.');
  if (layout?.version !== 1) errors.push('Unsupported snapshot layout version.');
  if (String(layout?.guild?.id || '') !== String(guild.id)) errors.push('Snapshot belongs to a different guild.');
  const roles = validateCollection(layout?.roles, 'roles', errors);
  const channels = validateCollection(layout?.channels, 'channels', errors);
  const channelIds = new Set(channels.map(x => String(x.id)));
  const roleIds = new Set(roles.map(x => String(x.id)));
  for (const channel of channels) {
    if (channel.parentId && !channelIds.has(String(channel.parentId))) errors.push(`Channel ${channel.id} has an unresolved parent.`);
    if (channel.parentId && String(channel.parentId) === String(channel.id)) errors.push(`Channel ${channel.id} cannot parent itself.`);
    for (const overwrite of Array.isArray(channel.permissionOverwrites) ? channel.permissionOverwrites : []) {
      if (Number(overwrite.type) === 0 && String(overwrite.id) !== String(guild.id) && !roleIds.has(String(overwrite.id))) {
        warnings.push(`Channel ${channel.id} references an external role overwrite ${overwrite.id}.`);
      }
    }
  }
  const bot = guild.members?.me;
  if (!bot) errors.push('Bot member was not resolved.');
  const missing = bot ? REQUIRED_PERMISSIONS.filter(permission => !bot.permissions.has(PermissionsBitField.Flags[permission])) : REQUIRED_PERMISSIONS;
  if (missing.length) errors.push(`Bot is missing: ${missing.join(', ')}.`);
  const highest = bot?.roles?.highest?.position ?? -1;
  const protectedRoles = roles.filter(role => {
    const existing = guild.roles.cache.get(String(role.id));
    return existing && (existing.managed || existing.position >= highest);
  });
  if (protectedRoles.length) warnings.push(`${protectedRoles.length} existing roles are managed or above the bot hierarchy and cannot be modified.`);
  if (mode === 'replace') warnings.push('Replace mode can delete existing roles and channels. Execution is not enabled.');
  warnings.push('Execution requires a persisted pre-restore snapshot, explicit confirmation, and ID remapping.');
  return {
    ok: errors.length === 0,
    previewOnly: true,
    mode,
    snapshotId: String(snapshot?.id || ''),
    summary: { roles: roles.length, channels: channels.length, protectedRoles: protectedRoles.length },
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)],
  };
}

module.exports = { preflightRestore };
