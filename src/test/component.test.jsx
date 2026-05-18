/**
 * Component tests: C1–C17
 * vi.mock calls are hoisted before imports — Firebase mocks live here, not in setup.js.
 */

// ── Firebase mocks ────────────────────────────────────────────────────────────

vi.mock('../firebase', () => ({
  db:   {},
  auth: {},
  COLLECTIONS: {
    SENTIMENT: 'sentiment_entries',
    FEATURES:  'feature_requests',
    ROADMAP:   'roadmap_items',
  },
  MODULES:        ['Demand', 'ESP', 'Other'],
  ROLES:          ['Leader', 'Demand Planner', 'Other'],
  BUSINESS_UNITS: ['Coffee+Creamer', 'BS&C'],
  LOCATIONS:      ['Oak Brook, IL', 'Remote'],
  TEAM_SIZE:      80,
  IDEA_STATUSES: [
    { value: 'under_review', label: 'Under Review', badge: 'bg-brand-slate/10 text-brand-slate' },
    { value: 'planned',      label: 'Planned',      badge: 'bg-brand-gold/15 text-brand-gold' },
    { value: 'in_progress',  label: 'In Progress',  badge: 'bg-blue-100 text-blue-700' },
    { value: 'shipped',      label: 'Shipped',      badge: 'bg-brand-leaf/25 text-brand-green' },
    { value: 'declined',     label: 'Declined',     badge: 'bg-red-100 text-red-700' },
  ],
  withTimeout:    vi.fn((p) => p),
}));

vi.mock('firebase/firestore', () => ({
  collection:      vi.fn(() => ({})),
  doc:             vi.fn(() => ({})),
  query:           vi.fn((ref) => ref),
  orderBy:         vi.fn(),
  onSnapshot:      vi.fn(),
  addDoc:          vi.fn(),
  updateDoc:       vi.fn(),
  increment:       vi.fn((n) => n),
  serverTimestamp: vi.fn(() => null),
  writeBatch:      vi.fn(() => ({
    set:    vi.fn(),
    update: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged:         vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut:                    vi.fn().mockResolvedValue(undefined),
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { onSnapshot, addDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import Pulse from '../pages/Pulse';
import Ideas from '../pages/Ideas';
import Admin from '../pages/Admin';

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeSnap = (docs) => ({
  docs: docs.map((data, i) => ({
    id:   `doc-${i}`,
    data: () => data,
  })),
});

const unsub = vi.fn();

// ─────────────────────────────────────────────────────────────────────────────
// Pulse — C1–C6
// ─────────────────────────────────────────────────────────────────────────────

describe('Pulse', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    addDoc.mockResolvedValue({ id: 'new-entry' });
  });

  test('C1 — renders 5 emoji buttons with aria-pressed', () => {
    render(<Pulse />);
    const emojiBtns = screen
      .getAllByRole('button')
      .filter((b) => b.hasAttribute('aria-pressed'));
    expect(emojiBtns).toHaveLength(5);
  });

  test('C2 — clicking emoji marks it pressed', async () => {
    const user = userEvent.setup();
    render(<Pulse />);
    const btn = screen.getByRole('button', { name: /frustrated/i });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    await user.click(btn);
    expect(btn).toHaveAttribute('aria-pressed', 'true');
  });

  test('C3 — submit calls addDoc with the selected emoji value', async () => {
    const user = userEvent.setup();
    render(<Pulse />);
    await user.click(screen.getByRole('button', { name: /positive/i }));
    await user.click(screen.getByRole('button', { name: /submit pulse/i }));
    await waitFor(() => expect(addDoc).toHaveBeenCalledTimes(1));
    expect(addDoc.mock.calls[0][1].emoji).toBe(4);
  });

  test('C3b — submit includes the selected module', async () => {
    const user = userEvent.setup();
    render(<Pulse />);
    await user.click(screen.getByRole('button', { name: /positive/i }));
    await user.selectOptions(screen.getByLabelText(/module/i), 'ESP');
    await user.click(screen.getByRole('button', { name: /submit pulse/i }));
    await waitFor(() => expect(addDoc).toHaveBeenCalledTimes(1));
    expect(addDoc.mock.calls[0][1].module).toBe('ESP');
  });

  test('C3c — submit includes the comment text', async () => {
    const user = userEvent.setup();
    render(<Pulse />);
    await user.click(screen.getByRole('button', { name: /positive/i }));
    await user.type(
      screen.getByPlaceholderText(/driving your rating/i),
      'ESP is too slow to load',
    );
    await user.click(screen.getByRole('button', { name: /submit pulse/i }));
    await waitFor(() => expect(addDoc).toHaveBeenCalledTimes(1));
    expect(addDoc.mock.calls[0][1].comment).toBe('ESP is too slow to load');
  });

  test('C4 — submit success shows thank-you banner', async () => {
    const user = userEvent.setup();
    render(<Pulse />);
    await user.click(screen.getByRole('button', { name: /neutral/i }));
    await user.click(screen.getByRole('button', { name: /submit pulse/i }));
    await waitFor(() =>
      expect(screen.getByText(/your pulse is recorded/i)).toBeInTheDocument(),
    );
  });

  test('C5 — submit error shows error banner', async () => {
    addDoc.mockRejectedValueOnce(new Error('Network error'));
    const user = userEvent.setup();
    render(<Pulse />);
    await user.click(screen.getByRole('button', { name: /energized/i }));
    await user.click(screen.getByRole('button', { name: /submit pulse/i }));
    await waitFor(() =>
      expect(screen.getByText(/could not submit/i)).toBeInTheDocument(),
    );
  });

  test('C6 — submit button is disabled while submitting', async () => {
    addDoc.mockReturnValueOnce(new Promise(() => {})); // never resolves
    const user = userEvent.setup();
    render(<Pulse />);
    await user.click(screen.getByRole('button', { name: /concerned/i }));
    await user.click(screen.getByRole('button', { name: /submit pulse/i }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /submitting/i })).toBeDisabled(),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Ideas — C7–C14
// ─────────────────────────────────────────────────────────────────────────────

describe('Ideas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    addDoc.mockResolvedValue({ id: 'new-idea' });
    updateDoc.mockResolvedValue(undefined);
    onSnapshot.mockImplementation((q, successCb) => {
      successCb(makeSnap([]));
      return unsub;
    });
  });

  test('C7 — renders heading and search input', () => {
    render(<Ideas />);
    expect(
      screen.getByRole('heading', { name: /what should we improve or build next/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/better demand forecast/i),
    ).toBeInTheDocument();
  });

  test('C8 — empty search shows no suggestion panels', () => {
    render(<Ideas />);
    expect(screen.queryByText(/similar ideas already exist/i)).not.toBeInTheDocument();
    // The amber duplicate panel (not the static description paragraph)
    expect(screen.queryByText(/upvote it instead of resubmitting/i)).not.toBeInTheDocument();
  });

  test('C9 — novel search (> 1 char, no match) shows submit button', async () => {
    const user = userEvent.setup();
    render(<Ideas />);
    await user.type(
      screen.getByPlaceholderText(/better demand forecast/i),
      'My brand new idea',
    );
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });

  test('C10 — exact title match shows amber duplicate warning', async () => {
    onSnapshot.mockImplementation((q, successCb) => {
      successCb(makeSnap([{ title: 'Better forecasting', upvotes: 5, status: 'queue' }]));
      return unsub;
    });
    const user = userEvent.setup();
    render(<Ideas />);
    await user.type(
      screen.getByPlaceholderText(/better demand forecast/i),
      'Better forecasting',
    );
    await waitFor(() =>
      expect(screen.getByText(/upvote it instead of resubmitting/i)).toBeInTheDocument(),
    );
  });

  test('C11 — partial match shows similar ideas panel', async () => {
    onSnapshot.mockImplementation((q, successCb) => {
      successCb(
        makeSnap([{ title: 'Demand forecasting improvements', upvotes: 3, status: 'queue' }]),
      );
      return unsub;
    });
    const user = userEvent.setup();
    render(<Ideas />);
    await user.type(
      screen.getByPlaceholderText(/better demand forecast/i),
      'demand',
    );
    await waitFor(() =>
      expect(screen.getByText(/similar ideas/i)).toBeInTheDocument(),
    );
  });

  test('C12 — submitting a new idea calls addDoc with correct data', async () => {
    const user = userEvent.setup();
    render(<Ideas />);
    await user.type(
      screen.getByPlaceholderText(/better demand forecast/i),
      'Totally new idea',
    );
    await user.click(screen.getByRole('button', { name: /submit/i }));
    await waitFor(() => expect(addDoc).toHaveBeenCalledTimes(1));
    expect(addDoc.mock.calls[0][1]).toMatchObject({
      title:  'Totally new idea',
      status: 'under_review',
    });
  });

  test('C12b — submitting an idea includes the selected module', async () => {
    const user = userEvent.setup();
    render(<Ideas />);
    await user.type(
      screen.getByPlaceholderText(/better demand forecast/i),
      'A brand new idea',
    );
    await user.selectOptions(screen.getByRole('combobox'), 'ESP');
    await user.click(screen.getByRole('button', { name: /submit/i }));
    await waitFor(() => expect(addDoc).toHaveBeenCalledTimes(1));
    expect(addDoc.mock.calls[0][1].module).toBe('ESP');
  });

  test('C18 — declined ideas are routed to a separate reviewed section', async () => {
    onSnapshot.mockImplementation((q, cb) => {
      cb(makeSnap([
        { title: 'Active idea',  upvotes: 3, status: 'under_review' },
        { title: 'Rejected one', upvotes: 1, status: 'declined', declineReason: 'Out of scope' },
      ]));
      return unsub;
    });
    render(<Ideas />);
    await waitFor(() => screen.getByText('Active idea'));
    expect(screen.getByText(/not planned \(1\)/i)).toBeInTheDocument();
  });

  test('C13 — upvoting an idea calls updateDoc', async () => {
    onSnapshot.mockImplementation((q, successCb) => {
      successCb(makeSnap([{ title: 'Some idea', upvotes: 2, status: 'queue' }]));
      return unsub;
    });
    const user = userEvent.setup();
    render(<Ideas />);
    await waitFor(() => screen.getByText('Some idea'));
    await user.click(screen.getByRole('button', { name: /upvote/i }));
    await waitFor(() => expect(updateDoc).toHaveBeenCalledTimes(1));
  });

  test('C14 — voted ID is persisted to localStorage after upvote', async () => {
    onSnapshot.mockImplementation((q, successCb) => {
      successCb(makeSnap([{ title: 'Persist test', upvotes: 1, status: 'queue' }]));
      return unsub;
    });
    const user = userEvent.setup();
    render(<Ideas />);
    await waitFor(() => screen.getByText('Persist test'));
    await user.click(screen.getByRole('button', { name: /upvote/i }));
    const stored = JSON.parse(
      localStorage.getItem('tph_voted_ideas_v1') || '[]',
    );
    expect(stored).toContain('doc-0');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Admin — Login — C15–C17
// ─────────────────────────────────────────────────────────────────────────────

describe('Admin / Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onAuthStateChanged.mockImplementation((auth, cb) => {
      cb(null); // unauthenticated
      return vi.fn();
    });
    signInWithEmailAndPassword.mockResolvedValue({
      user: { email: 'admin@test.com' },
    });
  });

  test('C15 — renders login form when unauthenticated', async () => {
    render(<Admin />);
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: /product team console/i }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  test('C16 — login calls signInWithEmailAndPassword with form values', async () => {
    const user = userEvent.setup();
    render(<Admin />);
    await waitFor(() => screen.getByLabelText(/email/i));
    await user.type(screen.getByLabelText(/email/i), 'admin@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() =>
      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'admin@example.com',
        'password123',
      ),
    );
  });

  test('C17 — failed login shows error message', async () => {
    signInWithEmailAndPassword.mockRejectedValueOnce(
      new Error('Firebase: Wrong password.'),
    );
    const user = userEvent.setup();
    render(<Admin />);
    await waitFor(() => screen.getByLabelText(/email/i));
    await user.type(screen.getByLabelText(/email/i), 'admin@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() =>
      expect(screen.getByText(/wrong password/i)).toBeInTheDocument(),
    );
  });
});
