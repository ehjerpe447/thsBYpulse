import { useEffect, useState } from 'react';
import { ChevronDown, Lock, Send, CheckCircle2, Sparkles, MessageSquare } from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, COLLECTIONS, MODULES, ROLES, BUSINESS_UNITS, LOCATIONS, withTimeout } from '../firebase';

const SCALE = [
  { value: 1, emoji: '😞', label: 'Frustrated' },
  { value: 2, emoji: '😕', label: 'Concerned' },
  { value: 3, emoji: '😐', label: 'Neutral' },
  { value: 4, emoji: '🙂', label: 'Positive' },
  { value: 5, emoji: '😄', label: 'Energized' },
];

// Best-effort once-per-calendar-day throttle. localStorage-based, so any
// determined user could clear it or use incognito — this stops casual
// double-submissions only. Server-side enforcement would require App Check
// or anonymous auth + per-user records.
const PULSE_KEY = 'tph_last_pulse_date_v1';

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const hasPulsedToday = () => {
  try { return localStorage.getItem(PULSE_KEY) === todayKey(); }
  catch { return false; }
};

const markPulsedToday = () => {
  try { localStorage.setItem(PULSE_KEY, todayKey()); }
  catch { /* localStorage unavailable — throttle is best-effort */ }
};

export default function Pulse() {
  const [selected, setSelected] = useState(null);
  const [showContext, setShowContext] = useState(false);
  const [selectedModule, setSelectedModule] = useState('');
  const [role, setRole] = useState('');
  const [location, setLocation] = useState('');
  const [bu, setBu] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [alreadyPulsed, setAlreadyPulsed] = useState(hasPulsedToday);

  useEffect(() => {
    if (!submitted) return;
    const t = setTimeout(() => setSubmitted(false), 5000);
    return () => clearTimeout(t);
  }, [submitted]);

  const handleSelect = (value) => {
    if (alreadyPulsed) return;
    setSelected(value);
    setShowContext(true);
    setSubmitted(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selected || alreadyPulsed) return;
    setSubmitting(true);
    setError('');
    try {
      await withTimeout(
        addDoc(collection(db, COLLECTIONS.SENTIMENT), {
          emoji: selected,
          module: selectedModule || null,
          role: role || null,
          location: location || null,
          bu: bu || null,
          comment: comment.trim() || null,
          timestamp: serverTimestamp(),
        }),
      );
      markPulsedToday();
      setAlreadyPulsed(true);
      setSubmitted(true);
      setShowContext(false);
      setSelected(null);
      setSelectedModule('');
      setRole('');
      setLocation('');
      setBu('');
      setComment('');
    } catch (err) {
      setError('Could not submit your pulse. Please try again.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <span className="chip">Daily Pulse</span>
        <h1 className="text-2xl sm:text-3xl">How are you feeling about planning with Blue Yonder today?</h1>
        <p className="text-sm text-brand-slate/80 max-w-xl">
          A quick sentiment check helps us see where the planning ecosystem is supporting you —
          and where it isn't. Tap an emoji to share your read.
        </p>
      </header>

      <section className="card">
        {alreadyPulsed && !submitted && (
          <div className="mb-5 flex items-center gap-2 rounded-lg bg-brand-green/5 border border-brand-green/15 px-4 py-3 text-sm text-brand-green">
            <CheckCircle2 size={18} />
            You've already shared your pulse today — see you tomorrow.
          </div>
        )}

        <div className={`grid grid-cols-5 gap-2 sm:gap-3 ${alreadyPulsed ? 'opacity-50 pointer-events-none' : ''}`}>
          {SCALE.map(({ value, emoji, label }) => {
            const isActive = selected === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => handleSelect(value)}
                disabled={alreadyPulsed}
                className={`group flex flex-col items-center gap-2 rounded-lg border px-2 py-4 sm:py-5 transition ${
                  isActive
                    ? 'border-brand-green bg-brand-green/5 shadow-card-hover'
                    : 'border-brand-green/10 hover:border-brand-green/40 hover:bg-brand-green/[0.03]'
                }`}
                aria-pressed={isActive}
                aria-label={`${label} (${value} of 5)`}
              >
                <span className="text-3xl sm:text-4xl transition group-hover:scale-110">
                  {emoji}
                </span>
                <span
                  className={`text-[11px] sm:text-xs font-medium uppercase tracking-wide ${
                    isActive ? 'text-brand-green' : 'text-brand-slate/70'
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        <div
          className={`grid transition-all duration-300 ease-out ${
            showContext ? 'grid-rows-[1fr] opacity-100 mt-6' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden">
            <form onSubmit={handleSubmit} className="space-y-5 border-t border-brand-green/10 pt-5">
              {/* Tier 1 — Recommended context */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-brand-green" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-brand-green">
                    Recommended context
                  </span>
                </div>
                <p className="text-xs text-brand-slate/70">
                  Which module is your read mostly about? Helps us route feedback to the right team.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Field label="Module">
                    <select
                      value={selectedModule}
                      onChange={(e) => setSelectedModule(e.target.value)}
                      className="input appearance-none"
                    >
                      <option value="">Select a module…</option>
                      {MODULES.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>

              {/* Tier 2 — Optional context */}
              <div className="space-y-2.5 border-t border-brand-green/10 pt-4">
                <div className="flex items-center gap-2">
                  <ChevronDown size={14} className="text-brand-green" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-brand-slate/70">
                    Optional context
                  </span>
                </div>
                <p className="text-xs text-brand-slate/70">
                  Helps us spot patterns by team.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Field label="Role">
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="input appearance-none"
                    >
                      <option value="">Skip</option>
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Growth Unit">
                    <select
                      value={bu}
                      onChange={(e) => setBu(e.target.value)}
                      className="input appearance-none"
                    >
                      <option value="">Skip</option>
                      {BUSINESS_UNITS.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Location">
                    <select
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="input appearance-none"
                    >
                      <option value="">Skip</option>
                      {LOCATIONS.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>

              {/* Comment */}
              <div className="space-y-2.5 border-t border-brand-green/10 pt-4">
                <div className="flex items-center gap-2">
                  <MessageSquare size={14} className="text-brand-green" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-brand-slate/70">
                    Anything to add?
                  </span>
                </div>
                <p className="text-xs text-brand-slate/70">
                  Optional — a sentence on what's working or what isn't. Please don't
                  include names or details that could identify you.
                </p>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="What's driving your rating today?"
                  className="input resize-none"
                />
                <div className="text-right text-[11px] text-brand-slate/50">
                  {comment.length}/500
                </div>
              </div>

              {error && (
                <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <p className="flex items-center gap-1.5 text-xs text-brand-slate/70">
                  <Lock size={12} />
                  Your feedback is anonymous and helps improve our planning ecosystem.
                </p>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  <Send size={15} />
                  {submitting ? 'Submitting…' : 'Submit pulse'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {submitted && (
          <div className="mt-5 flex items-center gap-2 rounded-lg bg-brand-leaf/10 border border-brand-leaf/30 px-4 py-3 text-sm text-brand-green">
            <CheckCircle2 size={18} />
            Thanks — your pulse is recorded. Come back tomorrow.
          </div>
        )}
      </section>

      <section className="grid sm:grid-cols-3 gap-3 text-sm">
        <Stat label="Why we ask" body="Track sentiment over time to surface friction early." />
        <Stat label="What we share" body="Aggregated trends only. Never individual responses." />
        <Stat label="Who sees it" body="The planning product team uses it to prioritize work." />
      </section>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-brand-slate/80 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function Stat({ label, body }) {
  return (
    <div className="rounded-lg border border-brand-green/10 bg-white/60 p-4">
      <div className="text-[11px] uppercase tracking-wider text-brand-green font-semibold">
        {label}
      </div>
      <div className="mt-1 text-brand-slate/80">{body}</div>
    </div>
  );
}
