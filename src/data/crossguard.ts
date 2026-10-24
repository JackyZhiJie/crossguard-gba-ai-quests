export interface Crossing {
  id: string;
  name: string;
  zh: string;
  partner: string;
  mode: 'Rail' | 'High-speed rail' | 'Bridge / bus';
  norm: number; // arrivals per minute on a normal evening
  gates: number;
  area: number; // m² of concourse being monitored
}

export const CROSSINGS: Crossing[] = [
  { id: 'lmc', name: 'Lok Ma Chau Spur Line', zh: '落馬洲支線', partner: 'Futian', mode: 'Rail', norm: 140, gates: 24, area: 1600 },
  { id: 'wk', name: 'West Kowloon Station', zh: '西九龍站', partner: 'Mainland port area', mode: 'High-speed rail', norm: 110, gates: 20, area: 1400 },
  { id: 'hzmb', name: 'HZMB Hong Kong Port', zh: '港珠澳大橋香港口岸', partner: 'Zhuhai / Macau', mode: 'Bridge / bus', norm: 90, gates: 16, area: 1200 },
];

export type ScenarioId = 'normal' | 'golden' | 'typhoon' | 'smoke' | 'spoof';

export const SCENARIOS: { id: ScenarioId; name: string; zh: string; text: string }[] = [
  { id: 'normal', name: 'Friday evening', zh: '周五黃昏', text: 'Busy but routine.' },
  { id: 'golden', name: 'Golden Week surge', zh: '黃金周', text: 'Arrivals climb to 1.8× normal over half an hour.' },
  { id: 'typhoon', name: 'After Signal 8', zh: '八號風球除下', text: 'Services resume at once and a backlog floods in.' },
  { id: 'smoke', name: 'Smoke on Platform 2', zh: '月台冒煙', text: 'Smoke detected at minute 25; half the exits close.' },
  { id: 'spoof', name: 'Sensor spoofing', zh: '感應器異常', text: 'One sensor starts reporting impossible densities.' },
];

export interface Factor {
  key: string;
  label: string;
  value: number; // contribution to the 0-100 index
}

export interface Tick {
  t: number;
  arrivals: number;
  throughput: number;
  queue: number;
  density: number; // persons / m², true value
  sensed: number; // persons / m², as reported
  cri: number;
  factors: Factor[];
  smoke: boolean;
}

export interface Interventions {
  extraGates: number;
  slowUntil: number;
  staffBoost: number;
  noticeUntil: number;
  excludeSensor: boolean;
}

export const MANUAL_DENSITY = 3.5; // persons/m² clearly visible as crowding on CCTV
export const ALERT_CRI = 70;

export const NO_INTERVENTIONS: Interventions = { extraGates: 0, slowUntil: -1, staffBoost: 0, noticeUntil: -1, excludeSensor: false };

function surge(s: ScenarioId, t: number): number {
  switch (s) {
    case 'golden':
      return 1 + 0.8 * Math.min(1, Math.max(0, (t - 8) / 30));
    case 'typhoon':
      return t < 10 ? 0.3 : 1 + 1.3 * Math.exp(-(t - 10) / 28);
    default:
      return 1 + 0.06 * Math.sin(t / 7);
  }
}

// Deterministic wobble so every replay of a scenario looks the same.
function noise(t: number): number {
  const x = Math.sin(t * 12.9898) * 43758.5453;
  return (x - Math.floor(x) - 0.5) * 0.12;
}

export function step(prev: Tick | null, t: number, c: Crossing, s: ScenarioId, iv: Interventions): Tick {
  const smoke = s === 'smoke' && t >= 25;
  const pulse = c.mode === 'Bridge / bus' ? 1 : 1 + 0.25 * Math.max(0, Math.cos((t * 2 * Math.PI) / 6));
  let arrivals = c.norm * surge(s, t) * pulse * (1 + noise(t));
  if (t <= iv.slowUntil) arrivals *= 0.78;
  if (t <= iv.noticeUntil) arrivals *= 0.94;

  const exitFactor = smoke ? 0.5 : 1;
  const perGate = 6.2 * (1 + iv.staffBoost);
  const throughput = (c.gates + iv.extraGates) * perGate * exitFactor;
  const queue = Math.max(0, (prev?.queue ?? c.norm * 2) + arrivals - throughput);
  const density = Math.min(7, queue / c.area + 0.6);
  const spoofed = s === 'spoof' && t >= 20 && !iv.excludeSensor;
  const sensed = spoofed ? Math.min(7, density + 4.5 + noise(t) * 4) : density;

  const ratio = arrivals / c.norm;
  const trend = prev ? sensed - prev.sensed : 0;
  const projected = Math.max(sensed, sensed + trend * 10);
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const factors: Factor[] = [
    { key: 'density', label: `Concourse density ${sensed.toFixed(1)}/m²`, value: 36 * clamp((sensed - 0.6) / 3.4) },
    { key: 'arrivals', label: `Arrivals ${ratio >= 1 ? '+' : ''}${Math.round((ratio - 1) * 100)}% vs norm`, value: 24 * clamp((ratio - 0.95) / 0.7) },
    { key: 'forecast', label: `Forecast ${projected.toFixed(1)}/m² in 10 min`, value: 20 * clamp((projected - 1.2) / 2.8) },
    { key: 'exits', label: smoke ? 'Exits C & D closed (smoke)' : 'All exits open', value: smoke ? 14 : 0 },
    { key: 'smoke', label: smoke ? 'Smoke detector P2 active' : 'No smoke detected', value: smoke ? 16 : 0 },
  ];
  const cri = Math.round(Math.min(100, 6 + factors.reduce((a, f) => a + f.value, 0)));
  return { t, arrivals, throughput, queue, density, sensed, cri, factors, smoke };
}

export interface Recommendation {
  id: string;
  t: number;
  kind: 'gates' | 'slow' | 'staff' | 'notice' | 'verify' | 'firemode';
  text: string;
  why: string;
  inScope: boolean;
}

export function recommend(tick: Tick, c: Crossing, s: ScenarioId, iv: Interventions, already: Set<string>): Recommendation[] {
  const out: Recommendation[] = [];
  const top = [...tick.factors].sort((a, b) => b.value - a.value)[0];
  const add = (kind: Recommendation['kind'], text: string, inScope = true) => {
    if (already.has(kind)) return;
    out.push({ id: `${kind}-${tick.t}`, t: tick.t, kind, text, why: `Risk ${tick.cri}: ${top.label.toLowerCase()}`, inScope });
  };
  if (s === 'spoof' && tick.t >= 20 && !iv.excludeSensor && tick.sensed - tick.density > 2) {
    add('verify', 'Sensor HZ-07 disagrees with its 3 neighbours. Verify on CCTV before acting.');
    return out;
  }
  if (tick.cri >= 60) add('notice', `Publish trilingual queue notice: “Expect delays at ${c.name}”.`);
  if (tick.cri >= 65 && iv.extraGates === 0) add('gates', 'Open 4 extra e-gates and redeploy 6 staff from departures.');
  if (tick.cri >= 72) add('slow', `Ask ${c.partner} to slow releases by about 20% for 10 minutes.`);
  if (tick.cri >= 78) add('staff', 'Call in the standby team to boost gate processing.');
  if (tick.smoke) add('firemode', 'Override fire shutters to reopen Exit C.', false);
  return out;
}

export function counterfactual(c: Crossing, s: ScenarioId, minutes = 120): { ticks: Tick[]; aiAt: number | null; manualAt: number | null } {
  const ticks: Tick[] = [];
  let prev: Tick | null = null;
  for (let t = 0; t <= minutes; t++) {
    prev = step(prev, t, c, s, NO_INTERVENTIONS);
    ticks.push(prev);
  }
  const aiAt = ticks.find((k) => k.cri >= ALERT_CRI)?.t ?? null;
  const manualAt = ticks.find((k) => k.density >= MANUAL_DENSITY)?.t ?? null;
  return { ticks, aiAt, manualAt };
}
