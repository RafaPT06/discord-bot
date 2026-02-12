const { SlashCommandBuilder } = require("discord.js");
const { canManageSettings } = require("../utils/perms");
const { pool } = require("../db/pool");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("perm_set")
    .setDescription("Set command permissions (Manage Server / Owner).")
    .addStringOption(o => o.setName("command").setDescription("Command name (no slash)").setRequired(true))
    .addRoleOption(o => o.setName("role").setDescription("Role allowed").setRequired(true))
    .addBooleanOption(o => o.setName("allow_manage_server").setDescription("Allow Manage Server bypass").setRequired(false)),
  async execute(interaction) {
    if (!interaction.guildId) return interaction.reply({ content: " Server only.", ephemeral: true });
    if (!canManageSettings(interaction)) return interaction.reply({ content: " Requires **Manage Server** (or Owner).", ephemeral: true });

    const command = interaction.options.getString("command", true).trim().toLowerCase();
    const role = interaction.options.getRole("role", true);
    const allowManage = interaction.options.getBoolean("allow_manage_server");
    const allow_manage_guild = allowManage === null ? true : Boolean(allowManage);

    await pool.query(
      `INSERT INTO command_permissions (guild_id, command_name, allowed_role_ids, allow_manage_guild)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (guild_id, command_name)
       DO UPDATE SET allowed_role_ids=EXCLUDED.allowed_role_ids, allow_manage_guild=EXCLUDED.allow_manage_guild, updated_at=NOW()`,
      [interaction.guildId, command, [role.id], allow_manage_guild]
    );

    return interaction.reply({
      content: ` \`/${command}\` allowed roles set to: <@&${role.id}>\n• Manage Server bypass: **${allow_manage_guild ? "ON" : "OFF"}**`,
      ephemeral: true,
      allowedMentions: { roles: [role.id] },
    });
  }
};
