// Deterministic fictional dataset: 180 days x 7 channels. No real data.
export const CHANNELS = [
  { id: 'search',  name: 'Busca paga',      color: '#f2b84b', cpc: 1.9,  ctr: .042, lead: .085, close: .21, aov: 238, spend: 1850, drift: .0012 },
  { id: 'social',  name: 'Meta Ads',        color: '#5eb3f6', cpc: 0.92, ctr: .013, lead: .052, close: .14, aov: 196, spend: 2300, drift: -.0008 },
  { id: 'short',   name: 'Vídeo curto',     color: '#e8738f', cpc: 0.55, ctr: .009, lead: .031, close: .11, aov: 172, spend: 1250, drift: .0021 },
  { id: 'video',   name: 'Vídeo longo',     color: '#b799f5', cpc: 1.35, ctr: .006, lead: .06,  close: .17, aov: 264, spend: 980,  drift: .0004 },
  { id: 'email',   name: 'E-mail / CRM',    color: '#6ee0b5', cpc: 1.7, ctr: .028, lead: .11,  close: .27, aov: 214, spend: 420,  drift: .0006 },
  { id: 'creator', name: 'Criadores',       color: '#f08c4a', cpc: 1.5,  ctr: .018, lead: .06, close: .16, aov: 289, spend: 1400, drift: -.0015 },
  { id: 'affil',   name: 'Afiliados',       color: '#9fb3c8', cpc: 1.1,  ctr: .022, lead: .038, close: .19, aov: 221, spend: 760,  drift: .0003 },
];
export const DAYS = 180;
export const WEEKDAY = [.86, 1.02, 1.08, 1.06, 1.0, .94, .84]; // Sun..Sat

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generate(end = new Date(Date.UTC(2026, 9, 31))) {
  const rows = [];
  CHANNELS.forEach((ch, ci) => {
    const r = rng(1000 + ci * 77);
    for (let d = 0; d < DAYS; d++) {
      const date = new Date(end.getTime() - (DAYS - 1 - d) * 864e5);
      const wd = date.getUTCDay();
      const camp = 1 + .22 * Math.sin((d + ci * 9) / 11) + (r() - .5) * .18;
      const black = date.getUTCMonth() === 10 || (date.getUTCMonth() === 9 && date.getUTCDate() > 24) ? 1.18 : 1;
      const spend = ch.spend / 7 * 1.0 * WEEKDAY[wd] * camp * black * (1 + ch.drift * d) * 1.05;
      const eff = 1 + (r() - .5) * .16 + ch.drift * d * .8;
      const clicks = Math.round(spend / (ch.cpc * (1 + (r() - .5) * .12)));
      const impressions = Math.round(clicks / (ch.ctr * (1 + (r() - .5) * .1)));
      const leads = Math.round(clicks * ch.lead * eff);
      const customers = Math.round(leads * ch.close * eff * (WEEKDAY[wd] ** .5));
      const revenue = Math.round(customers * ch.aov * (1 + (r() - .5) * .14));
      rows.push({ date: date.toISOString().slice(0, 10), ts: date.getTime(), channel: ch.id, spend: Math.round(spend), impressions, clicks, leads, customers, revenue });
    }
  });
  return rows;
}
