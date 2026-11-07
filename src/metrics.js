export const sum = (rows, k) => rows.reduce((s, r) => s + r[k], 0);
const div = (a, b) => (b > 0 ? a / b : 0);

export function aggregate(rows) {
  const spend = sum(rows, 'spend'), revenue = sum(rows, 'revenue');
  const impressions = sum(rows, 'impressions'), clicks = sum(rows, 'clicks');
  const leads = sum(rows, 'leads'), customers = sum(rows, 'customers');
  return {
    spend, revenue, impressions, clicks, leads, customers,
    roas: div(revenue, spend), cac: div(spend, customers),
    cpc: div(spend, clicks), ctr: div(clicks, impressions),
    cvr: div(customers, clicks), aov: div(revenue, customers),
    cpl: div(spend, leads),
  };
}

export function groupBy(rows, key) {
  const m = new Map();
  for (const r of rows) (m.get(r[key]) ?? m.set(r[key], []).get(r[key])).push(r);
  return m;
}

/** Last `days` days of `rows` and the `days` before them (for deltas). */
export function splitPeriods(rows, days) {
  const max = Math.max(...rows.map((r) => r.ts));
  const cut = max - (days - 1) * 864e5, prevCut = cut - days * 864e5;
  return {
    cur: rows.filter((r) => r.ts >= cut),
    prev: rows.filter((r) => r.ts >= prevCut && r.ts < cut),
  };
}

export const delta = (cur, prev) => (prev ? (cur - prev) / prev : 0);
