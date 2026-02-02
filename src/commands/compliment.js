const { pickRandom } = require("../utils/text");

const DEFAULT_FALLBACK = [
  "You’ve got really good vibes.",
  "You’re doing better than you think.",
  "You make things feel easier for people.",
];

const COMPLIMENT_COOLDOWN_MS = 10_000;

module.exports = {
  name: "compliment",
  async execute(interaction, ctx) {
    const { db, state } = ctx;

    const now = Date.now();
    const prev = state.complimentCooldown.get(interaction.user.id) ?? 0;
    if (now - prev < COMPLIMENT_COOLDOWN_MS) {
      return interaction.reply({ content: "⏳ Cooldown — wait a bit.", ephemeral: true });
    }
    state.complimentCooldown.set(interaction.user.id, now);

    let picked = null;
    if (interaction.inGuild()) {
      picked = await db.getRandomContentNoRepeat(interaction.guildId, "compliment").catch(() => null);
    }
    if (!picked) picked = pickRandom(DEFAULT_FALLBACK);

    const target = interaction.options.getUser("user");

    // In DMs: compliment invoker only
    if (!interaction.inGuild()) {
      return interaction.reply({ content: `✨ ${picked}`, ephemeral: false });
    }

    const who = target ?? interaction.user;
    return interaction.reply({ content: `Hey <@${who.id}> — ${picked} ✨`, ephemeral: false });
  },
};
