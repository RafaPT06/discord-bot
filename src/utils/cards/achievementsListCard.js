const { createCanvas } = require("canvas");
const {
  hexFromColor,
  imageFromUrl,
  drawDefaultBackground,
  drawAccentShapes,
  roundRect,
  drawCircularImage,
  drawAvatarFallback,
} = require("./cardBase");
const { drawPixelText, fitPixelText } = require("./pixelText");

async function createAchievementsListCardBuffer({
  username,
  displayName,
  avatarUrl,
  achievements = [],
  accentColor = 0xfbbf24,
  backgroundUrl,
}) {
  const width = 1200;
  const height = 650;
  const accent = hexFromColor(accentColor);
  const safeName = String(displayName || username || "Unknown");
  const list = Array.isArray(achievements) ? achievements.slice(0, 8) : [];

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
    drawCircularImage(ctx, avatar, 90, 105, 170);
  } catch {
    drawAvatarFallback(ctx, 90, 105, 170);
  }

  const nameSize = fitPixelText(safeName, 310, 5, 3);
  drawPixelText(ctx, safeName, 175, 305, nameSize, "#ffffff", "center");
  drawPixelText(ctx, `${list.length} UNLOCKED`, 175, 355, 4, accent, "center");

  drawPixelText(ctx, "ACHIEVEMENTS", 705, 105, 7, "#ffffff", "center");
  drawPixelText(ctx, "UNLOCKED ONLY", 705, 160, 4, "#ffffff", "center", 0.65);

  if (!list.length) {
    drawPixelText(ctx, "NO ACHIEVEMENTS YET", 705, 340, 6, "#ffffff", "center", 0.75);
    drawPixelText(ctx, "KEEP CHATTING TO UNLOCK SOME", 705, 400, 4, "#ffffff", "center", 0.45);
    return canvas.toBuffer("image/png");
  }

  for (let i = 0; i < list.length; i += 1) {
    const a = list[i];
    const y = 220 + i * 48;
    const name = String(a.name || "Achievement");
    const desc = String(a.description || "Unlocked");

    if (i > 0) {
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fillRect(370, y - 15, 680, 1);
    }

    drawPixelText(ctx, "#", 395, y, 4, accent, "left");
    drawPixelText(ctx, name, 440, y, fitPixelText(name, 300, 4, 3), "#ffffff", "left");
    drawPixelText(ctx, desc, 1040, y, fitPixelText(desc, 350, 3, 2), "#ffffff", "right", 0.60);
  }

  return canvas.toBuffer("image/png");
}

module.exports = { createAchievementsListCardBuffer };
