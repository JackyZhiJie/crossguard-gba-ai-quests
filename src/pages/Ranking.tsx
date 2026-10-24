import React, { useMemo, useState } from 'react';
import { LEARNERS, ORGS, PROJECTS, trustScore, type Project } from '../data/projects';
import { REGION_LABEL, type Region } from '../data/regimes';
import { useStore } from '../store';
import { BarList } from '../components/charts';
import { Icon, PageHead, RegionTag, SimNote } from '../components/ui';

type Board = 'learners' | 'projects' | 'orgs';
const ADOPTERS = ['District council digital team', 'Elderly care NGO', 'Ferry operator', 'University library', 'Public hospital cluster', 'Macau tourism office'];

export default function Ranking() {
  const { state, earned, update, earn } = useStore();
  const [board, setBoard] = useState<Board>('learners');
  const [region, setRegion] = useState<Region | 'all'>('all');
  const [psort, setPsort] = useState<'impact' | 'stars' | 'downloads' | 'trust'>('impact');
  const [pitching, setPitching] = useState<string | null>(null);

  const learners = useMemo(() => {
    const me = { name: state.name, zh: '你', uni: 'Your team', region: 'HK' as Region, points: earned, courses: state.coursesDone.length, projects: state.projects.length, me: true };
    return [...LEARNERS.map((l) => ({ ...l, me: false })), me]
      .filter((l) => region === 'all' || l.region === region)
      .sort((a, b) => b.points - a.points);
  }, [state, earned, region]);

  const impact = (p: Project) => Math.round(trustScore(p.scores) * (Math.log10(p.stars + 10) + Math.log10(p.downloads + 10) / 2 + p.adoptedBy.length * 0.6));
  const projects = useMemo(
    () =>
      [...state.projects, ...PROJECTS]
        .filter((p) => region === 'all' || p.region === region)
        .sort((a, b) => (psort === 'impact' ? impact(b) - impact(a) : psort === 'trust' ? trustScore(b.scores) - trustScore(a.scores) : b[psort] - a[psort])),
    [state.projects, region, psort],
  );
  const orgs = ORGS.filter((o) => region === 'all' || o.region === region).sort((a, b) => b.hoursSaved - a.hoursSaved);

  const pitch = (p: Project) => {
    setPitching(p.id);
    window.setTimeout(() => {
      const org = ADOPTERS[(p.name.length + p.stars) % ADOPTERS.length];
      update((s) => ({ ...s, projects: s.projects.map((x) => (x.id === p.id ? { ...x, adoptedBy: [...x.adoptedBy, `${org} (simulated)`], hoursSaved: x.hoursSaved + 300 } : x)) }));
      earn('adoption', `${org} adopted ${p.name}`, 500);
      setPitching(null);
    }, 1400);
  };

  const myRank = learners.findIndex((l) => l.me) + 1;

  return (
    <div className="view">
      <PageHead kicker="Expand impact · leaderboards" title="Ranking" zh="排行榜">
        Who is learning, which open projects are earning trust, and which organisations are putting them to work. Open source goes to government
        and organisations, and their workflows get better.
      </PageHead>

      <div className="rank-controls">
        <div className="seg" role="tablist" aria-label="Leaderboard">
          {(
            [
              ['learners', 'Learners'],
              ['projects', 'Open-source projects'],
              ['orgs', 'Adopting organisations'],
            ] as [Board, string][]
          ).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={board === id} className={board === id ? 'on' : ''} onClick={() => setBoard(id)}>
              {label}
            </button>
          ))}
        </div>
        <div className="seg small" role="group" aria-label="Jurisdiction">
          {(['all', 'HK', 'MO', 'CN'] as const).map((r) => (
            <button key={r} className={region === r ? 'on' : ''} onClick={() => setRegion(r)}>
              {r === 'all' ? 'All GBA' : REGION_LABEL[r].en}
            </button>
          ))}
        </div>
      </div>

      {board === 'learners' && (
        <>
          {learners.length >= 3 && (
            <div className="podium">
              {[1, 0, 2].map((i) => {
                const l = learners[i];
                return (
                  <div key={l.name} className={`pod pod-${i + 1} ${l.me ? 'me' : ''}`}>
                    <div className="pod-rank">{i + 1}</div>
                    <b>{l.name}</b>
                    <span className="zh">{l.zh}</span>
                    <span className="muted small">{l.uni}</span>
                    <span className="pod-pts tnum">{l.points.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          )}
          {myRank > 0 && (
            <p className="my-rank">
              You are <b>#{myRank}</b> of {learners.length} with {earned.toLocaleString()} points earned.{' '}
              {myRank > 1 && <>The next place needs {(learners[myRank - 2].points - earned + 1).toLocaleString()} more.</>}
            </p>
          )}
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Learner</th>
                  <th>University</th>
                  <th>Courses</th>
                  <th>Projects</th>
                  <th className="r">Points earned</th>
                </tr>
              </thead>
              <tbody>
                {learners.map((l, i) => (
                  <tr key={l.name} className={l.me ? 'me-row' : ''}>
                    <td className="tnum">{i + 1}</td>
                    <td>
                      <div className="proj-cell">
                        <RegionTag region={l.region} />
                        <b>{l.name}</b>
                        <span className="zh">{l.zh}</span>
                      </div>
                    </td>
                    <td>{l.uni}</td>
                    <td className="tnum">{l.courses}/5</td>
                    <td className="tnum">{l.projects}</td>
                    <td className="r tnum">
                      <b>{l.points.toLocaleString()}</b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {board === 'projects' && (
        <>
          <div className="filters">
            <select id="rk-sort" value={psort} onChange={(e) => setPsort(e.target.value as typeof psort)} aria-label="Rank projects by">
              <option value="impact">Rank by impact (trust × reach × adoption)</option>
              <option value="stars">Rank by GitHub stars</option>
              <option value="downloads">Rank by downloads</option>
              <option value="trust">Rank by Trust Score</option>
            </select>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Project</th>
                  <th>Category</th>
                  <th className="r">Stars</th>
                  <th className="r">Downloads</th>
                  <th className="r">Trust</th>
                  <th>Adopted by</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p, i) => {
                  const mine = 'mine' in p;
                  return (
                    <tr key={p.id} className={mine ? 'me-row' : ''}>
                      <td className="tnum">{i + 1}</td>
                      <td>
                        <div className="proj-cell">
                          <RegionTag region={p.region} />
                          <b>{p.name}</b>
                          <span className="muted small">{p.owner}</span>
                        </div>
                      </td>
                      <td>{p.category}</td>
                      <td className="r tnum">
                        <Icon name="star" size={12} /> {p.stars.toLocaleString()}
                      </td>
                      <td className="r tnum">{p.downloads.toLocaleString()}</td>
                      <td className="r tnum">
                        <b>{trustScore(p.scores)}</b>
                      </td>
                      <td>
                        {p.adoptedBy.length ? p.adoptedBy.join(', ') : <span className="muted">Not yet</span>}
                        {mine && p.adoptedBy.length === 0 && (
                          <button className="btn small" disabled={pitching === p.id} onClick={() => pitch(p)}>
                            {pitching === p.id ? 'Pitching…' : 'Pitch to an organisation (+500)'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {state.projects.length === 0 && <p className="muted">Share a project in Build &amp; Audit to see it ranked here.</p>}
        </>
      )}

      {board === 'orgs' && (
        <div className="two-col">
          <div className="min0">
            <h3 className="h3">Staff hours saved per year</h3>
            <BarList rows={orgs.map((o) => ({ label: o.name, value: o.hoursSaved, note: o.kind }))} format={(v) => `${v.toLocaleString()} h`} />
          </div>
          <div className="min0">
            <h3 className="h3">What changed in their workflow</h3>
            <ul className="org-list">
              {orgs.map((o) => (
                <li key={o.name}>
                  <div className="proj-cell">
                    <RegionTag region={o.region} />
                    <b>{o.name}</b>
                  </div>
                  <span>{o.workflow}</span>
                  <span className="muted small">Uses {o.projects.join(', ')}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <SimNote>Leaderboard people, projects and organisations are illustrative examples for the demo.</SimNote>
    </div>
  );
}
