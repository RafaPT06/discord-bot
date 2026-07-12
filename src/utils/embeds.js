const { EmbedBuilder } = require("discord.js");
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
