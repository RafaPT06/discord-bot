const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { canManageSettings } = require("../utils/perms");
const { pool } = require("../db/pool");

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("perm_list")
    .setDescription("List all commands with custom permission rules (Manage Server / Owner).")
    .addIntegerOption(o =>
      o.setName("page").setDescription("Page number (1, 2, 3...)").setRequired(false).setMinValue(1)
    ),
  async execute(interaction) {
    if (!interaction.guildId) return interaction.reply({ content: "Server only.", ephemeral: true });
    if (!canManageSettings(interaction)) {
      return interaction.reply({ content: "Requires **Manage Server** (or Owner).", ephemeral: true });
    }

    const page = interaction.options.getInteger("page") || 1;

    const { rows } = await pool.query(
      `SELECT command_name, allowed_role_ids, allow_manage_guild
       FROM command_permissions
       WHERE guild_id=$1
       ORDER BY command_name ASC`,
      [interaction.guildId]
    );

    const embed = new EmbedBuilder().setTitle("Permissions");

    if (!rows.length) {
      embed.setDescription("No custom permission overrides set in this server.");
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Resolve role names (no pings)
    const roleName = (id) => interaction.guild?.roles?.cache?.get(id)?.name || `role:${id}`;

    const lines = rows.map(r => {
      const roles = (r.allowed_role_ids?.length)
        ? r.allowed_role_ids.map(id => `\`${roleName(id)}\``).join(", ")
        : "_(none)_";
      const bypass = r.allow_manage_guild ? "ON" : "OFF";
      return `• \`/${r.command_name}\` → ${roles} (Manage Server bypass: **${bypass}**)`;
    });

    const pages = chunk(lines, 12);
    const maxPage = pages.length;
    const p = Math.max(1, Math.min(page, maxPage));

    embed.setDescription(pages[p - 1].join("\n"));
    embed.setFooter({ text: `Page ${p}/${maxPage}` });

    return interaction.reply({
      embeds: [embed],
      ephemeral: true,
      allowedMentions: { parse: [] },
    });
  },
};
