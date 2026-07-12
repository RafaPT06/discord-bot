const { EmbedBuilder } = require("discord.js");
const { BRAND_COLORS, resolveBrandColor } = require("./brandColors");

const THEME_FLAG = Symbol.for("meowz.embedThemeInstalled");

function installEmbedTheme() {
  if (EmbedBuilder.prototype[THEME_FLAG]) return;

  const originalSetColor = EmbedBuilder.prototype.setColor;
  const originalToJSON = EmbedBuilder.prototype.toJSON;

  Object.defineProperty(EmbedBuilder.prototype, THEME_FLAG, {
    value: true,
    enumerable: false,
    configurable: false,
    writable: false,
  });

  EmbedBuilder.prototype.setColor = function setMeowzColor(color) {
    return originalSetColor.call(this, resolveBrandColor(color));
  };

  EmbedBuilder.prototype.toJSON = function toMeowzJSON(validationOverride) {
    if (this.data?.color === undefined || this.data?.color === null) {
      originalSetColor.call(this, BRAND_COLORS.primary);
    }
    return originalToJSON.call(this, validationOverride);
  };
}

module.exports = { installEmbedTheme };
