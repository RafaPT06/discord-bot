const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { explainCommandPermission } = require("../services/commandPerms");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("permissions_check")
    .setDescription("Check why a user can or cannot run a command.")
    .addStringOption((opt) =>
      opt
        .setName("command")
        .setDescription("Command name to check")
        .setRequired(true)
        .setAutocomplete(true),
    )
    .addUserOption((opt) =>
      opt
        .setName("user")
        .setDescription("User to check. Defaults to you.")
        .setRequired(false),
    ),

  async execute(interaction, client) {
    if (!interaction.guildId) {
      return interaction.reply({ content: "Server only.", ephemeral: true });
    }

    const commandName = String(interaction.options.getString("command", true) || "").replace(/^\//, "").toLowerCase();
    const command = client.commands.get(commandName);
    if (!command) {
      return interaction.reply({ content: `Unknown command: /${commandName}`, ephemeral: true });
    }

    const user = interaction.options.getUser("user") || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      return interaction.reply({ content: "Could not find that user in this server.", ephemeral: true });
    }

    const info = await explainCommandPermission(interaction, commandName, member);
    const roleText = info.roleIds.length
      ? info.roleIds.slice(0, 12).map((id) => `<@&${id}>`).join(", ") + (info.roleIds.length > 12 ? "…" : "")
      : "none";

    const embed = new EmbedBuilder()
      .setTitle("Permission Check")
      .setDescription(info.allowed ? "Result: **Allowed**" : "Result: **Denied**")
      .addFields(
        { name: "Command", value: `/${commandName}`, inline: true },
        { name: "User", value: `<@${user.id}>`, inline: true },
        { name: "Source", value: info.source || "unknown", inline: true },
        { name: "Owner", value: info.targetIsOwner ? "yes" : "no", inline: true },
        { name: "Manage Server", value: info.hasManageGuild ? "yes" : "no", inline: true },
        { name: "Roles", value: roleText, inline: false },
        { name: "Reason", value: (info.reasons || []).join("\n") || "No details.", inline: false },
      )
      .setTimestamp(new Date());

    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
