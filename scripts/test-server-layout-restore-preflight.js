const assert = require('node:assert/strict');
const { preflightRestore } = require('../src/services/serverLayoutRestorePreflight');

const guildId = '123456789012345678';
const roleId = '223456789012345678';
const channelId = '323456789012345678';
const guild = {
  id: guildId,
  members: { me: { permissions: { has: () => true }, roles: { highest: { position: 10 } } } },
  roles: { cache: new Map([[roleId, { position: 2, managed: false }]]) },
};
const snapshot = {
  id: 42,
  layout: {
    version: 1,
    guild: { id: guildId },
    roles: [{ id: roleId }],
    channels: [{ id: channelId, parentId: null, permissionOverwrites: [] }],
  },
};
assert.equal(preflightRestore(guild, snapshot).ok, true);
assert.equal(preflightRestore(guild, snapshot, 'replace').mode, 'replace');
assert.equal(preflightRestore(guild, snapshot, 'unknown').ok, false);
assert.equal(preflightRestore(guild, { ...snapshot, layout: { ...snapshot.layout, guild: { id: '999999999999999999' } } }).ok, false);
assert.equal(preflightRestore(guild, { ...snapshot, layout: { ...snapshot.layout, channels: [{ id: channelId, parentId: '423456789012345678' }] } }).ok, false);
assert.equal(preflightRestore({ ...guild, members: { me: null } }, snapshot).ok, false);
assert.equal(preflightRestore(guild, { ...snapshot, layout: { ...snapshot.layout, roles: [{ id: roleId }, { id: roleId }] } }).ok, false);
console.log('Restore preflight tests passed');
