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
  ">": ["10000","01000","00100","00010","00100","01000","10000"],
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

function shortNumber(n) {
  const num = Number(n || 0);

  if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;

  return num.toString();
}

function normalizeText(text) {
  return String(text || "UNKNOWN")
    .replace(/[→➜]/g, ">")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9#/:._\-!?%()@' >]/g, "?");
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

async function createMemberEventCardBuffer({
  type = "welcome",
  username,
  displayName,
  avatarUrl,
  memberNumber,
  guildName,
  accentColor = 0x7c3aed,
  backgroundUrl,
}) {
  const EVENT_WIDTH = 1200;
  const EVENT_HEIGHT = 650;

  const accent = hexFromColor(accentColor);
  const isGoodbye = String(type).toLowerCase() === "goodbye";
  const safeName = String(displayName || username || "Unknown");
  const safeGuild = String(guildName || "this server");
  const memberText = memberNumber
    ? `MEMBER #${memberNumber}`
    : isGoodbye
      ? "GOODBYE"
      : "WELCOME";

  const canvas = createCanvas(EVENT_WIDTH, EVENT_HEIGHT);
  const ctx = canvas.getContext("2d");

  if (backgroundUrl) {
    try {
      const bg = await imageFromUrl(backgroundUrl);
      const scale = Math.max(EVENT_WIDTH / bg.width, EVENT_HEIGHT / bg.height);
      const sw = bg.width * scale;
      const sh = bg.height * scale;

      ctx.drawImage(bg, (EVENT_WIDTH - sw) / 2, (EVENT_HEIGHT - sh) / 2, sw, sh);

      ctx.fillStyle = "rgba(0,0,0,0.66)";
      ctx.fillRect(0, 0, EVENT_WIDTH, EVENT_HEIGHT);
    } catch {
      drawDefaultBackground(ctx, accent);
    }
  } else {
    drawDefaultBackground(ctx, accent);
  }

  drawAccentShapes(ctx, accent);

  roundRect(ctx, 40, 55, EVENT_WIDTH - 80, EVENT_HEIGHT - 110, 18);
  ctx.fillStyle = "rgba(0,0,0,0.50)";
  ctx.fill();

  roundRect(ctx, 410, 80, 380, 54, 14);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fill();

  drawPixelText(
    ctx,
    memberText,
    600,
    98,
    fitPixelText(memberText, 315, 4, 3),
    "#ffffff",
    "center",
    0.95
  );

  try {
    const avatar = await imageFromUrl(avatarUrl);
    drawCircularImage(ctx, avatar, 505, 165, 170);
  } catch {
    drawAvatarFallback(ctx, 505, 165, 170);
  }

  const headline = isGoodbye ? "GOODBYE" : "WELCOME";
  const headlineText = `${headline} ${safeName}`;
  const headlineSize = fitPixelText(headlineText, 760, 6, 4);

  drawPixelText(
    ctx,
    headlineText,
    600,
    395,
    headlineSize,
    "#ffffff",
    "center"
  );

  const sub = isGoodbye ? "LEFT" : "TO";

  drawPixelText(
    ctx,
    sub,
    600,
    465,
    4,
    "#ffffff",
    "center",
    0.75
  );

  const guildSize = fitPixelText(safeGuild, 760, 5, 3);

  drawPixelText(
    ctx,
    safeGuild,
    600,
    525,
    guildSize,
    "#ffffff",
    "center",
    0.9
  );

  return canvas.toBuffer("image/png");
}

async function createLeaderboardCardBuffer({
  guildName = "Level Ranking",
  entries = [],
  accentColor = 0x7c3aed,
}) {
  const accent = hexFromColor(accentColor);
  const width = 1200;
  const height = 900;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#050505");
  gradient.addColorStop(0.55, "#151515");
  gradient.addColorStop(1, "#050505");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.globalAlpha = 0.10;
  for (let i = 0; i < 34; i += 1) {
    ctx.fillStyle = i % 2 ? "#ffffff" : accent;
    ctx.beginPath();
    ctx.arc(Math.random() * width, Math.random() * height, 50 + Math.random() * 170, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  drawPixelText(ctx, "LEVEL RANKING", width / 2, 65, 7, "#ffffff", "center", 0.92);

  roundRect(ctx, 70, 150, width - 140, 680, 16);
  ctx.fillStyle = "rgba(0,0,0,0.62)";
  ctx.fill();

  const list = entries.slice(0, 10);
  if (!list.length) {
    drawPixelText(ctx, "NO XP YET", width / 2, 455, 8, "#ffffff", "center", 0.8);
    return canvas.toBuffer("image/png");
  }

  for (let i = 0; i < list.length; i += 1) {
    const entry = list[i];
    const y = 190 + i * 62;
    const rankText = `${i + 1}.`;
    const levelText = String(Number(entry.level || 0));
    const name = String(entry.displayName || entry.username || "Unknown");
    const xpText = `${shortNumber(entry.totalXp)} XP`;

    if (i > 0) {
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      ctx.fillRect(105, y - 14, width - 210, 1);
    }

    drawPixelText(ctx, rankText, 115, y, 5, "#ffffff", "left");

    const circleX = 188;
    const circleY = y - 17;
    const circleSize = 44;

    try {
      if (entry.avatarUrl) {
        const avatar = await imageFromUrl(entry.avatarUrl);
        drawCircularImage(ctx, avatar, circleX, circleY, circleSize);
      } else {
        throw new Error("No avatar");
      }
    } catch {
      ctx.save();
      ctx.beginPath();
      ctx.arc(circleX + circleSize / 2, circleY + circleSize / 2, circleSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.10)";
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }

    const lvlSize = fitPixelText(levelText, 35, 4, 3);
    drawPixelText(ctx, levelText, circleX + circleSize / 2, y - 2, lvlSize, "#ffffff", "center");

    const nameSize = fitPixelText(name, 430, 5, 3);
    drawPixelText(ctx, name, 260, y, nameSize, "#ffffff", "left");

    const xpSize = fitPixelText(xpText, 260, 5, 3);
    drawPixelText(ctx, xpText, 1090, y, xpSize, "#ffffff", "right", 0.9);
  }

  return canvas.toBuffer("image/png");
}



async function createMemberEventCardBuffer({
  type = "welcome",
  username,
  displayName,
  avatarUrl,
  memberNumber,
  guildName,
  accentColor = 0x7c3aed,
  backgroundUrl,
}) {
  const accent = hexFromColor(accentColor);
  const isGoodbye = String(type).toLowerCase() === "goodbye";
  const safeName = String(displayName || username || "Unknown");
  const safeGuild = String(guildName || "this server");
  const memberText = memberNumber ? `MEMBER #${memberNumber}` : (isGoodbye ? "GOODBYE" : "WELCOME");

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  if (backgroundUrl) {
    try {
      const bg = await imageFromUrl(backgroundUrl);
      const scale = Math.max(WIDTH / bg.width, HEIGHT / bg.height);
      const sw = bg.width * scale;
      const sh = bg.height * scale;
      ctx.drawImage(bg, (WIDTH - sw) / 2, (HEIGHT - sh) / 2, sw, sh);
      ctx.fillStyle = "rgba(0,0,0,0.66)";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    } catch {
      drawDefaultBackground(ctx, accent);
    }
  } else {
    drawDefaultBackground(ctx, accent);
  }

  drawAccentShapes(ctx, accent);

  roundRect(ctx, 40, 45, WIDTH - 80, HEIGHT - 90, 18);
  ctx.fillStyle = "rgba(0,0,0,0.50)";
  ctx.fill();

  // top badge
  roundRect(ctx, 410, 75, 380, 54, 14);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fill();
  drawPixelText(ctx, memberText, 600, 93, fitPixelText(memberText, 315, 4, 3), "#ffffff", "center", 0.95);

  // avatar
  try {
    const avatar = await imageFromUrl(avatarUrl);
    drawCircularImage(ctx, avatar, 505, 130, 170);
  } catch {
    drawAvatarFallback(ctx, 505, 130, 170);
  }

  const headline = isGoodbye ? "GOODBYE" : "WELCOME";
  const headlineSize = fitPixelText(`${headline} ${safeName}`, 700, 6, 4);
  drawPixelText(ctx, `${headline} ${safeName}`, 600, 320, headlineSize, "#ffffff", "center");

  const sub = isGoodbye ? "LEFT" : "TO";
  drawPixelText(ctx, sub, 600, 358, 4, "#ffffff", "center", 0.75);

  const guildSize = fitPixelText(safeGuild, 740, 5, 3);
  drawPixelText(ctx, safeGuild, 600, 385, guildSize, "#ffffff", "center", 0.9);

  return canvas.toBuffer("image/png");
}

module.exports = { createLevelCardBuffer, createLeaderboardCardBuffer, createMemberEventCardBuffer };
