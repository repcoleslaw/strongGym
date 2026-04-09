"use client";

import { useRouter } from "next/navigation";
import { Fragment, useCallback, useState } from "react";

import {
  type HeatmapViewPreset,
  HEATMAP_WEEKDAY_LABELS,
  buildHeatmapCalendar,
  heatmapVisitIntensityClass,
  normalizeHeatmapLookbackDays,
  normalizeHeatmapViewPreset,
  utcTodayKey
} from "@/lib/attendance-heatmap";
import type { AttendanceRecord } from "@/lib/types";

type AttendanceHeatmapProps = {
  initialAttendance: AttendanceRecord[];
  initialLookback?: number;
};

const VIEW_OPTIONS: { preset: HeatmapViewPreset; label: string }[] = [
  { preset: "30d", label: "30 days" },
  { preset: "90d", label: "90 days" },
  { preset: "rolling-year", label: "Year (rolling)" },
  { preset: "fixed-year", label: "Year (Jan-Dec)" }
];

export function AttendanceHeatmap({
  initialAttendance,
  initialLookback = 90
}: AttendanceHeatmapProps) {
  const router = useRouter();
  const initialDays = normalizeHeatmapLookbackDays(initialLookback);
  const initialPreset: HeatmapViewPreset =
    initialDays === 30 ? "30d" : initialDays === 90 ? "90d" : "rolling-year";
  const [preset, setPreset] = useState<HeatmapViewPreset>(initialPreset);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(initialAttendance);
  const [loading, setLoading] = useState(false);
  const [logLoading, setLogLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchForPreset = useCallback(async (p: HeatmapViewPreset) => {
    const res = await fetch(`/api/attendance?preset=${p}`, { credentials: "same-origin" });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || res.statusText);
    }
    const data = (await res.json()) as { attendance: AttendanceRecord[]; preset?: string };
    setAttendance(data.attendance);
    setPreset(normalizeHeatmapViewPreset(data.preset ?? p));
  }, []);

  const loadRange = useCallback(
    async (next: HeatmapViewPreset) => {
      setLoading(true);
      setError(null);
      try {
        await fetchForPreset(next);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load attendance");
      } finally {
        setLoading(false);
      }
    },
    [fetchForPreset]
  );

  const logVisitToday = useCallback(async () => {
    setLogLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }
      await fetchForPreset(preset);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not log visit");
    } finally {
      setLogLoading(false);
    }
  }, [fetchForPreset, preset, router]);

  const { weeks, monthLabels } = buildHeatmapCalendar(attendance, preset);
  const todayKey = utcTodayKey();
  const todayVisits =
    attendance.find((r) => r.date === todayKey)?.visitCount ?? 0;

  return (
    <div className={`card heatmap-card${loading ? " heatmap-card--loading" : ""}`}>
      <div className="heatmap-header">
        <h3 className="heatmap-title">Attendance</h3>
        <div className="heatmap-range" role="group" aria-label="Date range">
          {VIEW_OPTIONS.map((option) => (
            <button
              key={option.preset}
              type="button"
              className={`heatmap-range-btn${preset === option.preset ? " heatmap-range-btn--active" : ""}`}
              disabled={loading}
              onClick={() => {
                if (option.preset !== preset) {
                  void loadRange(option.preset);
                }
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="heatmap-log-row">
        <button
          type="button"
          className="heatmap-log-btn"
          disabled={loading || logLoading}
          onClick={() => void logVisitToday()}
        >
          {logLoading ? "Logging…" : "Log gym visit"}
        </button>
        <span className="heatmap-log-meta">
          Today (UTC <code>{todayKey}</code>): <strong>{todayVisits}</strong> logged
          {todayVisits === 1 ? " visit" : " visits"}
        </span>
      </div>
      {error ? (
        <p className="heatmap-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="heatmap-calendar-scroll">
        <div
          className="heatmap-calendar-grid"
          style={{ gridTemplateColumns: `38px repeat(${weeks.length}, 12px)` }}
        >
          <div className="heatmap-grid-corner" />
          {monthLabels.map((m, i) => (
            <div key={`month-${weeks[i]?.[0]?.dateKey ?? i}`} className="heatmap-grid-month">
              {m}
            </div>
          ))}
          {[0, 1, 2, 3, 4, 5, 6].map((ri) => (
            <Fragment key={HEATMAP_WEEKDAY_LABELS[ri]}>
              <div className="heatmap-grid-dow">{HEATMAP_WEEKDAY_LABELS[ri]}</div>
              {weeks.map((week) => {
                const cell = week[ri];
                const title = cell.inRange
                  ? `${cell.dateKey} — ${cell.visitCount} visit${cell.visitCount === 1 ? "" : "s"}`
                  : `${cell.dateKey} — outside selected range`;
                const cellClass = cell.inRange
                  ? `heatmap-cell ${heatmapVisitIntensityClass(cell.visitCount)}`
                  : "heatmap-cell heatmap-cell--pad";
                return <div key={cell.dateKey} className={cellClass} title={title} />;
              })}
            </Fragment>
          ))}
        </div>
      </div>
      <p className="heatmap-legend">
        Weeks start Sunday (UTC). Darker green = more visits the same day (each button press adds one).
        Faded cells pad partial weeks or future days.
      </p>
    </div>
  );
}
