const BRAND_COLORS = Object.freeze({
  primary: 0x8b5cf6,
  primaryDeep: 0x6d28d9,
  primaryLight: 0xc084fc,
  welcome: 0x8b5cf6,
  goodbye: 0xa855f7,
  leveling: 0x7c3aed,
  info: 0x8b5cf6,
  success: 0xa78bfa,
  warning: 0xc084fc,
  danger: 0x9333ea,
  message: 0xc084fc,
  member: 0xa78bfa,
  moderation: 0x9333ea,
  voice: 0x8b5cf6,
  deploy: 0x8b5cf6,
  restart: 0x7c3aed,
  backup: 0x7c3aed,
  achievement: 0xc084fc,
});

const NAMED_COLORS = Object.freeze({
  default: BRAND_COLORS.primary,
  blurple: BRAND_COLORS.primary,
  purple: BRAND_COLORS.primary,
  violet: BRAND_COLORS.primary,
  blue: BRAND_COLORS.info,
  aqua: BRAND_COLORS.info,
  green: BRAND_COLORS.success,
  yellow: BRAND_COLORS.warning,
  gold: BRAND_COLORS.warning,
  orange: BRAND_COLORS.warning,
  red: BRAND_COLORS.danger,
  fuchsia: BRAND_COLORS.danger,
  magenta: BRAND_COLORS.danger,
  white: BRAND_COLORS.primaryLight,
  grey: BRAND_COLORS.primaryDeep,
  gray: BRAND_COLORS.primaryDeep,
  black: BRAND_COLORS.primaryDeep,
});

const PALETTE_VALUES = new Set(Object.values(BRAND_COLORS));

function clampColor(value) {
  return Math.max(0, Math.min(0xffffff, Math.trunc(Number(value) || 0)));
}

function parseColor(value) {
  if (typeof value === "number" && Number.isFinite(value)) return clampColor(value);

  if (Array.isArray(value) && value.length >= 3) {
    const r = Math.max(0, Math.min(255, Number(value[0]) || 0));
    const g = Math.max(0, Math.min(255, Number(value[1]) || 0));
    const b = Math.max(0, Math.min(255, Number(value[2]) || 0));
    return (Math.trunc(r) << 16) | (Math.trunc(g) << 8) | Math.trunc(b);
  }

  if (typeof value === "string") {
    const clean = value.trim().toLowerCase();
    if (Object.prototype.hasOwnProperty.call(BRAND_COLORS, clean)) return BRAND_COLORS[clean];
    if (Object.prototype.hasOwnProperty.call(NAMED_COLORS, clean)) return NAMED_COLORS[clean];
    if (/^#?[0-9a-f]{6}$/i.test(clean)) return parseInt(clean.replace(/^#/, ""), 16);
    if (/^0x[0-9a-f]{6}$/i.test(clean)) return parseInt(clean.slice(2), 16);
  }

  return BRAND_COLORS.primary;
}

function hueFor(color) {
  const r = ((color >> 16) & 0xff) / 255;
  const g = ((color >> 8) & 0xff) / 255;
  const b = (color & 0xff) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  if (delta === 0) return { hue: 0, value: max, saturation: 0 };

  let hue;
  if (max === r) hue = 60 * (((g - b) / delta) % 6);
  else if (max === g) hue = 60 * ((b - r) / delta + 2);
  else hue = 60 * ((r - g) / delta + 4);
  if (hue < 0) hue += 360;

  return { hue, value: max, saturation: max === 0 ? 0 : delta / max };
}

function resolveBrandColor(value = BRAND_COLORS.primary) {
  const color = parseColor(value);
  if (PALETTE_VALUES.has(color)) return color;

  const { hue, value: brightness, saturation } = hueFor(color);
  if (saturation < 0.12) {
    if (brightness > 0.78) return BRAND_COLORS.primaryLight;
    if (brightness < 0.35) return BRAND_COLORS.primaryDeep;
    return BRAND_COLORS.primary;
  }

  if (hue >= 75 && hue < 175) return BRAND_COLORS.success;
  if (hue >= 25 && hue < 75) return BRAND_COLORS.warning;
  if (hue < 25 || hue >= 330) return BRAND_COLORS.danger;
  if (hue >= 175 && hue < 255) return BRAND_COLORS.info;
  if (brightness > 0.76) return BRAND_COLORS.primaryLight;
  if (brightness < 0.42) return BRAND_COLORS.primaryDeep;
  return BRAND_COLORS.primary;
}

function colorHex(value) {
  return `#${clampColor(value).toString(16).padStart(6, "0")}`;
}

module.exports = { BRAND_COLORS, resolveBrandColor, colorHex };
