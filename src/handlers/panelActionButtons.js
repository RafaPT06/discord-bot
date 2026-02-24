const { EmbedBuilder } = require("discord.js");
const { buildPanelEmbed } = require("../utils/panelPages");
const { pool } = require("../db/pool");
const { canRunCommand } = require("../services/commandPerms");
const { addPanelEvent, clearPanelEvents } = require("../services/panelEvents");
const { getMaintenanceEnabled, setMaintenanceEnabled } = require("../services/maintenance");
const { getBackupSetting, sendBackupToChannel } = require("../services/backupScheduler");
const { sendFeed } = require("../services/feed");
const { buildFeedEmbed } = require("../utils/feedEmbed");
const { buildDeployEmbed, sendDeployNotices } = require("../services/deployNotifier");

async function upsertSetting(table, guildId, channelId) {
  await pool.query(
    `INSERT INTO ${table} (guild_id, channel_id)
     VALUES ($1, $2)
     ON CONFLICT (guild_id) DO UPDATE SET channel_id=EXCLUDED.channel_id, enabled=TRUE, updated_at=NOW()`,
    [guildId, channelId]
  );
}

async function runSetupWizard(interaction) {
  const { ChannelType, PermissionFlagsBits } = require("discord.js");
  const guild = interaction.guild;
  const guildId = interaction.guildId;

  const me = guild.members.me;
  if (!me?.permissions?.has(PermissionFlagsBits.ManageChannels)) {
    throw new Error("Bot is missing Manage Channels permission.");
  }

  const categoryName = "bot";

  let category = guild.channels.cache.find(
    c => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === categoryName
  );

  if (!category) {
    category = await guild.channels.create({ name: categoryName, type: ChannelType.GuildCategory });
  }

  const everyoneId = guild.roles.everyone.id;
  const botId = interaction.client.user.id;

  const overwrites = [
    { id: everyoneId, deny: [PermissionFlagsBits.SendMessages] },
    { id: botId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.AttachFiles] },
  ];

  async function ensureText(name) {
    const existing = guild.channels.cache.find(
      c => (c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement) &&
           c.parentId === category.id &&
           c.name.toLowerCase() === name.toLowerCase()
    );
    if (existing) return existing;

    return guild.channels.create({
      name,
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: overwrites,
    });
  }

  const deployCh = await ensureText("deploy-updates");
  const robloxCh = await ensureText("roblox-alerts");
  const errorCh = await ensureText("error-alerts");
  const backupCh = await ensureText("backups");
  const feedCh = await ensureText("bot-feed");

  await upsertSetting("deploy_channel_settings", guildId, deployCh.id);
  await upsertSetting("roblox_alert_settings", guildId, robloxCh.id);
  await upsertSetting("error_alert_settings", guildId, errorCh.id);
  await upsertSetting("backup_channel_settings", guildId, backupCh.id);
  await upsertSetting("feed_channel_settings", guildId, feedCh.id);

  return { category, deployCh, robloxCh, errorCh, backupCh, feedCh };
}

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
    setup_wizard: "setup_channels",
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
      const who = interaction.user ? `<@${interaction.user.id}>` : "unknown";
      await addPanelEvent(guildId, { level: 2, kind: "backup", message: `Backup sent (by ${who})` });
      try { await interaction.followUp({ content: "Backup sent.", ephemeral: true }); } catch {}
    }

    if (action === "feed_test") {
      const embed = buildFeedEmbed("Feed Test", "Panel test message", 2);
      await sendFeed(client, guildId, 2, embed);
      const who = interaction.user ? `<@${interaction.user.id}>` : "unknown";
      await addPanelEvent(guildId, { level: 3, kind: "feed", message: `Feed test sent (by ${who})` });
      try { await interaction.followUp({ content: "Feed test sent.", ephemeral: true }); } catch {}
    }

    if (action === "deploy_test") {
      // Send to configured deploy channels; if none, just log
      await sendDeployNotices(client, "deploy_test");
      const who = interaction.user ? `<@${interaction.user.id}>` : "unknown";
      await addPanelEvent(guildId, { level: 2, kind: "deploy", message: `Deploy test sent (by ${who})` });
      try { await interaction.followUp({ content: "Deploy test sent.", ephemeral: true }); } catch {}
    }

    
    
    if (action === "setup_wizard") {
      const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("panelact:setup_confirm")
          .setLabel("Confirm Setup")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId("panelact:setup_cancel")
          .setLabel("Cancel")
          .setStyle(ButtonStyle.Secondary)
      );

      return interaction.followUp({
        content: "This will create a category and system channels. Continue?",
        components: [row],
        ephemeral: true
      });
    }

    if (action === "setup_cancel") {
      return interaction.followUp({ content: "Setup cancelled.", ephemeral: true });
    }

    if (action === "setup_confirm") {
      const res = await runSetupWizard(interaction);
      const who = interaction.user ? `<@${interaction.user.id}>` : "unknown";

      await addPanelEvent(guildId, { level: 2, kind: "setup", message: `Setup completed (by ${who})` });

      try {
        const embed = okEmbed("Setup Complete", `Category **${res.category.name}** is ready.`);
        await sendFeed(client, guildId, 2, embed);
      } catch {}

      return interaction.followUp({ content: "Setup finished successfully.", ephemeral: true });
    }

if (action === "logs_clear") {
      await clearPanelEvents(guildId);
      const who = interaction.user ? `<@${interaction.user.id}>` : "unknown";
      await addPanelEvent(guildId, { level: 2, kind: "logs", message: `Logs cleared (by ${who})` });
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
