const DEFAULT_MS = 3000;

// per user+command -> last time ms
const last = new Map();

function key(userId, command) {
  return `${userId}:${command}`;
}

function checkCooldown({ userId, commandName, msOverride }) {
  const ms = Number(msOverride || DEFAULT_MS);
  const k = key(userId, commandName);
  const now = Date.now();
  const prev = last.get(k) || 0;
  const remaining = (prev + ms) - now;
  if (remaining > 0) return { ok: false, remainingMs: remaining };
  last.set(k, now);
  return { ok: true, remainingMs: 0 };
}

function clearCooldown(userId, commandName) {
  last.delete(key(userId, commandName));
}

module.exports = { checkCooldown, clearCooldown, DEFAULT_MS };
