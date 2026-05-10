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
        <button onClick={() => signOut(auth)} className="btn-ghost">
          <LogOut size={15} />
          Sign out
        </button>
      </header>

      {snapshotError && (
        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {snapshotError}
        </div>
      )}

      <section className="grid sm:grid-cols-3 gap-3">
        <ScoreCard
          label="This week"
          score={stats.thisWeek.avg}
          count={stats.thisWeek.count}
          delta={stats.delta}
        />
        <MetricCard label="Total responses" value={sentiment.length} />
        <MetricCard label="Ideas in queue" value={queue.length} />
      </section>

      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base">Sentiment trend (last 14 days)</h2>
          <span className="text-xs text-brand-slate/60">avg score, daily</span>
        </div>
        <div className="h-64">
          {stats.daily.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.daily}>
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

function ScoreCard({ label, score, count, delta }) {
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
          ? 'No prior week'
          : `${delta >= 0 ? '+' : ''}${delta.toFixed(2)} vs. last week`}
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

function computeSentimentStats(entries) {
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const WEEK = 7 * DAY;

  const withTime = entries
    .map((e) => ({ ...e, ts: e.timestamp?.toMillis?.() }))
    .filter((e) => e.ts);

  const inRange = (start, end) =>
    withTime.filter((e) => e.ts >= start && e.ts < end);

  const thisWeekEntries = inRange(now - WEEK, now);
  const lastWeekEntries = inRange(now - 2 * WEEK, now - WEEK);

  const avg = (arr) =>
    arr.length ? arr.reduce((s, e) => s + (e.emoji || 0), 0) / arr.length : null;

  const thisWeek = { avg: avg(thisWeekEntries), count: thisWeekEntries.length };
  const lastWeek = { avg: avg(lastWeekEntries), count: lastWeekEntries.length };
  const delta =
    thisWeek.avg != null && lastWeek.avg != null ? thisWeek.avg - lastWeek.avg : null;

  const daily = [];
  for (let i = 13; i >= 0; i--) {
    const start = now - (i + 1) * DAY;
    const end = now - i * DAY;
    const day = inRange(start, end);
    const date = new Date(end - DAY / 2);
    daily.push({
      day: `${date.getMonth() + 1}/${date.getDate()}`,
      avg: avg(day),
      count: day.length,
    });
  }
  const hasData = daily.some((d) => d.avg != null);

  return { thisWeek, lastWeek, delta, daily: hasData ? daily : [] };
}
