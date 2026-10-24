import React, { useEffect, useMemo, useState } from 'react';
import {
  CERT_RULES,
  DIMENSIONS,
  MATURITY,
  PROJECTS,
  TIERS,
  certifies,
  tierGaps,
  trustScore,
  type Dimension,
  type Project,
  type Scores,
  type SubmittedProject,
  type Tier,
} from '../data/projects';
import { REGION_LABEL, type Region } from '../data/regimes';
import { useStore } from '../store';
import { Radar } from '../components/charts';
import { Icon, PageHead, Pts, RegionTag, SimNote, Status } from '../components/ui';

const CHECKS: { id: string; label: string; adds: Partial<Record<Dimension, number>> }[] = [
  { id: 'modelCard', label: 'Model card in the repo (purpose, data, limits)', adds: { transparency: 2 } },
  { id: 'register', label: 'Listed on a public algorithm register', adds: { transparency: 1 } },
  { id: 'localData', label: 'Personal data processed in its home jurisdiction', adds: { localisation: 3 } },
  { id: 'humanOverride', label: 'A named person can review and override outputs', adds: { oversight: 3 } },
  { id: 'contentFilter', label: 'Input/output filter and AI-content labels', adds: { safety: 3 } },
  { id: 'redTeam', label: 'Red-team tests (injection, spoofed data)', adds: { robustness: 2 } },
  { id: 'secretScan', label: 'Secret scanning on, no keys in history', adds: { robustness: 1 } },
  { id: 'biasTest', label: 'Bias tests across groups and languages', adds: { fairness: 3 } },
  { id: 'osi', label: 'OSI-approved licence and reproducible setup', adds: { openness: 3 } },
];

const PIPELINE = ['Licence detected', 'README and model card parsed', 'Secret scan of git history', 'PII scan of sample data', 'Dependency vulnerabilities', 'Evaluation report found'];

function hash(s: string): number {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

function scoreSubmission(repo: string, checks: Set<string>, maturity: number): Scores {
  const h = hash(repo.toLowerCase());
  const s = {} as Scores;
  DIMENSIONS.forEach((d, i) => {
    const jitter = ((h >>> (i * 3)) & 7) / 7; // 0..1 from the automated scan
    s[d.id] = 0.8 + jitter * 0.8;
  });
  for (const c of CHECKS) if (checks.has(c.id)) for (const [d, v] of Object.entries(c.adds)) s[d as Dimension] += v!;
  if (maturity >= 3) {
    s.robustness += 0.5;
    s.transparency += 0.5;
  }
  for (const d of DIMENSIONS) s[d.id] = Math.round(Math.min(5, s[d.id]) * 2) / 2;
  return s;
}

const RELEASE = [
  { name: 'Closed API', text: 'Access through an API only' },
  { name: 'Card + API', text: 'Model card and API published' },
  { name: 'Code open', text: 'Training and inference code open' },
  { name: 'Weights open', text: 'Licensed weights downloadable' },
  { name: 'Fully open', text: 'Weights, code and training data' },
];
const RELEASE_MAX: Record<Tier, number> = { Minimal: 4, Limited: 3, High: 2, Unacceptable: 0 };

const CERT_ZH: Record<Region, string> = { HK: '香港', MO: '澳門', CN: '內地' };

function CertStamps({ scores }: { scores: Scores }) {
  return (
    <div className="certs">
      {(Object.keys(CERT_RULES) as Region[]).map((r) => {
        const c = certifies(r, scores);
        return (
          <div key={r} className={`cert ${c.pass ? 'pass' : 'fail'}`} title={CERT_RULES[r].basis}>
            <div className="cert-ring">
              <span>{CERT_ZH[r]}</span>
              <b>{c.pass ? 'CERTIFIED' : 'GAPS'}</b>
            </div>
            <small>
              {REGION_LABEL[r].en} · {c.avg.toFixed(1)}/{CERT_RULES[r].min}
            </small>
          </div>
        );
      })}
    </div>
  );
}

function ProjectDetail({ p, onClose }: { p: Project; onClose?: () => void }) {
  const [release, setRelease] = useState(Math.min(3, RELEASE_MAX[p.tier]));
  useEffect(() => setRelease(Math.min(3, RELEASE_MAX[p.tier])), [p.id, p.tier]);
  const ts = trustScore(p.scores);
  const gaps = tierGaps(p.tier, p.scores);
  const minLayer = TIERS.find((t) => t.id === p.tier)!.min;
  const max = RELEASE_MAX[p.tier];
  const benefit = Math.round(15 + release * 21 * (0.6 + p.scores.openness / 12.5));
  const risk = Math.round(Math.min(100, release * (p.tier === 'High' ? 24 : p.tier === 'Limited' ? 15 : 9) * (1.4 - p.scores.safety / 10)));
  return (
    <div className="panel detail">
      <div className="detail-head">
        <div className="min0">
          <div className="kicker">
            {p.owner}/{p.id}
          </div>
          <h3 className="h2">{p.name}</h3>
          <p className="muted">{p.blurb}</p>
        </div>
        {onClose && (
          <button className="btn ghost" onClick={onClose}>
            Close
          </button>
        )}
      </div>
      <div className="detail-tags">
        <RegionTag region={p.region} />
        <Status kind={p.tier === 'High' ? 'warning' : p.tier === 'Unacceptable' ? 'critical' : 'neutral'}>{p.tier} risk</Status>
        <Status kind="info">
          L{p.maturity} {MATURITY[p.maturity - 1].name}
        </Status>
        <span className="trust-badge">
          Trust <b>{ts}</b>
        </span>
      </div>
      <div className="detail-grid">
        <div>
          <Radar
            axes={DIMENSIONS.map((d) => d.label.split(' ')[0])}
            layers={[
              { name: `${p.tier} tier minimum`, values: DIMENSIONS.map((d) => minLayer[d.id] ?? 0), color: 'var(--s2)', dashed: true },
              { name: p.name, values: DIMENSIONS.map((d) => p.scores[d.id]), color: 'var(--s1)' },
            ]}
          />
          <div className="legend">
            <span>
              <i style={{ background: 'var(--s1)' }} />
              {p.name}
            </span>
            <span>
              <i className="ring" style={{ borderColor: 'var(--s2)' }} />
              {p.tier} tier minimum{Object.keys(minLayer).length ? '' : ' (none)'}
            </span>
          </div>
        </div>
        <div className="min0">
          <h4 className="h4">Comply once, certify three times</h4>
          <CertStamps scores={p.scores} />
          <h4 className="h4">Tier requirements</h4>
          {gaps.length === 0 ? (
            <p className="ok-line">
              <Icon name="check" size={16} /> Meets every minimum for the {p.tier} tier.
            </p>
          ) : (
            <ul className="gaps">
              {gaps.map((g) => (
                <li key={g.dim}>
                  {DIMENSIONS.find((d) => d.id === g.dim)!.label}: {g.have} of {g.need} needed
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="openness">
        <h4 className="h4">Openness vs security · release level</h4>
        <input
          type="range"
          id={`release-${p.id}`}
          min={0}
          max={4}
          step={1}
          value={release}
          onChange={(e) => setRelease(Number(e.target.value))}
          aria-label="Release level"
        />
        <div className="release-steps">
          {RELEASE.map((r, i) => (
            <span key={r.name} className={`${i === release ? 'on' : ''} ${i > max ? 'over' : ''}`}>
              {r.name}
            </span>
          ))}
        </div>
        <div className="tradeoff-meters">
          <div>
            <span>Community reuse</span>
            <div className="meter">
              <div style={{ width: `${Math.min(100, benefit)}%`, background: 'var(--s1)' }} />
            </div>
            <b>{Math.min(100, benefit)}</b>
          </div>
          <div>
            <span>Misuse exposure</span>
            <div className="meter">
              <div style={{ width: `${risk}%`, background: 'var(--critical)' }} />
            </div>
            <b>{risk}</b>
          </div>
        </div>
        <p className={release > max ? 'warn-line' : 'muted'}>
          {release > max
            ? `Above the recommended ceiling for a ${p.tier}-risk system (${RELEASE[max].name}). Stage the release: share with vetted researchers first.`
            : `${RELEASE[release].text}. Within the recommended ceiling for ${p.tier}-risk systems (${RELEASE[max].name}).`}
        </p>
      </div>
    </div>
  );
}

function SubmitForm() {
  const { state, update, earn } = useStore();
  const [repo, setRepo] = useState('https://github.com/your-team/canto-safe-tutor');
  const [region, setRegion] = useState<Region>('HK');
  const [tier, setTier] = useState<Tier>('Limited');
  const [maturity, setMaturity] = useState<1 | 2 | 3 | 4>(2);
  const [checks, setChecks] = useState<Set<string>>(new Set(['modelCard', 'contentFilter', 'osi', 'secretScan']));
  const [running, setRunning] = useState(-1);
  const [result, setResult] = useState<SubmittedProject | null>(null);
  const [error, setError] = useState('');

  const match = repo.trim().match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/i) ?? repo.trim().match(/^([\w.-]+)\/([\w.-]+)$/);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!match) {
      setError('Enter a GitHub repository as github.com/owner/repo or owner/repo.');
      return;
    }
    if (tier === 'Unacceptable') {
      setError('Unacceptable-risk systems (social scoring, covert manipulation) cannot be listed or rewarded.');
      return;
    }
    if (state.projects.some((p) => p.id === match[2].toLowerCase())) {
      setError('You already shared this repository. Use “Sync stars” below to earn from new stars.');
      return;
    }
    setError('');
    setResult(null);
    setRunning(0);
  };

  useEffect(() => {
    if (running < 0 || !match) return;
    if (running < PIPELINE.length) {
      const t = window.setTimeout(() => setRunning(running + 1), 420);
      return () => window.clearTimeout(t);
    }
    const scores = scoreSubmission(repo, checks, maturity);
    const h = hash(repo);
    const proj: SubmittedProject = {
      id: match[2].toLowerCase(),
      name: match[2],
      owner: match[1],
      region,
      category: 'Community project',
      blurb: 'Shared through TrustLoop by you.',
      stars: 5 + (h % 40),
      downloads: 20 + (h % 300),
      maturity,
      tier,
      scores,
      adoptedBy: [],
      hoursSaved: 0,
      submittedAt: Date.now(),
      mine: true,
    };
    const ts = trustScore(scores);
    const bonus = Math.max(0, (ts - 50) * 3);
    update((s) => ({ ...s, projects: [proj, ...s.projects] }));
    earn('project', `Shared ${proj.owner}/${proj.name} (Trust ${ts})`, 150 + bonus);
    setResult(proj);
    setRunning(-1);
  }, [running]);

  const toggle = (id: string) =>
    setChecks((c) => {
      const n = new Set(c);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className="submit-wrap">
      <form className="panel submit" onSubmit={submit}>
        <h3 className="h3">
          <Icon name="github" /> Share an AI project
        </h3>
        <label className="field">
          <span>GitHub repository</span>
          <input id="repo" value={repo} onChange={(e) => setRepo(e.target.value)} spellCheck={false} />
        </label>
        <div className="field-row">
          <label className="field">
            <span>Home jurisdiction</span>
            <select id="region" value={region} onChange={(e) => setRegion(e.target.value as Region)}>
              {(Object.keys(REGION_LABEL) as Region[]).map((r) => (
                <option key={r} value={r}>
                  {REGION_LABEL[r].en}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Use-case risk tier</span>
            <select id="tier" value={tier} onChange={(e) => setTier(e.target.value as Tier)}>
              {TIERS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.id}: {t.text}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Maturity</span>
            <select id="maturity" value={maturity} onChange={(e) => setMaturity(Number(e.target.value) as 1 | 2 | 3 | 4)}>
              {MATURITY.map((m) => (
                <option key={m.level} value={m.level}>
                  L{m.level} {m.name}: {m.text}
                </option>
              ))}
            </select>
          </label>
        </div>
        <fieldset className="checks">
          <legend>Self-declared controls (checked against the repo)</legend>
          {CHECKS.map((c) => (
            <label key={c.id} className="check">
              <input type="checkbox" id={`chk-${c.id}`} checked={checks.has(c.id)} onChange={() => toggle(c.id)} />
              <span>{c.label}</span>
            </label>
          ))}
        </fieldset>
        {error && <p className="error">{error}</p>}
        <button className="btn primary" disabled={running >= 0}>
          {running >= 0 ? 'Auditing…' : 'Run audit and share'}
        </button>
        <SimNote>The demo simulates the repository scan from the URL; a live version would call the GitHub API and the audit runners.</SimNote>
      </form>

      <div className="min0">
        {running >= 0 && (
          <div className="panel pipeline">
            <h3 className="h3">Automated audit</h3>
            <ul>
              {PIPELINE.map((p, i) => (
                <li key={p} className={i < running ? 'done' : i === running ? 'run' : ''}>
                  <span className="pip" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        )}
        {result && (
          <>
            <div className="panel award">
              <b>Listed on the TrustLoop index.</b> Trust Score {trustScore(result.scores)} · earned{' '}
              <Pts n={150 + Math.max(0, (trustScore(result.scores) - 50) * 3)} sign />
            </div>
            <ProjectDetail p={result} />
          </>
        )}
        {running < 0 && !result && <MyProjects />}
      </div>
    </div>
  );
}

function MyProjects() {
  const { state, update, earn } = useStore();
  if (!state.projects.length)
    return (
      <div className="panel empty">
        <h3 className="h3">Your shared projects</h3>
        <p className="muted">
          Nothing shared yet. Paste a repository on the left, tick the controls you really have, and run the audit. You earn 150 points plus a
          bonus for every Trust Score point above 50, and 2 points for every new GitHub star after that.
        </p>
      </div>
    );
  const sync = (p: SubmittedProject) => {
    const add = 3 + Math.floor(Math.random() * 22);
    update((s) => ({ ...s, projects: s.projects.map((x) => (x.id === p.id ? { ...x, stars: x.stars + add, downloads: x.downloads + add * 9 } : x)) }));
    earn('github', `${add} new stars on ${p.name}`, add * 2);
  };
  return (
    <div className="panel">
      <h3 className="h3">Your shared projects</h3>
      <ul className="mine">
        {state.projects.map((p) => (
          <li key={p.id}>
            <div className="min0">
              <b>
                {p.owner}/{p.name}
              </b>
              <span className="muted">
                Trust {trustScore(p.scores)} · <Icon name="star" size={12} /> {p.stars} · {p.downloads} downloads
              </span>
            </div>
            <button className="btn small" onClick={() => sync(p)}>
              Sync stars
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

type SortKey = 'trust' | 'stars' | 'downloads' | 'maturity';

function Matrix() {
  const { state } = useStore();
  const all: Project[] = useMemo(() => [...state.projects, ...PROJECTS], [state.projects]);
  const [region, setRegion] = useState<Region | 'all'>('all');
  const [tier, setTier] = useState<Tier | 'all'>('all');
  const [minMat, setMinMat] = useState(1);
  const [minTrust, setMinTrust] = useState(0);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortKey>('trust');
  const [sel, setSel] = useState<string | null>(null);

  const rows = all
    .filter((p) => (region === 'all' || p.region === region) && (tier === 'all' || p.tier === tier) && p.maturity >= minMat && trustScore(p.scores) >= minTrust)
    .filter((p) => !q || `${p.name} ${p.owner} ${p.category} ${p.blurb}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (sort === 'trust' ? trustScore(b.scores) - trustScore(a.scores) : sort === 'maturity' ? b.maturity - a.maturity : b[sort] - a[sort]));
  const selected = all.find((p) => p.id === sel);

  const cell = (v: number) => <td className={`cell c${Math.floor(v)}`}>{v}</td>;

  return (
    <section className="block">
      <h2 className="h2">Evaluation Matrix</h2>
      <p className="muted narrow">
        Every project gets a risk tier, a maturity level and a 0–5 score on seven dimensions. The Trust Score is the weighted average. Filter to find
        projects that are mature and safe enough for your use, then open one to see its certificates and release advice.
      </p>
      <div className="filters">
        <input id="mx-q" placeholder="Search projects" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search projects" />
        <select id="mx-region" value={region} onChange={(e) => setRegion(e.target.value as Region | 'all')} aria-label="Jurisdiction">
          <option value="all">All jurisdictions</option>
          {(Object.keys(REGION_LABEL) as Region[]).map((r) => (
            <option key={r} value={r}>
              {REGION_LABEL[r].en}
            </option>
          ))}
        </select>
        <select id="mx-tier" value={tier} onChange={(e) => setTier(e.target.value as Tier | 'all')} aria-label="Risk tier">
          <option value="all">All tiers</option>
          {TIERS.filter((t) => t.id !== 'Unacceptable').map((t) => (
            <option key={t.id} value={t.id}>
              {t.id} risk
            </option>
          ))}
        </select>
        <select id="mx-mat" value={minMat} onChange={(e) => setMinMat(Number(e.target.value))} aria-label="Minimum maturity">
          {MATURITY.map((m) => (
            <option key={m.level} value={m.level}>
              Maturity ≥ L{m.level} {m.name}
            </option>
          ))}
        </select>
        <label className="range-f">
          <span>Trust ≥ {minTrust}</span>
          <input id="mx-trust" type="range" min={0} max={90} step={5} value={minTrust} onChange={(e) => setMinTrust(Number(e.target.value))} />
        </label>
        <select id="mx-sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort by">
          <option value="trust">Sort: Trust Score</option>
          <option value="stars">Sort: GitHub stars</option>
          <option value="downloads">Sort: downloads</option>
          <option value="maturity">Sort: maturity</option>
        </select>
      </div>
      <div className="table-wrap">
        <table className="table matrix">
          <thead>
            <tr>
              <th>Project</th>
              <th>Tier</th>
              <th>Maturity</th>
              {DIMENSIONS.map((d) => (
                <th key={d.id} title={d.ask} className="dim-h">
                  {d.label.split(' ')[0]}
                </th>
              ))}
              <th>Trust</th>
              <th>Stars</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className={`clickable ${sel === p.id ? 'sel' : ''}`} onClick={() => setSel(sel === p.id ? null : p.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setSel(p.id)}>
                <td>
                  <div className="proj-cell">
                    <RegionTag region={p.region} />
                    <b>{p.name}</b>
                    {'mine' in p && <span className="you">you</span>}
                  </div>
                </td>
                <td>{p.tier}</td>
                <td>L{p.maturity}</td>
                {DIMENSIONS.map((d) => (
                  <React.Fragment key={d.id}>{cell(p.scores[d.id])}</React.Fragment>
                ))}
                <td>
                  <b className="tnum">{trustScore(p.scores)}</b>
                </td>
                <td className="tnum">{p.stars.toLocaleString()}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={12} className="muted">
                  No project matches these filters. Lower the Trust or maturity threshold.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {selected && <ProjectDetail p={selected} onClose={() => setSel(null)} />}
    </section>
  );
}

export default function Build() {
  return (
    <div className="view">
      <PageHead kicker="Build in the open · audit automatically" title="Build & Audit" zh="開源 · 審計">
        Share an AI project from GitHub. It goes through an automated audit, gets a place in the Evaluation Matrix and earns points. Stars and
        adoption by organisations keep earning after that.
      </PageHead>
      <SubmitForm />
      <Matrix />
    </div>
  );
}
