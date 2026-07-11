const { imageFromUrl } = require("./cardBase");

const DEFAULT_FONT_FAMILY = '"DejaVu Sans","Liberation Sans","Noto Sans",Arial,sans-serif';
const TWEMOJI_BASE_URL = "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72";
const emojiImageCache = new Map();
const emojiPattern = /[\p{Extended_Pictographic}\p{Regional_Indicator}\u20e3]/u;

function splitGraphemes(value) {
  const text = String(value || "");
  if (typeof Intl?.Segmenter === "function") {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(segmenter.segment(text), (entry) => entry.segment);
  }
  return Array.from(text);
}

function isEmojiGrapheme(value) {
  return emojiPattern.test(String(value || ""));
}

function emojiAssetName(value) {
  return Array.from(String(value || ""))
    .map((char) => char.codePointAt(0))
    .filter((codePoint) => codePoint !== 0xfe0f)
    .map((codePoint) => codePoint.toString(16))
    .join("-");
}

async function getEmojiImage(value) {
  const asset = emojiAssetName(value);
  if (!asset) return null;
  if (!emojiImageCache.has(asset)) {
    const promise = imageFromUrl(`${TWEMOJI_BASE_URL}/${asset}.png`).catch(() => null);
    emojiImageCache.set(asset, promise);
  }
  return emojiImageCache.get(asset);
}

function setFont(ctx, size, weight, family) {
  ctx.font = `${weight} ${Math.max(1, Math.round(size))}px ${family || DEFAULT_FONT_FAMILY}`;
}

function measureUnicodeText(ctx, text, size, options = {}) {
  const {
    weight = 700,
    family = DEFAULT_FONT_FAMILY,
    emojiScale = 1.02,
    letterSpacing = 0,
  } = options;
  const graphemes = splitGraphemes(text);
  setFont(ctx, size, weight, family);
  let width = 0;
  for (const grapheme of graphemes) {
    width += isEmojiGrapheme(grapheme)
      ? size * emojiScale
      : ctx.measureText(grapheme).width;
    width += letterSpacing;
  }
  return Math.max(0, width - (graphemes.length ? letterSpacing : 0));
}

function fitUnicodeText(ctx, text, maxWidth, startSize, minSize = 18, options = {}) {
  let size = Math.max(minSize, startSize);
  while (size > minSize && measureUnicodeText(ctx, text, size, options) > maxWidth) {
    size -= 1;
  }
  return size;
}

async function drawUnicodeText(ctx, text, x, y, options = {}) {
  const {
    maxWidth = Number.POSITIVE_INFINITY,
    startSize = 42,
    minSize = 18,
    color = "#ffffff",
    align = "left",
    alpha = 1,
    weight = 700,
    family = DEFAULT_FONT_FAMILY,
    emojiScale = 1.02,
    letterSpacing = 0,
    uppercase = false,
  } = options;
  const value = uppercase ? String(text || "").toUpperCase() : String(text || "");
  const size = fitUnicodeText(ctx, value, maxWidth, startSize, minSize, {
    weight,
    family,
    emojiScale,
    letterSpacing,
  });
  const graphemes = splitGraphemes(value);
  const width = measureUnicodeText(ctx, value, size, {
    weight,
    family,
    emojiScale,
    letterSpacing,
  });
  let cursor = x;
  if (align === "center") cursor -= width / 2;
  if (align === "right") cursor -= width;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  setFont(ctx, size, weight, family);

  for (const grapheme of graphemes) {
    const emoji = isEmojiGrapheme(grapheme);
    const graphemeWidth = emoji
      ? size * emojiScale
      : ctx.measureText(grapheme).width;

    if (emoji) {
      const image = await getEmojiImage(grapheme);
      if (image) {
        const emojiSize = size * emojiScale;
        ctx.drawImage(image, cursor, y - size * 0.04, emojiSize, emojiSize);
      } else {
        ctx.fillText(grapheme, cursor, y);
      }
    } else {
      ctx.fillText(grapheme, cursor, y);
    }

    cursor += graphemeWidth + letterSpacing;
  }

  ctx.restore();
  return { width, size };
}

module.exports = {
  DEFAULT_FONT_FAMILY,
  splitGraphemes,
  measureUnicodeText,
  fitUnicodeText,
  drawUnicodeText,
};
