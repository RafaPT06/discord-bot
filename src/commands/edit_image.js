const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require("discord.js");
const { editImageWithOpenAI } = require("../services/imageAi");
const { isUserAllowedForEditImage } = require("../services/editImageAccess");
const { canManageSettings } = require("../utils/perms");

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("edit_image")
    .setDescription("Edit an uploaded image with OpenAI.")
    .addAttachmentOption((o) =>
      o.setName("image")
        .setDescription("Image to edit")
        .setRequired(true)
    )
    .addStringOption((o) =>
      o.setName("prompt")
        .setDescription("What should be added, removed, or changed?")
        .setRequired(true)
        .setMaxLength(1000)
    )
    .addStringOption((o) =>
      o.setName("size")
        .setDescription("Output size")
        .setRequired(false)
        .addChoices(
          { name: "1024x1024", value: "1024x1024" },
          { name: "1024x1536", value: "1024x1536" },
          { name: "1536x1024", value: "1536x1024" }
        )
    ),

  async execute(interaction) {
    if (!interaction.guildId) {
      return interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    }

    const canUse = canManageSettings(interaction) || await isUserAllowedForEditImage(interaction.guildId, interaction.user.id);
    if (!canUse) {
      return interaction.reply({
        content: "You are not allowed to use `/edit_image` in this server. Ask someone with Manage Server to add you from the Meowz dashboard.",
        ephemeral: true,
      });
    }

    const image = interaction.options.getAttachment("image", true);
    const prompt = interaction.options.getString("prompt", true).trim();
    const size = interaction.options.getString("size") || "1024x1024";

    if (!image.contentType?.startsWith("image/")) {
      return interaction.reply({ content: "Please upload a valid image file.", ephemeral: true });
    }

    if (image.size && image.size > MAX_IMAGE_BYTES) {
      return interaction.reply({ content: "Image is too large. Max size is 20MB.", ephemeral: true });
    }

    await interaction.deferReply();

    const result = await editImageWithOpenAI({
      imageUrl: image.url,
      prompt,
      size,
    });

    const embed = new EmbedBuilder()
      .setTitle("Image edited")
      .setDescription(prompt.length > 300 ? `${prompt.slice(0, 297)}...` : prompt)
      .setTimestamp();

    if (result.buffer) {
      const attachment = new AttachmentBuilder(result.buffer, { name: "edited-image.png" });
      embed.setImage("attachment://edited-image.png");
      return interaction.editReply({ embeds: [embed], files: [attachment] });
    }

    embed.setImage(result.url);
    return interaction.editReply({ embeds: [embed] });
  },
};
