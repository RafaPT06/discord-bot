const { EmbedBuilder } = require("discord.js");

function baseEmbed(title) {
  const e = new EmbedBuilder().setTitle(title);
  // Keep style minimal: timestamp only (consistent, no emojis)
  e.setTimestamp(new Date());
  return e;
}

function infoEmbed(title, description) {
  const e = baseEmbed(title);
  if (description) e.setDescription(description);
  return e;
}

function fieldsEmbed(title, fields, description) {
  const e = baseEmbed(title);
  if (description) e.setDescription(description);
  if (Array.isArray(fields) && fields.length) e.addFields(fields);
  return e;
}

function successEmbed(title, description) {
  return infoEmbed(title, description);
}

function errorEmbed(title, description) {
  return infoEmbed(title, description || "Unknown error.");
}

module.exports = { baseEmbed, infoEmbed, fieldsEmbed, successEmbed, errorEmbed };
