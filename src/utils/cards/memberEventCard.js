const { createCanvas, registerFont } = require("canvas");
const { existsSync } = require("node:fs");
const {
  hexFromColor,
  imageFromUrl,
  drawDefaultBackground,
  drawAccentShapes,
  roundRect,
  drawCircularImage,
  drawAvatarFallback,
} = require("./cardBase");
const { drawPixelText, fitPixelText } = require("./pixelText");

const FONT_FAMILY = "Meowz Sans";
const FONT_CANDIDATES = [
  { path: "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf", weight: "normal" },
  { path: "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf", weight: "bold" },
  { path: "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", weight: "normal" },
  { path: "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", weight: "bold" },
  { path: "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf", weight: "normal" },
  { path: "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf", weight: "bold" },
];

function registerCardFonts() {
  let registered = false;
  const seenWeights = new Set();

  for (const candidate of FONT_CANDIDATES) {
    if (seenWeights.has(candidate.weight) || !existsSync(candidate.path)) continue;
    try {
      registerFont(candidate.path, { family: FONT_FAMILY, weight: candidate.weight });
      seenWeights.add(candidate.weight);
      registered = true;
    } catch {
      // The pixel fallback below keeps cards readable even if font registration fails.
    }
  }

  return registered;
}

const HAS_REGISTERED_FONT = registerCardFonts();
const FONT_STACK = HAS_REGISTERED_FONT
  ? `"${FONT_FAMILY}"`
  : '"DejaVu Sans", "Liberation Sans", Arial, sans-serif';

function cleanProfileText(value, fallback = "Unknown") {
  const normalized = String(value || fallback)
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  return normalized || fallback;
}

function pixelFallbackText(value, fallback = "UNKNOWN") {
  const normalized = cleanProfileText(value, fallback)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .trim();
  return normalized || fallback;
}

function canvasWeight(weight) {
  return Number(weight) >= 700 ? "bold" : "normal";
}

function fitCanvasFont(ctx, value, maxWidth, startSize, minSize = 24, weight = 800) {
  const text = cleanProfileText(value);
  let size = startSize;
  const resolvedWeight = canvasWeight(weight);
  while (size > minSize) {
    ctx.font = `${resolvedWeight} ${size}px ${FONT_STACK}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  return size;
}

function drawCenteredText(ctx, value, x, y, maxWidth, startSize, options = {}) {
  const text = cleanProfileText(value);
  const weight = Number(options.weight || 800);
  const color = options.color || "#ffffff";
  const alpha = Number(options.alpha ?? 1);

  if (!HAS_REGISTERED_FONT) {
    const fallback = pixelFallbackText(text);
    const pixelSize = fitPixelText(
      fallback,
      maxWidth,
      Math.max(3, Math.round(startSize / 8)),
      Math.max(2, Math.round(Number(options.minSize || 24) / 10))
    );
    drawPixelText(ctx, fallback, x, y - (7 * pixelSize) / 2, pixelSize, color, "center", alpha);
    return pixelSize * 7;
  }

  const size = fitCanvasFont(ctx, text, maxWidth, startSize, Number(options.minSize || 24), weight);
  ctx.save();
  ctx.font = `${canvasWeight(weight)} ${size}px ${FONT_STACK}`;
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
  ctx.restore();
  return size;
}

function renderMemberEventTemplate(_messageTemplate, {
  type = "welcome",
  displayName,
  username,
  memberNumber,
} = {}) {
  const isGoodbye = String(type).toLowerCase() === "goodbye";
  const safeName = cleanProfileText(displayName || username || "Unknown");
  return {
    nameText: safeName,
    memberText: memberNumber
      ? (isGoodbye ? `MEMBER #${memberNumber}` : `YOU ARE MEMBER #${memberNumber}`)
      : (isGoodbye ? "THANKS FOR BEING HERE" : "WELCOME TO THE SERVER"),
  };
}

async function createMemberEventCardBuffer({
  type = "welcome",
  username,
  displayName,
  avatarUrl,
  memberNumber,
  accentColor = 0x7c3aed,
  backgroundUrl,
  showMember = true,
  showAvatar = true,
}) {
  const width = 1200;
  const height = 650;
  const accent = hexFromColor(accentColor);
  const { nameText, memberText } = renderMemberEventTemplate(null, {
    type,
    displayName,
    username,
    memberNumber,
  });

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  if (backgroundUrl) {
    try {
      const bg = await imageFromUrl(backgroundUrl);
      const scale = Math.max(width / bg.width, height / bg.height);
      const sw = bg.width * scale;
      const sh = bg.height * scale;
      ctx.drawImage(bg, (width - sw) / 2, (height - sh) / 2, sw, sh);
      ctx.fillStyle = "rgba(0,0,0,0.62)";
      ctx.fillRect(0, 0, width, height);
    } catch {
      drawDefaultBackground(ctx, accent, width, height);
    }
  } else {
    drawDefaultBackground(ctx, accent, width, height);
  }

  drawAccentShapes(ctx, accent, width, height);

  roundRect(ctx, 54, 54, width - 108, height - 108, 30);
  ctx.fillStyle = "rgba(8,10,17,0.76)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  ctx.stroke();

  const avatarSize = showAvatar === false ? 0 : 200;
  if (showAvatar !== false) {
    const avatarX = (width - avatarSize) / 2;
    const avatarY = 128;
    try {
      const avatar = await imageFromUrl(avatarUrl);
      drawCircularImage(ctx, avatar, avatarX, avatarY, avatarSize);
    } catch {
      drawAvatarFallback(ctx, avatarX, avatarY, avatarSize, nameText);
    }
    ctx.save();
    ctx.beginPath();
    ctx.arc(width / 2, avatarY + avatarSize / 2, avatarSize / 2 + 8, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.88)";
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.restore();
  }

  const nameY = showAvatar === false ? 300 : 410;
  drawCenteredText(ctx, nameText, width / 2, nameY, 850, 66, { minSize: 30, weight: 800 });
  if (showMember !== false && memberText) {
    drawCenteredText(ctx, memberText, width / 2, nameY + 66, 760, 28, {
      minSize: 20,
      weight: 600,
      alpha: 0.72,
      color: "#e7e7ef",
    });
  }

  return canvas.toBuffer("image/png");
}

module.exports = { createMemberEventCardBuffer, renderMemberEventTemplate };
