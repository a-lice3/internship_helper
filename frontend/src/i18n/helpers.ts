type TFunction = (key: string) => string;

const MONTH_KEYS = [
  "months.january", "months.february", "months.march", "months.april",
  "months.may", "months.june", "months.july", "months.august",
  "months.september", "months.october", "months.november", "months.december",
] as const;

const DAY_KEYS = [
  "days.mon", "days.tue", "days.wed", "days.thu",
  "days.fri", "days.sat", "days.sun",
] as const;

const DAY_SHORT_KEYS = [
  "daysShort.mo", "daysShort.tu", "daysShort.we", "daysShort.th",
  "daysShort.fr", "daysShort.sa", "daysShort.su",
] as const;

const MONTH_SHORT_KEYS = [
  "monthsShort.jan", "monthsShort.feb", "monthsShort.mar", "monthsShort.apr",
  "monthsShort.may", "monthsShort.jun", "monthsShort.jul", "monthsShort.aug",
  "monthsShort.sep", "monthsShort.oct", "monthsShort.nov", "monthsShort.dec",
] as const;

const STATUS_KEYS = [
  "bookmarked", "applied", "screened", "interview", "rejected", "accepted",
] as const;

export function getMonths(t: TFunction): string[] {
  return MONTH_KEYS.map((k) => t(k));
}

export function getDays(t: TFunction): string[] {
  return DAY_KEYS.map((k) => t(k));
}

export function getDaysShort(t: TFunction): string[] {
  return DAY_SHORT_KEYS.map((k) => t(k));
}

export function getMonthsShort(t: TFunction): string[] {
  return MONTH_SHORT_KEYS.map((k) => t(k));
}

export function getStatusLabel(t: TFunction, status: string): string {
  return t(`status.${status}` as never) || status;
}

export function getStatusLabels(t: TFunction): Record<string, string> {
  const result: Record<string, string> = {};
  for (const s of STATUS_KEYS) {
    result[s] = t(`status.${s}`);
  }
  return result;
}

export function getReminderTypeLabel(t: TFunction, type: string): string {
  return t(`reminderTypes.${type}` as never) || type.replace("_", " ");
}

export function getEventTypeLabel(t: TFunction, type: string): string {
  return t(`eventTypes.${type}` as never) || type;
}

export const STATUSES = ["bookmarked", "applied", "screened", "interview", "rejected", "accepted"];
export const REMINDER_TYPES = ["deadline", "follow_up", "interview", "custom"];
