const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { pool } = require("../db/pool");

function roleLabel(guild, roleId) {
  const r = guild?.roles?.cache?.get(roleId);
  return r ? r.name : roleId;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("perm_list")
    .setDescription("List all command permission overrides."),
  async execute(interaction) {
    const res = await pool.query(
      "SELECT command_name, allowed_role_ids, allow_manage_guild FROM command_permissions WHERE guild_id=$1 ORDER BY command_name ASC",
      [interaction.guildId]
    );
    const rows = res.rows || [];

    const embed = new EmbedBuilder().setTitle("Permissions");

    if (!rows.length) {
      embed.setDescription("_No overrides set._");
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const lines = rows.map((r) => {
      const roles = (r.allowed_role_ids || [])
        .map((id) => roleLabel(interaction.guild, id))
        .join(", ");
      const manage = r.allow_manage_guild ? "Manage Server allowed" : "Manage Server blocked";
      const roleText = roles ? `roles: ${roles}` : "roles: (none)";
      return `• \`${r.command_name}\` — ${roleText} | ${manage}`;
    });

    embed.setDescription(lines.join("\n"));
    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
