const express = require("express");

function startWebServer({ port }) {
  const app = express();
  app.get("/", (_req, res) => res.status(200).send("Bot is alive! 🤖"));
  app.listen(port, "0.0.0.0", () => {
    console.log(`🌐 Web server running on port ${port}`);
  });
}

module.exports = { startWebServer };
