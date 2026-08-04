const SENTENCES = [
  // Exhaustion, numbness and the moment someone stops forcing themselves to be okay.
  {
    quote: "The room grew quiet after I stopped explaining myself.",
    meaning: "I gave up trying to make people understand pain they had already decided not to see.",
  },
  {
    quote: "I kept the door unlocked long after I knew no one was returning.",
    meaning: "Part of me was still waiting even after hope had become another kind of pain.",
  },
  {
    quote: "The bandage stayed clean because I finally stopped touching the wound.",
    meaning: "Healing began when I stopped reopening the same hurt just to understand it again.",
  },
  {
    quote: "I called it peace because I was too tired to call it emptiness.",
    meaning: "Sometimes numbness feels safer than admitting how exhausted and disconnected we have become.",
  },
  {
    quote: "The night stopped asking me to be strong.",
    meaning: "I finally allowed myself to be tired instead of performing strength for everyone else.",
  },
  {
    quote: "The apology arrived after the part of me that needed it had gone quiet.",
    meaning: "Some closure comes too late to repair what the waiting already destroyed inside us.",
  },
  {
    quote: "I stopped chasing the version of me that existed before the hurt.",
    meaning: "Healing is not always becoming who we were; sometimes it is learning to live as who survived.",
  },
  {
    quote: "The flowers died while I was learning how much water was enough.",
    meaning: "I tried so hard to save something that I did not notice I was slowly losing myself.",
  },
  {
    quote: "I left the light on for a memory that no longer knew my address.",
    meaning: "I kept making space for someone who had already learned how to live without me.",
  },
  {
    quote: "The silence hurt less once I stopped expecting an answer.",
    meaning: "Giving up on being answered can be painful, but it can also be the first form of acceptance.",
  },
  {
    quote: "I learned to sleep beside the ache instead of waiting for it to leave.",
    meaning: "Some pain does not disappear quickly; we slowly learn how to live without letting it own every night.",
  },
  {
    quote: "The mirror stopped asking why I looked tired.",
    meaning: "I became used to carrying pain so quietly that even I stopped questioning its weight.",
  },
  {
    quote: "I held myself together so quietly that everyone thought I was healed.",
    meaning: "Surviving without showing the damage is not the same thing as genuinely recovering from it.",
  },
  {
    quote: "The storm passed, but my body still listened for thunder.",
    meaning: "Even after the danger is gone, the heart can remain prepared to be hurt again.",
  },
  {
    quote: "I stopped counting the days because healing refused to move in a straight line.",
    meaning: "Progress can disappear, return and change shape without meaning that we have failed.",
  },
  {
    quote: "The words 'I am fine' became easier than explaining where it still hurt.",
    meaning: "Emotional exhaustion can make silence feel safer than repeatedly translating our pain.",
  },
  {
    quote: "I buried the hope, but it kept breathing beneath the soil.",
    meaning: "Even after giving up, a hidden part of us may still believe that life can become softer.",
  },
  {
    quote: "The road home felt longer after I realized I had changed.",
    meaning: "Healing can make familiar places feel unfamiliar because we no longer fit our old life in the same way.",
  },

  // Slow healing: small, almost invisible changes that happen while the person still feels broken.
  {
    quote: "I did not wake up healed; I only woke up a little less afraid.",
    meaning: "Recovery often begins with tiny changes that are too quiet to feel like progress at first.",
  },
  {
    quote: "The wound still ached, but it was no longer the first thing I touched each morning.",
    meaning: "Healing can mean the pain is still present without being the center of every day.",
  },
  {
    quote: "I started breathing between the memories instead of inside them.",
    meaning: "I am slowly learning that remembering what happened does not require reliving it completely.",
  },
  {
    quote: "The sadness stayed, but it stopped using every room in the house.",
    meaning: "Pain can remain while gradually taking up less space in our mind and identity.",
  },
  {
    quote: "I still miss who I was, but I no longer blame who I became.",
    meaning: "Healing includes forgiving the version of ourselves that changed in order to survive.",
  },
  {
    quote: "The morning did not feel beautiful, only possible.",
    meaning: "Sometimes hope is not happiness; it is simply believing we can make it through another day.",
  },
  {
    quote: "I stopped asking when the pain would end and started noticing when it became quieter.",
    meaning: "Recovery becomes easier to see when we stop demanding a complete cure and recognize smaller relief.",
  },
  {
    quote: "The crack in me never vanished; light just learned how to enter through it.",
    meaning: "Our damage can remain part of us while still becoming a place where growth begins.",
  },
  {
    quote: "I smiled without checking whether it was allowed.",
    meaning: "A spontaneous moment of joy can reveal that healing has been happening beneath our awareness.",
  },
  {
    quote: "The song played again, and this time I did not fall apart.",
    meaning: "A memory can lose some of its power even when it still carries sadness.",
  },
  {
    quote: "I began choosing rest before my body had to beg for it.",
    meaning: "Healing includes learning to care for ourselves before exhaustion becomes a crisis.",
  },
  {
    quote: "The old pain knocked, but I no longer opened the door immediately.",
    meaning: "Progress can be the small pause between being triggered and surrendering to the same spiral.",
  },
  {
    quote: "I stopped treating every bad day as proof that nothing had changed.",
    meaning: "A difficult day does not erase the strength and progress built on all the days before it.",
  },
  {
    quote: "My hands still shook, but they started building again.",
    meaning: "Courage is not the absence of fear; it is creating a life while fear is still present.",
  },
  {
    quote: "I learned that healing can look like doing less and feeling more.",
    meaning: "Recovery sometimes begins when we stop running from emotions and allow them to pass through us.",
  },
  {
    quote: "The memory remained sharp, but I stopped using it against myself.",
    meaning: "Healing can mean remembering the truth without turning it into a reason to hate ourselves.",
  },
  {
    quote: "I was still lost, but I had stopped walking back toward what broke me.",
    meaning: "Not returning to familiar pain is already progress, even before we know where we are going.",
  },
  {
    quote: "The weight did not disappear; I simply grew stronger in places nobody could see.",
    meaning: "Sometimes recovery is invisible because life remains difficult while our ability to carry it changes.",
  },

  // Letting go: no longer chasing answers, people or versions of the past that cannot return.
  {
    quote: "I stopped waiting for the old me and started protecting the person left behind.",
    meaning: "Acceptance began when I cared for who I am now instead of mourning who I used to be.",
  },
  {
    quote: "I gave up trying to be saved by the same hands that taught me to drown.",
    meaning: "Healing required accepting that the person who caused the wound could not be responsible for closing it.",
  },
  {
    quote: "The answer never came, so I became my own ending.",
    meaning: "Closure can come from deciding to stop waiting, even when no explanation is ever given.",
  },
  {
    quote: "I returned the key without asking whether the door would miss me.",
    meaning: "Letting go means leaving something that once felt like home without needing it to regret losing us.",
  },
  {
    quote: "The goodbye became real when I stopped rewriting it in my head.",
    meaning: "Acceptance begins when we stop imagining a different ending and face the one that actually happened.",
  },
  {
    quote: "I stopped confusing being remembered with being loved.",
    meaning: "Someone thinking about us does not mean they can give us the care, safety or commitment we need.",
  },
  {
    quote: "The bridge remained, but I no longer crossed it every night.",
    meaning: "We can remember a connection without repeatedly returning to the pain attached to it.",
  },
  {
    quote: "I let the message stay unsent, and the world did not end.",
    meaning: "Resisting the urge to reopen contact can feel unbearable until we realize the feeling will pass.",
  },
  {
    quote: "The past still knew my name, but I stopped answering every time it called.",
    meaning: "Healing is learning that a memory can demand our attention without deserving it.",
  },
  {
    quote: "I stopped asking why I was not enough for someone who never knew how to hold anything gently.",
    meaning: "Another person's inability to love safely is not proof that we were unworthy of love.",
  },
  {
    quote: "I released the future I had imagined, not because it meant nothing, but because it was hurting me.",
    meaning: "Letting go can honor what we wanted while accepting that continuing to wait is destroying us.",
  },
  {
    quote: "The photograph stayed, but I stopped asking it to become a doorway.",
    meaning: "Memories can be kept without being used as a way to escape back into the past.",
  },
  {
    quote: "I forgave myself for staying after my heart had already asked to leave.",
    meaning: "Healing includes compassion for the choices we made while afraid, attached or still hoping.",
  },
  {
    quote: "The empty chair stopped feeling like a promise.",
    meaning: "Absence becomes easier to accept when we no longer treat it as proof that someone will return.",
  },
  {
    quote: "I no longer needed them to understand what they did in order to believe my own pain.",
    meaning: "Validation can come from trusting our experience instead of waiting for the person who hurt us to agree.",
  },
  {
    quote: "I stopped revisiting the wreckage to prove that the crash was real.",
    meaning: "We do not need to keep hurting ourselves in order to justify that something deeply affected us.",
  },
  {
    quote: "The love was real, and so was the damage; I finally stopped choosing only one truth.",
    meaning: "Maturity can mean accepting that something mattered while also accepting that it was harmful.",
  },
  {
    quote: "I walked away before my heart agreed, because some decisions must protect us before they comfort us.",
    meaning: "Leaving can be the right choice even when our emotions are still attached to what we are leaving.",
  },

  // Fragile hope: not fully healed, but beginning to believe life can become livable again.
  {
    quote: "I am not healed, but I am no longer disappearing.",
    meaning: "I still carry pain, yet I am slowly returning to my own life and identity.",
  },
  {
    quote: "The light was small, but for once I did not turn away from it.",
    meaning: "Hope can begin as nothing more than allowing one good possibility to exist.",
  },
  {
    quote: "I planted something even though I was not sure I would stay to see it grow.",
    meaning: "Creating a future can start before we fully believe that we deserve to have one.",
  },
  {
    quote: "The rain returned, but this time I remembered where I kept the umbrella.",
    meaning: "Healing does not prevent pain from returning; it gives us better ways to care for ourselves when it does.",
  },
  {
    quote: "I began speaking to myself in the voice I once needed from someone else.",
    meaning: "Recovery can mean becoming the safe and compassionate person we spent years searching for.",
  },
  {
    quote: "The future stopped looking like happiness and started looking like peace.",
    meaning: "After deep pain, wanting a calm and safe life can matter more than chasing constant joy.",
  },
  {
    quote: "I still had scars, but I stopped introducing myself through them.",
    meaning: "What happened to us can remain important without becoming the only story we tell about ourselves.",
  },
  {
    quote: "The morning found me tired, but it also found me still here.",
    meaning: "Sometimes survival itself is the quiet proof that a part of us has not completely given up.",
  },
  {
    quote: "I did not forgive the pain; I only stopped giving it every tomorrow.",
    meaning: "Moving forward does not require approving what happened, only refusing to let it own the future.",
  },
  {
    quote: "The heart can be tired and still choose one more gentle thing.",
    meaning: "Even when we have little strength left, one small act of care can keep healing alive.",
  },
  {
    quote: "I stopped waiting to feel whole before allowing myself to live.",
    meaning: "A meaningful life can begin while we are still healing rather than only after the pain is gone.",
  },
  {
    quote: "The silence became a place to rest instead of a place to be abandoned.",
    meaning: "Time alone can slowly transform from rejection into safety, reflection and peace.",
  },
  {
    quote: "I learned that missing someone is not the same as needing them back.",
    meaning: "Love and longing can remain even after we understand that returning would hurt us again.",
  },
  {
    quote: "The broken part of me was not asking to be fixed; it was asking to be held without shame.",
    meaning: "Healing can begin when we meet our pain with compassion instead of treating it like a defect.",
  },
  {
    quote: "I stopped looking for signs that they cared and started noticing the ways I was caring for myself.",
    meaning: "Recovery shifts our attention from another person's uncertainty toward our own consistent protection.",
  },
  {
    quote: "Some days I only moved an inch, but I stopped calling that nothing.",
    meaning: "Tiny progress deserves recognition, especially when simply continuing requires enormous effort.",
  },
  {
    quote: "The version of me that almost gave up still deserves to see what happens next.",
    meaning: "The exhausted part of us is worthy of the future it could not yet imagine.",
  },
  {
    quote: "I am still learning how to live without the pain being my only proof that it mattered.",
    meaning: "Healing means allowing the hurt to soften without believing that this erases the depth of what we felt.",
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
