import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { Rocket, CheckCircle2 } from 'lucide-react';
import { db, COLLECTIONS } from '../firebase';

export default function Changelog() {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, COLLECTIONS.FEATURES),
      (snap) => {
        setIdeas(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError('Could not load the changelog. Check your Firebase connection.');
        setLoading(false);
      },
    );
    return unsub;
  }, []);

  const shipped = useMemo(
    () =>
      ideas
        .filter((i) => i.status === 'shipped')
        .sort((a, b) => (b.shippedAt?.toMillis?.() || 0) - (a.shippedAt?.toMillis?.() || 0)),
    [ideas],
  );

  return (
    <div className="space-y-7">
      <header className="space-y-2">
        <span className="chip">Changelog</span>
        <h1 className="text-2xl sm:text-3xl">What we've shipped</h1>
        <p className="text-sm text-brand-slate/80 max-w-xl">
          Ideas from the Idea Lab that have been delivered — most recent first.
        </p>
      </header>

      {error && (
        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {loading ? (
        <div className="card text-center text-sm text-brand-slate/60">Loading changelog…</div>
      ) : shipped.length === 0 ? (
        <div className="card text-center py-12">
          <Rocket size={28} className="mx-auto text-brand-green/40" />
          <p className="mt-3 text-sm text-brand-slate/70">
            Nothing shipped yet. Delivered ideas will appear here.
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {shipped.map((idea) => (
            <li key={idea.id} className="card hover:shadow-card-hover">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-semibold text-brand-green">{idea.title}</h3>
                {idea.module && (
                  <span className="inline-flex items-center rounded-full bg-brand-green/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-green">
                    {idea.module}
                  </span>
                )}
              </div>
              {idea.description && (
                <p className="mt-1 text-sm text-brand-slate/80">{idea.description}</p>
              )}
              {idea.shippedAt?.toMillis && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-brand-slate/60">
                  <CheckCircle2 size={12} className="text-brand-leaf" />
                  Shipped{' '}
                  {new Date(idea.shippedAt.toMillis()).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
