/**
 * Pure analytics functions for the Admin dashboard.
 * No React, no Firebase — accepts plain JS data so it's fully testable
 * in isolation.
 *
 * Entry shape: { emoji: 1..5, timestamp: { toMillis: () => number },
 *                role?, location?, bu? }
 */

const DAY   = 24 * 60 * 60 * 1000;
const WEEK  = 7  * DAY;
const MONTH = 30 * DAY;

const avg = (arr) =>
  arr.length ? arr.reduce((s, e) => s + (e.emoji || 0), 0) / arr.length : null;

const enrichWithTime = (entries) =>
  entries
    .map((e) => ({ ...e, ts: e.timestamp?.toMillis?.() }))
    .filter((e) => e.ts);

/**
 * Top-level dashboard stats: weekly + monthly avgs/deltas, 14-day
 * daily series, 12-week weekly series.
 */
export function computeSentimentStats(entries) {
  const now      = Date.now();
  const withTime = enrichWithTime(entries);
  const inRange  = (start, end) => withTime.filter((e) => e.ts >= start && e.ts < end);

  // Weekly window
  const thisWeekEntries = inRange(now - WEEK,     now);
  const lastWeekEntries = inRange(now - 2 * WEEK, now - WEEK);
  const thisWeek = { avg: avg(thisWeekEntries), count: thisWeekEntries.length };
  const lastWeek = { avg: avg(lastWeekEntries), count: lastWeekEntries.length };
  const delta    = thisWeek.avg != null && lastWeek.avg != null ? thisWeek.avg - lastWeek.avg : null;

  // Monthly window (rolling 30-day)
  const thisMonthEntries = inRange(now - MONTH,     now);
  const lastMonthEntries = inRange(now - 2 * MONTH, now - MONTH);
  const thisMonth  = { avg: avg(thisMonthEntries), count: thisMonthEntries.length };
  const lastMonth  = { avg: avg(lastMonthEntries), count: lastMonthEntries.length };
  const monthDelta = thisMonth.avg != null && lastMonth.avg != null ? thisMonth.avg - lastMonth.avg : null;

  // 14-day daily series
  const daily14 = [];
  for (let i = 13; i >= 0; i--) {
    const start = now - (i + 1) * DAY;
    const end   = now - i * DAY;
    const day   = inRange(start, end);
    const date  = new Date(end - DAY / 2);
    daily14.push({
      day:   `${date.getMonth() + 1}/${date.getDate()}`,
      avg:   avg(day),
      count: day.length,
    });
  }

  // 12-week weekly series
  const weekly12 = [];
  for (let i = 11; i >= 0; i--) {
    const start  = now - (i + 1) * WEEK;
    const end    = now - i * WEEK;
    const bucket = inRange(start, end);
    const date   = new Date(start + WEEK / 2);
    weekly12.push({
      day:   `${date.getMonth() + 1}/${date.getDate()}`,
      avg:   avg(bucket),
      count: bucket.length,
    });
  }

  return {
    thisWeek, lastWeek, delta,
    thisMonth, lastMonth, monthDelta,
    daily14:  daily14.some((d) => d.avg != null) ? daily14 : [],
    weekly12: weekly12.some((d) => d.avg != null) ? weekly12 : [],
  };
}

/**
 * Group entries by `dimension` (e.g. 'role' | 'location' | 'bu'),
 * compute avg/count/delta for each unique value within the active window.
 * Window is 7-day or 30-day depending on `windowMs`. Returns rows sorted
 * by current avg ascending (lowest-sentiment segment first).
 */
export function computeSegmentBreakdown(entries, dimension, windowMs) {
  const now      = Date.now();
  const withTime = enrichWithTime(entries);

  const current = withTime.filter((e) => e.ts >= now - windowMs     && e.ts < now);
  const prior   = withTime.filter((e) => e.ts >= now - 2 * windowMs && e.ts < now - windowMs);

  const groups = {};
  for (const entry of current) {
    const key = entry[dimension];
    if (!key) continue;
    if (!groups[key]) groups[key] = { cur: [], pri: [] };
    groups[key].cur.push(entry);
  }
  for (const entry of prior) {
    const key = entry[dimension];
    if (!key || !groups[key]) continue;
    groups[key].pri.push(entry);
  }

  return Object.entries(groups)
    .map(([name, { cur, pri }]) => {
      const curAvg = avg(cur);
      const priAvg = avg(pri);
      return {
        name,
        avg:   curAvg,
        count: cur.length,
        delta: curAvg != null && priAvg != null ? curAvg - priAvg : null,
      };
    })
    .sort((a, b) => (a.avg ?? 999) - (b.avg ?? 999));
}
