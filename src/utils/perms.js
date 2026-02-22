function isOwner(interaction) {
  return interaction.user?.id === process.env.OWNER_ID;
}

function hasManageGuild(interaction) {
  return Boolean(interaction.memberPermissions?.has("ManageGuild"));
}

function canManageSettings(interaction) {
  return isOwner(interaction) || hasManageGuild(interaction);
}

module.exports = { isOwner, hasManageGuild, canManageSettings };
