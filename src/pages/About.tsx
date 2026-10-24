import React from 'react';
import { COMMON_CONTROLS, HARMONISATION_STEPS } from '../data/regimes';
import { go } from '../nav';
import { PROPOSAL } from '../data/tour';

export default function About({ onTour }: { onTour?: () => void }) {
  return (
    <div className="about">
      <div className="kicker">Responsible AI · Hong Kong · Macau · Mainland GBA</div>
      <h1 className="about-h">CrossGuard: responsible AI that crosses the border with its paperwork in order.</h1>
      <p className="lede">GBA AI Quests is the working prototype of CrossGuard. Every part of the proposal below is a quest you can play on the map.</p>
      <p className="lede">
        Designing, building, auditing and governing a responsible AI system for cross-border GBA deployment. Our answer is one loop: people learn by
        playing, build in the open, get audited, and earn the credits that fund the next round.
      </p>
      <div className="cta-row">
        {onTour && (
          <button className="btn primary" onClick={onTour}>
            Start the guided tour
          </button>
        )}
      </div>
      <p className="muted small">The guided tour walks through the proposal and flies to the quest that demonstrates each point.</p>

      <div className="pillars4">
        {[
          { v: 'Design', zh: '設計', t: 'GBA Responsible AI Harmonisation Model', d: 'Comply once, certify three times: the strictest version of each obligation, built in as one control.', q: 'seals' },
          { v: 'Build', zh: '構建', t: 'CrossGuard', d: 'Explainable crowd-risk prediction at crossings. Edge sensing, federated learning, a human decides.', q: 'surge' },
          { v: 'Audit', zh: '審計', t: 'Evaluation Matrix + Filter', d: 'Maturity, risk tier and seven trust dimensions for every project; live interception of IDs and injections.', q: 'harbour' },
          { v: 'Govern', zh: '治理', t: 'TrustLoop + AI Quests', d: 'Literacy through play. Points unlock scoped API keys only after the safety course.', q: 'checkpoint' },
        ].map((p) => (
          <button key={p.v} className="pillar4" onClick={() => go(p.q)}>
            <span className="pv">
              {p.v} <span className="zh">{p.zh}</span>
            </span>
            <b>{p.t}</b>
            <span>{p.d}</span>
          </button>
        ))}
      </div>

      <h2 className="h2">The proposal in brief</h2>
      <blockquote className="proposal">{PROPOSAL}</blockquote>

      <h2 className="h2">The sustainable loop</h2>
      <div className="loop-line">
        {['Learn: quests & courses', 'Build: share on GitHub', 'Audit: trust score', 'Earn: credits, compute, incubation', 'Adopt: government & organisations', 'Fund: licences pay for rewards'].map((s, i) => (
          <span key={s}>
            <b>{i + 1}</b>
            {s}
          </span>
        ))}
      </div>

      <div className="two-col">
        <div>
          <h2 className="h2">Harmonisation in four steps</h2>
          <ol className="steps">
            {HARMONISATION_STEPS.map((s) => (
              <li key={s.key}>
                <b>
                  {s.key} <span className="zh">{s.zh}</span>
                </b>
                <span>{s.text}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="min0">
          <h2 className="h2">Common controls, proven on CrossGuard</h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Control</th>
                  <th>Driven by</th>
                  <th>CrossGuard</th>
                </tr>
              </thead>
              <tbody>
                {COMMON_CONTROLS.map((c) => (
                  <tr key={c.control}>
                    <td>
                      <b>{c.control}</b>
                    </td>
                    <td>{c.drivenBy}</td>
                    <td>{c.response}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <h2 className="h2">Rollout</h2>
      <div className="roll">
        <div>
          <b>Pilot · 12 months</b>
          <span>One rail crossing in advisory mode. Target: flag high-risk build-ups 10+ minutes before manual monitoring. AI Quests in 20 schools.</span>
        </div>
        <div>
          <b>Scale</b>
          <span>Road crossings and the HZMB, linked to the AI City Brain. TrustLoop open to all GBA universities.</span>
        </div>
        <div>
          <b>Harmonise</b>
          <span>Publish the model as an open GBA template for health and e-government services.</span>
        </div>
      </div>
      <p className="simnote">
        Demo content: projects, people, organisations and pilot numbers are illustrative. Partner brands show the kind of reward proposed, not confirmed
        partnerships. Progress stays in this browser.
      </p>
    </div>
  );
}
