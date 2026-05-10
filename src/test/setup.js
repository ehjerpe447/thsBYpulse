import '@testing-library/jest-dom';

// Provide a reliable localStorage for jsdom — the default jsdom one
// sometimes has no-op methods depending on the runtime configuration.
let _store = {};
const localStorageMock = {
  getItem:    (k) => _store[k] ?? null,
  setItem:    (k, v) => { _store[k] = String(v); },
  removeItem: (k) => { delete _store[k]; },
  clear:      () => { Object.keys(_store).forEach((k) => delete _store[k]); },
  key:        (i) => Object.keys(_store)[i] ?? null,
  get length() { return Object.keys(_store).length; },
};
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

beforeEach(() => {
  // Reset storage between every test
  Object.keys(_store).forEach((k) => delete _store[k]);
});
