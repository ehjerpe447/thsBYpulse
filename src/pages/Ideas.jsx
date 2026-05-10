import { useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { ArrowUp, Plus, Search, TrendingUp, Clock, Sparkles } from 'lucide-react';
import { db, COLLECTIONS, withTimeout } from '../firebase';

const VOTE_KEY = 'tph_voted_ideas_v1';

const loadVotes = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(VOTE_KEY) || '[]'));
  } catch {
    return new Set();
  }
};

const saveVotes = (set) => {
  localStorage.setItem(VOTE_KEY, JSON.stringify([...set]));
};

export default function Ideas() {
  const [ideas, setIdeas] = useState([]);
  const [search, setSearch] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [sortBy, setSortBy] = useState('top');
  const [voted, setVoted] = useState(loadVotes);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, COLLECTIONS.FEATURES),
      orderBy('createdAt', 'desc'),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setIdeas(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, []);

  const matches = useMemo(() => {
    if (!search.trim()) return [];
    const needle = search.trim().toLowerCase();
    return ideas.filter((i) => i.title?.toLowerCase().includes(needle));
  }, [ideas, search]);

  const visible = useMemo(() => {
    const list = [...ideas];
    if (sortBy === 'top') {
      list.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
    } else {
      list.sort((a, b) => {
        const at = a.createdAt?.toMillis?.() || 0;
        const bt = b.createdAt?.toMillis?.() || 0;
        return bt - at;
      });
    }
    return list;
  }, [ideas, sortBy]);

  const exactMatchIdea = useMemo(
    () => ideas.find((i) => i.title?.trim().toLowerCase() === search.trim().toLowerCase()),
    [ideas, search],
  );
  const exactMatch = !!exactMatchIdea;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const title = search.trim();
    if (!title || exactMatch) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      await withTimeout(
        addDoc(collection(db, COLLECTIONS.FEATURES), {
          title,
          description: draftDescription.trim(),
          upvotes: 1,
          status: 'queue',
          createdAt: serverTimestamp(),
        }),
      );
      setSearch('');
      setDraftDescription('');
    } catch (err) {
      console.error(err);
      setSubmitError(err.message || 'Could not submit your idea. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleVote = async (idea) => {
    const hasVoted = voted.has(idea.id);
    const next = new Set(voted);
    if (hasVoted) next.delete(idea.id);
    else next.add(idea.id);
    setVoted(next);
    saveVotes(next);
    try {
      await updateDoc(doc(db, COLLECTIONS.FEATURES, idea.id), {
        upvotes: increment(hasVoted ? -1 : 1),
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-7">
      <header className="space-y-2">
        <span className="chip">Idea Lab</span>
        <h1 className="text-2xl sm:text-3xl">What should we build next?</h1>
        <p className="text-sm text-brand-slate/80 max-w-xl">
          Search to see if your idea already exists — upvote it if so, or submit a new one.
        </p>
      </header>

      <section className="card space-y-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-slate/50"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="e.g. Better demand forecast overrides…"
              className="input pl-10"
            />
          </div>

          {search.trim().length > 1 && exactMatch && exactMatchIdea && (
            <div className="rounded-lg border border-brand-gold/30 bg-brand-gold/5 p-3 space-y-2.5">
              <p className="text-xs font-medium text-brand-gold flex items-center gap-1.5">
                <Sparkles size={13} />
                This idea already exists — upvote it instead of resubmitting.
              </p>
              <div className="flex items-center gap-3 bg-white rounded-lg border border-brand-green/10 px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => toggleVote(exactMatchIdea)}
                  className={`flex flex-col items-center justify-center gap-0.5 rounded-lg border px-2.5 py-1.5 min-w-[48px] transition ${
                    voted.has(exactMatchIdea.id)
                      ? 'border-brand-green bg-brand-green text-white'
                      : 'border-brand-green/20 text-brand-green hover:bg-brand-green/5'
                  }`}
                  aria-pressed={voted.has(exactMatchIdea.id)}
                  aria-label={voted.has(exactMatchIdea.id) ? 'Remove upvote' : 'Upvote'}
                >
                  <ArrowUp size={14} strokeWidth={2.5} />
                  <span className="text-xs font-semibold">{exactMatchIdea.upvotes || 0}</span>
                </button>
                <span className="text-sm font-medium text-brand-green">{exactMatchIdea.title}</span>
              </div>
            </div>
          )}

          {search.trim().length > 1 && !exactMatch && matches.length > 0 && (
            <div className="rounded-lg border border-brand-green/10 bg-brand-green/[0.03] p-3 text-xs text-brand-slate/80">
              <div className="font-medium text-brand-green mb-1.5 flex items-center gap-1.5">
                <Sparkles size={13} /> Similar ideas already exist
              </div>
              <ul className="space-y-1">
                {matches.slice(0, 3).map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">{m.title}</span>
                    <span className="text-brand-green font-medium">{m.upvotes || 0} ▲</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {submitError && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {submitError}
            </div>
          )}

          {search.trim().length > 1 && !exactMatch && (
            <div className="space-y-2">
              <textarea
                value={draftDescription}
                onChange={(e) => setDraftDescription(e.target.value)}
                placeholder="Add a bit of context (optional)…"
                rows={2}
                className="input resize-none"
              />
              <button type="submit" className="btn-primary w-full sm:w-auto" disabled={submitting}>
                <Plus size={16} />
                {submitting ? 'Submitting…' : `Submit "${search.trim().slice(0, 40)}${search.trim().length > 40 ? '…' : ''}"`}
              </button>
            </div>
          )}
        </form>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-slate/70">
            {visible.length} {visible.length === 1 ? 'idea' : 'ideas'} in the queue
          </h2>
          <div className="inline-flex rounded-lg border border-brand-green/15 bg-white p-0.5">
            <SortBtn active={sortBy === 'top'} onClick={() => setSortBy('top')} icon={TrendingUp}>
              Top
            </SortBtn>
            <SortBtn active={sortBy === 'recent'} onClick={() => setSortBy('recent')} icon={Clock}>
              Recent
            </SortBtn>
          </div>
        </div>

        {loading ? (
          <div className="card text-center text-sm text-brand-slate/60">Loading ideas…</div>
        ) : visible.length === 0 ? (
          <div className="card text-center text-sm text-brand-slate/60">
            No ideas yet — be the first to suggest one above.
          </div>
        ) : (
          <ul className="space-y-2.5">
            {visible.map((idea) => (
              <IdeaRow
                key={idea.id}
                idea={idea}
                hasVoted={voted.has(idea.id)}
                onVote={() => toggleVote(idea)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function SortBtn({ active, onClick, icon: Icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
        active ? 'bg-brand-green text-white' : 'text-brand-slate hover:text-brand-green'
      }`}
    >
      <Icon size={13} />
      {children}
    </button>
  );
}

function IdeaRow({ idea, hasVoted, onVote }) {
  return (
    <li className="card flex items-start gap-4 hover:shadow-card-hover">
      <button
        type="button"
        onClick={onVote}
        className={`flex flex-col items-center justify-center gap-0.5 rounded-lg border px-3 py-2 min-w-[58px] transition ${
          hasVoted
            ? 'border-brand-green bg-brand-green text-white'
            : 'border-brand-green/20 text-brand-green hover:bg-brand-green/5'
        }`}
        aria-pressed={hasVoted}
        aria-label={hasVoted ? 'Remove upvote' : 'Upvote'}
      >
        <ArrowUp size={16} strokeWidth={2.5} />
        <span className="text-sm font-semibold">{idea.upvotes || 0}</span>
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-base font-semibold text-brand-green">{idea.title}</h3>
          {idea.status === 'roadmap' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-gold/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-gold">
              On roadmap
            </span>
          )}
        </div>
        {idea.description && (
          <p className="mt-1 text-sm text-brand-slate/80 line-clamp-3">{idea.description}</p>
        )}
      </div>
    </li>
  );
}
