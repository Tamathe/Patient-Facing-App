export type SafetyClassification = {
  level: "allowed" | "escalate" | "blocked";
  response: string;
};

const medicationChangePatterns = [
  /stop taking/i,
  /change my dose/i,
  /double my dose/i,
  /skip my medicine/i,
  /take extra/i,
  /should i increase my dose/i,
  /increase my dose/i,
  /can i take two/i,
  /stop for a day/i
];
const dangerousReadingWithSlashPattern = /(\d{2,3})\s*[\/\-]\s*(\d{2,3})/i;
const dangerousSystolicDiastolicPattern = /systolic\s*(?:is\s*)?(\d{2,3})\D{1,20}?diastolic\s*(?:is\s*)?(\d{2,3})/i;
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

function hasDangerousBloodPressure(systolic: number, diastolic: number): boolean {
  const plausibleReading = systolic >= 50 && systolic <= 260 && diastolic >= 20 && diastolic <= 160;

  if (!plausibleReading) {
    return false;
  }

  return systolic >= 180 || diastolic >= 120 || systolic < 90 || diastolic < 60;
}

function hasDangerousReading(input: string): boolean {
  const slashMatch = dangerousReadingWithSlashPattern.exec(input);

  if (slashMatch) {
    const systolic = Number.parseInt(slashMatch[1], 10);
    const diastolic = Number.parseInt(slashMatch[2], 10);

    return hasDangerousBloodPressure(systolic, diastolic);
  }

  const wordMatch = dangerousSystolicDiastolicPattern.exec(input);

  if (!wordMatch) {
    return false;
  }

  const systolic = Number.parseInt(wordMatch[1], 10);
  const diastolic = Number.parseInt(wordMatch[2], 10);

  return hasDangerousBloodPressure(systolic, diastolic);
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
