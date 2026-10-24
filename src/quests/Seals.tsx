import React, { useState } from 'react';
import { useStore } from '../store';
import { Mentor, Steps, Ticket } from '../components/kit';
import type { Region } from '../data/regimes';

const TASKS = ['Classify by risk', 'Map the obligations', 'Certify three times'];
type Tier = 'Minimal' | 'Limited' | 'High' | 'Unacceptable';
const TIERS: Tier[] = ['Minimal', 'Limited', 'High', 'Unacceptable'];

const USES: { name: string; zh: string; tier: Tier; why: string }[] = [
  { name: 'Cantonese spam filter for a school inbox', zh: '粵語垃圾郵件過濾', tier: 'Minimal', why: 'Low impact on safety or rights.' },
  { name: 'Tourist chatbot for the HZMB shuttle', zh: '港珠澳大橋旅客聊天機械人', tier: 'Limited', why: 'People must be told they are talking to an AI, and outputs need filtering.' },
  { name: 'CrossGuard crowd-risk prediction', zh: '口岸人流風險預測', tier: 'High', why: 'Public safety at stake: needs human oversight, testing and audits.' },
  { name: 'Scoring travellers’ “trustworthiness” from their social media', zh: '以社交媒體為旅客評分', tier: 'Unacceptable', why: 'Social scoring of individuals should not be built at all.' },
];

const OBLIGATIONS: { topic: string; zh: string; options: Record<Region, string>; strictest: Region; control: string }[] = [
  {
    topic: 'Moving personal data across the border', zh: '個人資料跨境',
    options: {
      HK: 'Use data only for the purpose it was collected for, unless the person consents.',
      MO: 'Transfer out of Macau only with adequate protection or the authority’s approval.',
      CN: 'A lawful transfer route (security assessment, standard contract or certification) plus an impact assessment.',
    },
    strictest: 'CN', control: 'Keep personal data local: edge processing and federated learning.',
  },
  {
    topic: 'Algorithm transparency', zh: '算法透明',
    options: {
      HK: 'Explain AI use in the privacy policy.',
      MO: 'Tell people what their data is used for.',
      CN: 'File the algorithm with the regulator and publish how it works.',
    },
    strictest: 'CN', control: 'Public register and trilingual model cards.',
  },
  {
    topic: 'Human oversight', zh: '人工監督',
    options: {
      HK: 'A human in the loop for high-risk decisions, with a named accountable officer.',
      MO: 'People can object to purely automated decisions.',
      CN: 'Users can switch off personalised recommendations.',
    },
    strictest: 'HK', control: 'Human-in-the-loop; named accountable officer.',
  },
  {
    topic: 'AI-generated content', zh: 'AI生成內容',
    options: {
      HK: 'Disclosure of AI-generated content is recommended.',
      MO: 'No specific rule yet.',
      CN: 'Visible and embedded labels, plus a content safety review.',
    },
    strictest: 'CN', control: 'Template-bound notices, labelled and operator-approved.',
  },
];

const REGION_NAME: Record<Region, string> = { HK: 'Hong Kong', MO: 'Macau', CN: 'Mainland' };

const scrollTop = () => document.querySelector('.sheet-body')?.scrollTo({ top: 0, behavior: 'smooth' });

export default function Seals({ onDone }: { onDone: () => void }) {
  const { state, update, earn } = useStore();
  const [task, setTaskRaw] = useState(0);
  const setTask = (n: number) => {
    setTaskRaw(n);
    scrollTop();
  };
  const [tiers, setTiers] = useState<(Tier | null)[]>(USES.map(() => null));
  const [checked1, setChecked1] = useState(false);
  const [picks, setPicks] = useState<(Region | null)[]>(OBLIGATIONS.map(() => null));
  const [checked2, setChecked2] = useState(false);
  const [stamped, setStamped] = useState(0);

  const tierScore = tiers.filter((t, i) => t === USES[i].tier).length;
  const mapScore = picks.filter((p, i) => p === OBLIGATIONS[i].strictest).length;

  const stamp = () => {
    const n = stamped + 1;
    setStamped(n);
    if (n === 3 && !state.questsDone.includes('seals')) {
      update((s) => ({ ...s, questsDone: [...s.questsDone, 'seals'] }));
      earn('bonus', 'Quest complete: Three Seals Island', 150 + (tierScore + mapScore) * 15);
    }
  };

  return (
    <div className="quest-body">
      <Steps labels={TASKS} at={task} />
      {task === 0 && (
        <section>
          <Mentor mood="think">
            Step one of the Harmonisation Model: <b>classify</b>. How much could each AI use harm safety or rights?
          </Mentor>
          <ul className="records">
            {USES.map((u, i) => (
              <li key={u.name} className={checked1 ? (tiers[i] === u.tier ? 'right' : 'wrong') : ''}>
                <div>
                  <b>{u.name}</b> <span className="zh">{u.zh}</span>
                </div>
                <div className="seg small">
                  {TIERS.map((t) => (
                    <button key={t} className={tiers[i] === t ? 'on' : ''} disabled={checked1} onClick={() => setTiers((x) => x.map((v, k) => (k === i ? t : v)))}>
                      {t}
                    </button>
                  ))}
                </div>
                {checked1 && <small>{tiers[i] === u.tier ? '✓ ' : `✗ Best: ${u.tier}. `}{u.why}</small>}
              </li>
            ))}
          </ul>
          {!checked1 ? (
            <button className="btn primary" disabled={tiers.some((t) => !t)} onClick={() => setChecked1(true)}>
              Check
            </button>
          ) : (
            <>
              <Ticket title="Risk decides the rules">
                {tierScore}/4 right. Higher tiers carry more obligations: a high-risk system needs human oversight, testing and audits before it goes live.
              </Ticket>
              <button className="btn primary" onClick={() => setTask(1)}>
                Next: map the obligations
              </button>
            </>
          )}
        </section>
      )}

      {task === 1 && (
        <section>
          <Mentor mood="think">
            CrossGuard is high-risk and crosses three systems. For each topic, pick the <b>strictest</b> rule. Meeting it once satisfies all three.
          </Mentor>
          <div className="oblig">
            {OBLIGATIONS.map((o, i) => (
              <div key={o.topic} className="oblig-row">
                <h4>
                  {o.topic} <span className="zh">{o.zh}</span>
                </h4>
                <div className="oblig-opts">
                  {(Object.keys(o.options) as Region[]).map((r) => {
                    const on = picks[i] === r;
                    const cls = checked2 ? (r === o.strictest ? 'right' : on ? 'wrong' : '') : on ? 'on' : '';
                    return (
                      <button key={r} className={`oblig-opt ${cls}`} disabled={checked2} onClick={() => setPicks((x) => x.map((v, k) => (k === i ? r : v)))}>
                        <span className={`region region-${r}`}>{REGION_NAME[r]}</span>
                        <span>{o.options[r]}</span>
                      </button>
                    );
                  })}
                </div>
                {checked2 && (
                  <p className="control-line">
                    Common control → <b>{o.control}</b>
                  </p>
                )}
              </div>
            ))}
          </div>
          {!checked2 ? (
            <button className="btn primary" disabled={picks.some((p) => !p)} onClick={() => setChecked2(true)}>
              Check
            </button>
          ) : (
            <>
              <Ticket title="Comply once, certify three times">
                {mapScore}/4 right. The strictest rule is not always from the same place: oversight comes from Hong Kong, data transfer and labelling from
                the mainland. One design meets all of them.
              </Ticket>
              <button className="btn primary" onClick={() => setTask(2)}>
                Next: collect the seals
              </button>
            </>
          )}
        </section>
      )}

      {task === 2 && (
        <section className="finale">
          <Mentor>
            The Joint Review Panel has officers from all three jurisdictions. Each one checks the same common controls. Press each seal to stamp CrossGuard’s
            certificate.
          </Mentor>
          <div className="seal-row">
            {(['HK', 'MO', 'CN'] as Region[]).map((r, i) => (
              <button key={r} className={`big-seal ${i < stamped ? 'stamped' : ''}`} disabled={i !== stamped} onClick={stamp}>
                <span>{r === 'HK' ? '香港' : r === 'MO' ? '澳門' : '內地'}</span>
                <b>{i < stamped ? 'CERTIFIED' : 'Stamp'}</b>
              </button>
            ))}
          </div>
          {stamped === 3 && (
            <>
              <div className="badge-big">
                <span>Harmoniser</span>
                <small>協調者徽章</small>
              </div>
              <p className="muted">The same four steps work for other cross-border services, such as AI triage for Hong Kong patients treated in GBA cities.</p>
              <button className="btn primary" onClick={onDone}>
                Back to the map
              </button>
            </>
          )}
        </section>
      )}
    </div>
  );
}
