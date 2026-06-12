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

async function imageFromUrl(url) {
  if (!url) throw new Error("Missing image URL");

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 DiscordBot LevelCard",
    },
  });

  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  return loadImage(buffer);
}

function drawDefaultBackground(ctx, accent, width = WIDTH, height = HEIGHT) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);

  gradient.addColorStop(0, "#050505");
  gradient.addColorStop(0.55, "#111111");
  gradient.addColorStop(1, "#030303");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.globalAlpha = 0.16;

  for (let i = 0; i < 26; i += 1) {
    ctx.fillStyle = i % 2 ? "#ffffff" : accent;
    ctx.beginPath();
    ctx.arc(
      Math.random() * width,
      Math.random() * height,
      60 + Math.random() * 150,
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

function drawAvatarFallback(ctx, x, y, size) {
  ctx.save();

  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();

  ctx.fillStyle = "#111111";
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 8;
  ctx.stroke();

  drawPixelText(ctx, "?", x + size / 2, y + size / 2 - 24, 10, "#ffffff", "center");

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
