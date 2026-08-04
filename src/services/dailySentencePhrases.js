const SENTENCES = [
  // These lines are intentionally indirect. The reflection suggests a direction,
  // but never closes the phrase into one fixed explanation.
  {
    quote: "The colors don’t stay anymore.",
    meaning: "The world may be unchanged; what stopped returning is harder to name.",
  },
  {
    quote: "Nothing lingers like it used to.",
    meaning: "Some things leave quickly. Others remain, but no longer reach the same place.",
  },
  {
    quote: "The noise doesn’t reach me.",
    meaning: "Distance can feel like protection until even the familiar begins arriving without weight.",
  },
  {
    quote: "There’s nothing left to hold onto.",
    meaning: "An empty hand may mean something was lost, released, or simply held for too long.",
  },
  {
    quote: "It all feels far away now.",
    meaning: "The distance might belong to the world, or to the person still standing inside it.",
  },
  {
    quote: "I don’t think it reaches anymore.",
    meaning: "What once crossed every wall can become quiet without anyone noticing when it stopped.",
  },
  {
    quote: "The echo stopped before the room was empty.",
    meaning: "Sometimes absence begins long before anything visibly leaves.",
  },
  {
    quote: "The window stayed open after the weather forgot it.",
    meaning: "Waiting can survive the reason it began, becoming habit before becoming acceptance.",
  },
  {
    quote: "Some doors close without moving.",
    meaning: "A path can remain visible after it has stopped being possible.",
  },
  {
    quote: "The cup was still warm when the house became unfamiliar.",
    meaning: "Change does not always announce itself; sometimes it happens between two ordinary moments.",
  },
  {
    quote: "I left the light on for no one in particular.",
    meaning: "It is difficult to tell when waiting becomes memory and memory becomes routine.",
  },
  {
    quote: "The clock kept the hour I stopped believing in.",
    meaning: "Time continues faithfully, even around moments that no longer feel real.",
  },
  {
    quote: "The rain knew the way back. I didn’t.",
    meaning: "Some returns are natural; others become impossible after the road changes inside us.",
  },
  {
    quote: "The chair remembered a weight the room had already lost.",
    meaning: "Objects can keep the outline of what people are still learning to release.",
  },
  {
    quote: "The hallway grew longer after the footsteps ended.",
    meaning: "Silence can enlarge a place more than any distance ever could.",
  },
  {
    quote: "Morning arrived, but nothing came with it.",
    meaning: "A new day can appear without bringing the renewal its light seems to promise.",
  },
  {
    quote: "The map still showed a road that no longer existed.",
    meaning: "Old directions remain convincing long after the destination has disappeared.",
  },
  {
    quote: "I folded the letter until the words disappeared.",
    meaning: "Meaning can be hidden without being erased; the hands still remember where it was.",
  },
  {
    quote: "The tide returned without asking what it had taken.",
    meaning: "What comes back is not always what left, and returning does not undo the absence.",
  },
  {
    quote: "The mirror kept a face I had stopped recognizing.",
    meaning: "Recognition can remain on the surface after belonging has quietly moved elsewhere.",
  },
  {
    quote: "The key still turned in a place that was no longer home.",
    meaning: "Access and belonging are different things, though they often take time to separate.",
  },
  {
    quote: "A candle can survive the dark and still forget warmth.",
    meaning: "Endurance may preserve the flame while changing what the flame remembers itself to be.",
  },
  {
    quote: "The garden learned winter before I did.",
    meaning: "The world sometimes accepts an ending before the person watching it can.",
  },
  {
    quote: "The bridge remained after both shores moved on.",
    meaning: "A connection can outlive the two places it once joined.",
  },
  {
    quote: "I stopped counting the stairs halfway down.",
    meaning: "Not every descent ends in a fall; sometimes the numbers simply stop mattering.",
  },
  {
    quote: "The song ended; the room kept listening.",
    meaning: "What follows an ending can carry more of it than the ending itself.",
  },
  {
    quote: "The moon looked close until I reached for it.",
    meaning: "Some distances only reveal themselves after hope becomes movement.",
  },
  {
    quote: "The dust settled where the answer should have been.",
    meaning: "Time can cover a question without ever resolving it.",
  },
  {
    quote: "The last train left with the station lights still on.",
    meaning: "A place can remain prepared for something that has already decided not to return.",
  },
  {
    quote: "Even the shadows had somewhere else to be.",
    meaning: "There are kinds of emptiness that seem to lose even the evidence of what made them.",
  },
  {
    quote: "I carried the umbrella through a season without rain.",
    meaning: "Protection can become heavier when the danger no longer arrives to justify it.",
  },
  {
    quote: "The glass did not break. It only stopped reflecting.",
    meaning: "Not everything damaged leaves a visible fracture.",
  },
  {
    quote: "A name can fade without becoming silence.",
    meaning: "Something may lose its sharpness while continuing to shape the quiet around it.",
  },
  {
    quote: "The fire went out so slowly no one noticed the cold.",
    meaning: "Some endings are mistaken for ordinary days until warmth becomes a memory.",
  },
  {
    quote: "The birds returned to a tree that had forgotten spring.",
    meaning: "The possibility of return does not guarantee the place is ready to receive it.",
  },
  {
    quote: "I kept the receipt for something that could not be returned.",
    meaning: "Proof of what was given does not always create a way to take it back.",
  },
  {
    quote: "The path vanished one footprint at a time.",
    meaning: "A way back can disappear through small choices rather than one final departure.",
  },
  {
    quote: "The room was full; the distance remained.",
    meaning: "Presence can occupy every chair and still fail to close what separates people.",
  },
  {
    quote: "The page turned before the sentence was ready.",
    meaning: "Life rarely waits for understanding before moving to what comes next.",
  },
  {
    quote: "The sea was calm because the storm had gone beneath it.",
    meaning: "Stillness does not always mean the weather has passed.",
  },
  {
    quote: "I mistook the absence of waves for solid ground.",
    meaning: "Relief can look like certainty when someone has been moving for too long.",
  },
  {
    quote: "The coat still fit, but the season did not.",
    meaning: "What once protected us may remain familiar after it stops belonging to the present.",
  },
  {
    quote: "The bell rang in a house no one entered.",
    meaning: "An invitation can continue after both the guest and the reason have gone.",
  },
  {
    quote: "The horizon moved every time I thought I was near.",
    meaning: "Some destinations exist mainly to keep a person walking toward them.",
  },
  {
    quote: "The thread held after the fabric forgot its shape.",
    meaning: "What keeps something together can outlast the thing it was meant to preserve.",
  },
  {
    quote: "A quiet room can still be full of departures.",
    meaning: "Leaving is not always a sound; sometimes it is what the silence contains.",
  },
  {
    quote: "The sun touched everything except the corner I kept.",
    meaning: "Light can be everywhere and still leave one chosen place unchanged.",
  },
  {
    quote: "I learned the shape of an empty hand.",
    meaning: "Absence becomes familiar in ways presence never needed to explain.",
  },
  {
    quote: "The water cleared when I stopped searching the bottom.",
    meaning: "Some answers become visible only after the need to find them has settled.",
  },
  {
    quote: "The door opened inward; I had been pushing for years.",
    meaning: "Effort can hide the possibility that the direction, not the strength, was wrong.",
  },
  {
    quote: "The house kept standing around the crack.",
    meaning: "A structure can continue without pretending the line through it was never there.",
  },
  {
    quote: "The first green leaf appeared where no one was watching.",
    meaning: "The smallest returns often begin before anyone is ready to call them change.",
  },
  {
    quote: "The snow melted without asking whether winter was finished.",
    meaning: "A season can loosen its grip before it is willing to leave completely.",
  },
  {
    quote: "The river changed course before the stones understood.",
    meaning: "Movement can begin long before the parts left behind know what has changed.",
  },
  {
    quote: "A small light can be mistaken for an ending.",
    meaning: "After enough darkness, even an opening may first look like something closing.",
  },
  {
    quote: "The window reflected dawn before the room felt morning.",
    meaning: "Evidence of change can arrive before the feeling of it does.",
  },
  {
    quote: "I found my shadow waiting somewhere ahead.",
    meaning: "Not every part left behind belongs only to the past.",
  },
  {
    quote: "The same road sounded different under quieter steps.",
    meaning: "A place may stay the same while the person crossing it becomes someone else.",
  },
  {
    quote: "The tide left one shell where the whole sea had been.",
    meaning: "Sometimes what remains is small enough to hold and large enough to contain everything.",
  },
  {
    quote: "The sky did not clear; I simply noticed another color.",
    meaning: "Change may begin as a different way of seeing the same unfinished weather.",
  },
  {
    quote: "The door remained unlocked, but I stopped facing it.",
    meaning: "Leaving can happen before the path behind us is physically closed.",
  },
  {
    quote: "The compass failed north but still pointed away.",
    meaning: "Direction can exist without certainty, especially when staying has become its own answer.",
  },
  {
    quote: "The last match stayed dry through the flood.",
    meaning: "What survives is not always enough to change the night, but it changes what remains possible.",
  },
  {
    quote: "The roots were moving before the branches knew.",
    meaning: "The deepest changes often happen where no one, including the tree, can see them yet.",
  },
  {
    quote: "I heard the rain and did not call it a warning.",
    meaning: "The same sound can become something else when fear no longer names it first.",
  },
  {
    quote: "The empty frame began to look like a window.",
    meaning: "A missing picture can eventually become an opening rather than a reminder.",
  },
  {
    quote: "The stone was lighter after I stopped naming it.",
    meaning: "Some weight belongs partly to the story repeated around it.",
  },
  {
    quote: "Some mornings enter through the smallest cracks.",
    meaning: "A beginning does not need the whole room; it only needs somewhere not completely sealed.",
  },
  {
    quote: "The road home appeared after I stopped tracing the old one.",
    meaning: "A new way back may remain invisible while every step is compared with what used to be.",
  },
  {
    quote: "The silence changed first.",
    meaning: "Before anything visible moves, the space around it may already sound different.",
  },
  {
    quote: "I noticed the door after I stopped waiting at the wall.",
    meaning: "Possibility can hide beside the place where attention has been fixed for too long.",
  },
  {
    quote: "The season turned without asking me to be ready.",
    meaning: "Change rarely waits for permission, but readiness can arrive after the first step into it.",
  },
];

function normalizeIndex(index) {
  const value = Number(index);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
}

function getSentenceForIndex(index) {
  const normalized = normalizeIndex(index);
  const entry = SENTENCES[normalized % SENTENCES.length];
  return { ...entry, index: normalized };
}

module.exports = { SENTENCES, getSentenceForIndex };
