import React, { useEffect, useRef, useState } from 'react';

export interface Series {
  name: string;
  color: string; // CSS color, usually var(--s1)
  values: number[];
  dashed?: boolean;
}

const fmt = (n: number) => (Math.abs(n) >= 10000 ? `${(n / 1000).toFixed(0)}k` : Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${Math.round(n)}`);

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const m = v / p;
  const step = m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10;
  return step * p;
}

export function LineChart({
  labels,
  series,
  height = 220,
  yMax,
  threshold,
  unit = '',
  area = false,
  marker,
  ariaLabel,
}: {
  labels: string[];
  series: Series[];
  height?: number;
  yMax?: number;
  threshold?: { value: number; label: string };
  unit?: string;
  area?: boolean;
  marker?: { index: number; label: string };
  ariaLabel: string;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  // Draw in real pixels so axis text stays the same size at any width.
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = height;
  const pad = { l: 44, r: 16, t: 14, b: 26 };
  const n = Math.max(1, labels.length);
  const max = yMax ?? niceMax(Math.max(1, ...series.flatMap((s) => s.values), threshold?.value ?? 0));
  const x = (i: number) => pad.l + (n === 1 ? 0 : (i / (n - 1)) * (W - pad.l - pad.r));
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const labelEvery = Math.ceil(n / Math.max(3, Math.floor(W / 80)));

  const onMove = (e: React.PointerEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };

  return (
    <div className="chart" ref={box}>
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={ariaLabel}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        style={{ touchAction: 'pan-y' }}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="grid" />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" className="axis">
              {fmt(t)}
            </text>
          </g>
        ))}
        {labels.map((l, i) =>
          i % labelEvery === 0 || i === n - 1 ? (
            <text key={l + i} x={x(i)} y={H - 6} textAnchor="middle" className="axis">
              {l}
            </text>
          ) : null,
        )}
        {threshold && (
          <g>
            <line x1={pad.l} x2={W - pad.r} y1={y(threshold.value)} y2={y(threshold.value)} className="threshold" />
            <text x={W - pad.r} y={y(threshold.value) - 6} textAnchor="end" className="axis strong">
              {threshold.label}
            </text>
          </g>
        )}
        {marker && (
          <g>
            <line x1={x(marker.index)} x2={x(marker.index)} y1={pad.t} y2={H - pad.b} className="marker" />
            <text x={Math.min(x(marker.index) + 6, W - pad.r - 80)} y={pad.t + 10} className="axis strong">
              {marker.label}
            </text>
          </g>
        )}
        {series.map((s) => {
          if (!s.values.length) return null;
          const d = s.values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
          const last = s.values.length - 1;
          return (
            <g key={s.name}>
              {area && (
                <path
                  d={`${d}L${x(last)},${y(0)}L${x(0)},${y(0)}Z`}
                  fill={s.color}
                  opacity={0.1}
                />
              )}
              <path d={d} fill="none" stroke={s.color} strokeWidth={2} strokeDasharray={s.dashed ? '5 4' : undefined} strokeLinejoin="round" />
              <circle cx={x(last)} cy={y(s.values[last])} r={4} fill={s.color} stroke="var(--surface)" strokeWidth={2} />
            </g>
          );
        })}
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} className="crosshair" />
            {series.map((s) =>
              s.values[hover] !== undefined ? (
                <circle key={s.name} cx={x(hover)} cy={y(s.values[hover])} r={4.5} fill={s.color} stroke="var(--surface)" strokeWidth={2} />
              ) : null,
            )}
          </g>
        )}
      </svg>
      {hover !== null && (
        <div className="tooltip" style={{ left: `${(x(hover) / W) * 100}%` }}>
          <div className="tt-title">{labels[hover]}</div>
          {series.map((s) =>
            s.values[hover] !== undefined ? (
              <div key={s.name} className="tt-row">
                <i style={{ background: s.color }} />
                <span>{s.name}</span>
                <b>
                  {s.values[hover].toLocaleString(undefined, { maximumFractionDigits: 1 })}
                  {unit}
                </b>
              </div>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}

export function Legend({ items }: { items: { name: string; color: string; dashed?: boolean }[] }) {
  return (
    <div className="legend">
      {items.map((i) => (
        <span key={i.name}>
          <i className={i.dashed ? 'dashed' : ''} style={{ background: i.dashed ? undefined : i.color, borderColor: i.color }} />
          {i.name}
        </span>
      ))}
    </div>
  );
}

export function BarList({
  rows,
  color = 'var(--s1)',
  format = (v: number) => v.toLocaleString(),
  max,
}: {
  rows: { label: string; value: number; note?: string; color?: string }[];
  color?: string;
  format?: (v: number) => string;
  max?: number;
}) {
  const m = max ?? Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="barlist">
      {rows.map((r) => (
        <div className="bar-row" key={r.label} title={`${r.label}: ${format(r.value)}${r.note ? ` (${r.note})` : ''}`}>
          <div className="bar-label">{r.label}</div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${Math.max(1.5, (r.value / m) * 100)}%`, background: r.color ?? color }} />
          </div>
          <div className="bar-value">
            {format(r.value)}
            {r.note && <small>{r.note}</small>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Columns({
  rows,
  color = 'var(--s1)',
  highlight,
  height = 160,
  ariaLabel,
}: {
  rows: { label: string; value: number }[];
  color?: string;
  highlight?: number;
  height?: number;
  ariaLabel: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 420;
  const H = height;
  const pad = { l: 8, r: 8, t: 18, b: 22 };
  const max = Math.max(1, ...rows.map((r) => r.value));
  const bw = (W - pad.l - pad.r) / rows.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} className="columns">
      <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} className="grid" />
      {rows.map((r, i) => {
        const h = (r.value / max) * (H - pad.t - pad.b);
        const x = pad.l + i * bw + 2;
        const y = H - pad.b - h;
        const on = hover === i || highlight === i;
        return (
          <g key={r.label} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
            <rect x={pad.l + i * bw} y={pad.t - 14} width={bw} height={H - pad.t + 14} fill="transparent" />
            <path
              d={`M${x},${H - pad.b}V${y + 4}q0,-4 4,-4h${bw - 12}q4,0 4,4V${H - pad.b}Z`}
              fill={color}
              opacity={hover === null || on ? 1 : 0.45}
            />
            <text x={x + (bw - 4) / 2} y={H - 6} textAnchor="middle" className="axis">
              {r.label}
            </text>
            {on && (
              <text x={x + (bw - 4) / 2} y={y - 5} textAnchor="middle" className="axis strong">
                {r.value}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function Radar({
  axes,
  layers,
  size = 280,
}: {
  axes: string[];
  layers: { name: string; values: number[]; color: string; dashed?: boolean }[];
  size?: number;
}) {
  const c = size / 2;
  const r = c - 46;
  const n = axes.length;
  const pt = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    return [c + Math.cos(a) * r * (v / 5), c + Math.sin(a) * r * (v / 5)] as const;
  };
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="radar" role="img" aria-label="Radar chart of trust dimensions">
      {[1, 2, 3, 4, 5].map((lv) => (
        <polygon key={lv} points={axes.map((_, i) => pt(i, lv).join(',')).join(' ')} className="grid" fill="none" />
      ))}
      {axes.map((a, i) => {
        const [x, y] = pt(i, 5);
        const [lx, ly] = pt(i, 6.15);
        return (
          <g key={a}>
            <line x1={c} y1={c} x2={x} y2={y} className="grid" />
            <text x={lx} y={ly + 3} textAnchor={Math.abs(lx - c) < 8 ? 'middle' : lx > c ? 'start' : 'end'} className="axis">
              {a}
            </text>
          </g>
        );
      })}
      {layers.map((l) =>
        l.dashed ? (
          // A requirement layer: hollow rings only on the axes that have a minimum.
          <g key={l.name}>
            {l.values.map((v, i) => {
              if (v <= 0) return null;
              const [x, y] = pt(i, v);
              return <circle key={i} cx={x} cy={y} r={5} fill="var(--surface)" stroke={l.color} strokeWidth={2} />;
            })}
          </g>
        ) : (
          <g key={l.name}>
            <polygon points={l.values.map((v, i) => pt(i, v).join(',')).join(' ')} fill={l.color} fillOpacity={0.14} stroke={l.color} strokeWidth={2} />
            {l.values.map((v, i) => {
              const [x, y] = pt(i, v);
              return <circle key={i} cx={x} cy={y} r={3.5} fill={l.color} stroke="var(--surface)" strokeWidth={1.5} />;
            })}
          </g>
        ),
      )}
    </svg>
  );
}

export function Gauge({ value, label }: { value: number; label: string }) {
  const status = value >= 70 ? 'critical' : value >= 50 ? 'warning' : 'good';
  const a = Math.PI * (1 - value / 100);
  const R = 80;
  const x = 100 + Math.cos(a) * R;
  const y = 100 - Math.sin(a) * R;
  return (
    <svg viewBox="0 0 200 118" className={`gauge ${status}`} role="img" aria-label={`${label} ${value}`}>
      <path d="M20,100 A80,80 0 0 1 180,100" className="gauge-track" />
      <path d={`M20,100 A80,80 0 0 1 ${x.toFixed(2)},${y.toFixed(2)}`} className="gauge-fill" />
      <text x="100" y="92" textAnchor="middle" className="gauge-num">
        {value}
      </text>
      <text x="100" y="113" textAnchor="middle" className="axis">
        {label}
      </text>
    </svg>
  );
}
