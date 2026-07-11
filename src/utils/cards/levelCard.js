const { createCanvas } = require("canvas");
const { WIDTH, HEIGHT, hexFromColor, shortNumber, imageFromUrl, drawDefaultBackground, drawAccentShapes, roundRect, drawCircularImage, drawAvatarFallback, drawProgressBar } = require("./cardBase");
const { drawPixelText, fitPixelText } = require("./pixelText");
const { drawUnicodeText } = require("./unicodeText");

async function createLevelCardBuffer({
  username,
  displayName,
  discriminator,
  avatarUrl,
  rank,
  level,
  previousLevel,
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
  const isLevelUpCard = Boolean(title);

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
      drawDefaultBackground(ctx, accent, WIDTH, HEIGHT);
    }
  } else {
    drawDefaultBackground(ctx, accent, WIDTH, HEIGHT);
  }

  drawAccentShapes(ctx, accent, WIDTH, HEIGHT);

  roundRect(ctx, 40, 45, WIDTH - 80, HEIGHT - 90, 18);
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fill();

  try {
    const avatar = await imageFromUrl(avatarUrl);
    drawCircularImage(ctx, avatar, 110, 92, 190);
  } catch {
    drawAvatarFallback(ctx, 110, 92, 190);
  }

  if (isLevelUpCard) {
    drawPixelText(ctx, "LEVEL UP!", 365, 95, 5, "#ffffff", "left");
  }

  const renderedName = await drawUnicodeText(ctx, safeName, 365, 166, {
    maxWidth: 430,
    startSize: 46,
    minSize: 26,
    align: "left",
    weight: 800,
    uppercase: true,
  });

  if (discriminator && discriminator !== "0") {
    drawPixelText(ctx, `#${discriminator}`, 365 + renderedName.width + 14, 184, 4, "#ffffff", "left", 0.4);
  }

  if (isLevelUpCard) {
    const oldLevel = Number(previousLevel ?? Math.max(0, safeLevel - 1));
    const transitionText = `${oldLevel} > ${safeLevel}`;
    const transitionSize = fitPixelText(transitionText, 300, 4, 3);

    drawPixelText(ctx, "LEVEL", 895, 90, 4, "#ffffff", "right", 0.75);
    drawPixelText(
      ctx,
      transitionText,
      1120,
      90,
      transitionSize,
      "#ffffff",
      "right"
    );
  } else {
    drawPixelText(ctx, "RANK", 800, 90, 4, "#ffffff", "right", 0.75);
    drawPixelText(ctx, `#${safeRank}`, 870, 90, 4, "#ffffff", "right");

    drawPixelText(ctx, "LEVEL", 1050, 90, 4, "#ffffff", "right", 0.75);
    drawPixelText(
      ctx,
      String(safeLevel).padStart(2, "0"),
      1120,
      90,
      4,
      "#ffffff",
      "right"
    );
  }

  drawPixelText(
    ctx,
    `${shortNumber(safeCurrentXp)}/${shortNumber(safeNeededXp)} XP`,
    1060,
    205,
    5,
    "#ffffff",
    "right"
  );

  drawProgressBar(ctx, 365, 250, 720, 54, percent, "#ffffff");

  drawPixelText(
    ctx,
    `TOTAL: ${shortNumber(safeTotalXp)} XP`,
    725,
    330,
    4,
    "#ffffff",
    "center"
  );

  return canvas.toBuffer("image/png");
}

module.exports = { createLevelCardBuffer };
