const { loadImage } = require("canvas");
const { drawPixelText } = require("./pixelText");

const WIDTH = 1200;
const HEIGHT = 420;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function hexFromColor(color) {
  const n = Number(color) || 0x7c3aed;
  return `#${n.toString(16).padStart(6, "0").slice(-6)}`;
}

function shortNumber(n) {
  const num = Number(n || 0);

  if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;

  return num.toString();
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);

  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function imageUrlCandidates(value) {
  const raw = String(value || "").trim();
  if (!raw) return [];

  const candidates = new Set([raw]);
  try {
    const parsed = new URL(raw);
    if (parsed.pathname.toLowerCase().endsWith(".gif")) {
      const staticUrl = new URL(parsed);
      staticUrl.pathname = staticUrl.pathname.replace(/\.gif$/i, ".png");
      candidates.add(staticUrl.toString());
    }
    if (parsed.hostname === "cdn.discordapp.com") {
      const mediaUrl = new URL(parsed);
      mediaUrl.hostname = "media.discordapp.net";
      candidates.add(mediaUrl.toString());
    }
  } catch {
    // The loadImage fallback below will report the invalid URL.
  }

  return [...candidates];
}

async function fetchImage(candidate) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(candidate, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 MeowzDiscordBot/1.0",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
    });
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
    const type = String(res.headers.get("content-type") || "").toLowerCase();
    if (type && !type.startsWith("image/")) throw new Error(`Unexpected image content type: ${type}`);
    return loadImage(Buffer.from(await res.arrayBuffer()));
  } finally {
    clearTimeout(timeout);
  }
}

async function imageFromUrl(url) {
  const candidates = imageUrlCandidates(url);
  if (!candidates.length) throw new Error("Missing image URL");

  let lastError = null;
  for (const candidate of candidates) {
    try {
      return await fetchImage(candidate);
    } catch (err) {
      lastError = err;
    }
  }

  try {
    return await loadImage(candidates[0]);
  } catch (err) {
    throw lastError || err;
  }
}

function hashSeed(value) {
  const text = String(value ?? "");
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let state = seed >>> 0 || 0x9e3779b9;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function drawDefaultBackground(ctx, accent, width = WIDTH, height = HEIGHT, seed = null) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);

  gradient.addColorStop(0, "#050505");
  gradient.addColorStop(0.55, "#111111");
  gradient.addColorStop(1, "#030303");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.globalAlpha = 0.16;
  const random = seed === null || seed === undefined || seed === ""
    ? Math.random
    : seededRandom(hashSeed(seed));

  for (let i = 0; i < 26; i += 1) {
    ctx.fillStyle = i % 2 ? "#ffffff" : accent;
    ctx.beginPath();
    ctx.arc(
      random() * width,
      random() * height,
      60 + random() * 150,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  ctx.globalAlpha = 1;

  ctx.fillStyle = "rgba(0,0,0,0.52)";
  ctx.fillRect(0, 0, width, height);
}

function drawAccentShapes(ctx, accent, width = WIDTH, height = HEIGHT) {
  ctx.fillStyle = accent;

  ctx.beginPath();
  ctx.moveTo(0, height);
  ctx.lineTo(0, Math.min(255, height * 0.55));
  ctx.bezierCurveTo(90, 250, 130, 335, 210, 330);
  ctx.bezierCurveTo(340, 320, 345, 405, 500, height);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(width, 0);
  ctx.lineTo(width, 90);
  ctx.bezierCurveTo(width - 80, 105, width - 115, 35, width - 165, 0);
  ctx.closePath();
  ctx.fill();
}

function drawAvatarFallback(ctx, x, y, size, label = "?") {
  ctx.save();

  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();

  ctx.fillStyle = "#111111";
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 8;
  ctx.stroke();

  const initial = String(label || "?")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .charAt(0)
    .toUpperCase() || "?";
  const pixelSize = Math.max(7, Math.round(size / 20));
  drawPixelText(ctx, initial, x + size / 2, y + size / 2 - (7 * pixelSize) / 2, pixelSize, "#ffffff", "center");

  ctx.restore();
}

function drawCircularImage(ctx, img, x, y, size) {
  ctx.save();

  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  ctx.drawImage(img, x, y, size, size);

  ctx.restore();

  ctx.save();

  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 8;
  ctx.stroke();

  ctx.restore();
}

function drawProgressBar(ctx, x, y, w, h, percent, accent) {
  const safePercent = clamp(Number(percent) || 0, 0, 100);

  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = "rgba(120,120,120,0.70)";
  ctx.fill();

  const filled = clamp(w * (safePercent / 100), 0, w);

  if (filled > 0) {
    roundRect(ctx, x, y, filled, h, h / 2);
    ctx.fillStyle = accent;
    ctx.fill();
  }
}

module.exports = { WIDTH, HEIGHT, clamp, hexFromColor, shortNumber, roundRect, imageFromUrl, drawDefaultBackground, drawAccentShapes, drawAvatarFallback, drawCircularImage, drawProgressBar };
