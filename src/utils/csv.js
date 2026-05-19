/**
 * Minimal RFC 4180 CSV serialization. Pure — no DOM, fully testable.
 */

// Characters that spreadsheet apps treat as the start of a formula.
const FORMULA_LEAD = /^[=+\-@\t\r]/;

// Escape one field for CSV:
//  1. Formula-injection guard — a value beginning with a formula character
//     is prefixed with a single quote so Excel/Sheets treat it as text, not
//     an executable macro.
//  2. RFC 4180 — wrap in double quotes if it contains a comma, quote, or
//     newline, doubling any embedded quotes. null/undefined → empty.
function escapeField(value) {
  if (value == null) return '';
  let s = String(value);
  if (FORMULA_LEAD.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Serialize an array of row objects to a CSV string (CRLF-separated).
 *
 * `columns` is an array of { label, key?, get? }:
 *   - `label` — the header cell text
 *   - `key`   — read row[key] for the cell value
 *   - `get`   — optional (row) => value, takes precedence over `key`
 */
export function toCsv(rows, columns) {
  const cell = (row, col) => escapeField(col.get ? col.get(row) : row[col.key]);
  const header = columns.map((c) => escapeField(c.label)).join(',');
  const lines = rows.map((row) => columns.map((c) => cell(row, c)).join(','));
  return [header, ...lines].join('\r\n');
}
