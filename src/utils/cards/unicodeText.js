const { imageFromUrl } = require("./cardBase");
const { normalizeText, measurePixelText, drawPixelText } = require("./pixelText");

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

function splitPixelEmojiRuns(value) {
  const runs = [];
  let textRun = "";

  for (const grapheme of splitGraphemes(value)) {
    if (isEmojiGrapheme(grapheme)) {
      if (textRun) runs.push({ type: "text", value: textRun });
      runs.push({ type: "emoji", value: grapheme });
      textRun = "";
    } else {
      textRun += grapheme;
    }
  }

  if (textRun) runs.push({ type: "text", value: textRun });
  return runs;
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

function normalizedRun(value) {
  return normalizeText(String(value || " "));
}

function measurePixelEmojiText(value, size) {
  const runs = splitPixelEmojiRuns(value);
  let width = 0;

  for (const run of runs) {
    if (run.type === "emoji") {
      width += 7 * size;
    } else {
      width += measurePixelText(normalizedRun(run.value), size);
    }
    width += size;
  }

  return Math.max(0, width - (runs.length ? size : 0));
}

function fitPixelEmojiText(value, maxWidth, startSize, minSize = 3) {
  let size = startSize;
  while (size > minSize && measurePixelEmojiText(value, size) > maxWidth) {
    size -= 1;
  }
  return size;
}

async function drawPixelEmojiText(ctx, value, x, y, options = {}) {
  const {
    maxWidth = Number.POSITIVE_INFINITY,
    startSize = 5,
    minSize = 3,
    color = "#ffffff",
    align = "left",
    alpha = 1,
  } = options;

  const text = String(value || "UNKNOWN");
  const size = fitPixelEmojiText(text, maxWidth, startSize, minSize);
  const runs = splitPixelEmojiRuns(text);
  const width = measurePixelEmojiText(text, size);
  let cursor = x;

  if (align === "center") cursor -= width / 2;
  if (align === "right") cursor -= width;

  for (const run of runs) {
    if (run.type === "emoji") {
      const image = await getEmojiImage(run.value);
      const emojiSize = 7 * size;
      if (image) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.drawImage(image, cursor, y, emojiSize, emojiSize);
        ctx.restore();
      } else {
        drawPixelText(ctx, "?", cursor, y, size, color, "left", alpha);
      }
      cursor += emojiSize + size;
    } else {
      const normalized = normalizedRun(run.value);
      drawPixelText(ctx, normalized, cursor, y, size, color, "left", alpha);
      cursor += measurePixelText(normalized, size) + size;
    }
  }

  return { width, size };
}

module.exports = {
  splitGraphemes,
  measurePixelEmojiText,
  fitPixelEmojiText,
  drawPixelEmojiText,
};
