const { createCanvas } = require("canvas");
const { hexFromColor, imageFromUrl, drawDefaultBackground, drawAccentShapes, roundRect, drawCircularImage, drawAvatarFallback } = require("./cardBase");
const { drawPixelText, fitPixelText } = require("./pixelText");

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

      ctx.drawImage(
        bg,
        (EVENT_WIDTH - sw) / 2,
        (EVENT_HEIGHT - sh) / 2,
        sw,
        sh
      );

      ctx.fillStyle = "rgba(0,0,0,0.66)";
      ctx.fillRect(0, 0, EVENT_WIDTH, EVENT_HEIGHT);
    } catch {
      drawDefaultBackground(ctx, accent, EVENT_WIDTH, EVENT_HEIGHT);
    }
  } else {
    drawDefaultBackground(ctx, accent, EVENT_WIDTH, EVENT_HEIGHT);
  }

  drawAccentShapes(ctx, accent, EVENT_WIDTH, EVENT_HEIGHT);

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

module.exports = { createMemberEventCardBuffer };
