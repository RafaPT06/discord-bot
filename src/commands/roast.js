const { pickRandom } = require("../utils/text");

const DEFAULT_ROASTS = [
  "I’d agree with you but then we’d both be wrong.",
  "I’m not saying I hate you, but I’d unplug your life support to charge my phone.",
  "You're like a cloud. When you disappear, it's a beautiful day.",
  "I treasure the time I spend with you, but I treasure my sanity more.",
  "You have the perfect face for radio.",
];

module.exports = {
  name: "roast",
  async execute(interaction, ctx) {
    const { db } = ctx;
    const target = interaction.options.getUser("user") || interaction.user;

    let roast = null;
    if (interaction.inGuild()) {
      roast = await db.getRandomContentNoRepeat(interaction.guildId, "roast").catch(() => null);
    }
    if (!roast) roast = pickRandom(DEFAULT_ROASTS);

    return interaction.reply({ content: `<@${target.id}>, ${roast}`, ephemeral: false });
  },
};
