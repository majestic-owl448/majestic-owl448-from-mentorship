import { prisma } from "@/lib/db";
import { isTimeZone } from "@/lib/postalEntitySettingValidation";

export type TimeZonePreference = {
  timeZone: string;
  timeZoneMode: "SYSTEM" | "CUSTOM";
};

export function validateTimeZonePreference(input: unknown):
  | { data: TimeZonePreference; errors?: never }
  | { data?: never; errors: Record<"timeZone" | "timeZoneMode", string> } {
  const record = typeof input === "object" && input !== null
    ? input as Record<string, unknown>
    : {};
  const timeZone = typeof record.timeZone === "string" ? record.timeZone.trim() : "";
  const timeZoneMode = typeof record.timeZoneMode === "string"
    ? record.timeZoneMode.trim().toUpperCase()
    : "";
  const errors: Partial<Record<"timeZone" | "timeZoneMode", string>> = {};
  if (timeZoneMode !== "SYSTEM" && timeZoneMode !== "CUSTOM") {
    errors.timeZoneMode = "Select system or custom timezone mode.";
  }
  if (!timeZone || !isTimeZone(timeZone)) {
    errors.timeZone = "Enter a valid IANA timezone.";
  }
  return Object.keys(errors).length > 0
    ? { errors: errors as Record<"timeZone" | "timeZoneMode", string> }
    : { data: { timeZone, timeZoneMode: timeZoneMode as "SYSTEM" | "CUSTOM" } };
}

export function updateTimeZonePreference(userId: string, preference: TimeZonePreference) {
  return prisma.userProfile.update({ where: { id: userId }, data: preference });
}
