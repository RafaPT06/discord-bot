const { EmbedBuilder } = require("discord.js");
const { buildPanelEmbed } = require("../utils/panelPages");
const { canRunCommand } = require("../services/commandPerms");
const { addPanelEvent, clearPanelEvents } = require("../services/panelEvents");
const { getMaintenanceEnabled, setMaintenanceEnabled } = require("../services/maintenance");
const { getBackupSetting, sendBackupToChannel } = require("../services/backupScheduler");
const { sendFeed } = require("../services/feed");
const { buildFeedEmbed } = require("../utils/feedEmbed");
const { buildDeployEmbed, sendDeployNotices } = require("../services/deployNotifier");

function okEmbed(title, text) {
  return new EmbedBuilder().setTitle(title).setDescription(text).setTimestamp(new Date());
}

async function handlePanelAction(interaction, client) {
  const parts = String(interaction.customId || "").split(":");
  const action = parts[1] || "";

  const guildId = interaction.guildId;
  if (!guildId) return;

  await interaction.deferUpdate().catch(() => {});

  // Permission mapping: actions correspond to existing commands
  const requireCmd = {
    maintenance_toggle: "maintenance",
    backup_now: "test_backup",
    feed_test: "feed_test",
    deploy_test: "deploy_test",
    logs_clear: "perm_clear", // keep restricted
  }[action] || null;

  if (requireCmd) {
    const allowed = await canRunCommand(interaction, requireCmd).catch(() => false);
    if (!allowed) {
      await addPanelEvent(guildId, { level: 2, kind: "deny", message: `Denied panel action: ${action}` }).catch(() => {});
      const e = okEmbed("Not allowed", "You don’t have permission to use this action.");
      return interaction.editReply({ embeds: [e], components: interaction.message.components }).catch(() => {});
    }
  }

  try {
    if (action === "maintenance_toggle") {
      const cur = await getMaintenanceEnabled().catch(() => false);
      const next = !cur;
      await setMaintenanceEnabled(next);
      await addPanelEvent(guildId, { level: 2, kind: "maintenance", message: `Maintenance toggled to ${next ? "ON" : "OFF"}` });
      try {
        const who = interaction.user ? `${interaction.user.tag}` : "unknown";
        const embed = okEmbed("Maintenance", `Maintenance is now **${next ? "ON" : "OFF"}** (by ${who})`);
        await sendFeed(client, guildId, 2, embed);
      } catch {}
      try { await interaction.followUp({ content: `Maintenance is now ${next ? "ON" : "OFF"}.`, ephemeral: true }); } catch {}
    }

    if (action === "backup_now") {
      const s = await getBackupSetting(guildId);
      if (!s?.enabled || !s?.channel_id) throw new Error("Backup channel is not set.");
      await sendBackupToChannel(client, s.channel_id, "panel");
      await addPanelEvent(guildId, { level: 2, kind: "backup", message: `Backup sent to #${s.channel_id}` });
      try { await interaction.followUp({ content: "Backup sent.", ephemeral: true }); } catch {}
    }

    if (action === "feed_test") {
      const embed = buildFeedEmbed("Feed Test", "Panel test message", 2);
      await sendFeed(client, guildId, 2, embed);
      await addPanelEvent(guildId, { level: 3, kind: "feed", message: "Feed test sent" });
      try { await interaction.followUp({ content: "Feed test sent.", ephemeral: true }); } catch {}
    }

    if (action === "deploy_test") {
      // Send to configured deploy channels; if none, just log
      await sendDeployNotices(client, "deploy_test");
      await addPanelEvent(guildId, { level: 2, kind: "deploy", message: "Deploy test sent" });
      try { await interaction.followUp({ content: "Deploy test sent.", ephemeral: true }); } catch {}
    }

    if (action === "logs_clear") {
      await clearPanelEvents(guildId);
      await addPanelEvent(guildId, { level: 2, kind: "logs", message: "Logs cleared" });
      try { await interaction.followUp({ content: "Logs cleared.", ephemeral: true }); } catch {}
    }

    // Refresh current page (best-effort from embed title)
    let page = "overview";

    const built = await buildPanelEmbed(client, guildId, page);
    const embed = built?.embed ?? built;

    const components = typeof require("../commands/panel").buildComponents === "function"
      ? require("../commands/panel").buildComponents(page)
      : [];

    return interaction.editReply({ embeds: [embed], components }).catch(() => {});
  } catch (err) {
    console.error("panel action error:", err);
    await addPanelEvent(guildId, { level: 1, kind: "error", message: `Panel action failed (${action}): ${err?.message || String(err)}` }).catch(() => {});
    const e = okEmbed("Action failed", err?.message || String(err));
    return interaction.editReply({ embeds: [e], components: interaction.message.components }).catch(() => {});
  }
}

module.exports = { handlePanelAction };
