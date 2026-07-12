const { createCanvas } = require("canvas");
const { shortNumber, imageFromUrl, roundRect, drawCircularImage } = require("./cardBase");
const { BRAND_COLORS, colorHex } = require("../brandColors");
const { drawPixelText, fitPixelText } = require("./pixelText");

async function createLeaderboardCardBuffer({
  guildName = "Level Ranking",
  entries = [],
  accentColor = 0x7c3aed,
  backgroundUrl,
}) {
  const accent = colorHex(BRAND_COLORS.primary);
  const width = 1200;
  const height = 900;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  if (backgroundUrl) {
    try {
      const bg = await imageFromUrl(backgroundUrl);
      const scale = Math.max(width / bg.width, height / bg.height);
      const sw = bg.width * scale;
      const sh = bg.height * scale;
      ctx.drawImage(bg, (width - sw) / 2, (height - sh) / 2, sw, sh);
      ctx.fillStyle = "rgba(0,0,0,0.70)";
      ctx.fillRect(0, 0, width, height);
    } catch {
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "#080511");
      gradient.addColorStop(0.55, "#170d2b");
      gradient.addColorStop(1, "#050308");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }
  } else {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#080511");
    gradient.addColorStop(0.55, "#170d2b");
    gradient.addColorStop(1, "#050308");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.globalAlpha = 0.10;

  for (let i = 0; i < 34; i += 1) {
    ctx.fillStyle = i % 2 ? "#ffffff" : accent;
    ctx.beginPath();
    ctx.arc(
      Math.random() * width,
      Math.random() * height,
      50 + Math.random() * 170,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  ctx.globalAlpha = 1;

  drawPixelText(
    ctx,
    "LEVEL RANKING",
    width / 2,
    65,
    7,
    "#ffffff",
    "center",
    0.92
  );

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
      ctx.arc(
        circleX + circleSize / 2,
        circleY + circleSize / 2,
        circleSize / 2,
        0,
        Math.PI * 2
      );

      ctx.fillStyle = "rgba(255,255,255,0.10)";
      ctx.fill();

      ctx.strokeStyle = accent;
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.restore();
    }

    const lvlSize = fitPixelText(levelText, 35, 4, 3);
    drawPixelText(
      ctx,
      levelText,
      circleX + circleSize / 2,
      y - 2,
      lvlSize,
      "#ffffff",
      "center"
    );

    const nameSize = fitPixelText(name, 430, 5, 3);
    drawPixelText(ctx, name, 260, y, nameSize, "#ffffff", "left");

    const xpSize = fitPixelText(xpText, 260, 5, 3);
    drawPixelText(ctx, xpText, 1090, y, xpSize, "#ffffff", "right", 0.9);
  }

  return canvas.toBuffer("image/png");
}

module.exports = { createLeaderboardCardBuffer };
