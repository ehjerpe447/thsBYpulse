/**
 * Minimal RFC 4180 CSV serialization. Pure — no DOM, fully testable.
 */

// Escape one field: wrap in double quotes if it contains a comma, quote,
// or newline, and double any embedded quotes. null/undefined → empty.
function escapeField(value) {
  if (value == null) return '';
  const s = String(value);
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
