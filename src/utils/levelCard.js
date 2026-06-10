const { createCanvas, loadImage } = require("@napi-rs/canvas");

const WIDTH = 1200;
const HEIGHT = 420;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function hexFromColor(color) {
  const n = Number(color) || 0x7c3aed;
  return `#${n.toString(16).padStart(6, "0").slice(-6)}`;
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

function font(size, bold = true) {
  return `${bold ? "bold " : ""}${size}px sans-serif`;
}

function fitText(ctx, text, maxWidth, startSize, minSize = 28) {
  let size = startSize;
  const value = String(text || "Unknown");

  while (size > minSize) {
    ctx.font = font(size, true);
    if (ctx.measureText(value).width <= maxWidth) return size;
    size -= 2;
  }

  return minSize;
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

function drawDefaultBackground(ctx, accent) {
  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);

  gradient.addColorStop(0, "#050505");
  gradient.addColorStop(0.55, "#111111");
  gradient.addColorStop(1, "#030303");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.globalAlpha = 0.16;

  for (let i = 0; i < 26; i += 1) {
    ctx.fillStyle = i % 2 ? "#ffffff" : accent;

    ctx.beginPath();
    ctx.arc(
      Math.random() * WIDTH,
      Math.random() * HEIGHT,
      60 + Math.random() * 150,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  ctx.globalAlpha = 1;

  ctx.fillStyle = "rgba(0,0,0,0.52)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function drawAccentShapes(ctx, accent) {
  ctx.fillStyle = accent;

  ctx.beginPath();
  ctx.moveTo(0, HEIGHT);
  ctx.lineTo(0, 255);
  ctx.bezierCurveTo(90, 250, 130, 335, 210, 330);
  ctx.bezierCurveTo(340, 320, 345, 405, 500, HEIGHT);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(WIDTH, 0);
  ctx.lineTo(WIDTH, 90);
  ctx.bezierCurveTo(1120, 105, 1085, 35, 1035, 0);
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

  ctx.font = font(72, true);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("?", x + size / 2, y + size / 2);

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

async function createLevelCardBuffer({
  username,
  displayName,
  discriminator,
  avatarUrl,
  rank,
  level,
  currentXp,
  neededXp,
  totalXp,
  accentColor = 0x7c3aed,
  backgroundUrl,
  title,
}) {
  const accent = hexFromColor(accentColor);

  const safeName = String(displayName || username || "Unknown");
  const safeRank = rank || "—";
  const safeLevel = Number(level || 0);
  const safeCurrentXp = Number(currentXp || 0);
  const safeNeededXp = Math.max(1, Number(neededXp || 1));
  const safeTotalXp = Number(totalXp || 0);
  const percent = Math.floor((safeCurrentXp / safeNeededXp) * 100);

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  if (backgroundUrl) {
    try {
      const bg = await imageFromUrl(backgroundUrl);
      const scale = Math.max(WIDTH / bg.width, HEIGHT / bg.height);
      const sw = bg.width * scale;
      const sh = bg.height * scale;

      ctx.drawImage(bg, (WIDTH - sw) / 2, (HEIGHT - sh) / 2, sw, sh);

      ctx.fillStyle = "rgba(0,0,0,0.62)";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    } catch {
      drawDefaultBackground(ctx, accent);
    }
  } else {
    drawDefaultBackground(ctx, accent);
  }

  drawAccentShapes(ctx, accent);

  roundRect(ctx, 40, 45, WIDTH - 80, HEIGHT - 90, 18);
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fill();

  try {
    const avatar = await imageFromUrl(avatarUrl);
    drawCircularImage(ctx, avatar, 110, 92, 190);
  } catch {
    drawAvatarFallback(ctx, 110, 92, 190);
  }

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  if (title) {
    ctx.font = font(30, true);
    ctx.fillStyle = accent;
    ctx.fillText(String(title), 365, 110);
  }

  ctx.fillStyle = "#ffffff";
  const nameSize = fitText(ctx, safeName, 430, 48, 30);

  ctx.font = font(nameSize, true);
  ctx.fillText(safeName, 365, 190);

  if (discriminator && discriminator !== "0") {
    const nameWidth = ctx.measureText(safeName).width;

    ctx.font = font(34, false);
    ctx.fillStyle = "rgba(255,255,255,0.40)";
    ctx.fillText(`#${discriminator}`, 365 + nameWidth + 12, 190);
  }

  ctx.textAlign = "right";

  ctx.font = font(34, false);
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillText("RANK", 825, 120);

  ctx.font = font(70, true);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(`#${safeRank}`, 985, 125);

  ctx.font = font(34, false);
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillText("LEVEL", 1080, 120);

  ctx.font = font(70, true);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(String(safeLevel).padStart(2, "0"), 1160, 125);

  ctx.font = font(36, true);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(safeCurrentXp.toLocaleString(), 870, 225);

  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fillText(`/${safeNeededXp.toLocaleString()} XP`, 1060, 225);

  ctx.textAlign = "left";
  drawProgressBar(ctx, 365, 250, 720, 54, percent, accent);

  ctx.textAlign = "center";
  ctx.font = font(28, true);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(`Total: ${safeTotalXp.toLocaleString()} XP`, 725, 340);

  return canvas.encode("png");
}

module.exports = { createLevelCardBuffer };
