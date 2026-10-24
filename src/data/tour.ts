import type { QuestId } from './quests';

export interface TourStop {
  title: string; // one claim of the proposal
  points: string[];
  focus: QuestId | null; // beacon the camera flies to; null = whole bay
  open?: QuestId | 'exchange' | 'about';
  openLabel?: string;
  seconds: number; // auto-play time for this stop
}

// The guided tour walks through the CrossGuard proposal and flies to the quest that demonstrates each claim.
export const TOUR: TourStop[] = [
  {
    title: 'Every AI system at a GBA crossing must satisfy three legal systems at once',
    points: [
      'Hong Kong PDPO, Macau’s Personal Data Protection Act and mainland PIPL apply at the same time.',
      'Lok Ma Chau, West Kowloon and the HZMB surge on holidays and after typhoons.',
      'Most people using AI in the GBA have never been taught to use it safely.',
    ],
    focus: null,
    seconds: 30,
  },
  {
    title: 'Our answer covers design, build, audit and governance in one loop',
    points: [
      'Design: the Harmonisation Model. Build: CrossGuard.',
      'Audit: the Evaluation Matrix and filter. Govern: AI Quests and TrustLoop.',
      'Each part is a quest on this map.',
    ],
    focus: null,
    open: 'about',
    openLabel: 'Open Our solution',
    seconds: 25,
  },
  {
    title: 'CrossGuard warns operators earlier without tracking anyone',
    points: [
      'Cameras become anonymous counts; each side trains locally and shares only parameters.',
      'A 0–100 Crowd Risk Index with reasons. It recommends; a person decides.',
      'Pilot hypothesis: 10+ minutes earlier than manual monitoring.',
    ],
    focus: 'surge',
    open: 'surge',
    openLabel: 'Play Golden Week Surge',
    seconds: 40,
  },
  {
    title: 'Comply once, certify three times: the strictest rule becomes one common control',
    points: ['Classify the risk, map every obligation, adopt the strictest version.', 'Build it into the design; a joint panel of all three jurisdictions assures it.'],
    focus: 'seals',
    open: 'seals',
    openLabel: 'Play Three Seals Island',
    seconds: 30,
  },
  {
    title: 'Every project is scored before it is trusted, and filter settings are measured',
    points: ['Maturity, risk tier and seven trust dimensions for every shared project.', 'At strictness 50, 11% of harmful prompts pass and no legitimate ones are held.'],
    focus: 'filter',
    open: 'filter',
    openLabel: 'Play Filter Forge',
    seconds: 30,
  },
  {
    title: 'AI Quests teaches the AI lifecycle by letting learners build CrossGuard',
    points: ['Six quests on a 3D map, a mentor and learning tickets.', 'A 55-minute lesson plan in English, Traditional and Simplified Chinese.'],
    focus: 'academy',
    open: 'academy',
    openLabel: 'Open Lantau Academy',
    seconds: 35,
  },
  {
    title: 'Points turn learning into access, and adoption pays for the next learners',
    points: ['Earn from quests, courses and sharing projects on GitHub.', 'Spend on API credits, GPU hours or incubation; keys unlock only after the safety course.'],
    focus: 'harbour',
    open: 'exchange',
    openLabel: 'Open Exchange',
    seconds: 30,
  },
  {
    title: 'Pilot one rail crossing in 12 months, then scale across the GBA',
    points: ['Pilot at one rail crossing in advisory mode, then road crossings and the HZMB.', 'Our ask: a pilot partner, sponsor credits for 5,000 learners, and schools to trial AI Quests.'],
    focus: 'surge',
    seconds: 20,
  },
];

export const PROPOSAL =
  'CrossGuard is one loop that designs, builds, audits and governs responsible AI across Hong Kong, Macau and the mainland. Its core is an explainable crowd-risk system for crossings such as Lok Ma Chau: cameras become anonymous counts on site, each side trains locally and shares only model parameters, and a trained operator approves every recommendation. We aim to warn at least 10 minutes earlier than manual monitoring. Our Harmonisation Model lets one system satisfy PDPO, Macau’s PDPA and PIPL by adopting the strictest version of each obligation as one control: comply once, certify three times. Every shared project is audited on maturity, risk tier and seven trust dimensions, with live filtering of personal data. Our working prototype, GBA AI Quests, is a trilingual 3D game where people build CrossGuard themselves; points from courses and open-source projects unlock scoped API credits, compute and incubation.';
