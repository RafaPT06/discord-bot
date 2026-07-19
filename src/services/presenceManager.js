const { ActivityType } = require("discord.js");
const { getMaintenanceEnabled } = require("./maintenance");

let timer = null;
let currentStatus = "online"; // dot status (online/idle/dnd/invisible)
let rotationEnabled = true;
let intervalMs = 30_000;
let activityIndex = 0;

function pluralize(count, singular, plural = `${singular}s`) {
  return Number(count) === 1 ? singular : plural;
}

function buildUsefulActivities(client) {
  const guildCount = client?.guilds?.cache?.size || 0;
  const memberCount = client?.guilds?.cache?.reduce(
    (total, guild) => total + Math.max(0, Number(guild.memberCount) || 0),
    0,
  ) || 0;

  return [
    {
      name: "Custom Status",
      type: ActivityType.Custom,
      state: "Use /help for commands",
    },
    {
      name: "Custom Status",
      type: ActivityType.Custom,
      state: `Serving ${guildCount.toLocaleString()} ${pluralize(guildCount, "server")}`,
    },
    {
      name: "Custom Status",
      type: ActivityType.Custom,
      state: `Helping ${memberCount.toLocaleString()} ${pluralize(memberCount, "member")}`,
    },
    {
      name: "Custom Status",
      type: ActivityType.Custom,
      state: "Dashboard: meowz.up.railway.app",
    },
  ];
}

async function buildActivity(client) {
  const maintenance = await getMaintenanceEnabled().catch(() => false);

  if (maintenance) {
    return {
      name: "Maintenance in progress",
      type: ActivityType.Watching,
    };
  }

  const activities = buildUsefulActivities(client);
  const activity = activities[activityIndex % activities.length];

  if (rotationEnabled) {
    activityIndex = (activityIndex + 1) % activities.length;
  }

  return activity;
}

async function applyPresence(client) {
  if (!client?.user) return;

  const activity = await buildActivity(client);

  // Maintenance changes only the activity; the configured dot status is preserved.
  try {
    client.user.setPresence({
      status: currentStatus,
      activities: [activity],
    });
  } catch (error) {
    console.error("Failed to update bot presence:", error);
  }
}

function startPresenceRotation(client, opts = {}) {
  rotationEnabled = Boolean(opts.rotationEnabled ?? true);
  intervalMs = Math.max(10_000, Number(opts.intervalMs || intervalMs));
  activityIndex = 0;

  if (timer) clearInterval(timer);

  applyPresence(client);
  timer = setInterval(() => {
    applyPresence(client);
  }, intervalMs);
}

function stopPresenceRotation() {
  if (timer) clearInterval(timer);
  timer = null;
}

async function refreshPresenceRotation(client) {
  await applyPresence(client);
}

async function setDotStatus(client, status) {
  const allowed = new Set(["online", "idle", "dnd", "invisible"]);
  if (!allowed.has(status)) throw new Error("Invalid status. Use: online, idle, dnd, invisible");

  currentStatus = status;
  await applyPresence(client);
  return currentStatus;
}

function getPresenceState() {
  return {
    status: currentStatus,
    intervalMs,
    rotationEnabled,
    running: Boolean(timer),
  };
}

module.exports = {
  startPresenceRotation,
  stopPresenceRotation,
  refreshPresenceRotation,
  setDotStatus,
  getPresenceState,
};
