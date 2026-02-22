const { SlashCommandBuilder } = require("discord.js");
const { pool } = require("../db/pool");
const { errorEmbed } = require("../utils/embeds");
const { sendFeed } = require("../services/feed");

async function getErrorTargets(guildId) {
  const res = await pool.query(
    "SELECT channel_id FROM error_alert_settings WHERE enabled=TRUE AND guild_id=$1",
    [guildId]
  );
  return res.rows || [];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("simulate_error")
    .setDescription("Owner: simulate an error alert."),
  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true }).catch(() => {});
    if (interaction.user.id !== process.env.OWNER_ID) {
      return interaction.editReply({ content: "Error: Owner only." }).catch(() => {});
    }
    const embed = errorEmbed("Simulated Error", "This is a simulated error alert.");
    // Send to configured error alert channel if exists, else current channel
    let sent = false;
    try {
      const targets = await getErrorTargets(interaction.guildId);
      for (const t of targets) {
        const ch = await client.channels.fetch(t.channel_id).catch(() => null);
        if (!ch || !ch.isTextBased()) continue;
        await ch.send({ embeds: [embed] }).catch(() => {});
        sent = true;
      }
    } catch (_) {}
    if (!sent) {
      await interaction.channel.send({ embeds: [embed] }).catch(() => {});
    }
    await sendFeed(client, interaction.guildId, 1, embed);
    return interaction.editReply({ content: "Simulated error sent." }).catch(() => {});
  },
};
