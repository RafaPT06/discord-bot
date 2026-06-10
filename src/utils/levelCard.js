const { createCanvas, loadImage, registerFont } = require("canvas");
const { execFileSync } = require("child_process");
const fs = require("fs");

const WIDTH = 1200;
const HEIGHT = 420;

let fontsReady = false;

function registerFontIfExists(file, options) {
  if (!file || !fs.existsSync(file)) return false;
  try {
    registerFont(file, options);
    return true;
  } catch {
    return false;
  }
}

function fontFromFcMatch(query) {
  try {
    const out = execFileSync("fc-match", ["-f", "%{file}", query], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return out || null;
  } catch {
    return null;
  }
}

function ensureFonts() {
  if (fontsReady) return;

  const regularCandidates = [
    fontFromFcMatch("DejaVu Sans"),
    fontFromFcMatch("Liberation Sans"),
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
  ];

  const boldCandidates = [
    fontFromFcMatch("DejaVu Sans:style=Bold"),
    fontFromFcMatch("Liberation Sans:style=Bold"),
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf",
  ];

  const regular = regularCandidates.find((file) => file && fs.existsSync(file));
  const bold = boldCandidates.find((file) => file && fs.existsSync(file));

  if (regular) {
    registerFontIfExists(regular, { family: "LevelSans", weight: "normal" });
  }

  if (bold) {
    registerFontIfExists(bold, { family: "LevelSans", weight: "bold" });
  }

  fontsReady = true;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function hexFromColor(color) {
  const n = Number(color) || 0x7c3aed;
  return `#${n.toString(16).padStart(6, "0").slice(-6)}`;
}

function font(size, bold = true) {
  return `${bold ? "700 " : "400 "}${size}px LevelSans, "DejaVu Sans", "Liberation Sans", Arial, sans-serif`;
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

function fitText(ctx, text, maxWidth, startSize, minSize = 24, bold = true) {
  let size = startSize;
  const value = String(text || "Unknown");

  while (size > minSize) {
    ctx.font = font(size, bold);
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

function drawText(ctx, text, x, y, size, options = {}) {
  const {
    color = "#ffffff",
    alpha = 1,
    align = "left",
    bold = true,
    baseline = "alphabetic",
  } = options;

  ctx.save();
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.font = font(size, bold);
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  ctx.fillText(String(text), x, y);
  ctx.restore();
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
  ensureFonts();

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

  if (title) {
    drawText(ctx, title, 365, 110, 30, { color: accent, bold: true });
  }

  const nameSize = fitText(ctx, safeName, 430, 48, 30, true);
  drawText(ctx, safeName, 365, 190, nameSize, { color: "#ffffff", bold: true });

  if (discriminator && discriminator !== "0") {
    ctx.font = font(nameSize, true);
    const nameWidth = ctx.measureText(safeName).width;
    drawText(ctx, `#${discriminator}`, 365 + nameWidth + 12, 190, 34, {
      color: "#ffffff",
      alpha: 0.4,
      bold: false,
    });
  }

  drawText(ctx, "RANK", 825, 120, 34, {
    color: "#ffffff",
    alpha: 0.75,
    align: "right",
    bold: false,
  });
  drawText(ctx, `#${safeRank}`, 985, 125, 70, {
    color: "#ffffff",
    align: "right",
    bold: true,
  });

  drawText(ctx, "LEVEL", 1080, 120, 34, {
    color: "#ffffff",
    alpha: 0.75,
    align: "right",
    bold: false,
  });
  drawText(ctx, String(safeLevel).padStart(2, "0"), 1160, 125, 70, {
    color: "#ffffff",
    align: "right",
    bold: true,
  });

  drawText(ctx, safeCurrentXp.toLocaleString(), 870, 225, 36, {
    color: "#ffffff",
    align: "right",
    bold: true,
  });
  drawText(ctx, `/${safeNeededXp.toLocaleString()} XP`, 1060, 225, 36, {
    color: "#ffffff",
    alpha: 0.45,
    align: "right",
    bold: true,
  });

  drawProgressBar(ctx, 365, 250, 720, 54, percent, accent);

  drawText(ctx, `Total: ${safeTotalXp.toLocaleString()} XP`, 725, 340, 28, {
    color: "#ffffff",
    align: "center",
    bold: true,
  });

  return canvas.toBuffer("image/png");
}

module.exports = { createLevelCardBuffer };
