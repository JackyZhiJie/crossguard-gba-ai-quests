import React from 'react';

export function LumiAvatar({ size = 56, mood = 'happy' }: { size?: number; mood?: 'happy' | 'think' | 'alert' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="lumi">
      <ellipse cx="32" cy="58" rx="14" ry="3" fill="rgba(13,40,60,.18)" />
      <g className="lumi-bob">
        <path d="M14 20 L6 14 M50 20 L58 14" stroke="#0d3b52" strokeWidth="3" strokeLinecap="round" />
        <circle cx="6" cy="14" r="3.4" fill="#ffcf4a" />
        <circle cx="58" cy="14" r="3.4" fill="#ffcf4a" />
        <rect x="10" y="16" width="44" height="34" rx="16" fill="#ffffff" stroke="#0d3b52" strokeWidth="3" />
        <rect x="16" y="22" width="32" height="20" rx="10" fill="#0d3b52" />
        {mood === 'think' ? (
          <>
            <rect x="21" y="30" width="7" height="3" rx="1.5" fill="#5ff2c9" />
            <rect x="36" y="30" width="7" height="3" rx="1.5" fill="#5ff2c9" />
          </>
        ) : mood === 'alert' ? (
          <>
            <circle cx="25" cy="31" r="4" fill="#ffcf4a" />
            <circle cx="39" cy="31" r="4" fill="#ffcf4a" />
          </>
        ) : (
          <>
            <path d="M21 33 q3.5 -5 7 0" stroke="#5ff2c9" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M36 33 q3.5 -5 7 0" stroke="#5ff2c9" strokeWidth="3" fill="none" strokeLinecap="round" />
          </>
        )}
        <circle cx="32" cy="12" r="4" fill="#e04848" stroke="#0d3b52" strokeWidth="2.5" />
      </g>
    </svg>
  );
}

export function Mentor({ children, mood, name = 'Lumi' }: { children: React.ReactNode; mood?: 'happy' | 'think' | 'alert'; name?: string }) {
  return (
    <div className="mentor">
      <LumiAvatar mood={mood} />
      <div className="bubble">
        <b>{name}</b>
        <div>{children}</div>
      </div>
    </div>
  );
}

export function Ticket({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <aside className="ticket">
      <div className="ticket-k">Learning ticket</div>
      <b>{title}</b>
      <div>{children}</div>
    </aside>
  );
}

export function Steps({ labels, at, done = [] }: { labels: string[]; at: number; done?: number[] }) {
  return (
    <ol className="qsteps" aria-label="Quest tasks">
      {labels.map((l, i) => (
        <li key={l} className={`${i === at ? 'on' : ''} ${i < at || done.includes(i) ? 'done' : ''}`}>
          <span className="qn">{i + 1}</span>
          <span className="ql">{l}</span>
        </li>
      ))}
    </ol>
  );
}
