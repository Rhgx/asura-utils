export const TIMESTAMP_PATTERN = /(?:\b(?:today|yesterday|just\s+now)\b|\blast\s+(?:hour|day|week|month|year)\b|\b\d+\s*(?:sec(?:ond)?s?|min(?:ute)?s?|hours?|days?|weeks?|months?|years?)\s+ago\b|\b\d+\s*(?:s|m|h|d|w|mo|y)(?:\s+\d+\s*(?:s|m|h|d|w|mo|y))*\b|\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:,\s*\d{4})?\b|\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b)/i;

const unitHours: Record<string, number> = {
  s: 1 / 3600,
  m: 1 / 60,
  h: 1,
  d: 24,
  w: 24 * 7,
  mo: 24 * 30,
  y: 24 * 365,
};

const longUnits: Record<string, number> = {
  second: 1 / 3600,
  minute: 1 / 60,
  hour: 1,
  day: 24,
  week: 24 * 7,
  month: 24 * 30,
  year: 24 * 365,
};

// Maps a timestamp label to a freshness class. `now` is epoch milliseconds.
export function getTimestampAgeClass(value: string, now: number): string {
  const normalized = value.trim().toLowerCase();
  let ageHours = 0;

  if (normalized === "yesterday") ageHours = 24;
  else if (normalized.startsWith("last ")) {
    const unit = normalized.slice(5);
    ageHours =
      unit === "hour" ? 1 :
      unit === "day" ? 24 :
      unit === "week" ? 24 * 7 :
      unit === "month" ? 24 * 30 :
      24 * 365;
  } else {
    const longMatch = normalized.match(
      /(\d+)\s*(second|minute|hour|day|week|month|year)s?\s+ago/
    );
    if (longMatch) {
      ageHours = Number(longMatch[1]) * (longUnits[longMatch[2]!] || 0);
    } else {
      const compactParts = Array.from(
        normalized.matchAll(/(\d+)\s*(mo|[smhdwy])\b/g)
      );
      if (compactParts.length) {
        ageHours = compactParts.reduce(
          (total, match) =>
            total + Number(match[1]) * (unitHours[match[2]!] || 0),
          0
        );
      } else if (!/^(?:today|just\s+now)$/.test(normalized)) {
        // Dates without a year are anchored to the current year. Without one, JS
        // parses them as 2001, which would classify every such date as old.
        const hasYear = /\b\d{4}\b/.test(value);
        const parsedDate = new Date(
          hasYear ? value : `${value} ${new Date(now).getFullYear()}`
        );
        if (!Number.isNaN(parsedDate.getTime())) {
          // A yearless date that lands in the future refers to the previous year.
          if (!hasYear && parsedDate.getTime() > now) {
            parsedDate.setFullYear(parsedDate.getFullYear() - 1);
          }
          ageHours = Math.max(0, (now - parsedDate.getTime()) / 3_600_000);
        }
      }
    }
  }

  if (ageHours <= 6) return "au-timestamp-fresh";
  if (ageHours <= 24) return "au-timestamp-recent";
  if (ageHours <= 24 * 7) return "au-timestamp-week";
  return "au-timestamp-old";
}
