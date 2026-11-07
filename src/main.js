import * as Plot from '@observablehq/plot';
import { CHANNELS, generate } from './data.js';
import { aggregate, groupBy, splitPeriods, delta } from './metrics.js';

const ALL = generate();
const CH = Object.fromEntries(CHANNELS.map((c) => [c.id, c]));
const state = { days: 30, on: new Set(CHANNELS.map((c) => c.id)), sort: 'revenue', dir: -1 };
const $ = (id) => document.getElementById(id);
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const brl2 = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
const num = new Intl.NumberFormat('pt-BR');
const x2 = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '×';
const pct = (v, d = 1) => (v * 100).toLocaleString('pt-BR', { maximumFractionDigits: d }) + '%';
const fmtDay = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' });
const WD = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const INK = '#9aa5b6';
const base = { style: { background: 'transparent', color: INK, fontSize: '12px' }, marginLeft: 46 };

const width = (el) => Math.max(260, Math.floor(el.clientWidth));
const rowsOn = () => ALL.filter((r) => state.on.has(r.channel));
const current = () => splitPeriods(rowsOn(), state.days).cur;

function chips() {
  $('chips').innerHTML = CHANNELS.map((c) => `<button class="chip" style="--c:${c.color}" data-id="${c.id}" aria-pressed="${state.on.has(c.id)}"><i></i>${c.name}</button>`).join('');
}

function spark(vals, color) {
  const w = 120, h = 30, mx = Math.max(...vals), mn = Math.min(...vals);
  const pts = vals.map((v, i) => `${(i / (vals.length - 1) * w).toFixed(1)},${(h - 3 - ((v - mn) / (mx - mn || 1)) * (h - 6)).toFixed(1)}`).join(' ');
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.8" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>`;
}

function buckets(rows, key, n = 10) {
  const days = [...new Set(rows.map((r) => r.ts))].sort((a, b) => a - b);
  const size = Math.ceil(days.length / n), out = [];
  for (let i = 0; i < days.length; i += size) {
    const set = new Set(days.slice(i, i + size));
    out.push(aggregate(rows.filter((r) => set.has(r.ts)))[key]);
  }
  return out;
}

function kpis() {
  const { cur, prev } = splitPeriods(rowsOn(), state.days);
  const a = aggregate(cur), b = aggregate(prev);
  const defs = [
    ['Receita', brl.format(a.revenue), delta(a.revenue, b.revenue), 1, 'revenue', '#f2b84b'],
    ['Investimento', brl.format(a.spend), delta(a.spend, b.spend), 0, 'spend', '#5eb3f6'],
    ['ROAS', x2(a.roas), delta(a.roas, b.roas), 1, 'roas', '#6ee0b5'],
    ['CAC', brl2.format(a.cac), delta(a.cac, b.cac), -1, 'cac', '#e8738f'],
    ['Novos clientes', num.format(a.customers), delta(a.customers, b.customers), 1, 'customers', '#b799f5'],
  ];
  $('kpis').innerHTML = defs.map(([l, v, d, good, k, col]) => {
    const cls = good === 0 ? 'flat' : d * good >= 0 ? 'up' : 'down';
    return `<div class="kpi"><span>${l}</span><strong>${v}</strong><em class="${cls}">${d >= 0 ? '▲' : '▼'} ${pct(Math.abs(d))} <small>vs. anterior</small></em>${spark(buckets(cur, k), col)}</div>`;
  }).join('');
}

function daily(rows) {
  return [...groupBy(rows, 'ts')].map(([ts, rs]) => ({ date: new Date(ts), ...aggregate(rs) })).sort((a, b) => a.date - b.date);
}

function trend() {
  const d = daily(current()), el = $('trend'), w = width(el);
  const ma = (k) => Plot.windowY(7, { x: 'date', y: k });
  el.replaceChildren(Plot.plot({
    ...base, width: w, height: w < 500 ? 250 : 320, marginBottom: 28,
    x: { type: 'utc', label: null, ticks: w < 500 ? 4 : 8, tickFormat: (t) => fmtDay.format(t) },
    y: { label: null, grid: true, tickFormat: (v) => compact.format(v) },
    marks: [
      Plot.areaY(d, { ...ma('revenue'), fill: 'url(#g)' }),
      Plot.lineY(d, { x: 'date', y: 'revenue', stroke: '#f2b84b', strokeOpacity: 0.22 }),
      Plot.lineY(d, { ...ma('revenue'), stroke: '#f2b84b', strokeWidth: 2.4 }),
      Plot.lineY(d, { ...ma('spend'), stroke: '#5eb3f6', strokeWidth: 2.2 }),
      Plot.ruleX(d, Plot.pointerX({ x: 'date', stroke: INK, strokeDasharray: '3 3' })),
      Plot.dot(d, Plot.pointerX({ x: 'date', y: 'revenue', fill: '#f2b84b', r: 4, stroke: '#0b0e13' })),
      Plot.dot(d, Plot.pointerX({ x: 'date', y: 'spend', fill: '#5eb3f6', r: 4, stroke: '#0b0e13' })),
      Plot.tip(d, Plot.pointerX({ x: 'date', y: 'revenue', anchor: 'bottom', title: (r) => `${fmtDay.format(r.date)}\nReceita ${brl.format(r.revenue)}\nInvest. ${brl.format(r.spend)}\nROAS ${x2(r.roas)}` })),
    ],
  }));
  el.querySelector('svg').insertAdjacentHTML('afterbegin', '<defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#f2b84b" stop-opacity=".30"/><stop offset="1" stop-color="#f2b84b" stop-opacity="0"/></linearGradient></defs>');
}

function perChannel() {
  return [...groupBy(current(), 'channel')].map(([id, rs]) => ({ id, name: CH[id].name, color: CH[id].color, ...aggregate(rs) }));
}

function bubble() {
  const d = perChannel(), el = $('bubble'), w = width(el);
  const avg = aggregate(current());
  el.replaceChildren(Plot.plot({
    ...base, width: w, height: w < 500 ? 300 : 340, marginBottom: 40, marginRight: 24, marginTop: 28,
    x: { label: 'CAC (R$) →', grid: true, nice: true, tickFormat: (v) => 'R$' + v },
    y: { label: '↑ ROAS', grid: true, nice: true, tickFormat: (v) => v + '×' },
    r: { range: [6, w < 500 ? 20 : 28] },
    marks: [
      Plot.ruleY([avg.roas], { stroke: INK, strokeOpacity: 0.4, strokeDasharray: '4 4' }),
      Plot.text([`média ${x2(avg.roas)}`], { frameAnchor: 'top-right', dy: -2, fill: INK, fontSize: 11 }),
      Plot.dot(d, { x: 'cac', y: 'roas', r: 'spend', fill: 'color', fillOpacity: 0.8, stroke: '#0b0e13', strokeWidth: 1.5, channels: { Canal: 'name' }, tip: { format: { x: (v) => brl2.format(v), y: x2, r: (v) => brl.format(v), fill: false, Canal: true } }, title: (r) => `${r.name}\nROAS ${x2(r.roas)}\nCAC ${brl2.format(r.cac)}\nInvest. ${brl.format(r.spend)}` }),
      Plot.text(d, { x: 'cac', y: 'roas', text: 'name', dy: -22, fill: '#e9edf3', fontSize: 11.5, stroke: '#121720', strokeWidth: 3, paintOrder: 'stroke' }),
    ],
  }));
}

function mix() {
  const cur = current(), el = $('mix'), w = width(el);
  const t0 = Math.min(...cur.map((r) => r.ts));
  const rows = cur.map((r) => ({ w: Math.floor((r.ts - t0) / (7 * 864e5)), name: CH[r.channel].name, spend: r.spend }));
  const order = CHANNELS.map((c) => c.name);
  el.replaceChildren(Plot.plot({
    ...base, width: w, height: w < 500 ? 300 : 340, marginBottom: 30,
    x: { label: null, tickFormat: (i) => 'S' + (i + 1), padding: 0.22 },
    y: { label: null, grid: true, tickFormat: (v) => compact.format(v) },
    color: { domain: order, range: CHANNELS.map((c) => c.color) },
    marks: [
      Plot.barY(rows, Plot.groupX({ y: 'sum' }, { x: 'w', y: 'spend', fill: 'name', order, rx: 2, tip: { format: { x: (i) => 'Semana ' + (i + 1), y: (v) => brl.format(v), fill: true } } })),
      Plot.ruleY([0]),
    ],
  }));
}

function table() {
  const d = perChannel().sort((a, b) => (a[state.sort] > b[state.sort] ? 1 : -1) * state.dir);
  const tot = aggregate(current());
  const cols = [['name', 'Canal'], ['spend', 'Investimento'], ['revenue', 'Receita'], ['roas', 'ROAS'], ['cac', 'CAC'], ['cpc', 'CPC'], ['cvr', 'Conversão'], ['customers', 'Clientes']];
  const best = Math.max(...d.map((r) => r.roas)), worst = Math.min(...d.map((r) => r.roas));
  $('table').innerHTML = `<thead><tr>${cols.map(([k, l]) => `<th scope="col"${state.sort === k ? ` aria-sort="${state.dir > 0 ? 'ascending' : 'descending'}"` : ''}><button data-k="${k}">${l}${state.sort === k ? (state.dir > 0 ? ' ↑' : ' ↓') : ''}</button></th>`).join('')}</tr></thead>
  <tbody>${d.map((r) => `<tr><td><span class="nm" style="--c:${r.color}"><i></i>${r.name}</span></td>
  <td>${brl.format(r.spend)}<span class="bar" style="--c:${r.color}"><b style="width:${(r.spend / tot.spend * 100).toFixed(1)}%"></b></span></td>
  <td>${brl.format(r.revenue)}</td>
  <td><span class="pill ${d.length > 1 && r.roas === best ? 'up' : d.length > 1 && r.roas === worst ? 'down' : ''}">${x2(r.roas)}</span></td>
  <td>${brl2.format(r.cac)}</td><td>${brl2.format(r.cpc)}</td><td>${pct(r.cvr, 2)}</td><td>${num.format(r.customers)}</td></tr>`).join('')}</tbody>
  <tfoot><tr><td><b>Total</b></td><td>${brl.format(tot.spend)}</td><td>${brl.format(tot.revenue)}</td><td>${x2(tot.roas)}</td><td>${brl2.format(tot.cac)}</td><td>${brl2.format(tot.cpc)}</td><td>${pct(tot.cvr, 2)}</td><td>${num.format(tot.customers)}</td></tr></tfoot>`;
}

function funnel() {
  const a = aggregate(current());
  const steps = [['Impressões', a.impressions], ['Cliques', a.clicks], ['Leads', a.leads], ['Clientes', a.customers]];
  const w = (v) => Math.max(14, Math.sqrt(v / a.impressions) * 100); // sqrt scale keeps the small steps visible
  $('funnel').innerHTML = steps.map(([l, v], i) => `${i ? `<div class="frate">↓ <b>${pct(v / steps[i - 1][1], 2)}</b> viram ${l.toLowerCase()}</div>` : ''}<div class="fbar" style="width:${w(v).toFixed(1)}%;opacity:${1 - i * 0.13}">${l}<span>${num.format(v)}</span></div>`).join('');
}

function heat() {
  const cur = current(), el = $('heat'), w = width(el);
  const cells = [];
  for (const [id, rs] of groupBy(cur, 'channel')) {
    for (const [wd, r2] of groupBy(rs.map((r) => ({ ...r, wd: new Date(r.ts).getUTCDay() })), 'wd')) cells.push({ name: CH[id].name, wd: WD[wd], roas: aggregate(r2).roas });
  }
  const names = CHANNELS.map((c) => c.name).filter((n) => cells.some((c) => c.name === n));
  el.replaceChildren(Plot.plot({
    ...base, width: w, height: 44 + names.length * 34, marginLeft: w < 500 ? 84 : 104, marginTop: 24,
    x: { domain: WD, label: null, axis: 'top', padding: 0.08 }, y: { label: null, domain: names, padding: 0.08 },
    color: { type: 'linear', range: ['#2a2f3b', '#f2b84b'], legend: false },
    marks: [
      Plot.cell(cells, { x: 'wd', y: 'name', fill: 'roas', rx: 5, tip: { format: { fill: x2, x: true, y: true } } }),
      Plot.text(cells, { x: 'wd', y: 'name', text: (c) => c.roas.toFixed(1).replace('.', ','), fill: '#0b0e13', fontSize: 11, fontWeight: 600, pointerEvents: 'none' }),
    ],
  }));
}

const charts = () => { trend(); bubble(); mix(); heat(); };
const draw = () => { kpis(); charts(); table(); funnel(); };

$('period').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  state.days = +b.dataset.d;
  $('period').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b));
  draw();
});
$('chips').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  const id = b.dataset.id;
  if (state.on.has(id)) { if (state.on.size === 1) return; state.on.delete(id); } else state.on.add(id);
  b.setAttribute('aria-pressed', state.on.has(id));
  draw();
});
$('table').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  state.dir = state.sort === b.dataset.k ? -state.dir : -1; state.sort = b.dataset.k; table();
});
let lastW = 0, t;
new ResizeObserver(() => { if (document.body.clientWidth === lastW) return; lastW = document.body.clientWidth; clearTimeout(t); t = setTimeout(charts, 120); }).observe(document.body);
chips(); draw();
