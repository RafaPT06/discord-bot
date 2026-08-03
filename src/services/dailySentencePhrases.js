const SENTENCES = [
  { quote: "The ocean never keeps what it cannot hold.", meaning: "Sometimes love means letting go." },
  { quote: "The wind still knows the way home.", meaning: "Part of me still wants to return to you." },
  { quote: "The rain came right on time today.", meaning: "I finally allowed myself to cry." },
  { quote: "The candle burned long after everyone left.", meaning: "My feelings remained even when it was over." },
  { quote: "The moon looks lonely tonight.", meaning: "I miss you." },
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
  { quote: "The first light found a crack in the curtains.", meaning: "Hope can enter quietly, even after a difficult night." },
  { quote: "The train left, but the platform kept its warmth.", meaning: "A goodbye does not erase what was shared." },
  { quote: "The page turned before I finished the sentence.", meaning: "Life sometimes moves forward before we feel ready." },
  { quote: "The river carried yesterday without becoming it.", meaning: "The past can travel with us without defining us." },
  { quote: "The key still fit, but the room felt different.", meaning: "Returning does not always restore what changed." },
  { quote: "The sunrise arrived in colors I had forgotten.", meaning: "Joy can return in ways we no longer expect." },
  { quote: "The old road looked smaller from the hill.", meaning: "Distance can make previous struggles easier to understand." },
  { quote: "The tree kept growing around its broken branch.", meaning: "Healing can include the parts of us that were hurt." },
  { quote: "The music returned when I stopped forcing the silence.", meaning: "Some peace appears only after we stop chasing it." },
  { quote: "The lantern did not light the whole path, only the next step.", meaning: "We do not need every answer to keep moving." },
  { quote: "The snow covered the footprints, not the journey.", meaning: "Evidence can fade while the experience remains." },
  { quote: "The horizon stayed, even when the weather changed.", meaning: "A difficult moment does not remove every possibility ahead." },
  { quote: "The glass held the sunlight for a second.", meaning: "Brief moments can still be meaningful." },
  { quote: "The quiet room finally felt like mine again.", meaning: "Healing can turn loneliness into peace." },
  { quote: "The compass shook, but it still pointed somewhere.", meaning: "Uncertainty does not mean we are completely lost." },
  { quote: "The sea was restless, yet the moon stayed reflected.", meaning: "Something steady can remain inside emotional chaos." },
  { quote: "The unopened message became easier to leave alone.", meaning: "Progress can be choosing not to reopen an old wound." },
  { quote: "The bridge disappeared into fog, but I took one step.", meaning: "Courage can begin before certainty arrives." },
  { quote: "The room changed when I opened the window.", meaning: "A small decision can make space for something new." },
  { quote: "The rain stopped without asking whether I noticed.", meaning: "Hard seasons can end gradually and quietly." },
  { quote: "The photograph stayed the same while I changed.", meaning: "Memories can remain even as we grow beyond them." },
  { quote: "The sky made room for both the storm and the stars.", meaning: "Pain and hope can exist at the same time." },
  { quote: "The path bent, but it did not end.", meaning: "A change in direction is not the same as failure." },
  { quote: "The heartbeat became louder than the goodbye.", meaning: "Life inside us can eventually become stronger than loss." },
  { quote: "The morning carried no answers, only another chance.", meaning: "A fresh start does not require everything to be solved." },
  { quote: "The empty shelf became space for something new.", meaning: "Loss can eventually create room for a different future." },
  { quote: "The wind moved the curtains, and the room breathed again.", meaning: "Change can bring life back into places that felt still." },
  { quote: "The distant light was enough to keep walking.", meaning: "Even a small reason can help us continue." },
  { quote: "The roots held on while the leaves learned to let go.", meaning: "We can keep our foundation while releasing what has ended." },
  { quote: "The silence stopped feeling like a punishment.", meaning: "Time alone can become rest instead of rejection." },
  { quote: "The last chapter did not ruin the whole story.", meaning: "An ending cannot erase every good part that came before it." },
  { quote: "The window reflected me before it showed the view.", meaning: "Sometimes we must understand ourselves before looking ahead." },
  { quote: "The storm moved on, leaving the air easier to breathe.", meaning: "Relief can arrive after emotions have finally passed through." },
  { quote: "The flower opened on a day nobody was watching.", meaning: "Growth still counts even when no one sees it." },
  { quote: "The road home felt new beneath familiar streetlights.", meaning: "We can return to old places as changed people." }
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
