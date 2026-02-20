const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { request } = require("undici");

async function getCatUrl() {
  // TheCatAPI: returns JSON with image URLs
  const res = await request("https://api.thecatapi.com/v1/images/search", {
    headersTimeout: 10000,
    bodyTimeout: 10000,
  });

  const text = await res.body.text();
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw new Error(`Cat API HTTP ${res.statusCode}`);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    // If we got HTML or something weird, don't show it
    throw new Error("Cat API returned non-JSON");
  }

  const url = data?.[0]?.url;
  if (!url) throw new Error("Cat API missing image url");
  return url;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("cat")
    .setDescription("Random cat."),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false }).catch(() => {});

    try {
      const url = await getCatUrl();

      const embed = new EmbedBuilder()
        .setTitle("Cat")
        .setImage(url);

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      // Never print the raw response body to users
      return interaction.editReply({
        content: "Error: cat service is unavailable right now.",
        embeds: [],
      });
    }
  },
};
