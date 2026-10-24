import type { Region } from './regimes';

export type Dimension = 'transparency' | 'localisation' | 'oversight' | 'safety' | 'robustness' | 'fairness' | 'openness';

export const DIMENSIONS: { id: Dimension; label: string; zh: string; ask: string; weight: number }[] = [
  { id: 'transparency', label: 'Transparency', zh: '透明度', ask: 'Model card, public register, explanations', weight: 1.2 },
  { id: 'localisation', label: 'Data localisation', zh: '數據本地化', ask: 'Personal data stays in its home jurisdiction', weight: 1.3 },
  { id: 'oversight', label: 'Human oversight', zh: '人工監督', ask: 'A named person can review and override', weight: 1.3 },
  { id: 'safety', label: 'Content safety', zh: '內容安全', ask: 'Filters, labels, template-bound outputs', weight: 1.0 },
  { id: 'robustness', label: 'Robustness & security', zh: '穩健與安全', ask: 'Red-teaming, spoof tests, key hygiene', weight: 1.1 },
  { id: 'fairness', label: 'Fairness', zh: '公平性', ask: 'Bias tests across groups and languages', weight: 1.0 },
  { id: 'openness', label: 'Openness', zh: '開放程度', ask: 'Licence, reproducible code, documentation', weight: 0.8 },
];

export type Scores = Record<Dimension, number>;

export const MATURITY = [
  { level: 1, name: 'Prototype', zh: '原型', text: 'Works in a notebook or demo' },
  { level: 2, name: 'Pilot', zh: '試點', text: 'Running with real users in one site' },
  { level: 3, name: 'Production', zh: '投產', text: 'Operated with monitoring and on-call' },
  { level: 4, name: 'Audited', zh: '已審計', text: 'Passed an independent third-party audit' },
] as const;

export type Tier = 'Minimal' | 'Limited' | 'High' | 'Unacceptable';

export const TIERS: { id: Tier; zh: string; text: string; min: Partial<Scores> }[] = [
  { id: 'Minimal', zh: '低', text: 'Spam filters, translation helpers', min: {} },
  { id: 'Limited', zh: '有限', text: 'Chatbots, content generation: disclosure needed', min: { transparency: 3, safety: 3 } },
  { id: 'High', zh: '高', text: 'Safety, health, jobs, public services', min: { transparency: 4, localisation: 4, oversight: 4, robustness: 3, fairness: 3 } },
  { id: 'Unacceptable', zh: '禁止', text: 'Social scoring, covert manipulation', min: {} },
];

export interface Project {
  id: string;
  name: string;
  owner: string;
  region: Region;
  category: string;
  blurb: string;
  stars: number;
  downloads: number;
  maturity: 1 | 2 | 3 | 4;
  tier: Tier;
  scores: Scores;
  adoptedBy: string[];
  hoursSaved: number;
}

export interface SubmittedProject extends Project {
  submittedAt: number;
  mine: true;
}

export function trustScore(s: Scores): number {
  const totalW = DIMENSIONS.reduce((a, d) => a + d.weight, 0);
  const sum = DIMENSIONS.reduce((a, d) => a + s[d.id] * d.weight, 0);
  return Math.round((sum / (5 * totalW)) * 100);
}

export function tierGaps(tier: Tier, s: Scores): { dim: Dimension; need: number; have: number }[] {
  const t = TIERS.find((x) => x.id === tier)!;
  return (Object.entries(t.min) as [Dimension, number][])
    .filter(([d, need]) => s[d] < need)
    .map(([d, need]) => ({ dim: d, need, have: s[d] }));
}

// "Certify three times": which dimensions each jurisdiction's reviewers lean on.
export const CERT_RULES: Record<Region, { dims: Dimension[]; min: number; basis: string }> = {
  HK: { dims: ['oversight', 'transparency', 'fairness'], min: 3.5, basis: 'PDPO + PCPD ethical AI principles' },
  MO: { dims: ['localisation', 'transparency', 'robustness'], min: 3.5, basis: 'PDPA (Law 8/2005) + Cybersecurity Law' },
  CN: { dims: ['localisation', 'safety', 'transparency', 'robustness'], min: 3.75, basis: 'PIPL + algorithm filing + GenAI measures' },
};

export function certifies(region: Region, s: Scores): { pass: boolean; avg: number } {
  const r = CERT_RULES[region];
  const avg = r.dims.reduce((a, d) => a + s[d], 0) / r.dims.length;
  return { pass: avg >= r.min && r.dims.every((d) => s[d] >= 3), avg };
}

const sc = (t: number, l: number, o: number, s: number, r: number, f: number, op: number): Scores => ({
  transparency: t, localisation: l, oversight: o, safety: s, robustness: r, fairness: f, openness: op,
});

// Illustrative seed projects for the demo. Names, owners and adopters are fictional.
export const PROJECTS: Project[] = [
  { id: 'crossguard-edge', name: 'CrossGuard-Edge', owner: 'gba-trustloop', region: 'HK', category: 'Public safety', blurb: 'On-site crowd density counting. Cameras in, anonymous numbers out.', stars: 1840, downloads: 22100, maturity: 2, tier: 'High', scores: sc(5, 5, 5, 4, 4, 4, 4), adoptedBy: ['Rail operator pilot', 'Port authority sandbox'], hoursSaved: 3900 },
  { id: 'pdpo-lint', name: 'pdpo-lint', owner: 'harbourdev', region: 'HK', category: 'Privacy tooling', blurb: 'Finds HKID, Macau ID, mainland ID and phone numbers in text and logs.', stars: 2630, downloads: 48800, maturity: 3, tier: 'Minimal', scores: sc(4, 5, 3, 4, 4, 3, 5), adoptedBy: ['District health centre', 'NGO helpline', 'University IT'], hoursSaved: 6100 },
  { id: 'cantoguard', name: 'CantoGuard', owner: 'yue-nlp', region: 'HK', category: 'Content safety', blurb: 'Cantonese and code-mixed toxicity classifier with explanations.', stars: 1210, downloads: 15400, maturity: 2, tier: 'Limited', scores: sc(4, 4, 3, 5, 3, 4, 5), adoptedBy: ['Online forum moderators'], hoursSaved: 1700 },
  { id: 'fedharbour', name: 'FedHarbour', owner: 'pearl-fl', region: 'CN', category: 'Federated learning', blurb: 'Secure aggregation for models trained across HK, Macau and Shenzhen.', stars: 970, downloads: 8600, maturity: 2, tier: 'Limited', scores: sc(4, 5, 3, 3, 4, 3, 4), adoptedBy: ['Hospital research network'], hoursSaved: 900 },
  { id: 'gba-modelcard', name: 'gba-modelcard', owner: 'opengov-mo', region: 'MO', category: 'Transparency', blurb: 'Generates model cards in Chinese, English and Portuguese from one YAML file.', stars: 760, downloads: 11300, maturity: 3, tier: 'Minimal', scores: sc(5, 3, 3, 3, 3, 3, 5), adoptedBy: ['Macau e-gov team', 'Startup incubator'], hoursSaved: 1200 },
  { id: 'trinotice', name: 'TriNotice', owner: 'gba-trustloop', region: 'MO', category: 'GenAI', blurb: 'Template-bound trilingual incident notices with operator approval.', stars: 540, downloads: 5200, maturity: 2, tier: 'Limited', scores: sc(4, 4, 5, 5, 3, 3, 4), adoptedBy: ['Ferry terminal pilot'], hoursSaved: 650 },
  { id: 'triage-gba', name: 'TriageBridge', owner: 'medai-hk', region: 'CN', category: 'Health', blurb: 'AI triage support for HK patients receiving care in GBA cities.', stars: 430, downloads: 2100, maturity: 1, tier: 'High', scores: sc(3, 4, 4, 3, 2, 3, 3), adoptedBy: [], hoursSaved: 0 },
  { id: 'biasbench', name: 'BiasBench-HK', owner: 'fair-lab', region: 'HK', category: 'Evaluation', blurb: 'Fairness benchmark across Cantonese, Mandarin, English and Portuguese prompts.', stars: 1390, downloads: 9700, maturity: 3, tier: 'Minimal', scores: sc(5, 3, 3, 4, 4, 5, 5), adoptedBy: ['Bank model risk team', 'University course'], hoursSaved: 2300 },
  { id: 'synthlabel', name: 'synth-label', owner: 'provenance-sz', region: 'CN', category: 'Content safety', blurb: 'Adds visible and embedded AI-generated labels to images and video.', stars: 2010, downloads: 31500, maturity: 3, tier: 'Limited', scores: sc(4, 4, 3, 5, 4, 3, 4), adoptedBy: ['Media agency', 'Short-video platform'], hoursSaved: 2800 },
  { id: 'redteam-yue', name: 'RedTeam-Yue', owner: 'yue-nlp', region: 'HK', category: 'Evaluation', blurb: 'Jailbreak and prompt-injection test set in Cantonese and English.', stars: 880, downloads: 6900, maturity: 2, tier: 'Minimal', scores: sc(4, 3, 2, 5, 5, 3, 4), adoptedBy: ['Fintech security team'], hoursSaved: 800 },
  { id: 'queuewise', name: 'QueueWise', owner: 'mobility-mo', region: 'MO', category: 'Public safety', blurb: 'Queue time forecasts for border checkpoints from open timetable data.', stars: 320, downloads: 1900, maturity: 1, tier: 'Limited', scores: sc(3, 4, 3, 3, 2, 2, 4), adoptedBy: [], hoursSaved: 0 },
  { id: 'eldervoice', name: 'ElderVoice', owner: 'silver-ai', region: 'HK', category: 'Smart ageing', blurb: 'Voice assistant for elders, with a family-visible activity log.', stars: 610, downloads: 3400, maturity: 2, tier: 'High', scores: sc(3, 4, 4, 4, 3, 3, 3), adoptedBy: ['Elderly home pilot'], hoursSaved: 520 },
];

export interface Learner {
  name: string;
  zh: string;
  uni: string;
  region: Region;
  points: number;
  courses: number;
  projects: number;
}

// Illustrative learners for the leaderboard.
export const LEARNERS: Learner[] = [
  { name: 'Hazel Ho', zh: '何曉晴', uni: 'HKU', region: 'HK', points: 4820, courses: 5, projects: 3 },
  { name: 'Leon Cheang', zh: '鄭力安', uni: 'UM', region: 'MO', points: 4410, courses: 5, projects: 2 },
  { name: 'Zhou Yiming', zh: '周一鳴', uni: 'SUSTech', region: 'CN', points: 4105, courses: 5, projects: 2 },
  { name: 'Ivy Lam', zh: '林綺薇', uni: 'CUHK', region: 'HK', points: 3760, courses: 4, projects: 2 },
  { name: 'Marco Leong', zh: '梁家駿', uni: 'MUST', region: 'MO', points: 3390, courses: 5, projects: 1 },
  { name: 'Chen Xiaoyu', zh: '陳曉雨', uni: 'SYSU', region: 'CN', points: 3120, courses: 4, projects: 1 },
  { name: 'Kelvin Tsang', zh: '曾家樂', uni: 'HKUST', region: 'HK', points: 2980, courses: 4, projects: 1 },
  { name: 'Ana Lou', zh: '盧安娜', uni: 'UM', region: 'MO', points: 2610, courses: 3, projects: 1 },
  { name: 'Wu Haoran', zh: '吳浩然', uni: 'SZU', region: 'CN', points: 2440, courses: 3, projects: 1 },
  { name: 'Grace Yip', zh: '葉嘉怡', uni: 'PolyU', region: 'HK', points: 2210, courses: 3, projects: 0 },
  { name: 'Ryan Wong', zh: '黃睿恆', uni: 'CityU', region: 'HK', points: 1960, courses: 3, projects: 0 },
  { name: 'Li Jiaxin', zh: '李佳欣', uni: 'SCUT', region: 'CN', points: 1720, courses: 2, projects: 0 },
  { name: 'Sofia Ip', zh: '葉思慧', uni: 'MPU', region: 'MO', points: 1480, courses: 2, projects: 0 },
  { name: 'Nathan Fung', zh: '馮子朗', uni: 'HKBU', region: 'HK', points: 1190, courses: 2, projects: 0 },
];

export interface Org {
  name: string;
  region: Region;
  kind: 'Government' | 'Public body' | 'NGO' | 'Enterprise' | 'University';
  projects: string[];
  workflow: string;
  hoursSaved: number;
}

// Illustrative adopters showing the open source → gov / org → better workflow path.
export const ORGS: Org[] = [
  { name: 'Rail operator (pilot)', region: 'HK', kind: 'Public body', projects: ['CrossGuard-Edge', 'TriNotice'], workflow: 'Crowd alerts 10+ min earlier on peak days', hoursSaved: 3900 },
  { name: 'District health centre', region: 'HK', kind: 'Public body', projects: ['pdpo-lint'], workflow: 'Automated PII scan before sharing reports', hoursSaved: 2600 },
  { name: 'Macau e-gov team', region: 'MO', kind: 'Government', projects: ['gba-modelcard'], workflow: 'Trilingual model cards for every public AI service', hoursSaved: 1200 },
  { name: 'Short-video platform', region: 'CN', kind: 'Enterprise', projects: ['synth-label'], workflow: 'Automatic AI labels on uploaded content', hoursSaved: 2400 },
  { name: 'Bank model risk team', region: 'HK', kind: 'Enterprise', projects: ['BiasBench-HK'], workflow: 'Fairness tests in model approval pipeline', hoursSaved: 1500 },
  { name: 'NGO helpline', region: 'HK', kind: 'NGO', projects: ['pdpo-lint'], workflow: 'Caller details masked before AI summaries', hoursSaved: 900 },
  { name: 'Hospital research network', region: 'CN', kind: 'University', projects: ['FedHarbour'], workflow: 'Cross-border studies without moving patient data', hoursSaved: 900 },
];
