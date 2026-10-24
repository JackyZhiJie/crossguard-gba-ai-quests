import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from './store';
import { QUESTS, PLACE_LABELS, type QuestId } from './data/quests';
import { World, webglAvailable } from './world/World';
import { LumiAvatar, Mentor } from './components/kit';
import { Icon } from './components/ui';
import LangToggle from './components/LangToggle';
import Tour from './components/Tour';
import { TOUR } from './data/tour';
import Surge from './quests/Surge';
import Seals from './quests/Seals';
import Play from './pages/Play';
import Learn from './pages/Learn';
import Guard from './pages/Guard';
import Build from './pages/Build';
import Rewards from './pages/Rewards';
import Ranking from './pages/Ranking';
import Dashboard from './pages/Dashboard';
import Educator from './pages/Educator';
import About from './pages/About';


type PageId = 'exchange' | 'hall' | 'educator' | 'about';
type Open = QuestId | PageId | null;
const PAGES: { id: PageId; label: string; zh: string }[] = [
  { id: 'exchange', label: 'Exchange', zh: '兌換' },
  { id: 'hall', label: 'Hall of Fame', zh: '名人堂' },
  { id: 'educator', label: 'Educator guide', zh: '教學指引' },
  { id: 'about', label: 'Our solution', zh: '方案' },
];
const isOpen = (s: string): s is Exclude<Open, null> => QUESTS.some((q) => q.id === s) || PAGES.some((p) => p.id === s);

function HallOfFame() {
  const [view, setView] = useState<'rank' | 'dash'>('rank');
  return (
    <>
      <div className="seg" style={{ marginBottom: 16 }}>
        <button className={view === 'rank' ? 'on' : ''} onClick={() => setView('rank')}>
          Leaderboards
        </button>
        <button className={view === 'dash' ? 'on' : ''} onClick={() => setView('dash')}>
          Impact dashboard
        </button>
      </div>
      {view === 'rank' ? <Ranking /> : <Dashboard />}
    </>
  );
}

export default function App() {
  const { state, balance, toasts, update, earn } = useStore();
  const h = location.hash.slice(1);
  const [open, setOpen] = useState<Open>(isOpen(h) ? h : null);
  const [selected, setSelected] = useState<QuestId | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [intro, setIntro] = useState(() => state.questsDone.length === 0 && state.ledger.length <= 1);
  const [logOpen, setLogOpen] = useState(() => window.innerWidth > 900);
  const [glFailed, setGlFailed] = useState(false);
  const [tour, setTour] = useState<number | null>(h === 'tour' ? 0 : null);
  const stageRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<World | null>(null);
  const labelRefs = useRef<Record<string, HTMLElement | null>>({});

  // derived completion for quests built on the shared pages
  const done = useMemo(() => {
    const d = new Set(state.questsDone);
    if (state.coursesDone.length >= 3) d.add('academy');
    if (state.gamesPlayed > 0 && state.bestGame >= 500) d.add('checkpoint');
    if (state.filterSolved) d.add('filter');
    if (state.projects.length > 0) d.add('harbour');
    return d;
  }, [state]);

  // award each badge once
  useEffect(() => {
    const fresh = [...done].filter((id) => !state.questsDone.includes(id));
    if (!fresh.length) return;
    update((s) => ({ ...s, questsDone: [...new Set([...s.questsDone, ...fresh])] }));
    fresh.forEach((id) => {
      const q = QUESTS.find((x) => x.id === id);
      if (q && id !== 'surge' && id !== 'seals') earn('bonus', `Badge earned: ${q.badge}`, 100);
    });
  }, [done, state.questsDone, update, earn]);

  useEffect(() => {
    if (!stageRef.current || !webglAvailable()) {
      setGlFailed(true);
      return;
    }
    try {
      const w = new World(
        stageRef.current,
        QUESTS.map((q) => ({ id: q.id, x: q.x, z: q.z, color: q.color })),
        PLACE_LABELS.map((l) => ({ id: l.id, x: l.x, z: l.z, y: l.y })),
        {
          onSelect: (id) => setSelected(id as QuestId),
          onHover: setHover,
          onFrame: (pos) => {
            for (const [id, p] of Object.entries(pos)) {
              const el = labelRefs.current[id];
              if (!el) continue;
              el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
              el.style.visibility = p.visible ? 'visible' : 'hidden';
            }
          },
        },
      );
      worldRef.current = w;
      return () => w.dispose();
    } catch {
      setGlFailed(true);
    }
  }, []);

  useEffect(() => {
    worldRef.current?.setCompleted([...done]);
  }, [done]);

  useEffect(() => {
    worldRef.current?.focus(selected);
  }, [selected]);

  useEffect(() => {
    if (tour === null) return;
    setSelected(null);
    setIntro(false);
    worldRef.current?.focus(TOUR[tour].focus);
  }, [tour]);

  useEffect(() => {
    const onGo = (e: Event) => {
      const d = (e as CustomEvent<string>).detail;
      if (d === 'world') setOpen(null);
      else if (d === 'tour') {
        setOpen(null);
        setTour(0);
      } else if (isOpen(d)) setOpen(d);
    };
    const onHash = () => {
      const d = location.hash.slice(1);
      if (d === 'tour') setTour(0);
      setOpen(isOpen(d) ? d : null);
    };
    window.addEventListener('gq-go', onGo);
    window.addEventListener('hashchange', onHash);
    return () => {
      window.removeEventListener('gq-go', onGo);
      window.removeEventListener('hashchange', onHash);
    };
  }, []);

  useEffect(() => {
    if (open) setIntro(false);
    document.querySelector('.sheet-body')?.scrollTo(0, 0);
  }, [open]);

  useEffect(() => {
    try {
      history.replaceState(null, '', open ? `#${open}` : location.pathname + location.search);
    } catch {
      /* sandboxed frame */
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (open) setOpen(null);
        else if (tour !== null) setTour(null);
        else setSelected(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, tour]);

  const sel = QUESTS.find((q) => q.id === selected);
  const openQuest = QUESTS.find((q) => q.id === open);
  const openPage = PAGES.find((p) => p.id === open);
  const nextQuest = [...QUESTS].sort((a, b) => a.order - b.order).find((q) => !done.has(q.id));
  const close = () => setOpen(null);

  return (
    <div className="game">
      <div className="stage" ref={stageRef}>
        {glFailed && (
          <div className="nogl">
            <p>3D needs WebGL, which this browser has turned off. Every quest still works from the quest log.</p>
          </div>
        )}
      </div>

      <div className="labels" aria-hidden={!!open}>
        {PLACE_LABELS.map((l) => (
          <div key={l.id} className="place" ref={(el) => (labelRefs.current[l.id] = el)}>
            <b>{l.zh}</b>
            <span className="place-en">{l.en}</span>
          </div>
        ))}
        {QUESTS.map((q) => (
          <button
            key={q.id}
            className={`qlabel ${done.has(q.id) ? 'done' : ''} ${hover === q.id || selected === q.id ? 'hot' : ''}`}
            ref={(el) => (labelRefs.current[q.id] = el)}
            onClick={() => setSelected(q.id)}
            style={{ ['--qc' as string]: q.color }}
          >
            <span className="qdot">{done.has(q.id) ? '★' : q.order}</span>
            <span className="qname">{q.title}</span>
          </button>
        ))}
      </div>

      <header className="tophud">
        <div className="hud-l">
          <button className="logo" onClick={() => { setSelected(null); setOpen(null); }}>
            <LumiAvatar size={34} />
            <span>
              GBA <b>AI Quests</b>
              <small>CrossGuard prototype</small>
            </span>
          </button>
        </div>
        <nav className="hud-nav">
          <button className={`tour-btn ${tour !== null ? 'on' : ''}`} onClick={() => { setOpen(null); setTour(tour === null ? 0 : null); }}>
            Guided tour
            <small className="zh">導覽</small>
          </button>
          {PAGES.map((p) => (
            <button key={p.id} className={open === p.id ? 'on' : ''} onClick={() => setOpen(p.id)}>
              {p.label}
              <small className="zh">{p.zh}</small>
            </button>
          ))}
        </nav>
        <div className="hud-r">
          <LangToggle />
          <span className="badges" title="Badges earned">
            <Icon name="star" size={15} /> {done.size}/{QUESTS.length}
          </span>
          <button className="coins" onClick={() => setOpen('exchange')}>
            <Icon name="coin" size={16} /> {balance.toLocaleString()}
          </button>
        </div>
      </header>

      <aside className={`questlog ${logOpen ? 'open' : ''}`}>
        <button className="ql-toggle" onClick={() => setLogOpen((o) => !o)} aria-expanded={logOpen}>
          Quest log <span>{done.size}/{QUESTS.length}</span>
        </button>
        {logOpen && (
          <ul>
            {[...QUESTS].sort((a, b) => a.order - b.order).map((q) => (
              <li key={q.id}>
                <button className={`ql-item ${selected === q.id ? 'on' : ''}`} onClick={() => setSelected(q.id)} style={{ ['--qc' as string]: q.color }}>
                  <span className="qdot">{done.has(q.id) ? '★' : q.order}</span>
                  <span className="ql-text">
                    <b>{q.title}</b>
                    <small>
                      {q.part} · {q.minutes} min
                    </small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {intro && !open && !sel && tour === null && (
        <div className="intro">
          <Mentor>
            <p>
              Hi, I’m <b>Lumi</b>. Welcome to the Greater Bay Area: three cities, three legal systems, one bay. Your mission is to build an AI that keeps
              border crossings safe, and to prove it is safe to use in all three.
            </p>
            <p className="muted small">Drag to look around · scroll or pinch to zoom · tap a beacon to see its quest.</p>
            <div className="cta-row">
              <button className="btn primary" onClick={() => { setIntro(false); setSelected(nextQuest?.id ?? 'surge'); }}>
                Show me my first quest
              </button>
              <button className="btn ghost" onClick={() => setIntro(false)}>
                Explore first
              </button>
            </div>
          </Mentor>
        </div>
      )}

      {sel && !open && tour === null && (
        <div className="qcard" style={{ ['--qc' as string]: sel.color }} role="dialog" aria-label={sel.title}>
          <button className="x" onClick={() => setSelected(null)} aria-label="Close">
            ×
          </button>
          <div className="qcard-top">
            <span className="qpart">{sel.part}</span>
            <span className="muted small">
              {sel.place} · {sel.placeZh}
            </span>
          </div>
          <h2>
            {sel.title} <span className="zh">{sel.zh}</span>
          </h2>
          <p className="qq">“{sel.question}”</p>
          <p>{sel.blurb}</p>
          <dl className="qmeta">
            <div>
              <dt>AI concept</dt>
              <dd>{sel.concept}</dd>
            </div>
            <div>
              <dt>Time</dt>
              <dd>{sel.minutes} min</dd>
            </div>
            <div>
              <dt>Reward</dt>
              <dd>{sel.reward} pts</dd>
            </div>
            <div>
              <dt>Badge</dt>
              <dd>{done.has(sel.id) ? `★ ${sel.badge}` : sel.badge}</dd>
            </div>
          </dl>
          <button className="btn primary big" onClick={() => setOpen(sel.id)}>
            {done.has(sel.id) ? 'Play again' : 'Start quest'}
          </button>
        </div>
      )}

      {tour !== null && !open && (
        <Tour index={tour} onGo={setTour} onOpen={(id) => setOpen(id as Exclude<Open, null>)} onExit={() => { setTour(null); worldRef.current?.focus(null); }} />
      )}

      {open && (
        <div className="overlay" role="dialog" aria-label={openQuest?.title ?? openPage?.label}>
          <div className="sheet" style={openQuest ? { ['--qc' as string]: openQuest.color } : undefined}>
            <div className="sheet-bar">
              <button className="btn small" onClick={close}>
                ← Map
              </button>
              <div className="sheet-title">
                {openQuest ? (
                  <>
                    <span className="qdot">{done.has(openQuest.id) ? '★' : openQuest.order}</span>
                    <b>{openQuest.title}</b>
                    <span className="zh">{openQuest.zh}</span>
                    <span className="muted small hide-sm">· {openQuest.place}</span>
                  </>
                ) : (
                  <b>
                    {openPage?.label} <span className="zh">{openPage?.zh}</span>
                  </b>
                )}
              </div>
              <LangToggle />
              <button className="coins" onClick={() => setOpen('exchange')}>
                <Icon name="coin" size={16} /> {balance.toLocaleString()}
              </button>
            </div>
            <div className="sheet-body">
              {open === 'surge' && <Surge onDone={close} />}
              {open === 'seals' && <Seals onDone={close} />}
              {open === 'checkpoint' && <Play />}
              {open === 'academy' && <Learn />}
              {open === 'filter' && <Guard />}
              {open === 'harbour' && <Build />}
              {open === 'exchange' && <Rewards />}
              {open === 'hall' && <HallOfFame />}
              {open === 'educator' && <Educator />}
              {open === 'about' && <About onTour={() => { setOpen(null); setTour(0); }} />}
            </div>
          </div>
        </div>
      )}

      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.amount !== undefined && t.amount < 0 ? 'spend' : ''}`}>
            {t.amount !== undefined && (
              <b>
                {t.amount > 0 ? '+' : ''}
                {t.amount}
              </b>
            )}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
