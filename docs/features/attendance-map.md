# Attendance Heatmap Feature

## Goal

Show each signed-in member a **calendar-aligned** heatmap of attendance: columns are **weeks** (Sunday–Saturday, **UTC**), rows are **weekdays** with labels, optional **month** labels on the first row, and a choice of **last 30 days**, **90 days**, **Year (rolling)**, or **Year (Jan-Dec fixed)**.

## Data Model

Attendance rows use `AttendanceRecord` (`lib/types.ts`):

- **`userId`**, **`date`** (`YYYY-MM-DD`), **`visitCount`** (number of gym visits logged that UTC day; multiple logs increment the same row)

Date keys are generated and compared in **UTC** so the grid lines up with stored strings.

## Backend: `listAttendance`

**Location:** `lib/repositories.ts` — `listAttendance(userId: string, lookback?: number)`

**Lookback** is normalized to **30**, **90**, **365**, or **366** via `normalizeHeatmapLookbackDays` in `lib/attendance-heatmap.ts` (invalid values default to **90**).

1. **Mock mode** (`USE_MOCK_DATA=true` or no `MONGODB_URI`)  
   - Each user is seeded with up to **`HEATMAP_MAX_DAYS` (366)** rows in `mockStore.attendanceByUser` using **`buildAttendance`**.  
   - **Sunday (UTC)** is always “missed”; other days are random in the mock.  
   - The function returns **`sliceLastAttendanceDays(existing, lookback)`**.

2. **MongoDB**  
   - **`find({ userId, date: { $gte: rangeStart } })`** with `rangeStart = lookbackRangeStartKey(lookback)`, sorted by `date` ascending.  
   - If **no documents**, seeds **366** days of sample rows, inserts them, then re-queries with the same filter.

## Calendar layout: `buildHeatmapCalendar`

**Location:** `lib/attendance-heatmap.ts`

Builds padding from the **Sunday** of the week that contains the first in-range day through:

- the **Saturday** of the week containing “today” (UTC) for rolling windows
- the **Saturday** of the week containing **Dec 31** for the fixed Jan-Dec view

In the fixed Jan-Dec view, future days in the same year are shown as padded cells. In-range days with **0 visits** are darker than days with visits; **brighter greens** mean more visits the same day (up to four intensity steps).

## UI: `AttendanceHeatmap` (client)

**Location:** `components/AttendanceHeatmap.tsx`

- **`"use client"`** for range controls and refetching.  
- **Props:** `initialAttendance`, optional `initialLookback` (default 90).  
- **Range buttons:** 30 days, 90 days, Year (rolling), Year (Jan-Dec).  
- Switching range calls **`GET /api/attendance?preset=`** and replaces local attendance state.  
- **Log gym visit** calls **`POST /api/attendance`** (body optional `{ "date" }`; only **today’s UTC date** is accepted), then refetches the current preset and triggers **`router.refresh()`** so loyalty points update.  
- Loading state dims the card; errors surface under the header.

## API

| Route | Behavior |
|--------|----------|
| **`GET /api/attendance?preset=30d\|90d\|rolling-year\|fixed-year`** | Session required; returns `{ attendance, days, preset }` for the current user. |
| **`POST /api/attendance`** | Session required; increments **`visitCount`** for the current UTC calendar day (optional body `{ "date": "YYYY-MM-DD" }` must match today UTC). Returns `{ record }`. |

## Dashboard and loyalty points

**Location:** `app/dashboard/page.tsx`

- Loads **`listAttendance(session.userId, 90)`** once for the **welcome card loyalty points** (90-day rolling) and as the heatmap’s **initial** dataset.  
- **Loyalty points** = **sum of `visitCount` over the 90-day window × 10** (each logged visit counts). Logging a visit refreshes the server-rendered welcome card via **`router.refresh()`**.

**`GET /api/dashboard`** still loads attendance with **90-day** lookback for its JSON payload.

## Styling

**Location:** `app/globals.css` — `.heatmap-card`, `.heatmap-calendar-grid`, `.heatmap-grid-dow`, `.heatmap-grid-month`, `.heatmap-cell`, modifiers **`--v0` … `--v4`** (visit intensity), `--pad`, log row, range buttons, etc.

## Related files

- `lib/attendance-heatmap.ts` — lookback constants, UTC date helpers, `buildHeatmapCalendar`  
- `lib/repositories.ts` — `listAttendance`, `buildAttendance`, `incrementAttendanceVisit`, `normalizeAttendanceRecord`  
- `app/api/attendance/route.ts`  
- `components/AttendanceHeatmap.tsx`  
- `app/dashboard/page.tsx`  
- `app/globals.css`  

## Possible enhancements

- Locale/timezone-aware “day” boundaries instead of UTC  
- Rich tooltips and “today” highlight  

