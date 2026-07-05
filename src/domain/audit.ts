import type { AuditEvent } from "./types";

export function recordAuditEvent(
  patientId: string,
  action: AuditEvent["action"],
  label: string
): AuditEvent {
  return {
    id: crypto.randomUUID(),
    patientId,
    action,
    label,
    createdAt: new Date().toISOString()
  };
}
