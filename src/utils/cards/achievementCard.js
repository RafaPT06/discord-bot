const { createCanvas } = require("canvas");
const { hexFromColor, imageFromUrl, drawDefaultBackground, drawAccentShapes, roundRect, drawCircularImage, drawAvatarFallback } = require("./cardBase");
const { drawPixelText, fitPixelText } = require("./pixelText");

async function createAchievementCardBuffer({ username, displayName, avatarUrl, achievementName, description, accentColor = 0xfbbf24, backgroundUrl }) {
  const width = 1200;
  const height = 520;
  const accent = hexFromColor(accentColor);
  const safeName = String(displayName || username || "Unknown");
  const safeAchievement = String(achievementName || "Achievement");
  const safeDescription = String(description || "Unlocked");

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  if (backgroundUrl) {
    try {
      const bg = await imageFromUrl(backgroundUrl);
      const scale = Math.max(width / bg.width, height / bg.height);
      const sw = bg.width * scale;
      const sh = bg.height * scale;
      ctx.drawImage(bg, (width - sw) / 2, (height - sh) / 2, sw, sh);
      ctx.fillStyle = "rgba(0,0,0,0.68)";
      ctx.fillRect(0, 0, width, height);
    } catch {
      drawDefaultBackground(ctx, accent, width, height);
    }
  } else {
    drawDefaultBackground(ctx, accent, width, height);
  }

  drawAccentShapes(ctx, accent, width, height);
  roundRect(ctx, 50, 55, width - 100, height - 110, 20);
  ctx.fillStyle = "rgba(0,0,0,0.50)";
  ctx.fill();

  try {
    const avatar = await imageFromUrl(avatarUrl);
    drawCircularImage(ctx, avatar, 95, 155, 185);
  } catch {
    drawAvatarFallback(ctx, 95, 155, 185);
  }

  drawPixelText(ctx, "ACHIEVEMENT", 645, 115, 6, "#ffffff", "center", 0.85);
  drawPixelText(ctx, "UNLOCKED", 645, 165, 6, accent, "center", 1);

  const achSize = fitPixelText(safeAchievement, 650, 7, 4);
  drawPixelText(ctx, safeAchievement, 645, 245, achSize, "#ffffff", "center");

  const descSize = fitPixelText(safeDescription, 700, 5, 3);
  drawPixelText(ctx, safeDescription, 645, 325, descSize, "#ffffff", "center", 0.75);

  const nameSize = fitPixelText(safeName, 360, 4, 3);
  drawPixelText(ctx, safeName, 187, 385, nameSize, "#ffffff", "center", 0.9);

  return canvas.toBuffer("image/png");
}

module.exports = { createAchievementCardBuffer };
