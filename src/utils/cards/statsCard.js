const { createCanvas } = require("canvas");
const {
  hexFromColor,
  shortNumber,
  imageFromUrl,
  drawDefaultBackground,
  drawAccentShapes,
  roundRect,
  drawCircularImage,
  drawAvatarFallback,
  drawProgressBar,
} = require("./cardBase");
const { drawPixelText, fitPixelText } = require("./pixelText");
const { BRAND_COLORS, colorHex } = require("../brandColors");

function statBox(ctx, x, y, w, h, label, value, accent) {
  roundRect(ctx, x, y, w, h, 14);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fill();
  drawPixelText(ctx, label, x + 20, y + 18, 3, "#ffffff", "left", 0.55);
  drawPixelText(ctx, String(value), x + w - 20, y + 55, fitPixelText(String(value), w - 40, 5, 3), accent, "right", 0.95);
}

async function createStatsCardBuffer({
  username,
  displayName,
  avatarUrl,
  rank,
  level,
  prestige,
  currentXp,
  neededXp,
  totalXp,
  messages,
  commandsUsed,
  levelsGained,
  xpToday,
  xpWeek,
  achievementsUnlocked,
  achievementsTotal,
  accentColor = 0x5865f2,
  backgroundUrl,
}) {
  const width = 1200;
  const height = 650;
  const accent = colorHex(BRAND_COLORS.primary);
  const safeName = String(displayName || username || "Unknown");
  const percent = Math.floor((Number(currentXp || 0) / Math.max(1, Number(neededXp || 1))) * 100);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  if (backgroundUrl) {
    try {
      const bg = await imageFromUrl(backgroundUrl);
      const scale = Math.max(width / bg.width, height / bg.height);
      const sw = bg.width * scale;
      const sh = bg.height * scale;
      ctx.drawImage(bg, (width - sw) / 2, (height - sh) / 2, sw, sh);
      ctx.fillStyle = "rgba(0,0,0,0.66)";
      ctx.fillRect(0, 0, width, height);
    } catch {
      drawDefaultBackground(ctx, accent, width, height);
    }
  } else {
    drawDefaultBackground(ctx, accent, width, height);
  }

  drawAccentShapes(ctx, accent, width, height);

  roundRect(ctx, 40, 55, width - 80, height - 110, 18);
  ctx.fillStyle = "rgba(0,0,0,0.50)";
  ctx.fill();

  try {
    const avatar = await imageFromUrl(avatarUrl);
    drawCircularImage(ctx, avatar, 90, 105, 175);
  } catch {
    drawAvatarFallback(ctx, 90, 105, 175);
  }

  const nameSize = fitPixelText(safeName, 320, 5, 3);
  drawPixelText(ctx, safeName, 177, 310, nameSize, "#ffffff", "center");
  drawPixelText(ctx, `RANK #${rank || "-"}`, 177, 360, 4, "#ffffff", "center", 0.70);
  drawPixelText(ctx, `LEVEL ${Number(level || 0)}`, 177, 405, 4, accent, "center");

  drawPixelText(ctx, "USER STATS", 700, 105, 7, "#ffffff", "center");

  drawPixelText(ctx, `${shortNumber(currentXp)}/${shortNumber(neededXp)} XP`, 1040, 180, 4, "#ffffff", "right", 0.85);
  drawProgressBar(ctx, 400, 205, 640, 42, percent, accent);
  drawPixelText(ctx, `TOTAL ${shortNumber(totalXp)} XP`, 720, 270, 4, "#ffffff", "center", 0.70);

  statBox(ctx, 390, 325, 210, 95, "MESSAGES", shortNumber(messages), accent);
  statBox(ctx, 625, 325, 210, 95, "COMMANDS", shortNumber(commandsUsed), accent);
  statBox(ctx, 860, 325, 210, 95, "LEVELS", shortNumber(levelsGained), accent);

  statBox(ctx, 390, 445, 210, 95, "XP TODAY", shortNumber(xpToday), accent);
  statBox(ctx, 625, 445, 210, 95, "XP WEEK", shortNumber(xpWeek), accent);
  statBox(ctx, 860, 445, 210, 95, "ACHIEVEMENTS", `${achievementsUnlocked}/${achievementsTotal}`, accent);

  drawPixelText(ctx, `PRESTIGE ${Number(prestige || 0)}`, 177, 475, 4, "#ffffff", "center", 0.65);

  return canvas.toBuffer("image/png");
}

module.exports = { createStatsCardBuffer };
