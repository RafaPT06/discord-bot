const { createCanvas, loadImage } = require("canvas");

const WIDTH = 1200;
const HEIGHT = 420;

const GLYPHS = {
  "A": ["01110","10001","10001","11111","10001","10001","10001"],
  "B": ["11110","10001","10001","11110","10001","10001","11110"],
  "C": ["01111","10000","10000","10000","10000","10000","01111"],
  "D": ["11110","10001","10001","10001","10001","10001","11110"],
  "E": ["11111","10000","10000","11110","10000","10000","11111"],
  "F": ["11111","10000","10000","11110","10000","10000","10000"],
  "G": ["01111","10000","10000","10111","10001","10001","01111"],
  "H": ["10001","10001","10001","11111","10001","10001","10001"],
  "I": ["11111","00100","00100","00100","00100","00100","11111"],
  "J": ["00111","00010","00010","00010","10010","10010","01100"],
  "K": ["10001","10010","10100","11000","10100","10010","10001"],
  "L": ["10000","10000","10000","10000","10000","10000","11111"],
  "M": ["10001","11011","10101","10101","10001","10001","10001"],
  "N": ["10001","11001","10101","10011","10001","10001","10001"],
  "O": ["01110","10001","10001","10001","10001","10001","01110"],
  "P": ["11110","10001","10001","11110","10000","10000","10000"],
  "Q": ["01110","10001","10001","10001","10101","10010","01101"],
  "R": ["11110","10001","10001","11110","10100","10010","10001"],
  "S": ["01111","10000","10000","01110","00001","00001","11110"],
  "T": ["11111","00100","00100","00100","00100","00100","00100"],
  "U": ["10001","10001","10001","10001","10001","10001","01110"],
  "V": ["10001","10001","10001","10001","10001","01010","00100"],
  "W": ["10001","10001","10001","10101","10101","10101","01010"],
  "X": ["10001","10001","01010","00100","01010","10001","10001"],
  "Y": ["10001","10001","01010","00100","00100","00100","00100"],
  "Z": ["11111","00001","00010","00100","01000","10000","11111"],
  "0": ["01110","10001","10011","10101","11001","10001","01110"],
  "1": ["00100","01100","00100","00100","00100","00100","01110"],
  "2": ["01110","10001","00001","00010","00100","01000","11111"],
  "3": ["11110","00001","00001","01110","00001","00001","11110"],
  "4": ["00010","00110","01010","10010","11111","00010","00010"],
  "5": ["11111","10000","10000","11110","00001","00001","11110"],
  "6": ["01110","10000","10000","11110","10001","10001","01110"],
  "7": ["11111","00001","00010","00100","01000","01000","01000"],
  "8": ["01110","10001","10001","01110","10001","10001","01110"],
  "9": ["01110","10001","10001","01111","00001","00001","01110"],
  "#": ["01010","01010","11111","01010","11111","01010","01010"],
  "/": ["00001","00010","00010","00100","01000","01000","10000"],
  ":": ["00000","00100","00100","00000","00100","00100","00000"],
  ".": ["00000","00000","00000","00000","00000","01100","01100"],
  "-": ["00000","00000","00000","11111","00000","00000","00000"],
  "_": ["00000","00000","00000","00000","00000","00000","11111"],
  "!": ["00100","00100","00100","00100","00100","00000","00100"],
  "?": ["01110","10001","00001","00010","00100","00000","00100"],
  "%": ["11001","11010","00010","00100","01000","01011","10011"],
  "(": ["00010","00100","01000","01000","01000","00100","00010"],
  ")": ["01000","00100","00010","00010","00010","00100","01000"],
  "@": ["01110","10001","10111","10101","10111","10000","01110"],
  "'": ["00100","00100","01000","00000","00000","00000","00000"],
  " ": ["000","000","000","000","000","000","000"],
};

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function hexFromColor(color) {
  const n = Number(color) || 0x7c3aed;
  return `#${n.toString(16).padStart(6, "0").slice(-6)}`;
}

function normalizeText(text) {
  return String(text || "UNKNOWN")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9#/:._\-!?%()@' ]/g, "?");
}

function measurePixelText(text, size) {
  const value = normalizeText(text);
  let width = 0;
  for (const ch of value) {
    const glyph = GLYPHS[ch] || GLYPHS["?"];
    width += glyph[0].length * size + size;
  }
  return Math.max(0, width - size);
}

function drawPixelText(ctx, text, x, y, size, color = "#ffffff", align = "left", alpha = 1) {
  const value = normalizeText(text);
  let startX = x;
  const width = measurePixelText(value, size);
  if (align === "center") startX = x - width / 2;
  if (align === "right") startX = x - width;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;

  let cursor = startX;
  for (const ch of value) {
    const glyph = GLYPHS[ch] || GLYPHS["?"];
    for (let row = 0; row < glyph.length; row += 1) {
      for (let col = 0; col < glyph[row].length; col += 1) {
        if (glyph[row][col] === "1") {
          ctx.fillRect(cursor + col * size, y + row * size, size, size);
        }
      }
    }
    cursor += glyph[0].length * size + size;
  }

  ctx.restore();
}

function fitPixelText(text, maxWidth, startSize, minSize = 4) {
  let size = startSize;
  while (size > minSize) {
    if (measurePixelText(text, size) <= maxWidth) return size;
    size -= 1;
  }
  return minSize;
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
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 DiscordBot LevelCard" } });
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
    ctx.arc(Math.random() * WIDTH, Math.random() * HEIGHT, 60 + Math.random() * 150, 0, Math.PI * 2);
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
  const safeRank = rank || "-";
  const safeLevel = Number(level || 0);
  const safeCurrentXp = Number(currentXp || 0);
  const safeNeededXp = Math.max(1, Number(neededXp || 1));
  const safeTotalXp = Number(totalXp || 0);
  const percent = Math.floor((safeCurrentXp / safeNeededXp) * 100);

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

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
if (title) drawPixelText(ctx, title, 365, 95, 5, accent, "left");

const nameSize = fitPixelText(safeName, 430, 6, 4);
drawPixelText(ctx, safeName, 365, 178, nameSize, "#ffffff", "left");

if (discriminator && discriminator !== "0") {
  const nameWidth = measurePixelText(safeName, nameSize);
  drawPixelText(ctx, `#${discriminator}`, 365 + nameWidth + 14, 184, 4, "#ffffff", "left", 0.4);
}
drawPixelText(ctx, "RANK", 910, 90, 4, "#ffffff", "right", 0.75);
drawPixelText(ctx, `#${safeRank}`, 1030, 82, 7, "#ffffff", "right");

drawPixelText(ctx, "LEVEL", 1110, 90, 4, "#ffffff", "right", 0.75);
drawPixelText(ctx, String(safeLevel).padStart(2, "0"), 1190, 82, 7, "#ffffff", "right");

drawPixelText(ctx, `${safeCurrentXp.toLocaleString()}/${safeNeededXp.toLocaleString()} XP`, 1060, 205, 5, "#ffffff", "right");

drawProgressBar(ctx, 365, 250, 720, 54, percent, accent);

drawPixelText(ctx, `TOTAL: ${safeTotalXp.toLocaleString()} XP`, 725, 330, 4, "#ffffff", "center");
  return canvas.toBuffer("image/png");
}

module.exports = { createLevelCardBuffer };
