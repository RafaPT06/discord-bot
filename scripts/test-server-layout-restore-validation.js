const assert = require('node:assert/strict');
const { normalizeRestoreMode, validateReplaceConfirmation } = require('../src/services/serverLayoutRestoreValidation');

assert.equal(normalizeRestoreMode('replace'), 'replace');
assert.equal(normalizeRestoreMode('MERGE'), 'merge');
assert.equal(validateReplaceConfirmation('merge', '', 'Meowz').ok, true);
assert.equal(validateReplaceConfirmation('replace', 'Meowz', 'Meowz').ok, true);
assert.equal(validateReplaceConfirmation('replace', 'meowz', 'Meowz').ok, false);
console.log('Server Layout restore validation checks passed.');
