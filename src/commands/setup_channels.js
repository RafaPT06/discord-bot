const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require("discord.js");
const { pool } = require("../db/pool");

function buildOverwrites(guild, botUserId) {
  const everyoneId = guild.roles.everyone?.id;
  const base = [];

  // Everyone can read, but cannot talk.
  if (everyoneId) {
    base.push({
      id: everyoneId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
      deny: [PermissionFlagsBits.SendMessages],
    });
  }

  // Bot can send messages.
  base.push({
    id: botUserId,
    allow: [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.EmbedLinks,
      PermissionFlagsBits.ReadMessageHistory,
    ],
  });

  return base;
}

async function upsertSetting(table, guildId, channelId) {
  await pool.query(
    `INSERT INTO ${table} (guild_id, channel_id, enabled)
     VALUES ($1,$2,TRUE)
     ON CONFLICT (guild_id)
     DO UPDATE SET channel_id=EXCLUDED.channel_id, enabled=TRUE, updated_at=NOW()`,
    [guildId, channelId]
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup_channels")
    .setDescription("Create a bot category + channels and auto-configure deploy/alert channels.")
    .addStringOption((o) =>
      o
        .setName("category")
        .setDescription("Category name (default: bot)")
        .setRequired(false)
    ),

  async execute(interaction, client) {
    if (!interaction.inGuild()) {
      return interaction.reply({ content: "Error: Use this in a server.", ephemeral: true });
    }

    // Require Manage Server OR Owner
    const isOwner = interaction.user?.id === process.env.OWNER_ID;
    const canManage = interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);
    if (!isOwner && !canManage) {
      return interaction.reply({
        content: "Error: You need Manage Server (or be the Owner) to run this command.",
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: false }).catch(() => {});

    const guild = interaction.guild;
    const categoryName = interaction.options.getString("category") || "bot";
    const overwrites = buildOverwrites(guild, client.user.id);

    const category = await guild.channels
      .create({
        name: categoryName,
        type: ChannelType.GuildCategory,
        permissionOverwrites: overwrites,
      })
      .catch(() => null);

    if (!category) {
      return interaction.editReply("Error: Could not create category (missing permissions?).").catch(() => {});
    }

    async function makeText(name) {
      return guild.channels
        .create({
          name,
          type: ChannelType.GuildText,
          parent: category.id,
          permissionOverwrites: overwrites,
        })
        .catch(() => null);
    }

    const deployCh = await makeText("deploy-updates");
    const robloxAlertCh = await makeText("roblox-alerts");
    const errorAlertCh = await makeText("error-alerts");

    // Auto-configure settings tables
    const gid = guild.id;
    if (deployCh) await upsertSetting("deploy_channel_settings", gid, deployCh.id);
    if (robloxAlertCh) await upsertSetting("roblox_alert_settings", gid, robloxAlertCh.id);
    if (errorAlertCh) await upsertSetting("error_alert_settings", gid, errorAlertCh.id);

    const lines = [
      "Setup complete.",
      `Category: ${category.name}`,
      deployCh ? `Deploy: #${deployCh.name}` : "Deploy: failed",
      robloxAlertCh ? `Roblox alerts: #${robloxAlertCh.name}` : "Roblox alerts: failed",
      errorAlertCh ? `Error alerts: #${errorAlertCh.name}` : "Error alerts: failed",
      "",
      "You can still use /set_deploy_channel, /set_roblox_alert_channel, /set_error_alert_channel to change these later.",
    ];

    return interaction.editReply(lines.join("\n")).catch(() => {});
  },
};
