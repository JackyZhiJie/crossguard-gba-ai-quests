import React, { useEffect, useState } from 'react';
import { TOUR } from '../data/tour';
import { Icon } from './ui';

export default function Tour({ index, onGo, onOpen, onExit }: { index: number; onGo: (i: number) => void; onOpen: (id: string) => void; onExit: () => void }) {
  const stop = TOUR[index];
  const [auto, setAuto] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => setElapsed(0), [index]);
  useEffect(() => {
    if (!auto) return;
    const id = window.setInterval(() => setElapsed((e) => e + 0.25), 250);
    return () => window.clearInterval(id);
  }, [auto]);
  useEffect(() => {
    if (!auto || elapsed < stop.seconds) return;
    if (index < TOUR.length - 1) onGo(index + 1);
    else setAuto(false);
  }, [auto, elapsed, stop.seconds, index, onGo]);

  return (
    <div className="tour" role="dialog" aria-label="Guided tour">
      <div className="tour-top">
        <span className="tour-slide">{`Stop ${index + 1} of ${TOUR.length}`}</span>
        <span className="tour-time tnum">{stop.seconds} s</span>
        <button className="x" onClick={onExit} aria-label="Exit the guided tour">
          ×
        </button>
      </div>
      <h2>{stop.title}</h2>
      <ul>
        {stop.points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <div className="tour-bar" aria-hidden="true">
        <div style={{ width: `${Math.min(100, (elapsed / stop.seconds) * 100)}%` }} />
      </div>
      <div className="tour-actions">
        <button className="btn small" disabled={index === 0} onClick={() => onGo(index - 1)}>
          ← Previous
        </button>
        <button className={`btn small ${auto ? 'primary' : ''}`} onClick={() => setAuto((a) => !a)} aria-pressed={auto}>
          <Icon name={auto ? 'pause' : 'play'} size={14} /> {auto ? 'Pause' : 'Auto-play'}
        </button>
        {stop.open && (
          <button className="btn small primary" onClick={() => onOpen(stop.open!)}>
            {stop.openLabel}
          </button>
        )}
        <button className="btn small" disabled={index === TOUR.length - 1} onClick={() => onGo(index + 1)}>
          Next →
        </button>
      </div>
      <div className="tour-dots" aria-hidden="true">
        {TOUR.map((s, i) => (
          <button key={s.title} className={i === index ? 'on' : i < index ? 'past' : ''} onClick={() => onGo(i)} tabIndex={-1} />
        ))}
      </div>
    </div>
  );
}
