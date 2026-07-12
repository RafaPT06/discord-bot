const { createCanvas } = require("canvas");
const { shortNumber, imageFromUrl, drawDefaultBackground, drawAccentShapes, roundRect, drawCircularImage, drawAvatarFallback, drawProgressBar } = require("./cardBase");
const { BRAND_COLORS, colorHex } = require("../brandColors");
const { drawPixelText, fitPixelText } = require("./pixelText");

async function createProfileCardBuffer({
  username,
  displayName,
  discriminator,
  avatarUrl,
  rank,
  level,
  currentXp,
  neededXp,
  totalXp,
  commandCount = 0,
  messageCount = 0,
  achievementsUnlocked = 0,
  achievementsTotal = 0,
  prestige = 0,
  joinedAt,
  createdAt,
  accentColor = 0x7c3aed,
  backgroundUrl,
}) {
  const PROFILE_WIDTH = 1200;
  const PROFILE_HEIGHT = 650;
  const accent = colorHex(BRAND_COLORS.primary);
  const accentLight = colorHex(BRAND_COLORS.primaryLight);

  const safeName = String(displayName || username || "Unknown");
  const safeRank = rank || "-";
  const safeLevel = Number(level || 0);
  const safeCurrentXp = Number(currentXp || 0);
  const safeNeededXp = Math.max(1, Number(neededXp || 1));
  const safeTotalXp = Number(totalXp || 0);
  const safeCommandCount = Number(commandCount || 0);
  const safeMessageCount = Number(messageCount || 0);
  const safeAchievementsUnlocked = Number(achievementsUnlocked || 0);
  const safeAchievementsTotal = Number(achievementsTotal || 0);
  const safePrestige = Number(prestige || 0);
  const percent = Math.floor((safeCurrentXp / safeNeededXp) * 100);

  const joinedText = joinedAt ? new Date(joinedAt).toISOString().slice(0, 10) : "UNKNOWN";
  const createdText = createdAt ? new Date(createdAt).toISOString().slice(0, 10) : "UNKNOWN";

  const canvas = createCanvas(PROFILE_WIDTH, PROFILE_HEIGHT);
  const ctx = canvas.getContext("2d");

  if (backgroundUrl) {
    try {
      const bg = await imageFromUrl(backgroundUrl);
      const scale = Math.max(PROFILE_WIDTH / bg.width, PROFILE_HEIGHT / bg.height);
      const sw = bg.width * scale;
      const sh = bg.height * scale;
      ctx.drawImage(bg, (PROFILE_WIDTH - sw) / 2, (PROFILE_HEIGHT - sh) / 2, sw, sh);
      ctx.fillStyle = "rgba(0,0,0,0.64)";
      ctx.fillRect(0, 0, PROFILE_WIDTH, PROFILE_HEIGHT);
    } catch {
      drawDefaultBackground(ctx, accent, PROFILE_WIDTH, PROFILE_HEIGHT);
    }
  } else {
    drawDefaultBackground(ctx, accent, PROFILE_WIDTH, PROFILE_HEIGHT);
  }

  drawAccentShapes(ctx, accent, PROFILE_WIDTH, PROFILE_HEIGHT);

  roundRect(ctx, 40, 55, PROFILE_WIDTH - 80, PROFILE_HEIGHT - 110, 18);
  ctx.fillStyle = "rgba(0,0,0,0.50)";
  ctx.fill();

  roundRect(ctx, 90, 95, 300, 470, 18);
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  ctx.fill();

  try {
    const avatar = await imageFromUrl(avatarUrl);
    drawCircularImage(ctx, avatar, 145, 145, 190);
  } catch {
    drawAvatarFallback(ctx, 145, 145, 190);
  }

  drawPixelText(ctx, "PROFILE", 240, 390, 5, accent, "center");

  const leftNameSize = fitPixelText(safeName, 240, 5, 3);
  drawPixelText(ctx, safeName, 240, 440, leftNameSize, "#ffffff", "center");

  if (discriminator && discriminator !== "0") {
    drawPixelText(ctx, `#${discriminator}`, 240, 480, 3, "#ffffff", "center", 0.45);
  }

  drawPixelText(ctx, "USER PROFILE", 450, 115, 6, "#ffffff", "left", 0.95);

  const mainNameSize = fitPixelText(safeName, 610, 7, 4);
  drawPixelText(ctx, safeName, 450, 175, mainNameSize, "#ffffff", "left");

  drawPixelText(ctx, "RANK", 620, 265, 4, "#ffffff", "right", 0.65);
  drawPixelText(ctx, `#${safeRank}`, 700, 265, 4, "#ffffff", "right");

  drawPixelText(ctx, "LEVEL", 860, 265, 4, "#ffffff", "right", 0.65);
  drawPixelText(ctx, String(safeLevel).padStart(2, "0"), 945, 265, 4, "#ffffff", "right");

  drawPixelText(ctx, "COMMANDS", 1080, 265, 4, "#ffffff", "right", 0.65);
  drawPixelText(ctx, shortNumber(safeCommandCount), 1145, 265, 4, "#ffffff", "right");

  drawPixelText(ctx, "MSG", 620, 320, 3, "#ffffff", "right", 0.65);
  drawPixelText(ctx, shortNumber(safeMessageCount), 700, 320, 3, "#ffffff", "right");

  drawPixelText(ctx, "ACH", 860, 320, 3, "#ffffff", "right", 0.65);
  drawPixelText(ctx, `${safeAchievementsUnlocked}/${safeAchievementsTotal}`, 945, 320, 3, "#ffffff", "right");

  drawPixelText(ctx, "PRESTIGE", 1080, 320, 3, "#ffffff", "right", 0.65);
  drawPixelText(ctx, String(safePrestige), 1145, 320, 3, "#ffffff", "right");

  drawPixelText(ctx, `${shortNumber(safeCurrentXp)}/${shortNumber(safeNeededXp)} XP`, 1085, 360, 5, "#ffffff", "right");
  drawProgressBar(ctx, 450, 400, 635, 46, percent, accentLight);

  drawPixelText(ctx, `TOTAL: ${shortNumber(safeTotalXp)} XP`, 768, 475, 4, "#ffffff", "center", 0.92);

  roundRect(ctx, 450, 515, 300, 68, 12);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fill();
  drawPixelText(ctx, "JOINED", 600, 530, 3, "#ffffff", "center", 0.55);
  drawPixelText(ctx, joinedText, 600, 558, 4, "#ffffff", "center");

  roundRect(ctx, 790, 515, 300, 68, 12);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fill();
  drawPixelText(ctx, "CREATED", 940, 530, 3, "#ffffff", "center", 0.55);
  drawPixelText(ctx, createdText, 940, 558, 4, "#ffffff", "center");

  return canvas.toBuffer("image/png");
}

module.exports = { createProfileCardBuffer };
