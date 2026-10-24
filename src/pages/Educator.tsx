import React from 'react';
import { QUESTS } from '../data/quests';
import { go } from '../nav';

const VOCAB = [
  ['Training data', 'The examples a model learns patterns from.'],
  ['Model testing', 'Checking predictions against real history the model has never seen.'],
  ['Federated learning', 'Each side trains locally and shares only model parameters, so personal data stays home.'],
  ['Data localisation', 'Keeping personal data inside the jurisdiction where it was collected.'],
  ['Human in the loop', 'A trained person reviews and decides on every AI recommendation that matters.'],
  ['Risk tier', 'How much harm an AI use could do to safety or rights, which decides the rules it must meet.'],
  ['Harmonisation', 'Meeting the strictest version of each rule once, so one system satisfies several legal systems.'],
  ['Prompt injection', 'Hidden instructions in text that try to make an AI ignore its rules.'],
];

const OBJECTIVES = [
  'Describe a real-world example of AI predictions supporting human decisions at a GBA border crossing.',
  'Explain how human choices about data (what to collect, clean and share) change what a model learns and whether it is lawful.',
  'Identify the stages of the AI lifecycle: data search, cleaning, selection, training, testing and deployment.',
  'Compare how Hong Kong, Macau and the mainland regulate personal data and AI, and explain “comply once, certify three times”.',
  'Argue where openness should give way to security, using evidence from the filter trade-off curve.',
];

const FLOW = [
  {
    t: 'Setting the scene',
    min: 10,
    body: 'Ask who has crossed at Lok Ma Chau, the HZMB or the Macau Border Gate on a holiday. What was the queue like? What could go wrong in a crowded concourse? Then ask: what is AI, and how could it help here? Who should be allowed to see the data?',
  },
  {
    t: 'Quest play: Golden Week Surge',
    min: 25,
    body: 'Students work in pairs through the six tasks. Give time checks every 10 minutes. Encourage them to make choices that make sense to them; testing will send them back if a choice does not work.',
  },
  {
    t: 'Side quest: Border Gate or Three Seals',
    min: 10,
    body: 'Half the class plays the Border Gate (governance in practice), half Three Seals (governance by design). Swap findings.',
  },
  {
    t: 'Wrap-up and reflection',
    min: 10,
    body: 'Pairs discuss the reflection prompts below, then the class compares their models’ accuracy and how many times they looped back.',
  },
];

const TIPS = [
  'AI predictions are shaped by decisions humans make during design and deployment.',
  'Not all data is equally useful, and some useful-looking data is unlawful or unfair to use.',
  'AI development is iterative. Going back after a failed test is normal, not failure.',
  'No crowd model is 100% accurate. Humans make the final call, especially when safety is at stake.',
];

const PROBES = [
  'Why did you leave out traveller names and ID numbers, or why did you include them?',
  'How did cleaning the data change your model’s accuracy?',
  'Why train federated instead of sending everything to one server?',
  'What did testing on last year’s Golden Week tell you that training did not?',
  'Which operator decision was hardest, and why?',
];

export default function Educator() {
  return (
    <div className="edu">
      <header className="edu-cover">
        <div className="kicker">Educator guide · 教學指引</div>
        <h1>GBA AI Quests</h1>
        <p className="lede">How can AI keep a border crossing safe without tracking the people who use it?</p>
        <dl className="edu-meta">
          <div>
            <dt>Subjects</dt>
            <dd>Computing, Civics, Liberal Studies, Law, Geography</dd>
          </div>
          <div>
            <dt>Audience</dt>
            <dd>Secondary (S3–S6), university and early-career professionals</dd>
          </div>
          <div>
            <dt>Duration</dt>
            <dd>55 minutes · extensions 45 min+</dd>
          </div>
          <div>
            <dt>Languages</dt>
            <dd>English with Traditional Chinese labels; Portuguese planned for Macau</dd>
          </div>
        </dl>
      </header>

      <section className="edu-sec">
        <h2>Enduring understanding</h2>
        <p>
          People design, test and govern AI. Used responsibly, it can warn a crossing about a dangerous crowd before anyone sees it, while personal data
          stays in its home jurisdiction and a trained person makes every decision.
        </p>
      </section>

      <section className="edu-sec two-col">
        <div>
          <h2>Learning objectives</h2>
          <p className="muted">By the end, learners will be able to:</p>
          <ul>
            {OBJECTIVES.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2>Vocabulary</h2>
          <dl className="vocab">
            {VOCAB.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="edu-sec">
        <h2>Lesson flow</h2>
        <ol className="flow">
          {FLOW.map((f) => (
            <li key={f.t}>
              <div className="flow-h">
                <b>{f.t}</b>
                <span>{f.min} min</span>
              </div>
              <p>{f.body}</p>
            </li>
          ))}
        </ol>
        <div className="task-strip">
          {['Data search', 'Data cleaning', 'Where data lives', 'Model training', 'Model testing ↺', 'Deployment'].map((t, i) => (
            <span key={t}>
              <b>Task {i + 1}</b>
              {t}
            </span>
          ))}
        </div>
        <p className="muted small">↺ Testing may send learners back to tasks 1–3 depending on accuracy, privacy and fairness.</p>
      </section>

      <section className="edu-sec two-col">
        <div className="tipbox">
          <div className="kicker">Teacher tip · concepts to reinforce</div>
          <ul>
            {TIPS.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
        <div className="tipbox">
          <div className="kicker">Probing questions</div>
          <ul>
            {PROBES.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="edu-sec two-col">
        <div>
          <h2>Reflection prompts</h2>
          <ul>
            <li>What was the most important decision you made in the game?</li>
            <li>Why is it hard to reach 100% accuracy when predicting crowds?</li>
            <li>What could go wrong if we let AI act without human oversight?</li>
            <li>Where should openness give way to security, and who decides?</li>
          </ul>
          <h2>Exit ticket</h2>
          <ul>
            <li>One question you still have about AI at the border.</li>
            <li>One other cross-border problem in the GBA that AI could help predict.</li>
          </ul>
        </div>
        <div>
          <h2>Alternative set-ups</h2>
          <p>
            <b>Few devices:</b> groups of 2–3 take turns, discussing each data choice aloud before committing.
          </p>
          <p>
            <b>One projector:</b> play as a class. Students vote on each decision and explain their reasoning.
          </p>
          <p className="note">
            Crowd crushes can be a sensitive topic. Let learners share only what they are comfortable with, and offer writing or drawing as alternatives.
          </p>
        </div>
      </section>

      <section className="edu-sec">
        <h2>All quests</h2>
        <div className="quest-table">
          {[...QUESTS].sort((a, b) => a.order - b.order).map((q) => (
            <button key={q.id} className="qt-row" onClick={() => go(q.id)}>
              <i style={{ background: q.color }} />
              <b>{q.title}</b>
              <span className="muted">{q.concept}</span>
              <span className="muted tnum">{q.minutes} min</span>
            </button>
          ))}
        </div>
        <h2>Extension activities</h2>
        <ul>
          <li>Audit a real open-source model card against the seven trust dimensions in Open Source Harbour.</li>
          <li>Redesign CrossGuard for AI triage of Hong Kong patients treated in GBA cities. What changes in the risk tier and controls?</li>
          <li>Debate: should points ever unlock real API keys for under-18s?</li>
        </ul>
      </section>
    </div>
  );
}
