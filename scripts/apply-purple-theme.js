const fs = require("node:fs");

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function write(file, content) {
  fs.writeFileSync(file, content.endsWith("\n") ? content : `${content}\n`);
}

function replace(file, from, to, label = from) {
  const content = read(file);
  if (content.includes(to)) return;
  if (!content.includes(from)) throw new Error(`Missing pattern in ${file}: ${label}`);
  write(file, content.replace(from, to));
}

function replaceAll(file, replacements) {
  let content = read(file);
  for (const [from, to, label = from] of replacements) {
    if (!content.includes(from)) {
      if (content.includes(to)) continue;
      throw new Error(`Missing pattern in ${file}: ${label}`);
    }
    content = content.split(from).join(to);
  }
  write(file, content);
}

replace(
  "src/index.js",
  'const { Client, GatewayIntentBits, Partials, Events, Collection } = require("discord.js");\n',
  'const { Client, GatewayIntentBits, Partials, Events, Collection } = require("discord.js");\nconst { installEmbedTheme } = require("./utils/embedTheme");\ninstallEmbedTheme();\n',
  "embed theme bootstrap",
);

write("src/utils/embeds.js", `const { EmbedBuilder } = require("discord.js");
const { BRAND_COLORS } = require("./brandColors");

function baseEmbed(title, tone = "primary") {
  const color = BRAND_COLORS[tone] || BRAND_COLORS.primary;
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setTimestamp(new Date());
}

function infoEmbed(title, description) {
  const embed = baseEmbed(title, "info");
  if (description) embed.setDescription(description);
  return embed;
}

function fieldsEmbed(title, fields, description) {
  const embed = baseEmbed(title, "primary");
  if (description) embed.setDescription(description);
  if (Array.isArray(fields) && fields.length) embed.addFields(fields);
  return embed;
}

function successEmbed(title, description) {
  const embed = baseEmbed(title, "success");
  if (description) embed.setDescription(description);
  return embed;
}

function errorEmbed(title, description) {
  const embed = baseEmbed(title, "danger");
  embed.setDescription(description || "Unknown error.");
  return embed;
}

module.exports = { baseEmbed, infoEmbed, fieldsEmbed, successEmbed, errorEmbed };
`);

replace(
  "src/services/dashboardEvents.js",
  "const { isUserModerationBypassed } = require('./moderationAccess');\n",
  "const { isUserModerationBypassed } = require('./moderationAccess');\nconst { BRAND_COLORS } = require('../utils/brandColors');\n",
  "dashboard event palette import",
);
replaceAll("src/services/dashboardEvents.js", [
  ["color = 0x5865f2", "color = BRAND_COLORS.info"],
  ["color = 0xed4245", "color = BRAND_COLORS.danger"],
  ["], 0xfee75c);", "], BRAND_COLORS.warning);"],
  ["], 0x3498db);", "], BRAND_COLORS.info);"],
  ["], 0x57f287);", "], BRAND_COLORS.member);"],
  ["], 0xed4245);", "], BRAND_COLORS.danger);"],
  ["], 0x9b59b6);", "], BRAND_COLORS.voice);"],
]);

replace(
  "src/services/deployNotifier.js",
  'const { EmbedBuilder } = require("discord.js");\n',
  'const { EmbedBuilder } = require("discord.js");\nconst { BRAND_COLORS } = require("../utils/brandColors");\n',
  "deploy palette import",
);
replace(
  "src/services/deployNotifier.js",
  `function embedColor() {
  const env = String(envName()).toLowerCase();
  if (env.includes("prod")) return 0x2ecc71; // green
  return 0xf39c12; // orange
}`,
  `function embedColor(type = "deploy") {
  if (type === "restart") return BRAND_COLORS.restart;
  const env = String(envName()).toLowerCase();
  return env.includes("prod") ? BRAND_COLORS.deploy : BRAND_COLORS.primaryLight;
}`,
  "deploy color resolver",
);
replace("src/services/deployNotifier.js", ".setColor(embedColor())", ".setColor(embedColor(type))");

replace(
  "src/services/backupScheduler.js",
  'const { pool } = require("../db/pool");\n',
  'const { pool } = require("../db/pool");\nconst { BRAND_COLORS } = require("../utils/brandColors");\n',
  "backup palette import",
);
replace(
  "src/services/backupScheduler.js",
  '    .setTitle("Database Backup")\n    .setDescription(',
  '    .setTitle("Database Backup")\n    .setColor(BRAND_COLORS.backup)\n    .setDescription(',
  "backup embed color",
);

replace(
  "src/services/errorAlerts.js",
  'const { pool } = require("../db/pool");\n',
  'const { pool } = require("../db/pool");\nconst { BRAND_COLORS } = require("../utils/brandColors");\n',
  "error palette import",
);
replace(
  "src/services/errorAlerts.js",
  '      .setTitle(` ${title}`)\n      .setDescription(',
  '      .setTitle(` ${title}`)\n      .setColor(BRAND_COLORS.danger)\n      .setDescription(',
  "error embed color",
);

replace(
  "src/services/leveling.js",
  'const { getCardBackground } = require("./config");\n',
  'const { getCardBackground } = require("./config");\nconst { BRAND_COLORS } = require("../utils/brandColors");\n',
  "leveling palette import",
);
replace(
  "src/services/leveling.js",
  `function getMemberEmbedColor(member) {
  const color = member?.displayColor || 0;
  return color && color !== 0 ? color : 0x5865f2;
}`,
  `function getMemberEmbedColor() {
  return BRAND_COLORS.leveling;
}`,
  "leveling brand color",
);

replace(
  "src/services/welcome.js",
  'const { getCardBackground } = require("./config");\n',
  'const { getCardBackground } = require("./config");\nconst { BRAND_COLORS } = require("../utils/brandColors");\n',
  "welcome palette import",
);
replace(
  "src/services/welcome.js",
  "    accentColor: member.displayColor || member.guild?.members?.me?.displayColor || 0x7c3aed,",
  "    accentColor: isGoodbye ? BRAND_COLORS.goodbye : BRAND_COLORS.welcome,",
  "welcome card color",
);

replace(
  "src/utils/cards/memberEventCard.js",
  'const { drawPixelText, fitPixelText } = require("./pixelText");\n',
  'const { drawPixelText, fitPixelText } = require("./pixelText");\nconst { BRAND_COLORS, colorHex } = require("../brandColors");\n',
  "member card palette import",
);
replaceAll("src/utils/cards/memberEventCard.js", [
  ["accentColor = 0x7c3aed", "accentColor = BRAND_COLORS.welcome"],
  ["  const accent = hexFromColor(accentColor);\n  const eventAccent = isGoodbye ? \"#f472b6\" : accent;", "  const eventAccent = colorHex(isGoodbye ? BRAND_COLORS.goodbye : BRAND_COLORS.welcome);"],
  ["`${type}:${nameText}:${memberNumber || 0}:${accent}`", "`${type}:${nameText}:${memberNumber || 0}:${eventAccent}`"],
  ["rgba(244,114,182,0.18)", "rgba(168,85,247,0.22)"],
  ["rgba(139,92,246,0.08)", "rgba(139,92,246,0.12)"],
  ["rgba(244,114,182,0.13)", "rgba(139,92,246,0.16)"],
  ["rgba(244,114,182,0.58)", "rgba(192,132,252,0.62)"],
  ["#f9a8d4", "#d8b4fe"],
  ["rgba(255,255,255,0.055)", "rgba(139,92,246,0.10)"],
  ["rgba(255,255,255,0.12)", "rgba(192,132,252,0.24)"],
  ["#ececf4", "#ede9fe"],
  ["rgba(244,114,182,0.16)", "rgba(168,85,247,0.22)"],
  ["isGoodbye ? \"rgba(249,168,212,0.92)\" : \"rgba(255,255,255,0.88)\"", "isGoodbye ? \"rgba(216,180,254,0.94)\" : \"rgba(196,181,253,0.90)\""],
  ["#f5d8e8", "#e9d5ff"],
  ["#e7e7ef", "#ddd6fe"],
]);

replace(
  "src/utils/cards/levelCard.js",
  'const { WIDTH, HEIGHT, hexFromColor, shortNumber, imageFromUrl, drawDefaultBackground, drawAccentShapes, roundRect, drawCircularImage, drawAvatarFallback, drawProgressBar } = require("./cardBase");\n',
  'const { WIDTH, HEIGHT, shortNumber, imageFromUrl, drawDefaultBackground, drawAccentShapes, roundRect, drawCircularImage, drawAvatarFallback, drawProgressBar } = require("./cardBase");\nconst { BRAND_COLORS, colorHex } = require("../brandColors");\n',
  "level card palette import",
);
replace(
  "src/utils/cards/levelCard.js",
  "  const accent = hexFromColor(accentColor);",
  "  const accent = colorHex(BRAND_COLORS.leveling);\n  const accentLight = colorHex(BRAND_COLORS.primaryLight);",
  "level card accent",
);
replaceAll("src/utils/cards/levelCard.js", [
  ['drawPixelText(ctx, "LEVEL UP!", 365, 95, 5, "#ffffff", "left");', 'drawPixelText(ctx, "LEVEL UP!", 365, 95, 5, accentLight, "left");'],
  ['  drawProgressBar(ctx, 365, 250, 720, 54, percent, "#ffffff");', '  drawProgressBar(ctx, 365, 250, 720, 54, percent, accentLight);'],
]);

replace(
  "src/utils/cards/profileCard.js",
  'const { hexFromColor, shortNumber, imageFromUrl, drawDefaultBackground, drawAccentShapes, roundRect, drawCircularImage, drawAvatarFallback, drawProgressBar } = require("./cardBase");\n',
  'const { shortNumber, imageFromUrl, drawDefaultBackground, drawAccentShapes, roundRect, drawCircularImage, drawAvatarFallback, drawProgressBar } = require("./cardBase");\nconst { BRAND_COLORS, colorHex } = require("../brandColors");\n',
  "profile card palette import",
);
replace("src/utils/cards/profileCard.js", "  const accent = hexFromColor(accentColor);", "  const accent = colorHex(BRAND_COLORS.primary);\n  const accentLight = colorHex(BRAND_COLORS.primaryLight);");
replace("src/utils/cards/profileCard.js", '  drawProgressBar(ctx, 450, 400, 635, 46, percent, "#ffffff");', "  drawProgressBar(ctx, 450, 400, 635, 46, percent, accentLight);");

replace(
  "src/utils/cards/leaderboardCard.js",
  'const { hexFromColor, shortNumber, imageFromUrl, roundRect, drawCircularImage } = require("./cardBase");\n',
  'const { shortNumber, imageFromUrl, roundRect, drawCircularImage } = require("./cardBase");\nconst { BRAND_COLORS, colorHex } = require("../brandColors");\n',
  "leaderboard palette import",
);
replace("src/utils/cards/leaderboardCard.js", "  const accent = hexFromColor(accentColor);", "  const accent = colorHex(BRAND_COLORS.primary);");
replaceAll("src/utils/cards/leaderboardCard.js", [
  ['gradient.addColorStop(0, "#050505");', 'gradient.addColorStop(0, "#080511");'],
  ['gradient.addColorStop(0.55, "#151515");', 'gradient.addColorStop(0.55, "#170d2b");'],
  ['gradient.addColorStop(1, "#050505");', 'gradient.addColorStop(1, "#050308");'],
]);

replace(
  "src/utils/cards/achievementCard.js",
  'const { hexFromColor, imageFromUrl, drawDefaultBackground, drawAccentShapes, roundRect, drawCircularImage, drawAvatarFallback } = require("./cardBase");\n',
  'const { imageFromUrl, drawDefaultBackground, drawAccentShapes, roundRect, drawCircularImage, drawAvatarFallback } = require("./cardBase");\nconst { BRAND_COLORS, colorHex } = require("../brandColors");\n',
  "achievement card palette import",
);
replace("src/utils/cards/achievementCard.js", "  const accent = hexFromColor(accentColor);", "  const accent = colorHex(BRAND_COLORS.achievement);");

replace(
  "src/utils/cards/statsCard.js",
  '  hexFromColor,\n',
  "",
  "stats card hex import",
);
replace(
  "src/utils/cards/statsCard.js",
  'const { drawPixelText, fitPixelText } = require("./pixelText");\n',
  'const { drawPixelText, fitPixelText } = require("./pixelText");\nconst { BRAND_COLORS, colorHex } = require("../brandColors");\n',
  "stats card palette import",
);
replace("src/utils/cards/statsCard.js", "  const accent = hexFromColor(accentColor);", "  const accent = colorHex(BRAND_COLORS.primary);");

replace(
  "src/utils/cards/achievementsListCard.js",
  '  hexFromColor,\n',
  "",
  "achievement list hex import",
);
replace(
  "src/utils/cards/achievementsListCard.js",
  'const { drawPixelText, fitPixelText } = require("./pixelText");\n',
  'const { drawPixelText, fitPixelText } = require("./pixelText");\nconst { BRAND_COLORS, colorHex } = require("../brandColors");\n',
  "achievement list palette import",
);
replace("src/utils/cards/achievementsListCard.js", "  const accent = hexFromColor(accentColor);", "  const accent = colorHex(BRAND_COLORS.achievement);");

replaceAll("src/utils/cards/cardBase.js", [
  ['gradient.addColorStop(0, "#050505");', 'gradient.addColorStop(0, "#080511");'],
  ['gradient.addColorStop(0.55, "#111111");', 'gradient.addColorStop(0.55, "#170d2b");'],
  ['gradient.addColorStop(1, "#030303");', 'gradient.addColorStop(1, "#050308");'],
]);

console.log("Applied Meowz purple theme updates.");
