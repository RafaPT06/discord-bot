const { SlashCommandBuilder } = require("discord.js");
const { canManageSettings } = require("../utils/perms");
const { pool } = require("../db/pool");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("perm_show")
    .setDescription("Show permissions for a command (Manage Server / Owner).")
    .addStringOption(o => o.setName("command").setDescription("Command name (no slash)").setRequired(true)),
  async execute(interaction) {
    if (!interaction.guildId) return interaction.reply({ content: " Server only.", ephemeral: true });
    if (!canManageSettings(interaction)) return interaction.reply({ content: " Requires **Manage Server** (or Owner).", ephemeral: true });

    const command = interaction.options.getString("command", true).trim().toLowerCase();
    const { rows } = await pool.query(
      "SELECT allowed_role_ids, allow_manage_guild FROM command_permissions WHERE guild_id=$1 AND command_name=$2",
      [interaction.guildId, command]
    );

    if (!rows.length) {
      return interaction.reply({ content: `ℹ️ \`/${command}\` has **no custom rules** (default behavior).`, ephemeral: true });
    }

    const roleIds = rows[0].allowed_role_ids || [];
    const roles = roleIds.length ? roleIds.map(id => `<@&${id}>`).join(", ") : "_(none)_";
    const allowManage = rows[0].allow_manage_guild ? "ON" : "OFF";

    return interaction.reply({
      content: ` **Permissions for** \`/${command}\`\n• **Allowed roles:** ${roles}\n• **Manage Server bypass:** **${allowManage}**`,
      ephemeral: true,
      allowedMentions: { roles: roleIds },
    });
  }
};
