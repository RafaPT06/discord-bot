const { SlashCommandBuilder } = require("discord.js");
const { canManageSettings } = require("../utils/perms");
const { pool } = require("../db/pool");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("perm_list")
    .setDescription("List all commands with custom permission rules (Manage Server / Owner)."),
  async execute(interaction) {
    if (!interaction.guildId) return interaction.reply({ content: " Server only.", ephemeral: true });
    if (!canManageSettings(interaction)) return interaction.reply({ content: " Requires **Manage Server** (or Owner).", ephemeral: true });

    const { rows } = await pool.query(
      `SELECT command_name, allowed_role_ids, allow_manage_guild
       FROM command_permissions
       WHERE guild_id=$1
       ORDER BY command_name ASC`,
      [interaction.guildId]
    );

    if (!rows.length) {
      return interaction.reply({ content: "ℹ️ No custom permission rules set in this server.", ephemeral: true });
    }

    const lines = rows.map(r => {
      const roles = (r.allowed_role_ids?.length)
        ? r.allowed_role_ids.map(id => `<@&${id}>`).join(", ")
        : "_(none)_";
      return `• \`/${r.command_name}\` → ${roles} (Manage Server bypass: **${r.allow_manage_guild ? "ON" : "OFF"}**)`;
    });

    const allRoleIds = rows.flatMap(r => r.allowed_role_ids || []);
    const text = (" **Custom command permissions**\n" + lines.join("\n")).slice(0, 1900);

    return interaction.reply({ content: text, ephemeral: true, allowedMentions: { roles: allRoleIds } });
  }
};
