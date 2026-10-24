import React, { useMemo, useState } from 'react';
import { CATEGORY_LABEL, SAMPLES, decide, tradeoffCurve, type Decision, type Verdict } from '../data/guard';
import { REGION_LABEL, type Region } from '../data/regimes';
import { useStore } from '../store';
import { LineChart, Legend } from '../components/charts';
import { PageHead, RegionTag } from '../components/ui';

const VERDICT: Record<Verdict, { label: string; zh: string; kind: string; text: string }> = {
  pass: { label: 'Pass', zh: '放行', kind: 'good', text: 'Delivered unchanged and logged.' },
  redact: { label: 'Redact', zh: '遮蔽', kind: 'info', text: 'Delivered with identifiers masked.' },
  escalate: { label: 'Escalate', zh: '轉介', kind: 'warning', text: 'Held for a human reviewer.' },
  block: { label: 'Block', zh: '攔截', kind: 'critical', text: 'Rejected and returned to sender.' },
};

interface LogRow {
  at: string;
  from: Region;
  to: Region;
  verdict: Verdict;
  rules: string;
  digest: string;
}

function digest(s: string): string {
  let h = 5381;
  for (const ch of s) h = ((h << 5) + h + ch.charCodeAt(0)) >>> 0;
  return h.toString(16).padStart(8, '0');
}

function Highlighted({ text, d }: { text: string; d: Decision }) {
  const parts: React.ReactNode[] = [];
  let at = 0;
  const hits = d.hits.filter((h, i, a) => !a.slice(0, i).some((p) => h.start < p.end && h.end > p.start));
  hits.forEach((h, i) => {
    if (h.start > at) parts.push(text.slice(at, h.start));
    parts.push(
      <mark key={i} className={`hl hl-${h.category}`} title={`${CATEGORY_LABEL[h.category]}: ${h.label}`}>
        {text.slice(h.start, h.end)}
        <sub>{h.label}</sub>
      </mark>,
    );
    at = h.end;
  });
  if (at < text.length) parts.push(text.slice(at));
  return <p className="highlighted">{parts}</p>;
}

export default function Guard() {
  const { state, update, earn } = useStore();
  const [text, setText] = useState(SAMPLES[0].text);
  const [from, setFrom] = useState<Region>(SAMPLES[0].from);
  const [to, setTo] = useState<Region>(SAMPLES[0].to);
  const [strict, setStrict] = useState(20);
  const [log, setLog] = useState<LogRow[]>([]);
  const [reported, setReported] = useState<Set<string>>(new Set());

  const d = useMemo(() => decide(text, from, to, strict), [text, from, to, strict]);
  const curve = useMemo(() => tradeoffCurve(21), []);
  const nearest = Math.round(strict / 5);
  const here = curve[nearest];

  const send = () => {
    const row: LogRow = {
      at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      from,
      to,
      verdict: d.verdict,
      rules: d.hits.length ? [...new Set(d.hits.map((h) => h.label))].join(', ') : 'none',
      digest: digest(text),
    };
    setLog((l) => [row, ...l].slice(0, 8));
  };

  const report = () => {
    const key = digest(text);
    if (reported.has(key) || state.guardChecks >= 3) return;
    setReported((r) => new Set(r).add(key));
    update((s) => ({ ...s, guardChecks: s.guardChecks + 1 }));
    earn('bonus', 'Responsible disclosure: filter bypass reported', 30);
  };

  const pick = (i: number) => {
    const s = SAMPLES[i];
    setText(s.text);
    setFrom(s.from);
    setTo(s.to);
  };

  const sweet = here.leaked <= 12 && here.overblocked <= 15;
  const solve = () => {
    if (state.filterSolved) return;
    update((s) => ({ ...s, filterSolved: true }));
    earn('bonus', 'Filter Forge: sweet spot found', 200);
  };

  const v = VERDICT[d.verdict];
  const bountyLeft = Math.max(0, 3 - state.guardChecks);

  return (
    <div className="view">
      <PageHead kicker="Govern · interception & filtering" title="Cross-border Filter" zh="跨境攔截過濾">
        Every prompt and output that crosses a GBA border passes this layer. It finds Hong Kong, Macau and mainland identifiers, prompt injections,
        unverified safety claims and deepfake requests, then passes, masks, escalates or blocks. Slide between openness and security to see what
        changes.
      </PageHead>

      <div className="guard-grid">
        <div className="panel min0">
          <div className="samples">
            <span className="muted">Try a sample</span>
            <div className="chips">
              {SAMPLES.slice(0, 10).map((s, i) => (
                <button key={s.label} className="chip" onClick={() => pick(i)}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <label className="field">
            <span>Prompt or model output</span>
            <textarea id="guard-text" rows={4} value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} />
          </label>
          <div className="field-row">
            <label className="field">
              <span>From</span>
              <select id="guard-from" value={from} onChange={(e) => setFrom(e.target.value as Region)}>
                {(Object.keys(REGION_LABEL) as Region[]).map((r) => (
                  <option key={r} value={r}>
                    {REGION_LABEL[r].en}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>To</span>
              <select id="guard-to" value={to} onChange={(e) => setTo(e.target.value as Region)}>
                {(Object.keys(REGION_LABEL) as Region[]).map((r) => (
                  <option key={r} value={r}>
                    {REGION_LABEL[r].en}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="slider-block">
            <div className="slider-labels">
              <span>Openness 開放</span>
              <b className="tnum">{strict}</b>
              <span>Security 安全</span>
            </div>
            <input id="guard-strict" type="range" min={0} max={100} step={5} value={strict} onChange={(e) => setStrict(Number(e.target.value))} aria-label="Openness to security" className="os-slider" />
          </div>
        </div>

        <div className={`panel verdict-panel vp-${v.kind} min0`}>
          <div className="vp-head">
            <div>
              <div className="kicker">Decision</div>
              <div className="vp-verdict">
                {v.label} <span className="zh">{v.zh}</span>
              </div>
              <div className="muted">{v.text}</div>
            </div>
            <div className="route-mini">
              <RegionTag region={from} /> → <RegionTag region={to} />
              {from !== to && <small>cross-border</small>}
            </div>
          </div>
          <h4 className="h4">Detected</h4>
          {d.hits.length ? <Highlighted text={text} d={d} /> : <p className="muted">Nothing detected.</p>}
          <h4 className="h4">Why</h4>
          <ul className="reasons">
            {d.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          {d.verdict !== 'block' && (
            <>
              <h4 className="h4">{d.verdict === 'escalate' ? 'Held for review' : 'Delivered'}</h4>
              <pre className="out">{d.redacted}</pre>
            </>
          )}
          <div className="cta-row">
            <button className="btn primary" onClick={send}>
              Send through the filter
            </button>
            {d.verdict === 'pass' && (
              <button className="btn" onClick={report} disabled={bountyLeft === 0 || reported.has(digest(text))}>
                Report a bypass (+30) · {bountyLeft} left
              </button>
            )}
          </div>
        </div>
      </div>

      <div className={`panel challenge ${sweet ? 'ok' : ''}`}>
        <div className="kicker">Quest challenge</div>
        <h3 className="h3">Find the sweet spot</h3>
        <p>
          Set the slider so that <b>no more than 12%</b> of harmful prompts pass untouched <b>and</b> <b>no more than 15%</b> of legitimate ones are held
          back. Right now: {here.leaked.toFixed(0)}% leak · {here.overblocked.toFixed(0)}% over-blocked.
        </p>
        {state.filterSolved ? (
          <p className="ok-line">Solved. The Filter Smith badge is yours.</p>
        ) : (
          <button className="btn primary" disabled={!sweet} onClick={solve}>
            {sweet ? 'Lock in this setting' : 'Not there yet: keep sliding'}
          </button>
        )}
      </div>

      <section className="block two-col">
        <div className="min0">
          <h2 className="h2">Openness vs security, measured</h2>
          <p className="muted">
            The same filter run across a labelled set of {SAMPLES.length} prompts at every setting. Moving right leaks less harmful content but holds
            back more legitimate requests. At <b>{strict}</b>: {here.leaked.toFixed(0)}% of harmful prompts pass untouched, {here.overblocked.toFixed(0)}%
            of benign ones are held or blocked.
          </p>
          <Legend
            items={[
              { name: 'Harmful prompts that pass (%)', color: 'var(--s2)' },
              { name: 'Benign prompts held or blocked (%)', color: 'var(--s1)' },
            ]}
          />
          <LineChart
            ariaLabel="Trade-off between harmful prompts leaked and benign prompts blocked across strictness settings"
            labels={curve.map((c) => String(c.s))}
            series={[
              { name: 'Harmful pass', color: 'var(--s2)', values: curve.map((c) => c.leaked) },
              { name: 'Benign held', color: 'var(--s1)', values: curve.map((c) => c.overblocked) },
            ]}
            yMax={100}
            unit="%"
            marker={{ index: nearest, label: `You: ${strict}` }}
          />
        </div>
        <div className="min0">
          <h2 className="h2">Audit log</h2>
          <p className="muted">Only a digest of the content is kept, never the text itself.</p>
          <div className="table-wrap">
            <table className="table log">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Route</th>
                  <th>Decision</th>
                  <th>Rules</th>
                  <th>Digest</th>
                </tr>
              </thead>
              <tbody>
                {log.map((r, i) => (
                  <tr key={i}>
                    <td className="tnum">{r.at}</td>
                    <td>
                      {REGION_LABEL[r.from].short}→{REGION_LABEL[r.to].short}
                    </td>
                    <td>
                      <span className={`status status-${VERDICT[r.verdict].kind}`}>{VERDICT[r.verdict].label}</span>
                    </td>
                    <td>{r.rules}</td>
                    <td className="mono">{r.digest}</td>
                  </tr>
                ))}
                {!log.length && (
                  <tr>
                    <td colSpan={5} className="muted">
                      Press “Send through the filter” to write the first entry.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
