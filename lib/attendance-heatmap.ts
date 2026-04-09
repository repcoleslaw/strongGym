import type { AttendanceRecord } from "@/lib/types";

export const HEATMAP_LOOKBACK_OPTIONS = [30, 90, 365] as const;

export type HeatmapLookbackDays = (typeof HEATMAP_LOOKBACK_OPTIONS)[number];
export type HeatmapQueryLookbackDays = HeatmapLookbackDays | 366;
export type HeatmapViewPreset = "30d" | "90d" | "rolling-year" | "fixed-year";

export const HEATMAP_MAX_DAYS = 366;

/** Week rows: Sunday (index 0) → Saturday (index 6), matching JS getUTCDay(). */
export const HEATMAP_WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export type HeatmapCalendarCell = {
  dateKey: string;
  inRange: boolean;
  visitCount: number;
};

export type HeatmapCalendarWeek = HeatmapCalendarCell[];

export function normalizeHeatmapLookbackDays(value: unknown): HeatmapQueryLookbackDays {
  const n = typeof value === "string" ? parseInt(value, 10) : Number(value);
  if (n === 30 || n === 90 || n === 365 || n === 366) {
    return n;
  }
  return 90;
}

export function normalizeHeatmapViewPreset(value: unknown): HeatmapViewPreset {
  if (value === "30d" || value === "90d" || value === "rolling-year" || value === "fixed-year") {
    return value;
  }
  return "90d";
}

export function getHeatmapLookbackDaysForPreset(
  preset: HeatmapViewPreset,
  dateKey = utcTodayKey()
): HeatmapQueryLookbackDays {
  if (preset === "30d") {
    return 30;
  }
  if (preset === "90d") {
    return 90;
  }
  if (preset === "rolling-year") {
    return 365;
  }
  return isLeapYearDateKey(dateKey) ? 366 : 365;
}

export function utcTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysToDateKey(dateKey: string, deltaDays: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  utc.setUTCDate(utc.getUTCDate() + deltaDays);
  return utc.toISOString().slice(0, 10);
}

/** First calendar day (inclusive) for a "last N days" window ending today (UTC). */
export function lookbackRangeStartKey(lookbackDays: HeatmapQueryLookbackDays): string {
  const end = utcTodayKey();
  return addDaysToDateKey(end, -(lookbackDays - 1));
}

export function sliceLastAttendanceDays(
  records: AttendanceRecord[],
  lookbackDays: HeatmapQueryLookbackDays
): AttendanceRecord[] {
  if (records.length <= lookbackDays) {
    return records;
  }
  return records.slice(-lookbackDays);
}

export function buildAttendanceDateMap(records: AttendanceRecord[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of records) {
    const n = typeof r.visitCount === "number" ? Math.max(0, Math.floor(r.visitCount)) : 0;
    map.set(r.date, n);
  }
  return map;
}

/** CSS class suffix for in-range cells: `heatmap-cell--v0` … `heatmap-cell--v4` (v4 = 4+ visits). */
export function heatmapVisitIntensityClass(visitCount: number): string {
  if (visitCount <= 0) {
    return "heatmap-cell--v0";
  }
  if (visitCount >= 4) {
    return "heatmap-cell--v4";
  }
  return `heatmap-cell--v${visitCount}` as const;
}

/** Sunday (UTC) of the week containing `dateKey`, as YYYY-MM-DD. */
export function startOfUtcWeekContaining(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  const dow = utc.getUTCDay(); // 0 Sun
  return addDaysToDateKey(dateKey, -dow);
}

/** Saturday (UTC) of the week containing `dateKey`. */
export function endOfUtcWeekContaining(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  const dow = utc.getUTCDay();
  return addDaysToDateKey(dateKey, 6 - dow);
}

export type HeatmapCalendarModel = {
  weeks: HeatmapCalendarWeek[];
  monthLabels: string[];
};

export function buildHeatmapCalendar(
  records: AttendanceRecord[],
  preset: HeatmapViewPreset
): HeatmapCalendarModel {
  const rangeEnd = utcTodayKey();
  const currentYear = rangeEnd.slice(0, 4);
  const isFixedYear = preset === "fixed-year";
  const rangeStart = isFixedYear
    ? `${currentYear}-01-01`
    : lookbackRangeStartKey(getHeatmapLookbackDaysForPreset(preset, rangeEnd));
  const visitsByDate = buildAttendanceDateMap(records);

  const gridStart = startOfUtcWeekContaining(rangeStart);
  const gridEnd = endOfUtcWeekContaining(isFixedYear ? `${currentYear}-12-31` : rangeEnd);

  const weeks: HeatmapCalendarWeek[] = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    const week: HeatmapCalendarWeek = [];
    for (let i = 0; i < 7; i++) {
      const dateKey = addDaysToDateKey(cursor, i);
      const inRange = dateKey >= rangeStart && dateKey <= rangeEnd;
      const visitCount = inRange ? (visitsByDate.get(dateKey) ?? 0) : 0;
      week.push({ dateKey, inRange, visitCount });
    }
    weeks.push(week);
    cursor = addDaysToDateKey(cursor, 7);
  }

  const monthLabels: string[] = [];
  let prevMonth = -1;
  for (const week of weeks) {
    const sundayKey = week[0].dateKey;
    const [y, m, d] = sundayKey.split("-").map(Number);
    const month = new Date(Date.UTC(y, m - 1, d)).getUTCMonth();
    const label = month !== prevMonth ? MONTH_SHORT[month] : "";
    monthLabels.push(label);
    prevMonth = month;
  }

  return { weeks, monthLabels };
}

function isLeapYearDateKey(dateKey: string): boolean {
  const year = Number(dateKey.slice(0, 4));
  return year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0);
}
