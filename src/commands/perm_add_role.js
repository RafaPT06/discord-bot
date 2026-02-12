const { SlashCommandBuilder } = require("discord.js");
const { canManageSettings } = require("../utils/perms");
const { pool } = require("../db/pool");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("perm_add_role")
    .setDescription("Add an allowed role to a command (Manage Server / Owner).")
    .addStringOption(o => o.setName("command").setDescription("Command name (no slash)").setRequired(true))
    .addRoleOption(o => o.setName("role").setDescription("Role allowed").setRequired(true)),
  async execute(interaction) {
    if (!interaction.guildId) return interaction.reply({ content: " Server only.", ephemeral: true });
    if (!canManageSettings(interaction)) return interaction.reply({ content: " Requires **Manage Server** (or Owner).", ephemeral: true });

    const command = interaction.options.getString("command", true).trim().toLowerCase();
    const role = interaction.options.getRole("role", true);

    await pool.query(
      `INSERT INTO command_permissions (guild_id, command_name, allowed_role_ids)
       VALUES ($1, $2, $3)
       ON CONFLICT (guild_id, command_name)
       DO UPDATE SET allowed_role_ids = (
         SELECT ARRAY(SELECT DISTINCT unnest(command_permissions.allowed_role_ids || EXCLUDED.allowed_role_ids))
       ), updated_at=NOW()`,
      [interaction.guildId, command, [role.id]]
    );

    return interaction.reply({
      content: ` Added <@&${role.id}> to \`/${command}\`.`,
      ephemeral: true,
      allowedMentions: { roles: [role.id] },
    });
  }
};
