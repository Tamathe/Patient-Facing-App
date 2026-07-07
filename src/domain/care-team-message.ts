import { barrierLabel } from "./labels";
import type { AppState } from "./types";

// Builds a plain-text message the patient can copy or share with their care team.
// Everything comes from on-device state; nothing is sent anywhere by this function.
export function buildCareTeamMessage(state: AppState): string {
  const lines: string[] = ["For my care team:"];

  lines.push(`- What I am working on: ${state.carePlan.plainLanguageSummary}`);

  const recentReadings = state.readings
    .slice(-3)
    .reverse()
    .map((reading) => `${reading.systolic}/${reading.diastolic}`);
  if (recentReadings.length > 0) {
    lines.push(`- Recent home readings: ${recentReadings.join(", ")}`);
  }

  const medication = state.medications[0];
  if (medication) {
    const barriers = medication.activeBarriers.map(barrierLabel).join("; ");
    const barrierText = barriers.length > 0 ? ` What has been hard: ${barriers}.` : "";
    lines.push(`- Medicine: ${medication.name} ${medication.dose}, ${medication.schedule}.${barrierText}`);
  }

  lines.push("- My question: I want to talk about whether my plan is working and any side effects I am noticing.");

  return lines.join("\n");
}

// Drafted message for an eye referral that needs the care team's push — used
// when a retina-urgent referral is placed and again when any referral stalls
// past its call window. Nothing is sent by this function.
export function buildReferralCareTeamMessage(
  state: AppState,
  details: { destinationName: string; tier: "optometry_routine" | "retina_urgent"; sentAt: string; reason: "urgent" | "stalled" }
): string {
  const language = state.patient.language;
  const sentDate = new Date(details.sentAt).toLocaleDateString(language === "es" ? "es-US" : "en-US");
  const tierLabel =
    language === "es"
      ? details.tier === "retina_urgent"
        ? "urgente con especialista de retina"
        : "de rutina con optometría"
      : details.tier === "retina_urgent"
        ? "urgent retina"
        : "routine optometry";

  const lines: string[] =
    language === "es"
      ? [
          "Para mi equipo de salud:",
          `- Soy ${state.patient.name}. Mi examen de ojos por la diabetes generó un referido ${tierLabel} a ${details.destinationName}, enviado el ${sentDate}.`,
          details.reason === "stalled"
            ? "- La clínica todavía no me llama para confirmar. ¿Pueden ayudarme a empujar esta cita?"
            : "- El reporte dice que necesito atención pronto. ¿Pueden ayudarme a asegurar que esta cita ocurra rápido?",
          `- Mi clínica: ${state.patient.primaryClinicName}, ${state.patient.primaryClinicPhone}.`
        ]
      : [
          "For my care team:",
          `- I'm ${state.patient.name}. My diabetes eye screening produced a ${tierLabel} referral to ${details.destinationName}, sent ${sentDate}.`,
          details.reason === "stalled"
            ? "- The clinic hasn't called to confirm yet. Can you help push this appointment through?"
            : "- The report says I need care soon. Can you help make sure this appointment happens quickly?",
          `- My clinic: ${state.patient.primaryClinicName}, ${state.patient.primaryClinicPhone}.`
        ];

  return lines.join("\n");
}

// The "I'd rather talk to someone" path from the screening nudge: an honest
// drafted callback request instead of a fake queue. Same on-device rules as
// buildCareTeamMessage — nothing is sent by this function.
export function buildScreeningCallbackMessage(state: AppState, monthsSinceLast: number | null): string {
  const language = state.patient.language;
  const lines: string[] =
    language === "es"
      ? [
          "Para mi equipo de salud:",
          `- Soy ${state.patient.name}. Recibí un recordatorio de mi chequeo de ojos por la diabetes y prefiero hablar con alguien para agendarlo.`,
          monthsSinceLast === null
            ? "- No tengo registrada la fecha de mi último examen de ojos."
            : `- Han pasado unos ${monthsSinceLast} meses desde mi último examen de ojos.`,
          `- Por favor llámenme para encontrar un horario y lugar que me funcione. Mi clínica: ${state.patient.primaryClinicName}.`
        ]
      : [
          "For my care team:",
          `- I'm ${state.patient.name}. I got a reminder about my diabetes eye check and I'd rather talk to someone to set it up.`,
          monthsSinceLast === null
            ? "- I don't have a record of my last eye screening date."
            : `- It has been about ${monthsSinceLast} months since my last eye screening.`,
          `- Please call me to find a time and place that works. My clinic: ${state.patient.primaryClinicName}.`
        ];

  return lines.join("\n");
}
