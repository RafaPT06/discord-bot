
const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require("discord.js");
const { pool } = require("../db/pool");
const { canManageSettings } = require("../utils/perms");
const { ensureFeedTables } = require("../services/feed");
const { ensureLevelTables, upsertLevelChannel, ensureLevelRewardRoles } = require("../services/leveling");
const { ensureWelcomeTables, setWelcomeChannel, setGoodbyeChannel } = require("../services/welcome");

async function upsertSetting(table, guildId, channelId) {
  await pool.query(
    `INSERT INTO ${table} (guild_id, channel_id)
     VALUES ($1, $2)
     ON CONFLICT (guild_id) DO UPDATE SET channel_id=EXCLUDED.channel_id, enabled=TRUE, updated_at=NOW()`,
    [guildId, channelId]
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup_channels")
    .setDescription("Create a category + system channels and auto-configure them (Manage Server / Owner).")
    .addStringOption(o =>
      o.setName("category")
        .setDescription("Category name (default: bot)")
        .setRequired(false)
    ),
  async execute(interaction) {
    if (!interaction.guildId) return interaction.reply({ content: "Server only.", ephemeral: true });
    if (!canManageSettings(interaction)) {
      return interaction.reply({ content: "Requires **Manage Server** (or Owner).", ephemeral: true });
    }

    const me = interaction.guild.members.me;
    if (!me?.permissions?.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({ content: "Bot is missing **Manage Channels** permission.", ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true }).catch(() => {});

    await ensureFeedTables();
    await ensureLevelTables();
    await ensureWelcomeTables();

    const categoryName = (interaction.options.getString("category") || "bot").trim().slice(0, 90);

    // Find or create category
    let category = interaction.guild.channels.cache.find(
      c => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === categoryName.toLowerCase()
    );

    if (!category) {
      category = await interaction.guild.channels.create({
        name: categoryName,
        type: ChannelType.GuildCategory
      });
    }

    const everyoneId = interaction.guild.roles.everyone.id;
    const botId = interaction.client.user.id;

    const overwrites = [
      { id: everyoneId, deny: [PermissionFlagsBits.SendMessages] },
      { id: botId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.AttachFiles] },
    ];

    async function ensureText(name) {
      // Reuse if already exists under the category
      const existing = interaction.guild.channels.cache.find(
        c => (c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement) &&
             c.parentId === category.id &&
             c.name.toLowerCase() === name.toLowerCase()
      );
      if (existing) return existing;

      return interaction.guild.channels.create({
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
    const levelCh = await ensureText("level-up");
    const welcomeCh = await ensureText("welcome");
    const goodbyeCh = await ensureText("goodbye");

    await upsertSetting("deploy_channel_settings", interaction.guildId, deployCh.id);
    await upsertSetting("roblox_alert_settings", interaction.guildId, robloxCh.id);
    await upsertSetting("error_alert_settings", interaction.guildId, errorCh.id);
    await upsertSetting("backup_channel_settings", interaction.guildId, backupCh.id);
    await upsertSetting("feed_channel_settings", interaction.guildId, feedCh.id);
    await upsertLevelChannel(interaction.guildId, levelCh.id);
    await setWelcomeChannel(interaction.guildId, welcomeCh.id);
    await setGoodbyeChannel(interaction.guildId, goodbyeCh.id);
    const levelRoles = await ensureLevelRewardRoles(interaction.guild).catch(() => []);

    return interaction.editReply({
      content: [
        "Setup complete.",
        `Category: **${category.name}**`,
        `Deploy: ${deployCh}`,
        `Roblox: ${robloxCh}`,
        `Errors: ${errorCh}`,
        `Backups: ${backupCh}`,
        `Feed: ${feedCh}`,
        `Level-up: ${levelCh}`,
        `Welcome: ${welcomeCh}`,
        `Goodbye: ${goodbyeCh}`,
        `Level roles: ${levelRoles.length ? levelRoles.map(({ level }) => `Level ${level}`).join(", ") : "not created (missing Manage Roles or role position)"}`,
      ].join("\n")
    });
  }
};
