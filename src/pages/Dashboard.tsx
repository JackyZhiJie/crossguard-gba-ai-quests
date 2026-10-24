import React, { useState } from 'react';
import {
  ACTIVE_LEARNERS,
  COURSES_DONE,
  FUNNEL,
  FUNNEL_STAGES,
  ORGS_ADOPTING,
  POINTS_MINTED,
  POINTS_REDEEMED,
  STARS,
  TOKENS_ISSUED_M,
  TRUST_BINS,
  WEEKS,
} from '../data/dashboard';
import { REGION_LABEL, type Region } from '../data/regimes';
import { useStore } from '../store';
import { BarList, Columns, Legend, LineChart } from '../components/charts';
import { PageHead, SimNote } from '../components/ui';

const COLOR: Record<Region, string> = { HK: 'var(--s1)', MO: 'var(--s3)', CN: 'var(--s2)' };
const ORDER: Region[] = ['HK', 'CN', 'MO'];

function Kpi({ label, value, delta, sub }: { label: string; value: string; delta?: number; sub?: string }) {
  return (
    <div className="kpi">
      <span className="kpi-l">{label}</span>
      <span className="kpi-v tnum">{value}</span>
      {delta !== undefined ? (
        <span className={`kpi-d ${delta >= 0 ? 'up' : 'down'}`}>
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}% vs last week
        </span>
      ) : (
        <span className="kpi-d">{sub}</span>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { state, earned } = useStore();
  const [regions, setRegions] = useState<Region[]>(ORDER);
  const [range, setRange] = useState(12);
  const [table, setTable] = useState(false);

  const toggle = (r: Region) => setRegions((rs) => (rs.includes(r) ? (rs.length > 1 ? rs.filter((x) => x !== r) : rs) : ORDER.filter((x) => rs.includes(x) || x === r)));
  const from = WEEKS.length - range;
  const labels = WEEKS.slice(from);
  const sum = (rec: Record<Region, number>) => regions.reduce((a, r) => a + rec[r], 0);
  const active = WEEKS.map((_, i) => regions.reduce((a, r) => a + ACTIVE_LEARNERS[r][i], 0));
  const last = active[active.length - 1];
  const prev = active[active.length - 2];
  const funnel = FUNNEL_STAGES.map((_, i) => regions.reduce((a, r) => a + FUNNEL[r][i], 0));
  const mintedTotal = POINTS_MINTED.slice(from).reduce((a, b) => a + b, 0);
  const redeemedTotal = POINTS_REDEEMED.slice(from).reduce((a, b) => a + b, 0);

  return (
    <div className="view">
      <PageHead kicker="Expand impact · pilot dashboard" title="Impact Dashboard" zh="影響力數據">
        Is the loop working? Learners come in, finish courses, ship projects and get adopted, while the points economy stays balanced.
      </PageHead>

      <div className="filters dash-filters">
        <div className="seg small" role="group" aria-label="Jurisdictions">
          {ORDER.map((r) => (
            <button key={r} className={regions.includes(r) ? 'on' : ''} onClick={() => toggle(r)} aria-pressed={regions.includes(r)}>
              <i className="swatch" style={{ background: COLOR[r] }} />
              {REGION_LABEL[r].en}
            </button>
          ))}
        </div>
        <div className="seg small" role="group" aria-label="Time range">
          {[4, 8, 12].map((w) => (
            <button key={w} className={range === w ? 'on' : ''} onClick={() => setRange(w)}>
              {w} weeks
            </button>
          ))}
        </div>
      </div>

      <div className="kpis">
        <Kpi label="Weekly active learners" value={last.toLocaleString()} delta={((last - prev) / prev) * 100} />
        <Kpi label="Courses completed" value={sum(COURSES_DONE).toLocaleString()} sub="since launch" />
        <Kpi label="Projects audited" value={funnel[2].toLocaleString()} sub={`${funnel[3]} adopted`} />
        <Kpi label="Organisations adopting" value={String(sum(ORGS_ADOPTING))} sub="government, NGO, enterprise" />
        <Kpi label="Model tokens issued" value={`${sum(TOKENS_ISSUED_M)}M`} sub="through scoped keys" />
      </div>

      <div className="dash-grid">
        <div className="panel min0 span2">
          <div className="panel-head">
            <h3 className="h3">Weekly active learners</h3>
            <button className="link" onClick={() => setTable((t) => !t)}>
              {table ? 'Show chart' : 'Show table'}
            </button>
          </div>
          {table ? (
            <div className="table-wrap">
              <table className="table compact">
                <thead>
                  <tr>
                    <th>Week</th>
                    {regions.map((r) => (
                      <th key={r} className="r">
                        {REGION_LABEL[r].en}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {labels.map((w, i) => (
                    <tr key={w}>
                      <td>{w}</td>
                      {regions.map((r) => (
                        <td key={r} className="r tnum">
                          {ACTIVE_LEARNERS[r][from + i].toLocaleString()}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <>
              <Legend items={regions.map((r) => ({ name: REGION_LABEL[r].en, color: COLOR[r] }))} />
              <LineChart
                ariaLabel="Weekly active learners by jurisdiction"
                labels={labels}
                series={regions.map((r) => ({ name: REGION_LABEL[r].en, color: COLOR[r], values: ACTIVE_LEARNERS[r].slice(from) }))}
              />
            </>
          )}
        </div>

        <div className="panel min0">
          <h3 className="h3">The loop, as a funnel</h3>
          <BarList
            rows={FUNNEL_STAGES.map((s, i) => ({
              label: s,
              value: funnel[i],
              note: i ? `${((funnel[i] / funnel[i - 1]) * 100).toFixed(0)}% of previous` : undefined,
            }))}
          />
          <p className="muted small">Learn → use → expand impact. Adoption is where open-source work turns into better public workflows.</p>
        </div>

        <div className="panel min0">
          <h3 className="h3">Points economy</h3>
          <Legend
            items={[
              { name: 'Minted', color: 'var(--s1)' },
              { name: 'Redeemed', color: 'var(--s2)' },
            ]}
          />
          <LineChart
            ariaLabel="Points minted and redeemed per week"
            labels={labels}
            series={[
              { name: 'Minted', color: 'var(--s1)', values: POINTS_MINTED.slice(from) },
              { name: 'Redeemed', color: 'var(--s2)', values: POINTS_REDEEMED.slice(from) },
            ]}
            height={180}
          />
          <p className="muted small">
            Redemption rate {((redeemedTotal / mintedTotal) * 100).toFixed(0)}% over {range} weeks. A rising rate means points have real value; the
            reward pool is sized so it stays under 80%.
          </p>
        </div>

        <div className="panel min0">
          <h3 className="h3">Trust Score of audited projects</h3>
          <Columns ariaLabel="Distribution of project trust scores" rows={TRUST_BINS.map((b) => ({ label: b.range, value: b.count }))} color="var(--s1)" highlight={4} />
          <p className="muted small">Most projects land at 60–79. Below 60, the audit report lists what to fix before rewards like compute unlock.</p>
        </div>

        <div className="panel min0">
          <h3 className="h3">GitHub stars across listed projects</h3>
          <LineChart ariaLabel="Cumulative GitHub stars" labels={labels} series={[{ name: 'Stars', color: 'var(--s1)', values: STARS.slice(from) }]} area height={180} />
        </div>

        <div className="panel min0 you-panel span2">
          <h3 className="h3">Your contribution, live</h3>
          <dl className="you-stats">
            <div>
              <dt>Points earned</dt>
              <dd className="tnum">{earned.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Courses passed</dt>
              <dd className="tnum">{state.coursesDone.length}</dd>
            </div>
            <div>
              <dt>Checkpoint shifts</dt>
              <dd className="tnum">{state.gamesPlayed}</dd>
            </div>
            <div>
              <dt>Projects shared</dt>
              <dd className="tnum">{state.projects.length}</dd>
            </div>
            <div>
              <dt>CrossGuard decisions</dt>
              <dd className="tnum">{state.crossguardDecisions}</dd>
            </div>
            <div>
              <dt>Rewards redeemed</dt>
              <dd className="tnum">{state.vouchers.length}</dd>
            </div>
          </dl>
        </div>
      </div>
      <SimNote>Pilot figures are a simulated 12-week projection for the demo. “Your contribution” is your real activity in this browser.</SimNote>
    </div>
  );
}
