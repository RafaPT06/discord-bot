function normalizeRestoreMode(value) {
  return String(value || '').toLowerCase() === 'replace' ? 'replace' : 'merge';
}

function validateReplaceConfirmation(mode, suppliedName, guildName) {
  if (mode !== 'replace') return { ok: true };
  if (String(suppliedName || '') !== String(guildName || '')) {
    return { ok: false, error: 'Replace mode requires the exact current server name as confirmation.' };
  }
  return { ok: true };
}

module.exports = { normalizeRestoreMode, validateReplaceConfirmation };
