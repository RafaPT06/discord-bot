const { PermissionFlagsBits } = require("discord.js");

function isOwner(interaction, ownerId) {
  return Boolean(ownerId) && interaction.user.id === ownerId;
}

function canManage(interaction, ownerId) {
  if (!interaction.inGuild()) return false;
  return (
    isOwner(interaction, ownerId) ||
    interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)
  );
}

module.exports = { isOwner, canManage };
