import { describe, it, expect } from 'vitest';
import { aggregate, splitPeriods, delta, groupBy } from '../src/metrics.js';
import { generate, CHANNELS, DAYS } from '../src/data.js';

const row = (o) => ({ spend: 0, revenue: 0, impressions: 0, clicks: 0, leads: 0, customers: 0, ...o });

describe('aggregate', () => {
  it('computes ROAS and CAC', () => {
    const a = aggregate([row({ spend: 100, revenue: 450, customers: 5 }), row({ spend: 100, revenue: 150, customers: 5 })]);
    expect(a.roas).toBe(3);
    expect(a.cac).toBe(20);
  });
  it('never divides by zero', () => {
    const a = aggregate([row({})]);
    expect(a.roas).toBe(0);
    expect(a.cac).toBe(0);
  });
});

describe('periods', () => {
  const rows = generate();
  it('splits equal windows', () => {
    const { cur, prev } = splitPeriods(rows, 30);
    expect(cur.length).toBe(30 * CHANNELS.length);
    expect(prev.length).toBe(30 * CHANNELS.length);
  });
  it('delta is relative', () => expect(delta(120, 100)).toBeCloseTo(0.2));
});

describe('dataset', () => {
  const rows = generate();
  it('is deterministic', () => expect(generate()).toEqual(rows));
  it('has full coverage', () => expect(rows.length).toBe(DAYS * CHANNELS.length));
  it('is plausible: every channel has positive ROAS between 0.5 and 8', () => {
    for (const [, rs] of groupBy(rows, 'channel')) {
      const { roas } = aggregate(rs);
      expect(roas).toBeGreaterThan(0.5);
      expect(roas).toBeLessThan(8);
    }
  });
});
