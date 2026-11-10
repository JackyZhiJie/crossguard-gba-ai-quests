// CrossGuard Operator Console. The crowd model, scenarios and recommendations are imported from the game's
// src/data/crossguard.ts, so the console and GBA AI Quests always compute the same Crowd Risk Index.
import './console.css';
import {
  ALERT_CRI,
  CROSSINGS as MODEL_CROSSINGS,
  NO_INTERVENTIONS,
  SCENARIOS as MODEL_SCENARIOS,
  counterfactual,
  recommend as modelRecommend,
  step,
  type Crossing,
  type Interventions,
  type Recommendation,
  type ScenarioId,
  type Tick,
} from '../../src/data/crossguard';

// Console-only details for each crossing: Simplified Chinese name, partner side and the monitored zone.
const META: Record<string, { zhs: string; partnerSide: string; zone: string }> = {
  lmc: { zhs: '落马洲支线', partnerSide: 'Shenzhen side (Futian)', zone: 'B2 concourse' },
  wk: { zhs: '西九龙站', partnerSide: 'Mainland port area', zone: 'B3 departures hall' },
  hzmb: { zhs: '港珠澳大桥香港口岸', partnerSide: 'Zhuhai and Macau side', zone: 'Arrivals hall' },
};
type ConsoleCrossing = Crossing & { zhs: string; partnerSide: string; zone: string };
const CROSSINGS: ConsoleCrossing[] = MODEL_CROSSINGS.map((c) => ({ ...c, ...META[c.id] }));
// Scenario order in the console's menu.
const SCENARIOS = (['golden', 'typhoon', 'smoke', 'spoof', 'normal'] as ScenarioId[]).map((id) => MODEL_SCENARIOS.find((s) => s.id === id)!);
const MINUTES = 120;
const NONE = (): Interventions => ({ ...NO_INTERVENTIONS });

type Rec = Recommendation & { cri: number };
type Decision = 'approved' | 'rejected' | 'blocked';
interface LogEntry { time: string; decidedAt: string; risk: number; recommendation: string; reason: string; decision: Decision; decidedBy: string }

function recommend(tick: Tick, c: Crossing, s: ScenarioId, iv: Interventions, already: Set<string>): Rec[] {
  return modelRecommend(tick, c, s, iv, already).map((r) => ({ ...r, cri: tick.cri }));
}
function baseline(c: Crossing, s: ScenarioId) {
  return counterfactual(c, s, MINUTES);
}

// ---------- state ----------
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
interface State {
  c: ConsoleCrossing; s: ScenarioId; ticks: Tick[]; iv: Interventions; pending: Rec[]; handled: Set<string>; log: LogEntry[];
  playing: boolean; speed: number; base: ReturnType<typeof baseline>; blocked: number; rid: number;
}
const S: State = { c: CROSSINGS[0], s: 'golden', ticks: [], iv: NONE(), pending: [], handled: new Set(), log: [], playing: true, speed: 1, base: baseline(CROSSINGS[0], 'golden'), blocked: 0, rid: 0 };
const clock = (t: number) => { const m = 17 * 60 + t; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
const esc = (x: unknown) => String(x).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch as '&' | '<' | '>' | '"']);

function reset(prerun?: number) {
  S.rid = (S.rid || 0) + 1;
  S.ticks = []; S.iv = NONE(); S.pending = []; S.handled = new Set(); S.log = []; S.blocked = 0;
  S.base = baseline(S.c, S.s);
  const stopAt = prerun ?? 0;
  advance();
  while (S.ticks.length - 1 < stopAt) advance();
  render();
}

function advance() {
  const t = S.ticks.length;
  if (t > MINUTES) { S.playing = false; return; }
  const prev = S.ticks[t - 1] ?? null;
  const tick = step(prev, t, S.c, S.s, S.iv);
  S.ticks.push(tick);
  const kinds = new Set([...S.handled, ...S.pending.map((p) => p.kind)]);
  for (const r of recommend(tick, S.c, S.s, S.iv, kinds)) S.pending.push(r);
}

function decide(id: string, decision: Decision) {
  const i = S.pending.findIndex((p) => p.id === id);
  if (i < 0) return;
  const r = S.pending[i];
  const now = S.ticks.length - 1;
  if (decision === 'approved') {
    if (r.kind === 'notice') S.iv.noticeUntil = now + 20;
    if (r.kind === 'gates') S.iv.extraGates = 4;
    if (r.kind === 'slow') S.iv.slowUntil = now + 10;
    if (r.kind === 'staff') S.iv.staffBoost = 0.15;
    if (r.kind === 'verify') S.iv.excludeSensor = true;
  }
  if (decision === 'blocked') S.blocked++;
  S.pending.splice(i, 1);
  S.handled.add(r.kind);
  S.log.unshift({ time: clock(r.t), decidedAt: clock(now), risk: r.cri, recommendation: r.text, reason: r.why, decision, decidedBy: decision === 'blocked' ? 'Design limit' : 'Duty operator' });
  render();
}

// ---------- rendering ----------
function level(cri: number): [string, string] { return cri >= ALERT_CRI ? ['lvl-crit', 'Act now'] : cri >= 50 ? ['lvl-warn', 'Watch'] : ['lvl-ok', 'Normal']; }

function render() {
  const k = S.ticks[S.ticks.length - 1];
  $('clock').textContent = clock(k.t);
  $('zoneName').textContent = `${S.c.zh} · ${S.c.zone}`;
  $('criNum').textContent = String(k.cri);
  const [cls, txt] = level(k.cri);
  for (const el of [$('criNum'), $('band'), $('meter')]) { el.classList.remove('lvl-ok', 'lvl-warn', 'lvl-crit'); el.classList.add(cls); }
  $('bandText').textContent = txt;
  $('meterFill').style.width = `${k.cri}%`;
  const fs = [...k.factors].sort((a, b) => b.value - a.value);
  $('factors').innerHTML = fs.map((f) => `<li class="${f.value < 0.5 ? 'zero' : ''}"><span>${esc(f.label)}</span><span class="tnum">+${Math.round(f.value)}</span><span class="bar"><b style="width:${Math.min(100, f.value / 36 * 100)}%"></b></span></li>`).join('');
  $('kvArr').textContent = String(Math.round(k.arrivals));
  $('kvThr').textContent = String(Math.round(k.throughput));
  $('kvQ').textContent = Math.round(k.queue).toLocaleString('en-GB');
  $('scenarioText').textContent = SCENARIOS.find((x) => x.id === S.s)!.text;
  drawChart();
  renderLead();
  renderRecs();
  renderNotice();
  renderBoundary(k);
  renderControls();
  renderLog();
  const play = $<HTMLButtonElement>('play');
  play.textContent = S.ticks.length > MINUTES ? 'Finished' : S.playing ? 'Pause' : 'Play';
  play.disabled = S.ticks.length > MINUTES;
}

function drawChart() {
  const W = 720, H = 300, L = 38, R = 26, T = 14, B = 34;
  const x = (t: number) => L + (t / MINUTES) * (W - L - R);
  const y = (v: number) => T + (1 - v / 100) * (H - T - B);
  const css = getComputedStyle(document.documentElement);
  const col = (n: string) => css.getPropertyValue(n).trim();
  const mono = 'JetBrains Mono, monospace';
  let g = '';
  for (const v of [0, 25, 50, 75, 100]) g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="${col('--line')}" stroke-width="1"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="${col('--muted')}" font-family="${mono}">${v}</text>`;
  for (let t = 0; t <= MINUTES; t += 20) g += `<text x="${x(t)}" y="${H - 12}" text-anchor="middle" font-size="11" fill="${col('--muted')}" font-family="${mono}">${clock(t)}</text>`;
  g += `<rect x="${L}" y="${y(100)}" width="${W - L - R}" height="${y(ALERT_CRI) - y(100)}" fill="${col('--crit')}" opacity="0.07"/>`;
  g += `<line x1="${L}" x2="${W - R}" y1="${y(ALERT_CRI)}" y2="${y(ALERT_CRI)}" stroke="${col('--crit')}" stroke-width="1" stroke-dasharray="2 4"/>`;
  g += `<text x="${W - R}" y="${y(ALERT_CRI) - 5}" text-anchor="end" font-size="11" fill="${col('--crit-text')}" font-family="${mono}">alert 70</text>`;
  const b = S.base;
  const path = (ts: Tick[]) => ts.map((k, i) => `${i ? 'L' : 'M'}${x(k.t).toFixed(1)},${y(k.cri).toFixed(1)}`).join('');
  g += `<path d="${path(b.ticks)}" fill="none" stroke="${col('--muted')}" stroke-width="1.5" stroke-dasharray="5 4"/>`;
  if (b.aiAt != null) g += `<line x1="${x(b.aiAt)}" x2="${x(b.aiAt)}" y1="${T}" y2="${H - B}" stroke="${col('--warn')}" stroke-width="2"/>`;
  if (b.manualAt != null) g += `<line x1="${x(b.manualAt)}" x2="${x(b.manualAt)}" y1="${T}" y2="${H - B}" stroke="${col('--crit')}" stroke-width="2" stroke-dasharray="4 3"/>`;
  const live = S.ticks;
  const area = path(live) + `L${x(live[live.length - 1].t).toFixed(1)},${y(0)}L${x(0)},${y(0)}Z`;
  g += `<path d="${area}" fill="${col('--accent')}" opacity="0.12"/>`;
  g += `<path d="${path(live)}" fill="none" stroke="${col('--accent')}" stroke-width="2.5" stroke-linejoin="round"/>`;
  const last = live[live.length - 1];
  g += `<circle cx="${x(last.t)}" cy="${y(last.cri)}" r="5" fill="${col('--accent')}" stroke="${col('--panel')}" stroke-width="2"/>`;
  for (const e of S.log.filter((l) => l.decision === 'approved')) {
    const m = toMin(e.decidedAt);
    g += `<circle cx="${x(m)}" cy="${y(4)}" r="4" fill="${col('--ok')}"/>`;
  }
  $('chart').innerHTML = g;
}
function toMin(hhmm: string) { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m - 17 * 60; }

function renderLead() {
  const b = S.base;
  if (S.s === 'spoof') { $('lead').innerHTML = `<span class="small">A spoofed sensor pushes the score past 70 at ${clock(b.aiAt ?? 20)} while the real crowd stays normal. CrossGuard flags the disagreement and asks the operator to verify before anyone acts.</span>`; return; }
  if (b.aiAt == null || b.manualAt == null) { $('lead').innerHTML = `<span class="small">No alert in this scenario: the crowd never reaches the alert level, so CrossGuard stays quiet.</span>`; return; }
  $('lead').innerHTML = `<strong>${b.manualAt - b.aiAt} min</strong><span>earlier than a person watching screens would see it</span><span class="small mono">alert ${clock(b.aiAt)} · visible on CCTV ${clock(b.manualAt)} · if nobody acts</span>`;
}

function renderRecs() {
  if (!S.pending.length) { $('recs').innerHTML = `<div class="empty">No recommendation waiting. CrossGuard suggests actions once the risk passes 60; none run without a person's approval.</div>`; return; }
  $('recs').innerHTML = S.pending.map((r) => `
    <div class="rec ${r.inScope ? '' : 'blocked'}">
      <div class="rec-meta"><span class="mono">${clock(r.t)}</span><span>Risk ${r.cri}</span></div>
      <p>${esc(r.text)}</p>
      <div class="why">${esc(r.why)}</div>
      ${r.inScope
        ? `<div class="rec-actions"><button class="btn primary" type="button" data-id="${r.id}" data-d="approved">Approve</button><button class="btn" type="button" data-id="${r.id}" data-d="rejected">Reject</button></div>`
        : `<div class="limit">Outside CrossGuard's scope: it may never control fire or life-safety systems. Fire mode stays with the fire engineering logic.</div><div class="rec-actions"><button class="btn" type="button" disabled>Approve</button><button class="btn" type="button" data-id="${r.id}" data-d="blocked">Dismiss and log</button></div>`}
    </div>`).join('');
}

function renderNotice() {
  const pending = S.pending.find((p) => p.kind === 'notice');
  const done = !pending && S.log.some((l) => l.recommendation.startsWith('Publish'));
  const el = $('notice');
  if (!pending && !done) { el.hidden = true; return; }
  el.hidden = false;
  const c = S.c;
  el.innerHTML = `<span class="tag">AI-GENERATED DRAFT · 人工智能生成 — ${done ? 'decision logged' : 'needs operator approval'}</span>
    <p>Expect delays at ${esc(c.name)}. Please follow staff directions and use all open e-gates.</p>
    <p lang="zh-Hant">${esc(c.zh)}現正人多，請聽從職員指示，使用所有開放的電子閘口。</p>
    <p lang="zh-Hans">${esc(c.zhs)}现正人多，请听从职员指示，使用所有开放的电子闸口。</p>
    <span class="small">Template-bound wording; the model only fills in the place name.</span>`;
}

function renderBoundary(k: Tick) {
  $('sideA').textContent = `${S.c.name} (Hong Kong side)`;
  $('sideB').textContent = S.c.partnerSide;
  $('bFrames').textContent = ((k.t + 1) * 60 * 25 * 48).toLocaleString('en-GB');
  const u = Math.floor(k.t / 15);
  $('bUpdates').textContent = `${u} update${u === 1 ? '' : 's'}`;
}

function renderControls() {
  const decided = S.log.filter((l) => l.decision !== 'blocked').length;
  const items: [string, string, string][] = [
    ['Data localisation', 'PIPL · Macau PDPA', '0 frames or IDs left the site'],
    ['Human oversight', 'Hong Kong AI principles', `${decided} decision${decided === 1 ? '' : 's'} by a person · 0 automatic actions`],
    ['Explanation', 'Mainland algorithm rules', 'Every recommendation shows its reason'],
    ['Life-safety limit', 'All three regimes', S.blocked ? `${S.blocked} fire-mode request${S.blocked === 1 ? '' : 's'} blocked` : 'No fire or life-safety control'],
    ['AI content label', 'Mainland labelling rules', 'Notices marked as AI-generated'],
  ];
  $('ctrls').innerHTML = items.map(([n, by, ev]) => `<div class="ctrl"><span class="pill">Met</span><b>${n}</b><span>${by}</span><span>${ev}</span></div>`).join('');
}

function renderLog() {
  if (!S.log.length) { $('log').innerHTML = `<tr><td colspan="5" class="small">Every recommendation and the operator's decision will appear here.</td></tr>`; return; }
  $('log').innerHTML = S.log.map((l) => `<tr><td class="mono">${l.time}</td><td class="tnum">${l.risk}</td><td>${esc(l.recommendation)}</td><td>${esc(l.reason)}</td><td class="dec-${l.decision}">${l.decision === 'blocked' ? 'Blocked by design' : l.decision[0].toUpperCase() + l.decision.slice(1)} · ${l.decidedAt}</td></tr>`).join('');
}

// ---------- controls ----------
$('crossing').innerHTML = CROSSINGS.map((c) => `<option value="${c.id}">${c.name} · ${c.zh}</option>`).join('');
$('scenario').innerHTML = SCENARIOS.map((s) => `<option value="${s.id}">${s.name}</option>`).join('');
$<HTMLSelectElement>('crossing').addEventListener('change', (e) => { S.c = CROSSINGS.find((c) => c.id === (e.target as HTMLSelectElement).value)!; S.playing = true; reset(0); });
$<HTMLSelectElement>('scenario').addEventListener('change', (e) => { S.s = (e.target as HTMLSelectElement).value as ScenarioId; S.playing = true; reset(0); });
$('play').addEventListener('click', () => { S.playing = !S.playing; render(); });
$('reset').addEventListener('click', () => { S.playing = true; reset(0); });
$('speed').addEventListener('click', () => { S.speed = S.speed === 1 ? 4 : 1; $('speed').textContent = `Speed ×${S.speed}`; });
$('recs').addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-id]'); if (b) decide(b.dataset.id!, b.dataset.d as Decision); });
$('copyLog').addEventListener('click', () => {
  const json = JSON.stringify({ crossing: S.c.name, scenario: S.s, simulated: true, entries: S.log }, null, 2);
  const fb = () => { const ta = $<HTMLTextAreaElement>('copyFallback'); ta.hidden = false; ta.value = json; ta.select(); $('copyMsg').textContent = 'Select and copy the text below.'; };
  try { navigator.clipboard.writeText(json).then(() => { $('copyMsg').textContent = `Copied ${S.log.length} entries.`; }, fb); } catch { fb(); }
});

function loop() {
  if (S.playing && S.ticks.length <= MINUTES) {
    for (let i = 0; i < S.speed; i++) advance();
    render();
  }
}
setInterval(loop, 600);

// Open in a working state: Golden Week at Lok Ma Chau, just after CrossGuard's first alert.
reset(41);
const first = S.pending.find((p) => p.kind === 'notice');
if (first) decide(first.id, 'approved');
while (S.ticks.length - 1 < 48) advance();
S.playing = false;
render();

// ---------- camera view: animated anonymous crowd, driven by the same simulation ----------
interface Person { x: number; y: number; vx: number; vy: number; lane: number; out: boolean; sp: number; ph: number; n: number }
interface CamStatus { k: Tick | undefined; open: boolean[]; smoke: boolean; spoof: boolean; staff: boolean; notice: boolean; slow: boolean; target: number }

const Crowd = (() => {
  const W = 720, H = 300, GATE_X = 580, TOP = 34, BOT = H - 22, LANES = 10, CELL = 12;
  const cv = $<HTMLCanvasElement>('crowd'), ctx = cv.getContext('2d')!;
  const cssv = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const laneY = (i: number) => TOP + 14 + i * ((BOT - TOP - 28) / (LANES - 1));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sans = 'Nunito, Arial, sans-serif';
  let people: Person[] = [];
  const laneClock: number[] = new Array(LANES).fill(0);
  let last = performance.now(), key = '';
  const status = (): CamStatus => {
    const k = S.ticks[S.ticks.length - 1];
    const smoke = !!(k && k.smoke);
    const open: boolean[] = [];
    for (let i = 0; i < LANES; i++) open.push(!(i >= 8 && !S.iv.extraGates) && !(smoke && i < 4));
    return { k, open, smoke, spoof: S.s === 'spoof' && !!k && k.t >= 20, staff: S.iv.staffBoost > 0,
      notice: !!k && k.t <= S.iv.noticeUntil, slow: !!k && k.t <= S.iv.slowUntil,
      target: k ? Math.min(520, Math.round(k.density * 70)) : 40 };
  };
  const pickLane = (st: CamStatus) => {
    const open = st.open.map((o, i) => (o ? i : -1)).filter((i) => i >= 0);
    const load = open.map((i) => people.filter((p) => p.lane === i && !p.out).length + Math.random() * 3);
    return open[load.indexOf(Math.min(...load))];
  };
  const spawn = (st: CamStatus, anywhere: boolean) => {
    people.push({ x: anywhere ? GATE_X - 20 - (GATE_X - 60) * Math.random() ** 1.6 : 8 + Math.random() * 10,
      y: TOP + 8 + Math.random() * (BOT - TOP - 16), vx: 0, vy: 0, lane: pickLane(st), out: false, sp: 34 + Math.random() * 16, ph: Math.random() * 6.28, n: 0 });
  };
  function physics(dt: number, st: CamStatus) {
    const inside = people.filter((p) => !p.out).length;
    const gap = st.target - inside;
    if (gap > 0) { const n = Math.min(gap, Math.ceil(gap * dt * 1.5 + dt * 6 * (st.slow ? 0.6 : 1))); for (let i = 0; i < n; i++) spawn(st, false); }
    const per = (st.staff ? 1.25 : 1) * (inside > st.target ? 3.2 : inside > st.target * 0.85 ? 1.1 : 0.25);
    for (let i = 0; i < LANES; i++) laneClock[i] = st.open[i] ? Math.min(1.5, laneClock[i] + dt * per) : 0;
    for (const p of people) if (!p.out && !st.open[p.lane]) p.lane = pickLane(st);
    const grid = new Map<string, Person[]>();
    for (const p of people) { if (p.out) continue; const kk = ((p.x / CELL) | 0) + ',' + ((p.y / CELL) | 0); if (!grid.has(kk)) grid.set(kk, []); grid.get(kk)!.push(p); }
    for (const p of people) {
      if (p.out) { p.x += 70 * dt; p.y += (laneY(p.lane) - p.y) * dt * 3; continue; }
      const gx = GATE_X - 7, gy = laneY(p.lane);
      const dx = gx - p.x, dy = (gy - p.y) * (p.x > GATE_X - 130 ? 1 : 0.35), d = Math.hypot(dx, dy) || 1;
      let fx = (dx / d) * p.sp, fy = (dy / d) * p.sp + Math.sin((p.ph += dt * 3)) * 4;
      let n = 0; const cx = (p.x / CELL) | 0, cy = (p.y / CELL) | 0;
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const q of grid.get((cx + a) + ',' + (cy + b)) || []) {
        if (q === p) continue; const ex = p.x - q.x, ey = p.y - q.y, r = Math.hypot(ex, ey);
        if (r < 13) n++;
        if (r < 7.5 && r > 0.01) { const push = (7.5 - r) * 26; fx += (ex / r) * push; fy += (ey / r) * push; }
      }
      p.n = n;
      const slow = 1 / (1 + n * 0.22);
      p.vx = p.vx * 0.8 + fx * slow * 0.2; p.vy = p.vy * 0.8 + fy * 0.2;
      p.x = Math.min(GATE_X - 5, Math.max(4, p.x + p.vx * dt)); p.y = Math.min(BOT - 4, Math.max(TOP + 4, p.y + p.vy * dt));
      if (p.x > GATE_X - 10 && Math.abs(p.y - gy) < 6 && laneClock[p.lane] >= 1) { laneClock[p.lane] -= 1; p.out = true; p.x = GATE_X + 4; }
    }
    people = people.filter((p) => p.x < W + 6);
  }
  function draw(st: CamStatus) {
    const scale = cv.width / W; ctx.setTransform(scale, 0, 0, scale, 0, 0);
    const ok = cssv('--ok'), warn = cssv('--warn'), warnText = cssv('--warn-text'), crit = cssv('--crit'), critText = cssv('--crit-text'), muted = cssv('--muted'), line = cssv('--line'), accent = cssv('--accent');
    ctx.fillStyle = cssv('--panel'); ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = cssv('--bg'); ctx.fillRect(0, TOP, GATE_X, BOT - TOP);
    ctx.strokeStyle = line; ctx.lineWidth = 1;
    for (let x = 40; x < GATE_X; x += 40) { ctx.beginPath(); ctx.moveTo(x, TOP); ctx.lineTo(x, BOT); ctx.stroke(); }
    ctx.font = `700 11px ${sans}`; ctx.fillStyle = muted; ctx.textAlign = 'left';
    ctx.fillText(st.slow ? `ARRIVING (${S.c.partner.toUpperCase()} SLOWING RELEASES)` : 'ARRIVING FROM PLATFORMS', 10, H - 7);
    ctx.textAlign = 'right'; ctx.fillText('TO IMMIGRATION →', W - 8, H - 7);
    ctx.textAlign = 'center'; ctx.fillText('E-GATES', GATE_X, TOP - 8);
    if (st.smoke) {
      for (let i = 0; i < 6; i++) { const t = performance.now() / 1400 + i; ctx.fillStyle = 'rgba(90,100,110,0.16)';
        ctx.beginPath(); ctx.arc(40 + i * 26 + Math.sin(t) * 6, TOP + 30 + Math.cos(t * 1.3) * 8, 26, 0, 6.3); ctx.fill(); }
      ctx.fillStyle = critText; ctx.textAlign = 'left'; ctx.fillText('SMOKE · PLATFORM 2', 12, TOP + 30);
      ctx.textAlign = 'right'; ctx.fillText('EXITS C & D CLOSED', GATE_X - 12, TOP + 16);
    }
    for (let i = 0; i < LANES; i++) {
      const y = laneY(i), o = st.open[i], smokeShut = st.smoke && i < 4;
      ctx.fillStyle = o ? ok : smokeShut ? crit : line;
      ctx.fillRect(GATE_X - 3, y - 7, 6, 3); ctx.fillRect(GATE_X - 3, y + 4, 6, 3);
      if (!o) { ctx.strokeStyle = smokeShut ? crit : muted; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(GATE_X - 4, y - 4); ctx.lineTo(GATE_X + 4, y + 4); ctx.moveTo(GATE_X + 4, y - 4); ctx.lineTo(GATE_X - 4, y + 4); ctx.stroke(); }
      if (st.staff && o && i % 2 === 0) { ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(GATE_X + 12, y, 4, 0, 6.3); ctx.fill(); }
    }
    if (S.iv.extraGates) { ctx.fillStyle = cssv('--ok-text'); ctx.textAlign = 'right'; ctx.fillText('+4 e-gates opened', GATE_X - 12, BOT - 6); }
    if (st.notice) {
      ctx.fillStyle = warn; ctx.fillRect(8, TOP + 40, 30, 22); ctx.fillStyle = cssv('--ink'); ctx.textAlign = 'center';
      ctx.font = `800 14px ${sans}`; ctx.fillText('!', 23, TOP + 56);
      ctx.font = `700 11px ${sans}`; ctx.fillStyle = warnText; ctx.textAlign = 'left'; ctx.fillText('notice on screens', 44, TOP + 55);
    }
    for (const p of people) {
      ctx.fillStyle = p.out ? muted : p.n >= 6 ? crit : p.n >= 3 ? warn : ok;
      ctx.globalAlpha = p.out ? 0.5 : 0.95;
      ctx.beginPath(); ctx.arc(p.x, p.y, 3.2, 0, 6.3); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ([[230, TOP + 70], [330, BOT - 50], [480, TOP + 50]] as [number, number][]).forEach(([x, y], i) => {
      const liar = st.spoof && i === 1, ignored = liar && S.iv.excludeSensor;
      ctx.strokeStyle = ignored ? muted : liar ? crit : accent; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, liar && !ignored ? 9 + Math.sin(performance.now() / 150) * 2 : 7, 0, 6.3); ctx.stroke();
      ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.arc(x, y, 2.5, 0, 6.3); ctx.fill();
      if (liar && st.k) { ctx.textAlign = 'left'; ctx.fillStyle = ignored ? muted : critText;
        ctx.fillText(ignored ? 'HZ-07 excluded (faulty)' : `HZ-07 reads ${st.k.sensed.toFixed(1)}/m²: the dots disagree`, x + 14, y + 4); }
    });
  }
  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const st = status();
    if (String(S.rid) !== key) { key = String(S.rid); people = []; for (let i = 0; i < st.target; i++) spawn(st, true); }
    const w = Math.round(cv.clientWidth * (window.devicePixelRatio || 1));
    if (w && cv.width !== w) { cv.width = w; cv.height = Math.round(w * H / W); }
    if (S.playing || !reduce) physics(dt, st);
    draw(st);
    $('camDens').textContent = st.k ? st.k.density.toFixed(1) : '0.0';
    $('camGates').textContent = `${st.open.filter(Boolean).length} of ${S.iv.extraGates ? 10 : 8}`;
    $('camName').textContent = `CAM 04 · ${S.c.zone.toUpperCase()}`;
    $('camBadge').classList.toggle('live', S.playing);
    requestAnimationFrame(frame);
  }
  return { start: () => requestAnimationFrame(frame) };
})();
Crowd.start();
