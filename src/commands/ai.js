const { SlashCommandBuilder } = require("discord.js");
const { setEnabled, getSettings, getStats } = require("../services/aiMonitor");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ai")
    .setDescription("Server AI monitor (feed-only).")
    .addSubcommand(s => s.setName("enable").setDescription("Enable AI monitor for this server."))
    .addSubcommand(s => s.setName("disable").setDescription("Disable AI monitor for this server."))
    .addSubcommand(s => s.setName("status").setDescription("Show AI monitor status.")),
  async execute(interaction) {
    if (!interaction.guildId) {
      return interaction.reply({ content: "Server only.", ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === "enable") {
      await setEnabled(interaction.guildId, true);
      return interaction.reply({ content: "AI monitor enabled (feed-only).", ephemeral: false });
    }

    if (sub === "disable") {
      await setEnabled(interaction.guildId, false);
      return interaction.reply({ content: "AI monitor disabled.", ephemeral: false });
    }

    if (sub === "status") {
      const s = await getSettings(interaction.guildId);
      const st = await getStats(interaction.guildId);

      const baseline = Number(st.baseline_rate || 0);
      const lastMsg = st.last_message_at ? Math.floor(new Date(st.last_message_at).getTime()/1000) : null;

      const lines = [
        `Enabled: ${s.enabled ? "YES" : "NO"}`,
        `Spike multiplier: ${Number(s.spike_multiplier).toFixed(2)}x`,
        `Window: ${s.window_seconds}s`,
        `Baseline (msgs/min): ${(baseline*60).toFixed(2)}`,
        `Idle minutes: ${s.idle_minutes}`,
        `Last message: ${lastMsg ? `<t:${lastMsg}:R>` : "n/a"}`,
      ];

      return interaction.reply({ content: lines.join("\n"), ephemeral: false });
    }
  },
};
