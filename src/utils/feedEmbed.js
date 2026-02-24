const { EmbedBuilder } = require("discord.js");

function buildFeedEmbed(title, description, level = 2) {
  const e = new EmbedBuilder().setTitle(title).setDescription(description).setTimestamp(new Date());
  return e;
}

module.exports = { buildFeedEmbed };
