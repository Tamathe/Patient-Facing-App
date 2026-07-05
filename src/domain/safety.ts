export type SafetyClassification = {
  level: "allowed" | "escalate" | "blocked";
  response: string;
};

const medicationChangePatterns = [/stop taking/i, /change my dose/i, /double my dose/i, /skip my medicine/i, /take extra/i];
const dangerousReadingPattern = /\b(?:bp|blood pressure)\b[^\d]{0,30}(\d{2,3})\s*[\/\-]\s*(\d{2,3})/i;
const urgentSymptomPatterns = [
  /chest pain/i,
  /i can't breathe/i,
  /i cannot breathe/i,
  /shortness of breath/i,
  /trouble breathing/i,
  /weakness on one side/i,
  /new confusion/i,
  /severe headache/i,
  /fainting/i
];

function hasDangerousReading(input: string): boolean {
  const match = dangerousReadingPattern.exec(input);

  if (!match) {
    return false;
  }

  const systolic = Number.parseInt(match[1], 10);
  const diastolic = Number.parseInt(match[2], 10);

  return systolic >= 180 || diastolic >= 120;
}

export function classifySafety(input: string): SafetyClassification {
  if (urgentSymptomPatterns.some((pattern) => pattern.test(input)) || hasDangerousReading(input)) {
    return {
      level: "escalate",
      response:
        "Some signs need urgent medical attention. If this may be an emergency, seek urgent help now. I can help you summarize what is happening for your care team."
    };
  }

  if (medicationChangePatterns.some((pattern) => pattern.test(input))) {
    return {
      level: "blocked",
      response:
        "I cannot tell you to stop, start, or change a medication dose. I can help you write a short message to your care team with your concern, symptoms, and recent readings."
    };
  }

  return {
    level: "allowed",
    response: ""
  };
}
