import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  writeBatch,
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  ShieldCheck,
  LogOut,
  TrendingUp,
  TrendingDown,
  Minus,
  Rocket,
  X,
} from 'lucide-react';
import { auth, db, COLLECTIONS, withTimeout } from '../firebase';

export default function Admin() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => onAuthStateChanged(auth, (u) => {
    setUser(u);
    setAuthChecked(true);
  }), []);

  if (!authChecked) {
    return <div className="card text-center text-sm text-brand-slate/60">Loading…</div>;
  }
  return user ? <AdminConsole user={user} /> : <Login />;
}

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await withTimeout(signInWithEmailAndPassword(auth, email, password));
    } catch (err) {
      setError(err.message?.replace('Firebase: ', '') || 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-8 sm:mt-16">
      <div className="card space-y-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-green text-white">
            <ShieldCheck size={18} />
          </span>
          <div>
            <h1 className="text-lg leading-tight">Product Team Console</h1>
            <p className="text-xs text-brand-slate/70">Sign in to manage the roadmap.</p>
          </div>
        </div>
        <form onSubmit={handleLogin} className="space-y-3">
          <label className="block">
            <span className="block text-xs font-medium text-brand-slate/80 mb-1.5">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              autoComplete="email"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-brand-slate/80 mb-1.5">Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              autoComplete="current-password"
            />
          </label>
          {error && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

function AdminConsole({ user }) {
  const [sentiment, setSentiment] = useState([]);
  const [features, setFeatures] = useState([]);
  const [roadmap, setRoadmap] = useState([]);
  const [promoting, setPromoting] = useState(null);
  const [promoteError, setPromoteError] = useState('');
  const [snapshotError, setSnapshotError] = useState('');
  const [view, setView] = useState('near'); // 'near' | 'long'

  useEffect(() => {
    const onError = (err) => {
      console.error(err);
      setSnapshotError('Could not load data. Check your Firebase connection or security rules.');
    };
    const unsubs = [
      onSnapshot(
        query(collection(db, COLLECTIONS.SENTIMENT), orderBy('timestamp', 'desc')),
        (snap) => setSentiment(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        onError,
      ),
      onSnapshot(
        collection(db, COLLECTIONS.FEATURES),
        (snap) => setFeatures(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        onError,
      ),
      onSnapshot(
        collection(db, COLLECTIONS.ROADMAP),
        (snap) => setRoadmap(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        onError,
      ),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const stats = useMemo(() => computeSentimentStats(sentiment), [sentiment]);
  const onRoadmapIds = useMemo(() => new Set(roadmap.map((r) => r.featureId)), [roadmap]);
  const queue = useMemo(
    () =>
      [...features]
        .filter((f) => !onRoadmapIds.has(f.id))
        .sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0)),
    [features, onRoadmapIds],
  );

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="chip">Admin Console</span>
          <h1 className="text-2xl mt-2">Planning Pulse Insights</h1>
          <p className="text-xs text-brand-slate/70 mt-1">Signed in as {user.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-lg border border-brand-green/15 bg-white p-0.5">
            <button
              type="button"
              onClick={() => setView('near')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                view === 'near' ? 'bg-brand-green text-white' : 'text-brand-slate hover:text-brand-green'
              }`}
            >
              Near-term
            </button>
            <button
              type="button"
              onClick={() => setView('long')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                view === 'long' ? 'bg-brand-green text-white' : 'text-brand-slate hover:text-brand-green'
              }`}
            >
              Long-term
            </button>
          </div>
          <button onClick={() => signOut(auth)} className="btn-ghost">
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </header>

      {snapshotError && (
        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {snapshotError}
        </div>
      )}

      <section className="grid sm:grid-cols-3 gap-3">
        {view === 'near' ? (
          <ScoreCard
            label="This week"
            score={stats.thisWeek.avg}
            count={stats.thisWeek.count}
            delta={stats.delta}
            deltaLabel="vs. last week"
          />
        ) : (
          <ScoreCard
            label="This month"
            score={stats.thisMonth.avg}
            count={stats.thisMonth.count}
            delta={stats.monthDelta}
            deltaLabel="vs. prior month"
          />
        )}
        <MetricCard label="Total responses" value={sentiment.length} />
        <MetricCard label="Ideas in queue" value={queue.length} />
      </section>

      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base">Sentiment trend</h2>
            <p className="text-xs text-brand-slate/60 mt-0.5">
              {view === 'near' ? 'Daily avg · last 14 days' : 'Weekly avg · last 12 weeks'}
            </p>
          </div>
        </div>
        <div className="h-64">
          {(view === 'near' ? stats.daily14 : stats.weekly12).length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={view === 'near' ? stats.daily14 : stats.weekly12}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="day"
                  fontSize={11}
                  stroke="#4A4A4A"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[1, 5]}
                  ticks={[1, 2, 3, 4, 5]}
                  fontSize={11}
                  stroke="#4A4A4A"
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid rgba(0,74,41,0.15)',
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="avg"
                  stroke="#004A29"
                  strokeWidth={2.5}
                  dot={{ fill: '#004A29', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-brand-slate/60">
              Not enough data yet.
            </div>
          )}
        </div>
      </section>

      <DemographicBreakdown sentiment={sentiment} view={view} />

      <section className="space-y-3">
        <h2 className="text-base">Idea queue · ranked by upvotes</h2>
        {queue.length === 0 ? (
          <div className="card text-center text-sm text-brand-slate/60">
            No pending ideas. The queue is clear.
          </div>
        ) : (
          <ul className="space-y-2.5">
            {queue.map((idea) => (
              <li key={idea.id} className="card flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-brand-green">
                      ▲ {idea.upvotes || 0}
                    </span>
                    <h3 className="text-base">{idea.title}</h3>
                  </div>
                  {idea.description && (
                    <p className="mt-1 text-sm text-brand-slate/80">{idea.description}</p>
                  )}
                </div>
                <button onClick={() => setPromoting(idea)} className="btn-primary whitespace-nowrap">
                  <Rocket size={14} />
                  Promote
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {promoting && (
        <PromoteModal
          idea={promoting}
          onClose={() => setPromoting(null)}
          onSubmit={async (payload) => {
            setPromoteError('');
            const batch = writeBatch(db);
            const roadmapRef = doc(collection(db, COLLECTIONS.ROADMAP));
            batch.set(roadmapRef, { featureId: promoting.id, ...payload });
            batch.update(doc(db, COLLECTIONS.FEATURES, promoting.id), { status: 'roadmap' });
            try {
              await withTimeout(batch.commit());
              setPromoting(null);
            } catch (err) {
              console.error(err);
              setPromoteError(err.message || 'Promote failed. Please try again.');
            }
          }}
          error={promoteError}
        />
      )}
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="card">
      <div className="text-[11px] uppercase tracking-wider text-brand-slate/60 font-semibold">
        {label}
      </div>
      <div className="mt-1 text-3xl font-semibold text-brand-green">{value}</div>
    </div>
  );
}

function ScoreCard({ label, score, count, delta, deltaLabel = 'vs. last week' }) {
  const Icon = delta != null && delta > 0.05 ? TrendingUp : delta != null && delta < -0.05 ? TrendingDown : Minus;
  const tone = delta != null && delta > 0.05 ? 'text-brand-leaf' : delta != null && delta < -0.05 ? 'text-red-600' : 'text-brand-slate/60';
  const display = score != null ? score.toFixed(2) : '—';
  return (
    <div className="card">
      <div className="text-[11px] uppercase tracking-wider text-brand-slate/60 font-semibold">
        {label} · {count} {count === 1 ? 'response' : 'responses'}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-3xl font-semibold text-brand-green">{display}</span>
        <span className="text-xs text-brand-slate/60">/ 5.00</span>
      </div>
      <div className={`mt-1 flex items-center gap-1 text-xs font-medium ${tone}`}>
        <Icon size={13} />
        {delta == null
          ? 'No prior period'
          : `${delta >= 0 ? '+' : ''}${delta.toFixed(2)} ${deltaLabel}`}
      </div>
    </div>
  );
}

function nextQuarter(now = new Date()) {
  const q = Math.floor(now.getMonth() / 3) + 1;
  return q === 4
    ? `Q1 ${now.getFullYear() + 1}`
    : `Q${q + 1} ${now.getFullYear()}`;
}

function PromoteModal({ idea, onClose, onSubmit, error }) {
  const [timing, setTiming] = useState(nextQuarter);
  const [businessCase, setBusinessCase] = useState('');
  const [team, setTeam] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onSubmit({ timing, businessCase, team });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-card-hover">
        <div className="flex items-start justify-between p-5 border-b border-brand-green/10">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-brand-green font-semibold">
              Promote to Roadmap
            </span>
            <h2 className="text-base mt-1">{idea.title}</h2>
          </div>
          <button onClick={onClose} className="text-brand-slate/60 hover:text-brand-slate">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <label className="block">
            <span className="block text-xs font-medium text-brand-slate/80 mb-1.5">Timing</span>
            <input
              required
              value={timing}
              onChange={(e) => setTiming(e.target.value)}
              placeholder="e.g. Q3 2026"
              className="input"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-brand-slate/80 mb-1.5">
              Business case
            </span>
            <textarea
              required
              value={businessCase}
              onChange={(e) => setBusinessCase(e.target.value)}
              rows={3}
              placeholder="Why we're doing this and the expected impact…"
              className="input resize-none"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-brand-slate/80 mb-1.5">Feature team</span>
            <input
              required
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              placeholder="e.g. Forecasting Squad"
              className="input"
            />
          </label>
          {error && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={busy}>
              <Rocket size={15} />
              {busy ? 'Promoting…' : 'Add to roadmap'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const BREAKDOWN_DIMS = [
  { key: 'role',     label: 'Role' },
  { key: 'location', label: 'Location' },
  { key: 'bu',       label: 'Business Unit' },
];

function computeSegmentBreakdown(entries, dimension, windowMs) {
  const now = Date.now();

  const withTime = entries
    .map((e) => ({ ...e, ts: e.timestamp?.toMillis?.() }))
    .filter((e) => e.ts);

  const avg = (arr) =>
    arr.length ? arr.reduce((s, e) => s + (e.emoji || 0), 0) / arr.length : null;

  const current = withTime.filter((e) => e.ts >= now - windowMs && e.ts < now);
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
      const curAvg  = avg(cur);
      const priAvg  = avg(pri);
      return {
        name,
        avg:   curAvg,
        count: cur.length,
        delta: curAvg != null && priAvg != null ? curAvg - priAvg : null,
      };
    })
    .sort((a, b) => (a.avg ?? 999) - (b.avg ?? 999)); // lowest sentiment first
}

function DemographicBreakdown({ sentiment, view }) {
  const [dim, setDim] = useState('role');

  const DAY   = 24 * 60 * 60 * 1000;
  const windowMs    = view === 'near' ? 7 * DAY : 30 * DAY;
  const periodLabel = view === 'near' ? 'this week' : 'this month';

  const rows = useMemo(
    () => computeSegmentBreakdown(sentiment, dim, windowMs),
    [sentiment, dim, windowMs],
  );

  const dimLabel = BREAKDOWN_DIMS.find((d) => d.key === dim)?.label ?? dim;

  return (
    <section className="card space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base">Sentiment by segment</h2>
          <p className="text-xs text-brand-slate/60 mt-0.5">
            {periodLabel} · respondents who provided context
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-brand-green/15 bg-white p-0.5">
          {BREAKDOWN_DIMS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setDim(key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                dim === key
                  ? 'bg-brand-green text-white'
                  : 'text-brand-slate hover:text-brand-green'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="text-sm text-brand-slate/60 text-center py-6">
          No {periodLabel} responses with {dimLabel} data.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-green/10 text-[11px] uppercase tracking-wider text-brand-slate/50">
                <th className="text-left pb-2 font-semibold">Segment</th>
                <th className="text-right pb-2 font-semibold px-4">Avg</th>
                <th className="pb-2 px-4" aria-label="Score bar" />
                <th className="text-right pb-2 font-semibold px-4">Responses</th>
                <th className="text-right pb-2 font-semibold pl-4">
                  {view === 'near' ? 'vs. last week' : 'vs. prior month'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-green/5">
              {rows.map((row) => {
                const scoreColor =
                  row.avg >= 4   ? 'text-brand-leaf'
                  : row.avg >= 3 ? 'text-brand-green'
                  : row.avg >= 2 ? 'text-amber-600'
                  :                'text-red-600';
                const Icon =
                  row.delta != null && row.delta >  0.05 ? TrendingUp
                  : row.delta != null && row.delta < -0.05 ? TrendingDown
                  : Minus;
                const tone =
                  row.delta != null && row.delta >  0.05 ? 'text-brand-leaf'
                  : row.delta != null && row.delta < -0.05 ? 'text-red-600'
                  : 'text-brand-slate/50';
                const barPct = ((row.avg - 1) / 4) * 100;

                return (
                  <tr key={row.name}>
                    <td className="py-2.5 font-medium text-brand-slate">{row.name}</td>
                    <td className={`py-2.5 px-4 text-right font-semibold tabular-nums ${scoreColor}`}>
                      {row.avg?.toFixed(2)}
                      <span className="text-brand-slate/40 text-xs font-normal ml-0.5">/5</span>
                    </td>
                    <td className="py-2.5 px-4 w-28">
                      <div className="h-1.5 rounded-full bg-brand-green/10">
                        <div
                          className="h-1.5 rounded-full bg-brand-green/60"
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-right text-brand-slate/70 tabular-nums">
                      {row.count}
                    </td>
                    <td className={`py-2.5 pl-4 text-right ${tone}`}>
                      <span className="inline-flex items-center justify-end gap-1">
                        <Icon size={13} />
                        {row.delta != null
                          ? `${row.delta >= 0 ? '+' : ''}${row.delta.toFixed(2)}`
                          : '—'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

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

  // Weekly comparison
  const thisWeekEntries = inRange(now - WEEK, now);
  const lastWeekEntries = inRange(now - 2 * WEEK, now - WEEK);
  const thisWeek = { avg: avg(thisWeekEntries), count: thisWeekEntries.length };
  const lastWeek = { avg: avg(lastWeekEntries), count: lastWeekEntries.length };
  const delta =
    thisWeek.avg != null && lastWeek.avg != null ? thisWeek.avg - lastWeek.avg : null;

  // Monthly comparison (rolling 30-day windows)
  const thisMonthEntries = inRange(now - MONTH, now);
  const lastMonthEntries = inRange(now - 2 * MONTH, now - MONTH);
  const thisMonth = { avg: avg(thisMonthEntries), count: thisMonthEntries.length };
  const lastMonth = { avg: avg(lastMonthEntries), count: lastMonthEntries.length };
  const monthDelta =
    thisMonth.avg != null && lastMonth.avg != null ? thisMonth.avg - lastMonth.avg : null;

  // 14-day daily buckets
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

  // 12-week weekly buckets
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
    daily14: daily14.some((d) => d.avg != null) ? daily14 : [],
    weekly12: weekly12.some((d) => d.avg != null) ? weekly12 : [],
  };
}
