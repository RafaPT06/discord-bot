const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'services', 'serverLayoutRestore.js'), 'utf8');
const route = fs.readFileSync(path.join(__dirname, '..', 'src', 'web', 'serverLayoutDashboardPatch.js'), 'utf8');

assert.match(source, /createLayoutSnapshot\(guild/);
assert.match(source, /Automatic safety snapshot before/);
assert.match(source, /roleMap/);
assert.match(source, /channelMap/);
assert.match(source, /permissionOverwrites\.set/);
assert.match(source, /role\.managed/);
assert.match(source, /restoreMode === 'replace'/);
assert.match(route, /confirmServerName/);
assert.match(route, /restoreLocks/);
assert.match(route, /snapshots\/:snapshotId\/restore/);
console.log('Server Layout restore safety checks passed.');
