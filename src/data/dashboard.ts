import type { Region } from './regimes';

// Simulated 12-week pilot projection. Shown on the dashboard with a clear "simulated" label.
export const WEEKS = Array.from({ length: 12 }, (_, i) => `W${i + 1}`);

function series(start: number, growth: number, wobble: number, seed: number): number[] {
  return WEEKS.map((_, i) => {
    const w = Math.sin((i + 1) * seed) * wobble;
    return Math.round(start * Math.pow(1 + growth, i) + w);
  });
}

export const ACTIVE_LEARNERS: Record<Region, number[]> = {
  HK: series(420, 0.14, 40, 1.7),
  MO: series(110, 0.16, 14, 2.3),
  CN: series(260, 0.17, 30, 0.9),
};

export const POINTS_MINTED = series(52000, 0.12, 4000, 1.3);
export const POINTS_REDEEMED = POINTS_MINTED.map((m, i) => Math.round(m * (0.28 + i * 0.035)));

export const STARS = series(2100, 0.11, 120, 2.9).map((_v, i, a) => a.slice(0, i + 1).reduce((x, y) => x + y, 0));

export const FUNNEL: Record<Region, [number, number, number, number]> = {
  HK: [2650, 1890, 410, 74],
  MO: [720, 540, 120, 22],
  CN: [1450, 1010, 260, 50],
};
export const FUNNEL_STAGES = ['Registered', 'Finished a course', 'Shared a project', 'Project adopted'];

export const TRUST_BINS = [
  { range: '0–39', count: 9 },
  { range: '40–49', count: 14 },
  { range: '50–59', count: 23 },
  { range: '60–69', count: 37 },
  { range: '70–79', count: 41 },
  { range: '80–89', count: 18 },
  { range: '90–100', count: 4 },
];

export const COURSES_DONE: Record<Region, number> = { HK: 6120, MO: 1580, CN: 3560 };
export const TOKENS_ISSUED_M: Record<Region, number> = { HK: 168, MO: 41, CN: 103 };
export const ORGS_ADOPTING: Record<Region, number> = { HK: 12, MO: 4, CN: 7 };

export const FUNDING_SOURCES = [
  { source: 'CrossGuard site licences', share: 0.38 },
  { source: 'Sponsor model credits', share: 0.27 },
  { source: 'Government innovation grants', share: 0.22 },
  { source: 'Enterprise audit services', share: 0.13 },
];
