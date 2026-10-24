export type QuestId = 'surge' | 'checkpoint' | 'filter' | 'harbour' | 'seals' | 'academy';

export interface Quest {
  id: QuestId;
  title: string;
  zh: string;
  place: string;
  placeZh: string;
  x: number;
  z: number;
  color: string;
  part: 'Design' | 'Build' | 'Audit' | 'Govern' | 'Learn';
  concept: string;
  minutes: number;
  reward: string;
  badge: string;
  question: string;
  blurb: string;
  order: number;
}

export const QUESTS: Quest[] = [
  {
    id: 'academy', order: 1, title: 'Lantau Academy', zh: '大嶼學院', place: 'Lantau Island', placeZh: '大嶼山', x: 6, z: 9.6, color: '#f08c2e',
    part: 'Learn', concept: 'AI literacy foundations', minutes: 10, reward: '110–160 per course', badge: 'Scholar',
    question: 'What do I need to know before I use or build AI?',
    blurb: 'Five short courses with quizzes: hallucinations, data across three systems, prompt safety, deepfakes and auditing. Pass three to earn the badge.',
  },
  {
    id: 'checkpoint', order: 2, title: 'The Border Gate', zh: '關閘', place: 'Macau Border Gate', placeZh: '澳門關閘', x: -22.4, z: 15.4, color: '#2a78d6',
    part: 'Govern', concept: 'Data governance at the border', minutes: 5, reward: 'score ÷ 10', badge: 'Gatekeeper',
    question: 'Which AI traffic is allowed to cross the border?',
    blurb: 'Twelve cards in three levels. Allow, redact, block or escalate data flows, model outputs and CrossGuard recommendations before the timer runs out.',
  },
  {
    id: 'surge', order: 3, title: 'Golden Week Surge', zh: '黃金周人潮', place: 'Lok Ma Chau Crossing', placeZh: '落馬洲口岸', x: 18.6, z: -6, color: '#e04848',
    part: 'Build', concept: 'The full AI lifecycle', minutes: 15, reward: '400 + bonus', badge: 'Crowd Guardian',
    question: 'How can AI help a crossing prepare for a holiday crowd surge?',
    blurb: 'Build CrossGuard yourself: search for data, clean it, decide where it lives, train and test a model, then deploy it with a human in charge.',
  },
  {
    id: 'filter', order: 4, title: 'Filter Forge', zh: '過濾工坊', place: 'Cyberport', placeZh: '數碼港', x: 18.6, z: 15.2, color: '#8b5cf6',
    part: 'Audit', concept: 'Interception, filtering, openness vs security', minutes: 6, reward: '200', badge: 'Filter Smith',
    question: 'How open can a cross-border AI service be while staying safe?',
    blurb: 'Run prompts through the live filter, then find the sweet spot between leaking harmful content and blocking legitimate requests.',
  },
  {
    id: 'harbour', order: 5, title: 'Open Source Harbour', zh: '開源港', place: 'Qianhai, Shenzhen', placeZh: '深圳前海', x: 0, z: -15.4, color: '#1baf7a',
    part: 'Audit', concept: 'Evaluation matrix & open source', minutes: 6, reward: '150 + audit bonus', badge: 'Harbour Builder',
    question: 'Is this open-source AI project mature and safe enough to adopt?',
    blurb: 'Share a GitHub project, watch it get audited on seven trust dimensions, and see whether all three jurisdictions would certify it.',
  },
  {
    id: 'seals', order: 6, title: 'Three Seals Island', zh: '三印島', place: 'HZMB artificial island', placeZh: '港珠澳大橋人工島', x: -11, z: 13.4, color: '#d6457a',
    part: 'Design', concept: 'Governance harmonisation', minutes: 6, reward: '250', badge: 'Harmoniser',
    question: 'Can one AI system satisfy three legal systems at once?',
    blurb: 'Classify AI uses by risk, then pick the strictest version of each obligation to build one set of controls. Comply once, certify three times.',
  },
];

export const PLACE_LABELS = [
  { id: 'lbl-sz', x: 22, z: -26, en: 'Shenzhen', zh: '深圳' },
  { id: 'lbl-hk', x: 32, z: 1, en: 'Hong Kong', zh: '香港' },
  { id: 'lbl-mo', x: -26, z: 24.6, en: 'Macau', zh: '澳門' },
  { id: 'lbl-zh', x: -40, z: 2, en: 'Zhuhai', zh: '珠海' },
  { id: 'lbl-prd', x: -12, z: -2, en: 'Pearl River Estuary', zh: '珠江口', y: 0.2 },
];

export const PARTS = [
  { id: 'Design', text: 'GBA Responsible AI Harmonisation Model' },
  { id: 'Build', text: 'CrossGuard: explainable crowd-risk AI' },
  { id: 'Audit', text: 'Evaluation Matrix and interception filter' },
  { id: 'Govern', text: 'TrustLoop: literacy, points and gated rewards' },
];
