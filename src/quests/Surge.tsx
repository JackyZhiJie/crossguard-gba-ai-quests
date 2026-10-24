import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store';
import { Mentor, Steps, Ticket } from '../components/kit';
import { LineChart, Legend } from '../components/charts';
import { CROSSINGS, counterfactual } from '../data/crossguard';

const TASKS = ['Data search', 'Data cleaning', 'Where data lives', 'Model training', 'Model testing', 'Deployment'];

interface Source {
  id: string;
  name: string;
  zh: string;
  useful: number;
  flag?: 'privacy' | 'bias' | 'noise';
  note: string;
}

const SOURCES: Source[] = [
  { id: 'cctv', name: 'Crowd counts from CCTV', zh: '閉路電視人數', useful: 3, note: 'Converted to anonymous counts on site, so no faces leave the camera.' },
  { id: 'gates', name: 'E-gate tap-ins per minute', zh: '電子閘口流量', useful: 3, note: 'A direct measure of how fast people are moving through.' },
  { id: 'timetable', name: 'Train timetable and delays', zh: '列車時刻表', useful: 2, note: 'Each arriving train brings a pulse of passengers.' },
  { id: 'weather', name: 'Weather and typhoon signals', zh: '天氣及風球', useful: 2, note: 'Signal 8 lifting releases a backlog all at once.' },
  { id: 'smoke', name: 'Smoke and ventilation sensors', zh: '煙霧及通風感應', useful: 2, note: 'Incidents close exits and change how crowds move.' },
  { id: 'social', name: 'Social media posts', zh: '社交媒體帖文', useful: 1, flag: 'noise', note: 'Noisy and easy to manipulate. Small gain, real risk.' },
  { id: 'ids', name: 'Traveller names and ID numbers', zh: '旅客姓名及證件號碼', useful: 0, flag: 'privacy', note: 'Not needed to count a crowd, and illegal to move across the border without a lawful route.' },
  { id: 'faces', name: 'Face recognition watchlist', zh: '人臉識別名單', useful: 0, flag: 'privacy', note: 'Identity tracking. CrossGuard is designed never to do this.' },
  { id: 'nation', name: 'Passport nationality', zh: '護照國籍', useful: 0, flag: 'bias', note: 'Says nothing about crowd risk and invites discrimination.' },
];
const MAX_USEFUL = 12;

type Clean = 'keep' | 'fix' | 'remove';
const RECORDS: { text: string; answer: Clean; why: string }[] = [
  { text: '17:05 · Gate B · 212 tap-ins', answer: 'keep', why: 'A normal reading.' },
  { text: '17:06 · Gate B · 9,999 tap-ins', answer: 'remove', why: 'Impossible for one gate in a minute: a sensor glitch.' },
  { text: '17:07 · Gate B · (missing)', answer: 'fix', why: 'Fill the gap from the minutes either side.' },
  { text: '17:05 · Gate B · 212 tap-ins', answer: 'remove', why: 'An exact duplicate of the first record.' },
  { text: '17:08 · Zone 2 · 2.1 persons/m²', answer: 'keep', why: 'Anonymous density, exactly what we need.' },
  { text: '17:08 · Zone 2 · image_0412.jpg (faces visible)', answer: 'remove', why: 'Raw images with faces must not enter the dataset.' },
  { text: '09:09 · Gate C · 188 tap-ins (time in UTC)', answer: 'fix', why: 'Convert to Hong Kong time so it lines up with the rest.' },
  { text: '17:10 · Smoke sensor P2 · normal', answer: 'keep', why: 'Normal readings teach the model what “safe” looks like.' },
];

type Arch = 'central' | 'federated' | 'local';
const ARCHS: { id: Arch; name: string; text: string; verdict: string; ok: boolean; factor: number }[] = [
  {
    id: 'central', name: 'One central server in Shenzhen', text: 'Send every side’s raw data to a single place and train there.',
    verdict: 'Most accurate on paper, but personal data would cross the border in both directions. That breaks PDPO, Macau’s PDPA and PIPL transfer rules.', ok: false, factor: 1,
  },
  {
    id: 'federated', name: 'Federated learning', text: 'Each side trains on its own data. Only model parameters and anonymous indicators are shared.',
    verdict: 'Personal data stays home and the model still learns from both sides. This is CrossGuard’s design.', ok: true, factor: 1,
  },
  {
    id: 'local', name: 'Hong Kong data only', text: 'Never share anything. Train only on the Hong Kong side.',
    verdict: 'Safe, but the model is blind to what is coming from Shenzhen, so it warns later.', ok: true, factor: 0.82,
  },
];

const DEPLOY: { text: string; a: string; b: string; right: 'a' | 'b'; why: string }[] = [
  {
    text: 'Risk 82: arrivals +45% vs norm, Exit C restricted. CrossGuard suggests opening 4 extra e-gates.',
    a: 'Approve', b: 'Reject', right: 'a', why: 'Clear explanation and a reversible action. A person approved it, which is the point.',
  },
  {
    text: 'Risk 95 from a single sensor. Its three neighbours read normal.',
    a: 'Act now: slow all trains', b: 'Verify on CCTV first', right: 'b', why: 'One sensor disagreeing with its neighbours is a fault or spoofing. Check before acting.',
  },
  {
    text: 'During smoke on Platform 2, CrossGuard suggests overriding the fire shutters to reopen Exit C.',
    a: 'Approve', b: 'Reject', right: 'b', why: 'CrossGuard may never control fire or life-safety systems. This is a hard limit built into the design.',
  },
];

const REFLECT = [
  'What was the most important decision you made, and why?',
  'Why can a crowd model never be 100% accurate?',
  'What could go wrong if CrossGuard acted without a human operator?',
];

const scrollTop = () => document.querySelector('.sheet-body')?.scrollTo({ top: 0, behavior: 'smooth' });

export default function Surge({ onDone }: { onDone: () => void }) {
  const { state, update, earn } = useStore();
  const [task, setTaskRaw] = useState(-1);
  const setTask = (n: number) => {
    setTaskRaw(n);
    scrollTop();
  };
  const [picked, setPicked] = useState<string[]>([]);
  const [searchDone, setSearchDone] = useState(false);
  const [clean, setClean] = useState<(Clean | null)[]>(RECORDS.map(() => null));
  const [cleanDone, setCleanDone] = useState(false);
  const [arch, setArch] = useState<Arch | null>(null);
  const [epoch, setEpoch] = useState(0);
  const [training, setTraining] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [deploy, setDeploy] = useState<('a' | 'b' | null)[]>(DEPLOY.map(() => null));
  const [finished, setFinished] = useState(false);

  const chosen = SOURCES.filter((s) => picked.includes(s.id));
  const useful = chosen.reduce((a, s) => a + s.useful, 0) / MAX_USEFUL;
  const cleanScore = clean.filter((c, i) => c === RECORDS[i].answer).length / RECORDS.length;
  const archDef = ARCHS.find((a) => a.id === arch);
  const noise = picked.includes('social') ? 3 : 0;
  const accuracy = Math.round(Math.max(40, 50 + 40 * Math.min(1, useful) * (0.55 + 0.45 * cleanScore) * (archDef?.factor ?? 1) - noise));
  const privacyOk = !picked.includes('ids') && !picked.includes('faces') && cleanScore >= 0.75 && clean[5] === 'remove' && (archDef?.ok ?? false);
  const fairOk = !picked.includes('nation');
  const accOk = accuracy >= 80;
  const allOk = privacyOk && fairOk && accOk;

  // training animation
  useEffect(() => {
    if (!training) return;
    if (epoch >= 30) {
      setTraining(false);
      return;
    }
    const t = window.setTimeout(() => setEpoch((e) => e + 1), 70);
    return () => window.clearTimeout(t);
  }, [training, epoch]);

  const loss = useMemo(() => {
    const floor = 1 - accuracy / 100;
    return Array.from({ length: epoch + 1 }, (_, i) => +(floor + (0.95 - floor) * Math.exp(-i / 6) + Math.sin(i * 1.7) * 0.012).toFixed(3));
  }, [epoch, accuracy]);

  const test = useMemo(() => {
    const cf = counterfactual(CROSSINGS[0], 'golden', 90);
    const actual = cf.ticks.filter((_, i) => i % 3 === 0).map((t) => t.cri);
    const err = (100 - accuracy) / 100;
    const pred = actual.map((v, i) => Math.max(0, Math.min(100, Math.round(v + Math.sin(i * 1.3) * 22 * err - (i > 12 ? 30 * err : 0)))));
    return { actual, pred, labels: actual.map((_, i) => `${17 + Math.floor((i * 3) / 60)}:${String((i * 3) % 60).padStart(2, '0')}`) };
  }, [accuracy]);

  const deployScore = deploy.filter((d, i) => d === DEPLOY[i].right).length;

  const finish = () => {
    if (finished) return;
    setFinished(true);
    const bonus = Math.max(0, accuracy - 80) * 5 + deployScore * 30 - attempts * 20;
    if (!state.questsDone.includes('surge')) {
      update((s) => ({ ...s, questsDone: [...s.questsDone, 'surge'] }));
      earn('bonus', 'Quest complete: Golden Week Surge', 400 + Math.max(0, bonus));
    }
  };

  if (task === -1) {
    return (
      <div className="quest-body">
        <div className="scene-card surge-scene">
          <div className="scene-sky" aria-hidden="true">
            <span className="scene-train" />
          </div>
          <div className="scene-text">
            <div className="kicker">Mission Control · 落馬洲</div>
            <h3>Golden Week starts tomorrow.</h3>
            <p>
              Over a million trips will cross between Shenzhen and Hong Kong this week. Last year a crowd built up on the B2 concourse at Lok Ma Chau
              faster than staff could see it. Operators on each side use different data, procedures and laws.
            </p>
          </div>
        </div>
        <Mentor>
          Your job: build CrossGuard, an AI that warns operators before a crowd becomes dangerous. You will make the same decisions real AI teams make.
          There is more than one reasonable path, and you can go back if testing goes badly.
        </Mentor>
        <Steps labels={TASKS} at={-1} />
        <button className="btn primary big" onClick={() => setTask(0)}>
          Start the quest
        </button>
      </div>
    );
  }

  return (
    <div className="quest-body">
      <Steps labels={TASKS} at={finished ? TASKS.length : task} />

      {task === 0 && (
        <section>
          <Mentor mood="think">
            Pick up to <b>five</b> data sources to train on. Think about what actually predicts a crowd, and what you are allowed to use.
          </Mentor>
          <div className="source-grid">
            {SOURCES.map((s) => {
              const on = picked.includes(s.id);
              return (
                <button
                  key={s.id}
                  className={`source ${on ? 'on' : ''} ${searchDone && s.flag ? `flag-${s.flag}` : ''}`}
                  disabled={searchDone || (!on && picked.length >= 5)}
                  onClick={() => setPicked((p) => (on ? p.filter((x) => x !== s.id) : [...p, s.id]))}
                  aria-pressed={on}
                >
                  <b>{s.name}</b>
                  <span className="zh">{s.zh}</span>
                  {searchDone && <small>{s.note}</small>}
                </button>
              );
            })}
          </div>
          {!searchDone ? (
            <button className="btn primary" disabled={picked.length === 0} onClick={() => setSearchDone(true)}>
              {`Use these ${picked.length} source${picked.length === 1 ? '' : 's'}`}
            </button>
          ) : (
            <>
              <Ticket title="Not all data is equally useful">
                Useful signal collected: <b>{Math.round(Math.min(1, useful) * 100)}%</b>.{' '}
                {chosen.some((s) => s.flag === 'privacy') && 'Some of your sources identify people. A crowd model never needs to know who someone is. '}
                {chosen.some((s) => s.flag === 'bias') && 'Nationality adds bias, not accuracy. '}
                {chosen.some((s) => s.flag === 'noise') && 'Social media is noisy and easy to fake. '}
                {!chosen.some((s) => s.flag) && 'Every source you chose is relevant and lawful. Nice. '}
                Human choices here decide what the model can learn.
              </Ticket>
              <div className="cta-row">
                <button className="btn primary" onClick={() => setTask(1)}>
                  Next: clean the data
                </button>
                <button className="btn ghost" onClick={() => setSearchDone(false)}>
                  Change my picks
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {task === 1 && (
        <section>
          <Mentor mood="think">Raw data is messy. For each record, keep it, fix it, or remove it.</Mentor>
          <ul className="records">
            {RECORDS.map((r, i) => (
              <li key={i} className={cleanDone ? (clean[i] === r.answer ? 'right' : 'wrong') : ''}>
                <code>{r.text}</code>
                <div className="seg small">
                  {(['keep', 'fix', 'remove'] as Clean[]).map((c) => (
                    <button key={c} className={clean[i] === c ? 'on' : ''} disabled={cleanDone} onClick={() => setClean((x) => x.map((v, k) => (k === i ? c : v)))}>
                      {c[0].toUpperCase() + c.slice(1)}
                    </button>
                  ))}
                </div>
                {cleanDone && <small>{clean[i] === r.answer ? '✓ ' : `✗ Best: ${r.answer}. `}{r.why}</small>}
              </li>
            ))}
          </ul>
          {!cleanDone ? (
            <button className="btn primary" disabled={clean.some((c) => c === null)} onClick={() => setCleanDone(true)}>
              Check my cleaning
            </button>
          ) : (
            <>
              <Ticket title="Clean data, better predictions">
                You cleaned {Math.round(cleanScore * 100)}% of records correctly. Glitches and duplicates teach the model things that never happened, and raw
                faces create privacy risk without adding accuracy.
              </Ticket>
              <div className="cta-row">
                <button className="btn primary" onClick={() => setTask(2)}>
                  Next: where does the data live?
                </button>
                <button className="btn ghost" onClick={() => setCleanDone(false)}>
                  Redo cleaning
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {task === 2 && (
        <section>
          <Mentor mood="think">Data comes from two jurisdictions with different laws. Where should training happen?</Mentor>
          <div className="arch-grid">
            {ARCHS.map((a) => (
              <button key={a.id} className={`arch ${arch === a.id ? 'on' : ''}`} onClick={() => setArch(a.id)} aria-pressed={arch === a.id}>
                <ArchPic id={a.id} />
                <b>{a.name}</b>
                <span>{a.text}</span>
              </button>
            ))}
          </div>
          {archDef && (
            <>
              <Ticket title={archDef.ok ? (archDef.factor < 1 ? 'Safe, with a cost' : 'Data stays home') : 'Compliance problem'}>{archDef.verdict}</Ticket>
              <button className="btn primary" onClick={() => setTask(3)}>
                Next: train the model
              </button>
            </>
          )}
        </section>
      )}

      {task === 3 && (
        <section>
          <Mentor>
            Training means showing the model many past days so it learns which patterns came before a dangerous crowd. Each pass is an epoch, and the
            error should fall.
          </Mentor>
          <div className="train-box">
            <Legend items={[{ name: 'Training error', color: 'var(--s1)' }]} />
            <LineChart ariaLabel="Training error by epoch" labels={loss.map((_, i) => `E${i}`)} series={[{ name: 'Error', color: 'var(--s1)', values: loss }]} yMax={1} height={170} />
            <div className="train-stats">
              <span>
                Epoch <b className="tnum">{epoch}</b>/30
              </span>
              <span>
                Final error <b className="tnum">{loss[loss.length - 1].toFixed(2)}</b>
              </span>
            </div>
          </div>
          {epoch < 30 ? (
            <button className="btn primary" disabled={training} onClick={() => setTraining(true)}>
              {training ? 'Training…' : 'Train the model'}
            </button>
          ) : (
            <button className="btn primary" onClick={() => setTask(4)}>
              Next: test it on real history
            </button>
          )}
        </section>
      )}

      {task === 4 && (
        <section>
          <Mentor mood={allOk ? 'happy' : 'alert'}>
            We replay last Golden Week, which the model has never seen, and compare its predictions with what really happened.
          </Mentor>
          <Legend
            items={[
              { name: 'What really happened (risk index)', color: 'var(--s2)' },
              { name: 'Your model predicted', color: 'var(--s1)', dashed: true },
            ]}
          />
          <LineChart
            ariaLabel="Predicted vs actual crowd risk"
            labels={test.labels}
            series={[
              { name: 'Actual', color: 'var(--s2)', values: test.actual },
              { name: 'Predicted', color: 'var(--s1)', values: test.pred, dashed: true },
            ]}
            yMax={100}
            threshold={{ value: 70, label: 'Alert 70' }}
            height={190}
          />
          <div className="checks3">
            <Check ok={accOk} label="Accuracy" value={`${accuracy}%`} need="80% needed" />
            <Check ok={privacyOk} label="Privacy" value={privacyOk ? 'Pass' : 'Fail'} need="No identities, data stays home" />
            <Check ok={fairOk} label="Fairness" value={fairOk ? 'Pass' : 'Fail'} need="No group-based features" />
          </div>
          {allOk ? (
            <>
              <Ticket title="Good enough is not perfect">
                {accuracy}% is strong, but crowds are messy and no model is 100% right. That is why CrossGuard recommends and a person decides.
              </Ticket>
              <button className="btn primary" onClick={() => setTask(5)}>
                Next: deploy with a human in the loop
              </button>
            </>
          ) : (
            <>
              <Ticket title="AI development is a loop">
                Real teams go back and improve their data when testing fails.{' '}
                {!accOk && 'Accuracy is too low: pick more useful sources or clean more carefully. '}
                {!privacyOk && 'Privacy fails: remove identity data, drop raw faces and keep data in its home jurisdiction. '}
                {!fairOk && 'Fairness fails: nationality must not be a feature. '}
              </Ticket>
              <div className="cta-row">
                <button className="btn primary" onClick={() => { setAttempts((a) => a + 1); setSearchDone(false); setEpoch(0); setTask(0); }}>
                  Back to data search
                </button>
                <button className="btn" onClick={() => { setAttempts((a) => a + 1); setCleanDone(false); setEpoch(0); setTask(1); }}>
                  Back to cleaning
                </button>
                <button className="btn" onClick={() => { setAttempts((a) => a + 1); setEpoch(0); setTask(2); }}>
                  Back to architecture
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {task === 5 && !finished && (
        <section>
          <Mentor>
            CrossGuard is live in advisory mode. You are the duty operator. Each recommendation comes with its reasons. Decide.
          </Mentor>
          <ul className="deploy">
            {DEPLOY.map((d, i) => (
              <li key={i} className={deploy[i] ? (deploy[i] === d.right ? 'right' : 'wrong') : ''}>
                <p>{d.text}</p>
                <div className="cta-row">
                  {(['a', 'b'] as const).map((k) => (
                    <button key={k} className={`btn small ${deploy[i] === k ? 'primary' : ''}`} disabled={!!deploy[i]} onClick={() => setDeploy((x) => x.map((v, j) => (j === i ? k : v)))}>
                      {d[k]}
                    </button>
                  ))}
                </div>
                {deploy[i] && <small>{deploy[i] === d.right ? '✓ ' : '✗ '}{d.why}</small>}
              </li>
            ))}
          </ul>
          <button className="btn primary" disabled={deploy.some((d) => !d)} onClick={finish}>
            End the shift
          </button>
        </section>
      )}

      {finished && (
        <section className="finale">
          <div className="badge-big">
            <span>Crowd Guardian</span>
            <small>守護者徽章</small>
          </div>
          <h3>CrossGuard is ready for its pilot.</h3>
          <p className="muted">
            {`Accuracy ${accuracy}% · ${deployScore}/3 operator calls right · ${attempts} trip${attempts === 1 ? '' : 's'} back through the loop.`} In the full
            simulation it warns about 10 minutes before manual monitoring.
          </p>
          <div className="seals3">
            {['香港 HK', '澳門 MO', '內地 GBA'].map((s) => (
              <span key={s} className="seal3">
                {s}
                <b>CERTIFIED</b>
              </span>
            ))}
          </div>
          <h4 className="h4">Reflect</h4>
          {REFLECT.map((q, i) => (
            <label key={q} className="field">
              <span>{q}</span>
              <textarea
                id={`surge-r${i}`}
                rows={2}
                value={state.reflections[`surge-${i}`] ?? ''}
                onChange={(e) => update((s) => ({ ...s, reflections: { ...s.reflections, [`surge-${i}`]: e.target.value } }))}
              />
            </label>
          ))}
          <button className="btn primary" onClick={onDone}>
            Back to the map
          </button>
        </section>
      )}
    </div>
  );
}

function Check({ ok, label, value, need }: { ok: boolean; label: string; value: string; need: string }) {
  return (
    <div className={`check3 ${ok ? 'ok' : 'bad'}`}>
      <span>{label}</span>
      <b>{value}</b>
      <small>
        {ok ? '✓' : '✗'} {need}
      </small>
    </div>
  );
}

function ArchPic({ id }: { id: Arch }) {
  const node = (x: number, label: string) => (
    <g>
      <rect x={x} y="22" width="34" height="22" rx="6" fill="#fff" stroke="#0d3b52" strokeWidth="2" />
      <text x={x + 17} y="37" textAnchor="middle" fontSize="10" fontWeight="700" fill="#0d3b52">
        {label}
      </text>
    </g>
  );
  return (
    <svg viewBox="0 0 160 60" className="archpic" aria-hidden="true">
      {node(8, 'HK')}
      {node(118, 'SZ')}
      {id === 'central' && (
        <>
          <rect x="63" y="4" width="34" height="20" rx="6" fill="#e04848" />
          <text x="80" y="18" textAnchor="middle" fontSize="9" fill="#fff" fontWeight="700">
            ALL
          </text>
          <path d="M42 30 L63 16 M118 30 L97 16" stroke="#e04848" strokeWidth="2.5" />
        </>
      )}
      {id === 'federated' && <path d="M44 33 H116" stroke="#1baf7a" strokeWidth="2.5" strokeDasharray="5 4" />}
      {id === 'local' && <path d="M70 26 L90 40 M90 26 L70 40" stroke="#9aa9a5" strokeWidth="2.5" />}
    </svg>
  );
}
