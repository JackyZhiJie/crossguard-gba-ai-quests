import React from 'react';
import { REGION_LABEL, type Region } from '../data/regimes';

const PATHS: Record<string, string> = {
  allow: 'M5 12.5l4.2 4.2L19 7',
  redact: 'M4 12h16M7 8h10M7 16h10',
  block: 'M6 6l12 12M18 6L6 18',
  escalate: 'M12 4a3.5 3.5 0 110 7 3.5 3.5 0 010-7zM5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5',
  coin: 'M12 3a9 9 0 110 18 9 9 0 010-18zM9 9.5h4.5a2 2 0 010 4H9.5M10.5 7.5v9',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  play: 'M8 5l11 7-11 7z',
  pause: 'M8 5v14M16 5v14',
  reset: 'M4 12a8 8 0 108-8 8 8 0 00-6 2.7M4 4v4h4',
  lock: 'M7 11V8a5 5 0 0110 0v3M6 11h12v9H6z',
  check: 'M5 12.5l4.2 4.2L19 7',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z',
  github: 'M9 19c-4 1.3-4-2-6-2.5M15 21v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 00-1.3-3.2 4.2 4.2 0 00-.1-3.2s-1-.3-3.4 1.3a11.6 11.6 0 00-6.2 0C6.6 2.8 5.6 3.1 5.6 3.1a4.2 4.2 0 00-.1 3.2A4.6 4.6 0 004.2 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21',
  shield: 'M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z',
  timer: 'M12 8v5l3 2M9 2h6M12 21a8 8 0 100-16 8 8 0 000 16z',
  copy: 'M9 9h10v10H9zM5 15V5h10',
};

export function Icon({ name, size = 18, className }: { name: keyof typeof PATHS | string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={PATHS[name] ?? ''} />
    </svg>
  );
}

export function RegionTag({ region }: { region: Region }) {
  return (
    <span className={`region region-${region}`}>
      {REGION_LABEL[region].short}
      <span className="zh">{REGION_LABEL[region].zh}</span>
    </span>
  );
}

export function PageHead({ kicker, title, zh, children }: { kicker: string; title: string; zh?: string; children?: React.ReactNode }) {
  return (
    <header className="page-head">
      <div className="kicker">{kicker}</div>
      <h1>
        {title}
        {zh && <span className="h-zh">{zh}</span>}
      </h1>
      {children && <div className="lede">{children}</div>}
    </header>
  );
}

export function Pts({ n, sign = false }: { n: number; sign?: boolean }) {
  return (
    <span className={`pts ${n < 0 ? 'neg' : ''}`}>
      <Icon name="coin" size={14} />
      {sign && n > 0 ? '+' : ''}
      {n.toLocaleString()}
    </span>
  );
}

export function Status({ kind, children }: { kind: 'good' | 'warning' | 'critical' | 'neutral' | 'info'; children: React.ReactNode }) {
  return <span className={`status status-${kind}`}>{children}</span>;
}

export function SimNote({ children }: { children: React.ReactNode }) {
  return <p className="simnote">{children}</p>;
}
