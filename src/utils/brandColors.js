const MEOWZ_PURPLE = 0x8b5cf6;

// Every semantic role intentionally resolves to the exact same Meowz purple.
// Neutral surfaces and readable text remain black/white inside card renderers,
// but every visible accent, Discord embed rail and branded highlight uses this value.
const BRAND_COLORS = Object.freeze({
  primary: MEOWZ_PURPLE,
  primaryDeep: MEOWZ_PURPLE,
  primaryLight: MEOWZ_PURPLE,
  welcome: MEOWZ_PURPLE,
  goodbye: MEOWZ_PURPLE,
  leveling: MEOWZ_PURPLE,
  info: MEOWZ_PURPLE,
  success: MEOWZ_PURPLE,
  warning: MEOWZ_PURPLE,
  danger: MEOWZ_PURPLE,
  message: MEOWZ_PURPLE,
  member: MEOWZ_PURPLE,
  moderation: MEOWZ_PURPLE,
  voice: MEOWZ_PURPLE,
  deploy: MEOWZ_PURPLE,
  restart: MEOWZ_PURPLE,
  backup: MEOWZ_PURPLE,
  achievement: MEOWZ_PURPLE,
});

function clampColor(value) {
  return Math.max(0, Math.min(0xffffff, Math.trunc(Number(value) || 0)));
}

function resolveBrandColor() {
  return MEOWZ_PURPLE;
}

function colorHex(value = MEOWZ_PURPLE) {
  return `#${clampColor(value).toString(16).padStart(6, "0")}`;
}

module.exports = { MEOWZ_PURPLE, BRAND_COLORS, resolveBrandColor, colorHex };
