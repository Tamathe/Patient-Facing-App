export type SafetyClassification = {
  level: "allowed" | "escalate" | "blocked";
  response: string;
};

const medicationChangePatterns = [/stop taking/i, /change my dose/i, /double my dose/i, /skip my medicine/i, /take extra/i];
const urgentSymptomPatterns = [
  /chest pain/i,
  /shortness of breath/i,
  /weakness on one side/i,
  /new confusion/i,
  /severe headache/i,
  /fainting/i
];

export function classifySafety(input: string): SafetyClassification {
  if (urgentSymptomPatterns.some((pattern) => pattern.test(input))) {
    return {
      level: "escalate",
      response:
        "Some symptoms need urgent attention. If this may be an emergency, seek urgent medical help now. I can help you summarize what is happening for your care team."
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
