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
const FONT_STACK = '"DejaVu Sans", "Liberation Sans", Arial, sans-serif';

function fitCanvasFont(ctx, value, maxWidth, startSize, minSize = 24, weight = 800) {
  const text = String(value || "Unknown");
  let size = startSize;
  while (size > minSize) {
    ctx.font = `${weight} ${size}px ${FONT_STACK}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  return size;
}

function drawCenteredText(ctx, value, x, y, maxWidth, startSize, options = {}) {
  const text = String(value || "Unknown");
  const weight = Number(options.weight || 800);
  const size = fitCanvasFont(ctx, text, maxWidth, startSize, Number(options.minSize || 24), weight);
  ctx.save();
  ctx.font = `${weight} ${size}px ${FONT_STACK}`;
  ctx.fillStyle = options.color || "#ffffff";
  ctx.globalAlpha = Number(options.alpha ?? 1);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
  ctx.restore();
  return size;
}

function renderMemberEventTemplate(_messageTemplate, {
  type = "welcome",
  displayName,
  username,
  memberNumber,
} = {}) {
  const isGoodbye = String(type).toLowerCase() === "goodbye";
  const safeName = String(displayName || username || "Unknown");
  return {
    nameText: safeName,
    memberText: memberNumber
      ? (isGoodbye ? `MEMBER #${memberNumber}` : `YOU ARE MEMBER #${memberNumber}`)
      : '',
  };
}

async function createMemberEventCardBuffer({
  type = "welcome",
  username,
  displayName,
  avatarUrl,
  memberNumber,
  accentColor = 0x7c3aed,
  backgroundUrl,
  showMember = true,
  showAvatar = true,
}) {
  const width = 1200;
  const height = 650;
  const accent = hexFromColor(accentColor);
  const { nameText, memberText } = renderMemberEventTemplate(null, {
    type,
    displayName,
    username,
    memberNumber,
  });

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  if (backgroundUrl) {
    try {
      const bg = await imageFromUrl(backgroundUrl);
      const scale = Math.max(width / bg.width, height / bg.height);
      const sw = bg.width * scale;
      const sh = bg.height * scale;
      ctx.drawImage(bg, (width - sw) / 2, (height - sh) / 2, sw, sh);
      ctx.fillStyle = "rgba(0,0,0,0.62)";
      ctx.fillRect(0, 0, width, height);
    } catch {
      drawDefaultBackground(ctx, accent, width, height);
    }
  } else {
    drawDefaultBackground(ctx, accent, width, height);
  }

  drawAccentShapes(ctx, accent, width, height);

  roundRect(ctx, 54, 54, width - 108, height - 108, 30);
  ctx.fillStyle = "rgba(8,10,17,0.76)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  ctx.stroke();

  const avatarSize = showAvatar === false ? 0 : 200;
  if (showAvatar !== false) {
    const avatarX = (width - avatarSize) / 2;
    const avatarY = 128;
    try {
      const avatar = await imageFromUrl(avatarUrl);
      drawCircularImage(ctx, avatar, avatarX, avatarY, avatarSize);
    } catch {
      drawAvatarFallback(ctx, avatarX, avatarY, avatarSize);
    }
    ctx.save();
    ctx.beginPath();
    ctx.arc(width / 2, avatarY + avatarSize / 2, avatarSize / 2 + 8, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.88)";
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.restore();
  }

  const nameY = showAvatar === false ? 300 : 410;
  drawCenteredText(ctx, nameText, width / 2, nameY, 850, 66, { minSize: 30, weight: 850 });
  if (showMember !== false && memberText) {
    drawCenteredText(ctx, memberText, width / 2, nameY + 66, 760, 28, {
      minSize: 20,
      weight: 650,
      alpha: 0.66,
      color: "#e7e7ef",
    });
  }

  return canvas.toBuffer("image/png");
}

module.exports = { createMemberEventCardBuffer, renderMemberEventTemplate };
