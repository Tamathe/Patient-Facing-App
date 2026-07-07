// Grounded patient-education knowledge base for diabetic retinopathy and the
// screening process. Sandy uses this to answer questions in plain language.
// It is deliberately non-diagnostic: every answer is general education. Anything
// clinical or urgent is caught upstream by the crisis/safety gate
// (classifyCrisis / classifySafety) before an education answer is ever produced,
// so this module never has to reassure an acute symptom.

export interface EducationTopic {
  id: string;
  title: string;
  body: string;
}

export const EDUCATION_SOURCE_LABEL =
  "General diabetes eye-health education, consistent with ADA and American Academy of Ophthalmology guidance. Not a diagnosis.";

export const RETINOPATHY_TOPICS: EducationTopic[] = [
  {
    id: "what",
    title: "What diabetic retinopathy is",
    body:
      "Diabetic retinopathy is eye damage caused by diabetes. Over time, high blood sugar can weaken the tiny blood vessels in the retina - the light-sensing layer at the back of your eye. Those vessels can leak, swell, or close off, and in later stages the eye may grow new, fragile vessels. It is one of the most common causes of vision loss in adults with diabetes - and one of the most preventable when it is caught early."
  },
  {
    id: "silent",
    title: "Why it can be silent",
    body:
      "In its early stages, diabetic retinopathy usually has no warning signs. Your eyes can feel completely normal while small changes are already starting. That is exactly why a yearly screening matters even when your vision seems fine - it can find changes long before you would ever notice them."
  },
  {
    id: "risk",
    title: "What raises the risk",
    body:
      "Your risk goes up the longer you have diabetes and the higher your blood sugar (A1C) runs over time. High blood pressure, high cholesterol, smoking, and pregnancy can add to it. The good news: keeping these under control lowers your risk and helps protect your sight."
  },
  {
    id: "exam",
    title: "What the screening is like",
    body:
      "The screening is quick and painless. A special camera takes a photo of the back of your eye - no needles. Many mobile-camera and pharmacy sites use a camera that does not need dilating drops, so you can usually get back to your day right away. Some sites still use drops - the site can tell you ahead of time. The whole visit takes about 10 to 15 minutes."
  },
  {
    id: "results",
    title: "What your results can mean",
    body:
      "There are usually three kinds of results. \"Looks good\" means keep up your care and screen again next year. \"A closer look is recommended\" means the photos suggest you should see an eye specialist - this is common and very treatable when caught early. \"Let's retake the photo\" means the image was not clear enough to read. A navigator can help you with whatever comes next."
  },
  {
    id: "treatment",
    title: "How it is treated when caught early",
    body:
      "When diabetic retinopathy is caught early, it can often be watched closely and kept from getting worse - mostly by controlling blood sugar, blood pressure, and cholesterol. If it reaches a more advanced stage, an eye doctor may recommend laser treatment or eye injections. Catching it early is the whole point of screening - it is when problems are easiest to manage and your vision is easiest to protect."
  },
  {
    id: "protect",
    title: "How to protect your vision",
    body:
      "With regular screening and good control, most serious vision loss from diabetes can be avoided. The best protection is keeping your blood sugar, blood pressure, and cholesterol close to your targets, taking your medicines as prescribed, not smoking, and getting your eye screening every year. Small, steady steps add up."
  },
  {
    id: "logistics",
    title: "Cost, coverage, and rides",
    body:
      "Cost should not be a barrier. Many screening sites are low-cost or covered, and a navigator can confirm your coverage before you go. If getting there is hard, a navigator can also help arrange a ride. You can ask about both right from your plan."
  },
  {
    id: "after",
    title: "What happens after your screening",
    body:
      "After your screening, your results are reviewed. If everything looks good, you are set for the year and we will remind you next time. If a closer look is recommended, a navigator helps you book the follow-up with an eye specialist. You are not on your own for any of the next steps."
  }
];

interface QaEntry {
  id: string;
  keywords: string[];
  answer: string;
}

// Answers are keyword-matched. Longer phrase matches win, so a specific phrase
// ("what is the test") beats a broad one ("what is").
const QA: QaEntry[] = [
  {
    id: "what",
    keywords: [
      "what is diabetic retinopathy",
      "what is retinopathy",
      "what does retinopathy",
      "what is it",
      "retinopathy",
      "blood vessels",
      "back of the eye",
      "retina",
      "damage"
    ],
    answer:
      "Diabetic retinopathy is eye damage from diabetes. Over time, high blood sugar can weaken the tiny blood vessels in the retina at the back of your eye, so they leak, swell, or close off. Caught early, it is very manageable - which is what the screening is for."
  },
  {
    id: "silent",
    keywords: ["symptom", "no symptom", "feel fine", "notice", "how do i know", "how do i tell", "signs", "silent"],
    answer:
      "Early on, diabetic retinopathy usually has no symptoms at all - your eyes can feel completely normal. That is why a yearly screening matters even when your vision seems fine: it finds changes before you could ever notice them."
  },
  {
    id: "howoften",
    keywords: ["how often", "how frequently", "once a year", "every year", "yearly", "annual", "how many times"],
    answer:
      "For most people with diabetes, a retinal screening about once a year is recommended. Your care team may suggest a different interval based on your history, but yearly is the common starting point."
  },
  {
    id: "risk",
    keywords: ["risk", "who gets", "cause", "why do i", "more likely", "a1c", "high blood sugar", "chance"],
    answer:
      "Risk goes up the longer you have diabetes and the higher your A1C runs over time. High blood pressure, high cholesterol, and smoking add to it. Keeping those in range lowers your risk and helps protect your sight."
  },
  {
    id: "exam",
    keywords: [
      "what is the test",
      "what happens at",
      "painful",
      "hurt",
      "pain",
      "needle",
      "dilate",
      "dilation",
      "drops",
      "how long",
      "camera",
      "photo",
      "what is the screening like"
    ],
    answer:
      "The screening is quick and painless. A camera takes a photo of the back of your eye - no needles. Many mobile-camera and pharmacy sites use a camera that needs no dilating drops (some still do), and the whole visit takes about 10 to 15 minutes."
  },
  {
    id: "driving",
    keywords: ["drive", "driving", "drive after", "drive home"],
    answer:
      "Many mobile-camera and pharmacy sites use no dilating drops, so driving afterward is usually fine. If a site does dilate your eyes, your vision can be blurry and light-sensitive for a few hours, so bring sunglasses or a driver just in case."
  },
  {
    id: "results",
    keywords: ["result", "refer", "referral", "abnormal", "what if", "come back"],
    answer:
      "Results usually come as one of three: \"looks good\" (screen again next year), \"a closer look is recommended\" (see an eye specialist - common and very treatable early), or \"retake the photo\" (the image was not clear). A navigator helps you with whatever is next."
  },
  {
    id: "treatment",
    keywords: ["treat", "laser", "injection", "shot", "reversible", "fix", "help it"],
    answer:
      "Found early, diabetic retinopathy can usually be watched and kept from getting worse with good blood sugar and blood pressure control. More advanced stages may need laser treatment or eye injections from an eye doctor. Early is best - that is the whole point of screening."
  },
  {
    id: "cure",
    keywords: ["cure", "cured", "go away", "permanent"],
    answer:
      "Treatment can often stop diabetic retinopathy from getting worse and protect the vision you have, especially when it is caught early. It is not usually described as a cure, which is why regular screening and good diabetes control matter so much."
  },
  {
    id: "blind",
    keywords: ["blind", "go blind", "blindness", "lose my vision", "vision loss"],
    answer:
      "Diabetes is a leading cause of vision loss, but with regular screening and good blood sugar and blood pressure control, most serious loss can be avoided. Finding changes early is what protects your sight, and early problems are very manageable."
  },
  {
    id: "protect",
    keywords: ["protect", "prevent", "avoid", "stop it", "lower my risk", "keep my eyes"],
    answer:
      "Most serious vision loss from diabetes can be avoided: keep your blood sugar, blood pressure, and cholesterol near your targets, take your medicines as prescribed, do not smoke, and get your eye screening every year."
  },
  {
    id: "logistics",
    keywords: ["cost", "pay", "money", "insurance", "covered", "coverage", "afford", "ride", "transportation", "get there"],
    answer:
      "Cost should not be a barrier - many sites are low-cost or covered, and a navigator can confirm your coverage before you go. If getting there is hard, a navigator can help arrange a ride. You can ask about both from your plan."
  },
  {
    id: "after",
    keywords: ["after", "next step", "what happens after", "follow up", "follow-up", "remind", "come next"],
    answer:
      "After your screening, your results are reviewed. If they look good, you are set for the year and we will remind you next time. If a closer look is recommended, a navigator helps you book the follow-up. You are not on your own for the next steps."
  }
];

export type EducationAnswer =
  | { kind: "answer"; text: string; source: string }
  | { kind: "fallback"; text: string };

export const EDUCATION_FALLBACK =
  "That's a great one for your care team - I can send it to a navigator. In general, a yearly diabetic eye screening is the best way to catch problems early, even when your eyes feel fine.";

export const EDUCATION_CHIPS: string[] = [
  "What is diabetic retinopathy?",
  "Will it hurt?",
  "How often do I need it?",
  "What do the results mean?",
  "Can it be treated?"
];

// A conservative score so an unrelated question falls back instead of forcing a
// weak match. Used by both the Learn surface and the coach education router.
export const EDUCATION_MATCH_FLOOR = 4;

interface EducationMatch {
  answer: EducationAnswer;
  score: number;
}

function scoreEducationQuestion(input: string): EducationMatch {
  const text = input.toLowerCase();
  let best: { entry: QaEntry; score: number } | null = null;
  for (const entry of QA) {
    let score = 0;
    for (const keyword of entry.keywords) {
      if (text.includes(keyword)) score += keyword.length;
    }
    if (score > 0 && (best === null || score > best.score)) best = { entry, score };
  }
  if (best) {
    return { answer: { kind: "answer", text: best.entry.answer, source: EDUCATION_SOURCE_LABEL }, score: best.score };
  }
  return { answer: { kind: "fallback", text: EDUCATION_FALLBACK }, score: 0 };
}

export function answerEducationQuestion(input: string): EducationAnswer {
  return scoreEducationQuestion(input).answer;
}

// Requires an explicit eye/vision/screening context token, so a generic coach
// question ("will it hurt?", "how much does it cost?") is NOT hijacked into an
// eye-screening answer. The Learn surface calls answerEducationQuestion directly
// and does not need this gate.
const DR_CONTEXT =
  /\b(eye|eyes|vision|sight|retina|retinopath\w*|screening|screened|dilat\w*|floaters?|blind\w*)\b/i;

// True when the message is confidently a diabetic-retinopathy education question,
// used by the coach to route it to a grounded education answer instead of the
// generic model path. The floor + context gate avoid hijacking unrelated questions.
export function isEducationQuestion(input: string): boolean {
  if (!DR_CONTEXT.test(input)) return false;
  return scoreEducationQuestion(input).score >= EDUCATION_MATCH_FLOOR;
}
