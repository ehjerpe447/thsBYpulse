/**
 * Unit tests: pure functions extracted from page modules.
 * Firebase module is mocked globally in setup.js.
 */

// ---------------------------------------------------------------------------
// Helpers — mirror the private functions under test
// ---------------------------------------------------------------------------

// computeSentimentStats (from Admin.jsx)
function computeSentimentStats(entries) {
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const WEEK = 7 * DAY;
  const MONTH = 30 * DAY;

  const withTime = entries
    .map((e) => ({ ...e, ts: e.timestamp?.toMillis?.() }))
    .filter((e) => e.ts);

  const inRange = (start, end) =>
    withTime.filter((e) => e.ts >= start && e.ts < end);

  const avg = (arr) =>
    arr.length ? arr.reduce((s, e) => s + (e.emoji || 0), 0) / arr.length : null;

  const thisWeekEntries = inRange(now - WEEK, now);
  const lastWeekEntries = inRange(now - 2 * WEEK, now - WEEK);
  const thisWeek = { avg: avg(thisWeekEntries), count: thisWeekEntries.length };
  const lastWeek = { avg: avg(lastWeekEntries), count: lastWeekEntries.length };
  const delta =
    thisWeek.avg != null && lastWeek.avg != null ? thisWeek.avg - lastWeek.avg : null;

  const thisMonthEntries = inRange(now - MONTH, now);
  const lastMonthEntries = inRange(now - 2 * MONTH, now - MONTH);
  const thisMonth = { avg: avg(thisMonthEntries), count: thisMonthEntries.length };
  const lastMonth = { avg: avg(lastMonthEntries), count: lastMonthEntries.length };
  const monthDelta =
    thisMonth.avg != null && lastMonth.avg != null ? thisMonth.avg - lastMonth.avg : null;

  const daily14 = [];
  for (let i = 13; i >= 0; i--) {
    const start = now - (i + 1) * DAY;
    const end   = now - i * DAY;
    const day   = inRange(start, end);
    const date  = new Date(end - DAY / 2);
    daily14.push({ day: `${date.getMonth() + 1}/${date.getDate()}`, avg: avg(day), count: day.length });
  }

  const weekly12 = [];
  for (let i = 11; i >= 0; i--) {
    const start  = now - (i + 1) * WEEK;
    const end    = now - i * WEEK;
    const bucket = inRange(start, end);
    const date   = new Date(start + WEEK / 2);
    weekly12.push({ day: `${date.getMonth() + 1}/${date.getDate()}`, avg: avg(bucket), count: bucket.length });
  }

  return {
    thisWeek, lastWeek, delta,
    thisMonth, lastMonth, monthDelta,
    daily14: daily14.some((d) => d.avg != null) ? daily14 : [],
    weekly12: weekly12.some((d) => d.avg != null) ? weekly12 : [],
  };
}

// nextQuarter (from Admin.jsx)
function nextQuarter(now = new Date()) {
  const q = Math.floor(now.getMonth() / 3) + 1;
  return q === 4
    ? `Q1 ${now.getFullYear() + 1}`
    : `Q${q + 1} ${now.getFullYear()}`;
}

// loadVotes / saveVotes (from Ideas.jsx)
const VOTE_KEY = 'tph_voted_ideas_v1';
function loadVotes() {
  try {
    return new Set(JSON.parse(localStorage.getItem(VOTE_KEY) || '[]'));
  } catch {
    return new Set();
  }
}
function saveVotes(set) {
  localStorage.setItem(VOTE_KEY, JSON.stringify([...set]));
}

// withTimeout (from firebase.js) — tested independently
function withTimeout(promise, ms = 10000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error('Request timed out.')),
        ms,
      ),
    ),
  ]);
}

// Entry factory — ts relative to now
const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;
function makeEntry(emoji, daysAgo) {
  const ts = Date.now() - daysAgo * DAY;
  return { emoji, timestamp: { toMillis: () => ts } };
}

// ---------------------------------------------------------------------------
// computeSentimentStats — U1–U9
// ---------------------------------------------------------------------------

describe('computeSentimentStats', () => {
  test('U1 — empty array returns nulls and empty daily', () => {
    const r = computeSentimentStats([]);
    expect(r.thisWeek.avg).toBeNull();
    expect(r.thisWeek.count).toBe(0);
    expect(r.delta).toBeNull();
    expect(r.daily14).toEqual([]);
  });

  test('U2 — all entries this week: lastWeek null, delta null', () => {
    const entries = [makeEntry(4, 1), makeEntry(5, 2), makeEntry(3, 3)];
    const r = computeSentimentStats(entries);
    expect(r.thisWeek.avg).toBeCloseTo(4.0);
    expect(r.thisWeek.count).toBe(3);
    expect(r.lastWeek.avg).toBeNull();
    expect(r.delta).toBeNull();
  });

  test('U3 — two full weeks: delta = thisWeek.avg - lastWeek.avg', () => {
    const entries = [
      makeEntry(5, 1), makeEntry(5, 2),       // this week avg=5
      makeEntry(3, 8), makeEntry(3, 9),        // last week avg=3
    ];
    const r = computeSentimentStats(entries);
    expect(r.thisWeek.avg).toBeCloseTo(5.0);
    expect(r.lastWeek.avg).toBeCloseTo(3.0);
    expect(r.delta).toBeCloseTo(2.0);
  });

  test('U4 — single entry score=1', () => {
    const r = computeSentimentStats([makeEntry(1, 1)]);
    expect(r.thisWeek.avg).toBeCloseTo(1.0);
    expect(r.delta).toBeNull();
  });

  test('U5 — single entry score=5', () => {
    const r = computeSentimentStats([makeEntry(5, 1)]);
    expect(r.thisWeek.avg).toBeCloseTo(5.0);
  });

  test('U6 — mixed scores (1,3,5) avg=3', () => {
    const entries = [makeEntry(1, 1), makeEntry(3, 2), makeEntry(5, 3)];
    const r = computeSentimentStats(entries);
    expect(r.thisWeek.avg).toBeCloseTo(3.0);
  });

  test('U7 — entries with null timestamp are filtered out', () => {
    const entries = [
      { emoji: 5, timestamp: null },
      { emoji: 5, timestamp: undefined },
      makeEntry(3, 1),
    ];
    const r = computeSentimentStats(entries);
    expect(r.thisWeek.count).toBe(1);
    expect(r.thisWeek.avg).toBeCloseTo(3.0);
  });

  test('U8 — 14 days of data produces 14 daily14 entries', () => {
    // Each bucket is [now-(i+1)*DAY, now-i*DAY). Use i+0.5 so every entry lands
    // strictly inside its own bucket — integer daysAgo would sit on a boundary and
    // fall into the adjacent (newer) bucket instead.
    const entries = Array.from({ length: 14 }, (_, i) => makeEntry(3, i + 0.5));
    const r = computeSentimentStats(entries);
    expect(r.daily14).toHaveLength(14);
    r.daily14.forEach((d) => expect(d.avg).not.toBeNull());
  });

  test('U8b — monthly stats compute correctly with data in both windows', () => {
    const entries = [
      makeEntry(4, 10), makeEntry(4, 20),  // this month avg=4
      makeEntry(2, 40), makeEntry(2, 50),  // last month avg=2
    ];
    const r = computeSentimentStats(entries);
    expect(r.thisMonth.avg).toBeCloseTo(4.0);
    expect(r.lastMonth.avg).toBeCloseTo(2.0);
    expect(r.monthDelta).toBeCloseTo(2.0);
  });

  test('U8c — monthDelta is null when only one month has data', () => {
    const entries = [makeEntry(3, 10)]; // only this month
    const r = computeSentimentStats(entries);
    expect(r.lastMonth.avg).toBeNull();
    expect(r.monthDelta).toBeNull();
  });

  test('U8d — weekly12 produces 12 buckets each covering one week', () => {
    // One entry per week midpoint for 12 weeks
    const entries = Array.from({ length: 12 }, (_, i) => makeEntry(3, (i + 0.5) * 7));
    const r = computeSentimentStats(entries);
    expect(r.weekly12).toHaveLength(12);
    r.weekly12.forEach((w) => expect(w.avg).not.toBeNull());
  });

  test('U9 — delta is negative when this week is lower than last', () => {
    const entries = [
      makeEntry(2, 1),   // this week avg=2
      makeEntry(4, 8),   // last week avg=4
    ];
    const r = computeSentimentStats(entries);
    expect(r.delta).toBeCloseTo(-2.0);
    expect(r.delta).toBeLessThan(0);
  });
});

// ---------------------------------------------------------------------------
// nextQuarter — U10–U12
// ---------------------------------------------------------------------------

describe('nextQuarter', () => {
  test('U10 — Q1 (January) returns Q2 same year', () => {
    expect(nextQuarter(new Date('2026-01-15'))).toBe('Q2 2026');
  });

  test('U11 — Q4 (October) returns Q1 next year', () => {
    // Use new Date(y, m, d) to avoid ISO-string UTC-parse timezone ambiguity.
    expect(nextQuarter(new Date(2026, 9, 1))).toBe('Q1 2027'); // month 9 = October
  });

  test('U12 — Dec 31 returns Q1 of next year (not Q5)', () => {
    const result = nextQuarter(new Date(2026, 11, 31)); // month 11 = December
    expect(result).toBe('Q1 2027');
    expect(result).not.toContain('Q5');
  });
});

// ---------------------------------------------------------------------------
// loadVotes / saveVotes — U13–U16
// ---------------------------------------------------------------------------

describe('loadVotes / saveVotes', () => {
  test('U13 — localStorage empty returns empty Set', () => {
    const votes = loadVotes();
    expect(votes).toBeInstanceOf(Set);
    expect(votes.size).toBe(0);
  });

  test('U14 — localStorage with valid JSON array returns correct Set', () => {
    localStorage.setItem(VOTE_KEY, JSON.stringify(['id1', 'id2']));
    const votes = loadVotes();
    expect(votes.has('id1')).toBe(true);
    expect(votes.has('id2')).toBe(true);
    expect(votes.size).toBe(2);
  });

  test('U15 — malformed JSON returns empty Set without throwing', () => {
    localStorage.setItem(VOTE_KEY, '{broken json{{');
    expect(() => loadVotes()).not.toThrow();
    expect(loadVotes().size).toBe(0);
  });

  test('U16 — save then load round-trip preserves all IDs', () => {
    const original = new Set(['abc', 'def', 'ghi']);
    saveVotes(original);
    const loaded = loadVotes();
    expect(loaded).toEqual(original);
  });
});

// ---------------------------------------------------------------------------
// withTimeout — U17–U19
// ---------------------------------------------------------------------------

describe('withTimeout', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  test('U17 — resolves when promise resolves before timeout', async () => {
    const p = Promise.resolve('ok');
    await expect(withTimeout(p, 5000)).resolves.toBe('ok');
  });

  test('U18 — rejects with timeout error when promise is too slow', async () => {
    const slow = new Promise(() => {}); // never resolves
    const race = withTimeout(slow, 1000);
    vi.advanceTimersByTime(1001);
    await expect(race).rejects.toThrow('timed out');
  });

  test('U19 — rejects with original error when promise rejects before timeout', async () => {
    const failing = Promise.reject(new Error('original error'));
    await expect(withTimeout(failing, 5000)).rejects.toThrow('original error');
  });
});
