const { pool } = require("../db/pool");

const TIME_ZONE = "Europe/Lisbon";
const TARGET_HOUR = 21;
const TARGET_MINUTE = 30;

const SAVED_SENTENCES = [
  {
    quote: "The ocean never keeps what it cannot hold.",
    meaning: "Sometimes love means letting go.",
  },
  {
    quote: "The wind still knows the way home.",
    meaning: "Part of me still wants to return to you.",
  },
  {
    quote: "The rain came right on time today.",
    meaning: "I finally allowed myself to cry.",
  },
  {
    quote: "The candle burned long after everyone left.",
    meaning: "My feelings remained even when it was over.",
  },
  {
    quote: "The moon looks lonely tonight.",
    meaning: "I miss you.",
  },
];

const ORIGINAL_SENTENCES = [
  { quote: "The room remembered your laughter.", meaning: "Some memories stay even after someone leaves." },
  { quote: "The door closed softly, but I still heard it.", meaning: "Goodbyes can hurt even when they are gentle." },
  { quote: "The stars looked brighter from far away.", meaning: "Distance can make feelings feel stronger." },
  { quote: "The song ended, but I kept listening.", meaning: "I was not ready for something to be over." },
  { quote: "The garden grew around the empty chair.", meaning: "Life continues, even around absence." },
  { quote: "The letter stayed folded in my pocket.", meaning: "Some things are felt more than they are said." },
  { quote: "The shore waited without asking the sea to return.", meaning: "Real love can be patient without forcing anything." },
  { quote: "The window kept the last light of the day.", meaning: "I held onto the final good moments." },
  { quote: "The echo sounded softer each morning.", meaning: "Healing happens slowly, even when it is hard to notice." },
  { quote: "The clock moved, but my heart stayed behind.", meaning: "Time passed before I felt ready to move on." },
  { quote: "The sky changed colors without warning me.", meaning: "Life can shift before we are prepared for it." },
  { quote: "The path was quiet, but I kept walking.", meaning: "I am trying to continue even while hurting." },
  { quote: "The light touched places I tried to hide.", meaning: "Healing reveals feelings I avoided." },
  { quote: "The bridge stayed even after we crossed it.", meaning: "Some connections still matter after they change." },
  { quote: "The night carried words I never sent.", meaning: "I still think about what I wish I had said." },
  { quote: "The empty cup still smelled like coffee.", meaning: "Small reminders can bring back big memories." },
  { quote: "The waves returned, but never the same way.", meaning: "Feelings can come back differently each time." },
  { quote: "The sun rose without needing my permission.", meaning: "New days arrive even when I am not ready." },
  { quote: "The book opened to a page I had avoided.", meaning: "Some truths wait until we are ready to face them." },
  { quote: "The flowers leaned toward the rain.", meaning: "Even pain can help something grow." },
  { quote: "The silence was not empty after all.", meaning: "Being alone can still be full of feelings." },
  { quote: "The road did not ask me to forget.", meaning: "Moving forward does not mean erasing the past." },
  { quote: "The mirror learned my tired face.", meaning: "I have been carrying more than people can see." },
  { quote: "The house was quiet, but my thoughts were loud.", meaning: "Peace outside does not always mean peace inside." },
  { quote: "The rain washed the street, not the memory.", meaning: "Some things cannot be cleaned away quickly." },
  { quote: "The morning found me still awake.", meaning: "Some nights are heavier than others." },
  { quote: "The flame flickered, but it did not leave.", meaning: "Hope can be small and still survive." },
  { quote: "The clouds moved like they knew where to go.", meaning: "I wish moving on felt that simple." },
  { quote: "The bench kept space for someone gone.", meaning: "Absence can feel like a presence." },
  { quote: "The tide returned what I tried to bury.", meaning: "Feelings come back when they are not fully healed." },
];

function getLisbonParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return {
    dateKey: `${map.year}-${map.month}-${map.day}`,
    hour: Number(map.hour),
    minute: Number(map.minute),
  };
}

function shouldSendNow(now = new Date()) {
  const { hour, minute } = getLisbonParts(now);
  return hour > TARGET_HOUR || (hour === TARGET_HOUR && minute >= TARGET_MINUTE);
}

function getMessageForIndex(index) {
  const allFixed = [...SAVED_SENTENCES, ...ORIGINAL_SENTENCES];
  if (index < allFixed.length) return allFixed[index];

  const n = index - allFixed.length + 1;
  return {
    quote: `The quiet day still carried something new, part ${n}.`,
    meaning: "Even after the old words are used, there is still a new feeling to understand.",
  };
}

async function ensureDailyDmTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS daily_sentence_dm_state (
      user_id TEXT PRIMARY KEY,
      next_index INT NOT NULL DEFAULT 0,
      last_sent_date TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function getState(userId) {
  await ensureDailyDmTable();
  const result = await pool.query(
    `INSERT INTO daily_sentence_dm_state (user_id)
     VALUES ($1)
     ON CONFLICT (user_id) DO NOTHING
     RETURNING user_id, next_index, last_sent_date`,
    [userId],
  );

  if (result.rows[0]) return result.rows[0];

  const existing = await pool.query(
    `SELECT user_id, next_index, last_sent_date FROM daily_sentence_dm_state WHERE user_id = $1`,
    [userId],
  );
  return existing.rows[0] || { user_id: userId, next_index: 0, last_sent_date: null };
}

async function markSent(userId, sentDate, nextIndex) {
  await pool.query(
    `UPDATE daily_sentence_dm_state
     SET next_index = $2, last_sent_date = $3, updated_at = NOW()
     WHERE user_id = $1`,
    [userId, nextIndex, sentDate],
  );
}

function buildDmContent(entry) {
  return [
    `“${entry.quote}”`,
    "",
    `Meaning: ${entry.meaning}`,
  ].join("\n");
}

let timer = null;
let running = false;

async function tick(client, force = false) {
  if (running) return;
  running = true;

  try {
    const userId = process.env.DAILY_SENTENCE_USER_ID || process.env.OWNER_ID;
    if (!userId) return;

    const parts = getLisbonParts();
    if (!force && !shouldSendNow()) return;

    const state = await getState(userId);
    if (!force && state.last_sent_date === parts.dateKey) return;

    const entry = getMessageForIndex(Number(state.next_index || 0));
    const user = await client.users.fetch(userId);
    await user.send(buildDmContent(entry));

    await markSent(userId, parts.dateKey, Number(state.next_index || 0) + 1);
    console.log(`Daily sentence DM sent to ${userId} for ${parts.dateKey}`);
  } catch (err) {
    console.error("Daily sentence DM error:", err);
  } finally {
    running = false;
  }
}

function startDailySentenceDm(client) {
  if (timer) clearInterval(timer);

  // Check shortly after startup so if Railway restarts after 21:30 it can still send today's message.
  setTimeout(() => tick(client).catch(() => {}), 15_000);

  // Check every minute; DB state prevents duplicate daily messages.
  timer = setInterval(() => tick(client).catch(() => {}), 60_000);
  console.log(`Daily sentence DM scheduler started for ${TARGET_HOUR}:${String(TARGET_MINUTE).padStart(2, "0")} ${TIME_ZONE}`);
}

module.exports = {
  startDailySentenceDm,
  tickDailySentenceDm: tick,
};
