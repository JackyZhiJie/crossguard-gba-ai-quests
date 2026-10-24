import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ACTIONS, LEVELS, drawRun, type GateAction, type GateCard } from '../data/gate';
import { useStore } from '../store';
import { go } from '../nav';
import { Icon, PageHead, RegionTag } from '../components/ui';

type Result = 'correct' | 'partial' | 'wrong' | 'timeout';
interface Answer {
  card: GateCard;
  choice: GateAction | null;
  result: Result;
  gained: number;
}
type Phase = 'intro' | 'level' | 'card' | 'verdict' | 'done';

const LIMIT = 15;
const STAMP: Record<GateAction, { en: string; zh: string }> = {
  allow: { en: 'CLEARED', zh: '放行' },
  redact: { en: 'MASKED', zh: '遮蔽' },
  block: { en: 'DENIED', zh: '攔截' },
  escalate: { en: 'REFERRED', zh: '轉介' },
};

export default function Play() {
  const { state, update, earn } = useStore();
  const [phase, setPhase] = useState<Phase>('intro');
  const [run, setRun] = useState<GateCard[]>(() => drawRun());
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [trust, setTrust] = useState(3);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [left, setLeft] = useState(LIMIT);
  const deadline = useRef(0);
  const paid = useRef(false);

  const card = run[idx];
  const last = answers[answers.length - 1];

  const start = () => {
    setRun(drawRun());
    setIdx(0);
    setScore(0);
    setStreak(0);
    setTrust(3);
    setAnswers([]);
    paid.current = false;
    setPhase('level');
  };

  const beginCard = useCallback(() => {
    deadline.current = performance.now() + LIMIT * 1000;
    setLeft(LIMIT);
    setPhase('card');
  }, []);

  const decide = useCallback(
    (choice: GateAction | null) => {
      if (phase !== 'card' || !card) return;
      const timeLeft = Math.max(0, (deadline.current - performance.now()) / 1000);
      let result: Result;
      if (choice === null) result = 'timeout';
      else if (choice === card.correct) result = 'correct';
      else if (card.partial?.includes(choice)) result = 'partial';
      else result = 'wrong';

      let gained = 0;
      const nextStreak = result === 'correct' ? streak + 1 : 0;
      if (result === 'correct') {
        const mult = nextStreak >= 5 ? 2 : nextStreak >= 3 ? 1.5 : 1;
        gained = Math.round((100 + 50 * (timeLeft / LIMIT)) * mult);
      } else if (result === 'partial') {
        gained = 40;
      }
      setStreak(nextStreak);
      setScore((s) => s + gained);
      if (result === 'wrong' || result === 'timeout') setTrust((t) => t - 1);
      setAnswers((a) => [...a, { card, choice, result, gained }]);
      setPhase('verdict');
    },
    [phase, card, streak],
  );

  const next = useCallback(() => {
    if (phase === 'level') return beginCard();
    if (phase !== 'verdict') return;
    if (trust <= 0 || idx >= run.length - 1) {
      setPhase('done');
      return;
    }
    const n = idx + 1;
    setIdx(n);
    if (run[n].level !== run[idx].level) setPhase('level');
    else beginCard();
  }, [phase, trust, idx, run, beginCard]);

  // countdown
  useEffect(() => {
    if (phase !== 'card') return;
    const id = window.setInterval(() => {
      const l = Math.max(0, (deadline.current - performance.now()) / 1000);
      setLeft(l);
      if (l <= 0) decide(null);
    }, 100);
    return () => window.clearInterval(id);
  }, [phase, decide]);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const k = e.key.toUpperCase();
      if (phase === 'card') {
        const a = ACTIONS.find((x, i) => x.key === k || String(i + 1) === k);
        if (a) {
          e.preventDefault();
          decide(a.id);
        }
      } else if ((phase === 'verdict' || phase === 'level') && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, decide, next]);

  // pay out once at the end
  useEffect(() => {
    if (phase !== 'done' || paid.current) return;
    paid.current = true;
    const pts = Math.round(score / 10);
    update((s) => ({ ...s, gamesPlayed: s.gamesPlayed + 1, bestGame: Math.max(s.bestGame, score) }));
    earn('game', `Checkpoint run: ${score.toLocaleString()} score`, pts);
  }, [phase, score, update, earn]);

  const mult = streak >= 5 ? 2 : streak >= 3 ? 1.5 : 1;
  const correctCount = answers.filter((a) => a.result === 'correct').length;
  const level = card ? LEVELS[card.level - 1] : LEVELS[0];

  if (phase === 'intro') {
    return (
      <div className="view">
        <PageHead kicker="Learn by playing · AI literacy game" title="Checkpoint" zh="AI關口">
          You run the AI checkpoint between Hong Kong, Macau and the mainland GBA. Requests, model outputs and CrossGuard recommendations arrive at
          your desk. Clear them, mask them, deny them or refer them to a human. Each card has 15 seconds.
        </PageHead>
        <div className="intro-grid">
          <div className="panel">
            <h3 className="h3">How to play</h3>
            <div className="action-legend">
              {ACTIONS.map((a) => (
                <div key={a.id} className={`legend-action act-${a.id}`}>
                  <span className="act-icon">
                    <Icon name={a.id} />
                  </span>
                  <div>
                    <b>
                      {a.label} <span className="zh">{a.zh}</span>
                    </b>
                    <span className="muted">{a.hint}</span>
                  </div>
                  <kbd>{a.key}</kbd>
                </div>
              ))}
            </div>
            <ul className="rules">
              <li>Correct: 100 points plus a speed bonus of up to 50.</li>
              <li>Three correct in a row gives ×1.5, five gives ×2.</li>
              <li>A defensible second-best answer earns 40.</li>
              <li>Wrong answers and timeouts cost one trust seal. Lose all three and the shift ends.</li>
              <li>Your score ÷ 10 goes into your TrustLoop wallet.</li>
            </ul>
            <button className="btn primary big" onClick={start}>
              <Icon name="play" size={16} /> Start shift
            </button>
          </div>
          <div className="panel">
            <h3 className="h3">Three levels, twelve cards</h3>
            <ol className="levels">
              {LEVELS.map((l) => (
                <li key={l.level}>
                  <b>
                    {l.name} <span className="zh">{l.zh}</span>
                  </b>
                  <span className="muted">{l.blurb}</span>
                </li>
              ))}
            </ol>
            {state.gamesPlayed > 0 && (
              <p className="muted">
                Your best: <b>{state.bestGame.toLocaleString()}</b> {` over ${state.gamesPlayed} shift${state.gamesPlayed > 1 ? 's' : ''}.`}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'done') {
    const acc = answers.length ? Math.round((correctCount / answers.length) * 100) : 0;
    const rank = acc >= 90 ? 'Chief Border Ethicist' : acc >= 70 ? 'Senior Gatekeeper' : acc >= 50 ? 'Gatekeeper' : 'Trainee';
    return (
      <div className="view">
        <PageHead kicker="Shift over" title={trust <= 0 ? 'Trust ran out' : 'Shift complete'} zh={trust <= 0 ? '信任耗盡' : '值班完成'} />
        <div className="done-grid">
          <div className="panel score-panel">
            <div className="big-num">{score.toLocaleString()}</div>
            <div className="muted">score · {acc}% correct · rank: <b>{rank}</b></div>
            <div className="earned">
              +{Math.round(score / 10)} points added to your wallet
            </div>
            <div className="cta-row">
              <button className="btn primary" onClick={start}>
                Play again
              </button>
              <button className="btn" onClick={() => go('learn')}>
                Learn the rules you missed
              </button>
              <button className="btn ghost" onClick={() => go('rewards')}>
                Spend points
              </button>
            </div>
          </div>
          <div className="panel min0">
            <h3 className="h3">Your decisions</h3>
            <ul className="review">
              {answers.map((a) => (
                <li key={a.card.id} className={`rv-${a.result}`}>
                  <span className="rv-mark">{a.result === 'correct' ? '✓' : a.result === 'partial' ? '~' : '✗'}</span>
                  <div className="min0">
                    <b>{a.card.title}</b>
                    <span className="muted">
                      You: {a.choice ? ACTIONS.find((x) => x.id === a.choice)!.label : 'timed out'} · Best: {ACTIONS.find((x) => x.id === a.card.correct)!.label} · {a.card.rule}
                    </span>
                  </div>
                  <span className="rv-pts">+{a.gained}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="view game">
      <div className="hud">
        <div className="hud-item">
          <span className="hud-k">Level</span>
          <b>
            {card.level}/3 · {level.name}
          </b>
        </div>
        <div className="hud-item">
          <span className="hud-k">Card</span>
          <b>
            {idx + 1}/{run.length}
          </b>
        </div>
        <div className="hud-item">
          <span className="hud-k">Score</span>
          <b className="tnum">{score.toLocaleString()}</b>
        </div>
        <div className="hud-item">
          <span className="hud-k">Streak</span>
          <b className={mult > 1 ? 'hot' : ''}>
            {streak} {mult > 1 && `· ×${mult}`}
          </b>
        </div>
        <div className="hud-item seals" aria-label={`${trust} trust seals left`}>
          <span className="hud-k">Trust</span>
          <span>
            {[0, 1, 2].map((i) => (
              <Icon key={i} name="shield" size={18} className={i < trust ? 'seal on' : 'seal'} />
            ))}
          </span>
        </div>
      </div>

      {phase === 'level' ? (
        <div className="level-card panel">
          <div className="kicker">Level {level.level} of 3</div>
          <h2 className="display-s">
            {level.name} <span className="zh">{level.zh}</span>
          </h2>
          <p className="lede">{level.blurb}</p>
          <button className="btn primary big" onClick={next} autoFocus>
            Begin <kbd>Enter</kbd>
          </button>
        </div>
      ) : (
        <>
          <div className="timer" aria-hidden="true">
            <div className={`timer-fill ${left < 5 ? 'low' : ''}`} style={{ width: `${(phase === 'card' ? left / LIMIT : 0) * 100}%` }} />
          </div>
          <article className={`gate-card ${phase === 'verdict' ? 'decided' : ''}`}>
            <div className="gate-route">
              <RegionTag region={card.from} />
              <svg width="56" height="12" viewBox="0 0 56 12" aria-hidden="true">
                <path d="M0 6h50M44 1l6 5-6 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray={card.from === card.to ? '0' : '3 3'} />
              </svg>
              <RegionTag region={card.to} />
              <span className="gate-actor">{card.actor}</span>
              <span className="gate-no">No. {String(idx + 1).padStart(3, '0')}</span>
            </div>
            <h2 className="gate-title">{card.title}</h2>
            <pre className="gate-payload">{card.payload}</pre>
            {phase === 'verdict' && last && (
              <div className={`stamp stamp-${last.result}`} aria-hidden="true">
                {last.choice ? STAMP[last.choice].en : 'TIMED OUT'}
                <span>{last.choice ? STAMP[last.choice].zh : '逾時'}</span>
              </div>
            )}
          </article>

          {phase === 'card' && (
            <div className="actions">
              {ACTIONS.map((a) => (
                <button key={a.id} className={`act act-${a.id}`} onClick={() => decide(a.id)}>
                  <span className="act-icon">
                    <Icon name={a.id} size={20} />
                  </span>
                  <span className="act-label">
                    {a.label}
                    <span className="zh">{a.zh}</span>
                  </span>
                  <kbd>{a.key}</kbd>
                </button>
              ))}
            </div>
          )}

          {phase === 'verdict' && last && (
            <div className={`verdict v-${last.result}`}>
              <div className="verdict-head">
                <b>
                  {last.result === 'correct' ? 'Correct' : last.result === 'partial' ? 'Defensible, not best' : last.result === 'timeout' ? 'Too slow' : 'Not this time'}
                </b>
                <span className="verdict-pts">+{last.gained}</span>
              </div>
              <p>
                <span className="rule-chip">{card.rule}</span> Best call: <b>{ACTIONS.find((x) => x.id === card.correct)!.label}</b>. {card.why}
              </p>
              <button className="btn primary" onClick={next} autoFocus>
                {trust <= 0 || idx >= run.length - 1 ? 'See results' : 'Next card'} <kbd>Enter</kbd>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
