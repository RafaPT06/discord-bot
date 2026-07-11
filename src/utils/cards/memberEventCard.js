const { createCanvas } = require("canvas");
const { hexFromColor, imageFromUrl, drawDefaultBackground, drawAccentShapes, roundRect, drawCircularImage, drawAvatarFallback } = require("./cardBase");
const { drawPixelText, fitPixelText } = require("./pixelText");
const { drawUnicodeText } = require("./unicodeText");

function renderMemberEventTemplate(messageTemplate, {
  type = "welcome",
  displayName,
  username,
  guildName,
  memberNumber,
} = {}) {
  const isGoodbye = String(type).toLowerCase() === "goodbye";
  const safeName = String(displayName || username || "Unknown");
  const safeGuild = String(guildName || "this server");
  const raw = String(messageTemplate || "").trim();

  if (!raw) {
    return {
      headlineText: `${isGoodbye ? "GOODBYE" : "WELCOME"} ${safeName}`,
      subText: isGoodbye ? "LEFT" : "TO",
      guildText: safeGuild,
    };
  }

  const rendered = raw
    .replaceAll("{user}", safeName)
    .replaceAll("{server}", safeGuild)
    .replaceAll("{memberCount}", String(memberNumber || ""));
  const lines = rendered.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  if (lines.length >= 3) {
    const guildText = lines.pop();
    const subText = lines.pop();
    return {
      headlineText: lines.join(" "),
      subText,
      guildText,
    };
  }

  if (lines.length === 2) {
    return {
      headlineText: lines[0],
      subText: isGoodbye ? "LEFT" : "TO",
      guildText: lines[1],
    };
  }

  return {
    headlineText: lines[0] || `${isGoodbye ? "GOODBYE" : "WELCOME"} ${safeName}`,
    subText: isGoodbye ? "LEFT" : "TO",
    guildText: safeGuild,
  };
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
  messageTemplate,
  showMember = true,
  showAvatar = true,
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
  const { headlineText, subText, guildText } = renderMemberEventTemplate(messageTemplate, {
    type,
    displayName: safeName,
    username,
    guildName: safeGuild,
    memberNumber,
  });

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
      drawDefaultBackground(ctx, accent, EVENT_WIDTH, EVENT_HEIGHT);
    }
  } else {
    drawDefaultBackground(ctx, accent, EVENT_WIDTH, EVENT_HEIGHT);
  }

  drawAccentShapes(ctx, accent, EVENT_WIDTH, EVENT_HEIGHT);

  roundRect(ctx, 40, 55, EVENT_WIDTH - 80, EVENT_HEIGHT - 110, 18);
  ctx.fillStyle = "rgba(0,0,0,0.50)";
  ctx.fill();

  if (showMember !== false) {
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
  }

  if (showAvatar !== false) {
    try {
      const avatar = await imageFromUrl(avatarUrl);
      drawCircularImage(ctx, avatar, 505, 165, 170);
    } catch {
      drawAvatarFallback(ctx, 505, 165, 170);
    }
  }

  await drawUnicodeText(ctx, headlineText, 600, 382, {
    maxWidth: 760,
    startSize: 54,
    minSize: 28,
    align: "center",
    weight: 800,
    uppercase: true,
  });

  await drawUnicodeText(ctx, subText, 600, 456, {
    maxWidth: 500,
    startSize: 30,
    minSize: 20,
    align: "center",
    weight: 700,
    alpha: 0.78,
    uppercase: true,
  });

  await drawUnicodeText(ctx, guildText, 600, 510, {
    maxWidth: 760,
    startSize: 46,
    minSize: 24,
    align: "center",
    weight: 800,
    alpha: 0.92,
    uppercase: true,
  });

  return canvas.toBuffer("image/png");
}

module.exports = { createMemberEventCardBuffer, renderMemberEventTemplate };
