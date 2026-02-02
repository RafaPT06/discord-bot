function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function toSpongeCase(text) {
  return text
    .split("")
    .map((char, i) => (i % 2 === 0 ? char.toLowerCase() : char.toUpperCase()))
    .join("");
}

module.exports = { pickRandom, toSpongeCase };
