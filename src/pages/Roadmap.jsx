import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { Map, Calendar, Users, Target } from 'lucide-react';
import { db, COLLECTIONS } from '../firebase';

export default function Roadmap() {
  const [items, setItems] = useState([]);
  const [features, setFeatures] = useState({});
  const [loading, setLoading] = useState(true);
  const [featuresReady, setFeaturesReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onError = (err) => {
      console.error(err);
      setError('Could not load roadmap data. Check your Firebase connection.');
      setLoading(false);
      setFeaturesReady(true); // unblock render so the error banner is the only thing shown
    };

    const unsubR = onSnapshot(
      query(collection(db, COLLECTIONS.ROADMAP), orderBy('timing', 'asc')),
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      onError,
    );
    const unsubF = onSnapshot(
      collection(db, COLLECTIONS.FEATURES),
      (snap) => {
        const map = {};
        snap.docs.forEach((d) => { map[d.id] = d.data(); });
        setFeatures(map);
        setFeaturesReady(true);
      },
      onError,
    );
    return () => {
      unsubR();
      unsubF();
    };
  }, []);

  // Show only ideas still in flight — planned or in progress. Shipped
  // ideas move to the Changelog; declined / regressed ones drop off.
  const grouped = useMemo(() => {
    const acc = {};
    items.forEach((item) => {
      const status = features[item.featureId]?.status;
      if (status !== 'planned' && status !== 'in_progress') return;
      const key = item.timing || 'Unscheduled';
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
    });
    return acc;
  }, [items, features]);

  const sortedTimings = useMemo(
    () => Object.keys(grouped).sort((a, b) => a.localeCompare(b)),
    [grouped],
  );

  return (
    <div className="space-y-7">
      <header className="space-y-2">
        <span className="chip">Public Roadmap</span>
        <h1 className="text-2xl sm:text-3xl">What we're building</h1>
        <p className="text-sm text-brand-slate/80 max-w-xl">
          Ideas promoted from the Idea Lab, grouped by planned delivery. Timing is directional — we
          re-prioritize as we learn.
        </p>
      </header>

      {error && (
        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {loading || !featuresReady ? (
        <div className="card text-center text-sm text-brand-slate/60">Loading roadmap…</div>
      ) : sortedTimings.length === 0 ? (
        <div className="card text-center py-12">
          <Map size={28} className="mx-auto text-brand-green/40" />
          <p className="mt-3 text-sm text-brand-slate/70">
            Nothing on the roadmap yet. Promoted ideas will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedTimings.map((timing) => {
            const list = grouped[timing];
            return (
              <section key={timing} className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-green text-white">
                    <Calendar size={14} />
                  </span>
                  <h2 className="text-lg">{timing}</h2>
                  <span className="text-xs text-brand-slate/60">
                    · {list.length} {list.length === 1 ? 'item' : 'items'}
                  </span>
                </div>
                <ul className="space-y-2.5 ml-9 border-l-2 border-brand-green/10 pl-5">
                  {list.map((item) => {
                    const feature = features[item.featureId];
                    return (
                      <li key={item.id} className="card hover:shadow-card-hover">
                        <h3 className="text-base">{feature?.title || 'Untitled feature'}</h3>
                        {feature?.description && (
                          <p className="mt-1 text-sm text-brand-slate/80">{feature.description}</p>
                        )}
                        <dl className="mt-3 grid sm:grid-cols-2 gap-2 text-xs">
                          {item.team && (
                            <Meta icon={Users} label="Team">
                              {item.team}
                            </Meta>
                          )}
                          {item.businessCase && (
                            <Meta icon={Target} label="Business case">
                              {item.businessCase}
                            </Meta>
                          )}
                        </dl>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Meta({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-2 rounded-md bg-brand-green/[0.04] px-2.5 py-1.5">
      <Icon size={13} className="mt-0.5 text-brand-green" />
      <div>
        <dt className="font-semibold text-brand-green/80 uppercase tracking-wide text-[10px]">
          {label}
        </dt>
        <dd className="text-brand-slate">{children}</dd>
      </div>
    </div>
  );
}
