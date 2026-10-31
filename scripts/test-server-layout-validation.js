const assert = require('node:assert/strict');
const validation = require('../src/services/serverLayoutRestoreValidation');
assert.equal(validation.normalizeRestoreMode('replace'), 'replace');
assert.equal(validation.normalizeRestoreMode('anything'), 'merge');
assert.equal(validation.validateReplaceConfirmation('replace', 'Server', 'Server').ok, true);
assert.equal(validation.validateReplaceConfirmation('replace', 'Wrong', 'Server').ok, false);
console.log('restore validation ok');
