function mimicCase(input) {
  let out = "";
  let up = false;
  for (const ch of input) {
    if (/[a-z]/i.test(ch)) {
      out += up ? ch.toUpperCase() : ch.toLowerCase();
      up = !up;
    } else {
      out += ch;
    }
  }
  return out;
}

function clampInt(n, min, max) {
  n = Number.isFinite(n) ? n : min;
  return Math.max(min, Math.min(max, n));
}

module.exports = { mimicCase, clampInt };
