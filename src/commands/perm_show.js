const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { canManageSettings } = require("../utils/perms");
const { pool } = require("../db/pool");

function dedupe(arr) {
  return Array.from(new Set((arr || []).filter(Boolean)));
}

function roleLabel(interaction, roleId) {
  const r = interaction.guild?.roles?.cache?.get(roleId);
  return r ? `@${r.name}` : roleId;
}

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
      const embed = new EmbedBuilder()
        .setTitle("Permission")
        .setDescription([`Command: /${command}`, "Rules: none (default behavior)"].join("\n"));
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const roleIds = dedupe(rows[0].allowed_role_ids);
    const roles = roleIds.length ? roleIds.map((id) => roleLabel(interaction, id)).join(", ") : "none";
    const allowManage = rows[0].allow_manage_guild ? "ON" : "OFF";

    const embed = new EmbedBuilder()
      .setTitle("Permission")
      .setDescription(
        [
          `Command: /${command}`,
          `Allowed roles: ${roles}`,
          `Manage Server bypass: ${allowManage}`,
        ].join("\n")
      );

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
