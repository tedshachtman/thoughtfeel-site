export const slides = [
  {
    "name": "Title",
    "steps": [
      "",
      "Good afternoon, writers. My name is Mr. Shachtman."
    ]
  },
  {
    "name": "What comes after the evidence",
    "steps": [
      "Mrs. Lazar told me you wrote essays about A Different Pond. In your essays, you made a claim. Then you backed it up with evidence from the book.",
      "Today is about what comes right after the evidence. A lot of writers put in their evidence and stop. But the reader is still wondering, 'How does that prove your claim?' You won't be there to answer. So your essay has to answer.",
      "That's called explaining your evidence."
    ]
  },
  {
    "name": "The three steps",
    "steps": [
      "Essay writers explain their evidence in three steps.",
      "Step one. Circle the big word. That's the word your whole claim depends on.",
      "Step two. Say what it means, in your own words.",
      "Step three. Show where it is in the evidence.",
      "Watch me do all three."
    ]
  },
  {
    "name": "Model: sacrifice",
    "steps": [
      "Here's my claim. 'A Different Pond teaches that families make sacrifices for each other.'",
      "Here's my evidence. Dad wakes up hours before the sun comes up. He goes fishing so his family will have dinner. Then he goes to work.",
      "If I stop here, my reader is still wondering, 'How does that show a sacrifice?' So I explain.",
      "Step one. Circle the big word. My whole claim depends on 'sacrifices.' So I circle it.",
      "Step two. Say what it means. A sacrifice is when you give up something you want, to help someone else.",
      "So a sacrifice has two parts. Something you give up. And someone you help.",
      "Step three. Show where it is in the evidence. I look for both parts.",
      "First part. What does Dad give up? His sleep. He's up hours before the sun.",
      "Second part. Who does he help? His family. Now they'll have dinner.",
      "Both parts are in the evidence. That's how I know it shows a sacrifice."
    ]
  },
  {
    "name": "Finger check",
    "steps": [
      "Now I'll write it down. Here are three sentences I could write. Only one explains my evidence. The other two are mistakes writers make all the time.",
      "One. 'This shows that families make sacrifices for each other.'",
      "Two. 'Dad woke up early and went fishing before work.'",
      "Three. 'A sacrifice means giving up something you want to help someone else. In this part, Dad gives up his sleep so his family will have dinner. So this shows Dad making a sacrifice.'",
      "Which one explains? Think first. Fingers up on three. One, two, three.",
      "It's number three. It says what sacrifice means. Then it shows both parts in the evidence.",
      "Number one only says the claim again. Number two only says the evidence again. Neither one tells the reader how the evidence proves the claim."
    ]
  },
  {
    "name": "Partner try: helpful",
    "steps": [
      "Now you try it with your partner. Same book, new claim. 'The boy in A Different Pond is helpful.'",
      "Step one. What's the big word? Yes, helpful. I'll circle it.",
      "Step two. Say what it means. Being helpful means doing some of the work, so someone else has less to do. Two parts. Work you do. And someone who has less to do.",
      "Step three. Show where it is in the evidence. Each pair has three strips. Each one is something that happens in the book. I'll read them. A. The boy gathers twigs and builds the fire. He lights it with one match. B. Dad tells the boy about fishing at a pond in Vietnam. C. The boy uses two hands to guide the fish into the bucket.",
      "Two of these strips show the boy is helpful. One doesn't. Check each strip for the two parts. Is the boy doing work? Does someone have less to do? Find the strip that doesn't have both parts, and hold it up. Go.",
      "It's strip B. It really happens in the book. But the boy isn't doing any work. So it can't show he's helpful.",
      "Now pick strip A or strip C. Explain it to your partner. Start with 'Helpful means.' Go.",
      "Who will share their explanation? Say your name first."
    ]
  },
  {
    "name": "Your turn: hardworking",
    "steps": [
      "So today, and every time you write an essay, don't stop at the evidence. Circle the big word. Say what it means. Show where it is in the evidence.",
      "On your sheet is one more claim, about Dad. 'The dad in A Different Pond is hardworking.'",
      "Here's the evidence. At the bait store, Dad says he got a second job. He has to work on a Saturday morning.",
      "Do the three steps. Circle the big word. Tell your partner what it means. Then write your explanation in purple pen. The sentence starters on the sheet will help.",
      "When you finish, take out your own essay. Pick one piece of evidence. Do the same three steps. Off you go."
    ]
  },
  {
    "name": "Writing time (campfire timer)",
    "steps": [
      "",
      "Writers, pens down and eyes on me for a moment. Listen to [name]'s explanation. … [Name] said what hardworking means. Then [name] showed where it is in the evidence. Check that yours does both. Back to work."
    ]
  },
  {
    "name": "Share and close",
    "steps": [
      "Writers, finish the sentence you're on. Read your explanation to your partner. Partners, listen for two things. Does it say what the big word means? Does it show where that is in the evidence?",
      "Now pick your best sentence. Copy it onto a sticky note, and put your name on it.",
      "Who will read theirs to the class? Say your name first. … [Name] said what the big word means. Then [name] showed where it is in the evidence. That's an explanation.",
      "Here's what I want you to remember. Evidence doesn't explain itself. You explain it. Circle the big word. Say what it means. Show where it is in the evidence.",
      "Bring your sticky note up and put it on the chart. Thank you, writers. Thank you, Mrs. Lazar."
    ]
  }
];

export const prompts = [
  [
    "To get a student started",
    "Read me the claim. What's your big word? · What does hardworking mean? Say it in your own words. · Now look at the evidence. Where is that in the evidence? Say it to me. · Good. Now write what you just said."
  ],
  [
    "If a student can't say what the word means",
    "Hardworking means doing a lot of work, even when you could rest. Can you find both parts in the evidence?"
  ],
  [
    "If a student wrote the claim again",
    "Read me your sentence. It says the claim again. Start a new sentence with 'Hardworking means.'"
  ],
  [
    "If a student wrote the evidence again",
    "Read me your sentence. It says the evidence again. Start a new sentence with 'Hardworking means.'"
  ],
  [
    "If a student is done",
    "You explained your evidence. Now take out your own essay. Read me your claim. What's your big word? Which piece of evidence will you explain?"
  ]
];

// Student-facing wording, in lesson order. Each array of fragments reads as one sentence.
export const boardCopy = {
  title: "Explain Your Evidence", teacher: "Mr. Shachtman",
  labels: ["CLAIM", "EVIDENCE", "EXPLANATION"], question: "?",
  readerQuestion: "How does that prove your claim?",
  stepsHeading: "Explain your evidence in 3 steps",
  steps: ["Circle the big word.", "Say what it means.", "Show where it is in the evidence."],
  modelClaim: ["A Different Pond teaches that families make ", "sacrifices", " for each other."],
  modelEvidence: [["Dad ", "wakes up hours before the sun comes up", "."], ["He goes fishing ", "so his family will have dinner", "."], "Then he goes to work."],
  storeSign: "OPEN",
  sacrificeQuestion: "How does that show a sacrifice?",
  modelMeaning: ["A sacrifice is when you ", "give up something you want", ", to ", "help someone else", "."],
  modelParts: ["something you give up", "someone you help"],
  modelAnswers: ["his sleep", "his family"], both: "Both parts are in the evidence.",
  fingerHeading: "Which one explains?",
  fingers: ["This shows that families make sacrifices for each other.", "Dad woke up early and went fishing before work."],
  correct: ["A sacrifice means", " giving up something you want to help someone else. In this part, Dad gives up ", "his sleep", " so ", "his family will have dinner", ". So this shows Dad making a sacrifice."],
  verdicts: ["Says the claim again", "Says the evidence again", "Explains ✓"],
  partnerClaim: ["The boy in A Different Pond is ", "helpful", "."],
  partnerMeaning: ["Being helpful means ", "doing some of the work", ", so ", "someone else has less to do", "."],
  partnerParts: ["work you do", "someone who has less to do"],
  strips: [["The boy gathers twigs and ", "builds the fire", ". He lights it with one match."], ["Dad tells the boy about fishing at a pond in Vietnam."], ["The boy ", "uses two hands to guide the fish into the bucket", "."]],
  stripLetters: ["A","B","C"], partnerQuestion: "Which strip doesn't have both parts?", noWork: "No work for the boy", less: "less to do",
  frame: "Helpful means ___. In this part, ___. So this shows ___.",
  workClaim: "The dad in A Different Pond is hardworking.",
  workEvidence: "At the bait store, Dad says he got a second job. He has to work on a Saturday morning.",
  directions: ["Circle the big word (purple pen).", "Tell your partner what it means.", "Write your explanation (purple pen)."],
  finished: "Finished?", extra: "Your own essay. Pick one piece of evidence. Same three steps.",
  share: "Read your explanation to your partner.", checks: ["Says what the big word means", "Shows where it is in the evidence"],
  note: "Best sentence → sticky note → your name",
  close: "Evidence doesn't explain itself. You explain it.", thanks: "Thank you, writers!"
};
