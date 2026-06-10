const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');

const WIDTH = 1200;
const HEIGHT = 420;

try {
  GlobalFonts.registerFromPath('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 'CardBold');
  GlobalFonts.registerFromPath('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 'CardRegular');
} catch {}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function hexFromColor(color) {
  const n = Number(color) || 0x7c3aed;
  return `#${n.toString(16).padStart(6, '0').slice(-6)}`;
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

function fitText(ctx, text, maxWidth, startSize, minSize = 28, family = 'CardBold') {
  let size = startSize;
  while (size > minSize) {
    ctx.font = `${size}px ${family}, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= 2;
  }
  return minSize;
}

async function imageFromUrl(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  return loadImage(buffer);
}

function drawDefaultBackground(ctx, accent) {
  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, '#060606');
  gradient.addColorStop(0.55, '#111111');
  gradient.addColorStop(1, '#050505');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.globalAlpha = 0.18;
  for (let i = 0; i < 26; i += 1) {
    ctx.fillStyle = i % 2 ? '#ffffff' : accent;
    ctx.beginPath();
    ctx.arc(Math.random() * WIDTH, Math.random() * HEIGHT, 60 + Math.random() * 150, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = 'rgba(0,0,0,0.48)';
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

function drawCircularImage(ctx, img, x, y, size) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, x, y, size, size);
  ctx.restore();
}

function drawProgressBar(ctx, x, y, w, h, percent, accent) {
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = 'rgba(120,120,120,0.70)';
  ctx.fill();

  const filled = clamp(w * (percent / 100), 0, w);
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
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  if (backgroundUrl) {
    try {
      const bg = await imageFromUrl(backgroundUrl);
      const scale = Math.max(WIDTH / bg.width, HEIGHT / bg.height);
      const sw = bg.width * scale;
      const sh = bg.height * scale;
      ctx.drawImage(bg, (WIDTH - sw) / 2, (HEIGHT - sh) / 2, sw, sh);
      ctx.fillStyle = 'rgba(0,0,0,0.58)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    } catch {
      drawDefaultBackground(ctx, accent);
    }
  } else {
    drawDefaultBackground(ctx, accent);
  }

  drawAccentShapes(ctx, accent);

  roundRect(ctx, 40, 45, WIDTH - 80, HEIGHT - 90, 18);
  ctx.fillStyle = 'rgba(0,0,0,0.42)';
  ctx.fill();

  const avatar = await imageFromUrl(avatarUrl);
  drawCircularImage(ctx, avatar, 110, 92, 190);

  const name = displayName || username;
  ctx.fillStyle = '#ffffff';
  const nameSize = fitText(ctx, name, 430, 48, 30);
  ctx.font = `${nameSize}px CardBold, sans-serif`;
  ctx.fillText(name, 365, 190);

  if (discriminator && discriminator !== '0') {
    ctx.font = '34px CardRegular, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.40)';
    ctx.fillText(`#${discriminator}`, 365 + ctx.measureText(name).width + 12, 190);
  }

  ctx.textAlign = 'right';
  ctx.font = '34px CardRegular, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText('RANK', 825, 120);
  ctx.font = '70px CardBold, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`#${rank || '—'}`, 985, 125);

  ctx.font = '34px CardRegular, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText('LEVEL', 1080, 120);
  ctx.font = '70px CardBold, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(String(level).padStart(2, '0'), 1160, 125);

  const percent = neededXp > 0 ? Math.floor((currentXp / neededXp) * 100) : 0;
  ctx.font = '36px CardBold, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${currentXp.toLocaleString()}`, 870, 225);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText(`/${neededXp.toLocaleString()} XP`, 1060, 225);

  ctx.textAlign = 'left';
  drawProgressBar(ctx, 365, 250, 720, 54, percent, accent);

  ctx.textAlign = 'center';
  ctx.font = '28px CardBold, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`Total: ${Number(totalXp || 0).toLocaleString()} XP`, 725, 340);

  if (title) {
    ctx.textAlign = 'left';
    ctx.font = '30px CardBold, sans-serif';
    ctx.fillStyle = accent;
    ctx.fillText(title, 365, 110);
  }

  return canvas.encode('png');
}

module.exports = { createLevelCardBuffer };
