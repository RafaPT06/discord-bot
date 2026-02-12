function padRight(str, length) {
  return str + " ".repeat(Math.max(0, length - str.length));
}

/**
 * Clean, help-style section (no emojis, aligned labels, bold values):
 *
 * Title
 *
 * Label        **value**
 * Label2       **value2**
 */
function createSection(title, rows) {
  const longestKey = Math.max(0, ...rows.map((r) => String(r.label || "").length));

  const lines = rows.map((r) => {
    const label = padRight(String(r.label || ""), longestKey + 2);
    return `${label}**${String(r.value)}**`;
  });

  return [title, "", ...lines].join("\n");
}

function createListSection(title, items) {
  const lines = items.map((s) => `• ${s}`);
  return [title, ...lines].join("\n");
}

module.exports = { createSection, createListSection };
