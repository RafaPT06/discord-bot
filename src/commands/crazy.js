const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const CRAZY_COOLDOWN_MS = 15_000;
const CRAZY_MAX_TIMES = 3;

module.exports = {
  name: "crazy",
  async execute(interaction, ctx) {
    const { state } = ctx;
    const now = Date.now();
    const prev = state.crazyCooldown.get(interaction.user.id) ?? 0;
    if (now - prev < CRAZY_COOLDOWN_MS) {
      return interaction.reply({ content: "⏳ Cooldown — wait a bit.", ephemeral: true });
    }
    state.crazyCooldown.set(interaction.user.id, now);

    const timesRaw = interaction.options.getInteger("times") ?? 1;
    const times = Math.max(1, Math.min(timesRaw, CRAZY_MAX_TIMES));

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`crazy_send_${times}_${interaction.user.id}`)
        .setLabel("Go Crazy")
        .setStyle(ButtonStyle.Danger)
    );

    const payload = {
      content: `Ready to go crazy? Times: **${times}** (max ${CRAZY_MAX_TIMES}).`,
      components: [row],
    };

    // Ephemeral breaks in DMs -> only use in guilds
    if (interaction.inGuild()) payload.ephemeral = true;
    return interaction.reply(payload);
  },
  constants: { CRAZY_MAX_TIMES },
};
