module.exports = {
  name: "cat",
  async execute(interaction) {
    await interaction.deferReply();
    try {
      const response = await fetch("https://api.thecatapi.com/v1/images/search");
      const data = await response.json();
      const catUrl = data?.[0]?.url;
      if (!catUrl) return interaction.editReply("😿 No cats found today...");
      return interaction.editReply({ content: "🐱 Here is a chaotic cat!", files: [catUrl] });
    } catch (e) {
      console.error("Cat API error:", e);
      return interaction.editReply("😿 The cats are hiding.");
    }
  },
};
