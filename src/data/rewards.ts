import type { AppState } from '../store';
import { trustScore } from './projects';

export interface Reward {
  id: string;
  name: string;
  zh: string;
  kind: 'API credits' | 'Model access' | 'Compute' | 'Funding' | 'Credential';
  cost: number;
  detail: string;
  guardrail: string;
  gate?: { label: string; ok: (s: AppState) => boolean };
}

const done = (s: AppState, id: string) => s.coursesDone.includes(id);
const bestTrust = (s: AppState) => Math.max(0, ...s.projects.map((p) => trustScore(p.scores)));
const bestMaturity = (s: AppState) => Math.max(0, ...s.projects.map((p) => p.maturity));

// Partner names show the kind of reward the scheme would offer; none are confirmed partners.
export const REWARDS: Reward[] = [
  {
    id: 'qwen', name: 'Qwen API credits', zh: '通義千問 API 額度', kind: 'API credits', cost: 450,
    detail: '500k tokens on a scoped key',
    guardrail: 'Spend cap, 30-day expiry, usage logged',
    gate: { label: 'Finish “Prompt safety & API keys”', ok: (s) => done(s, 'promptsafety') },
  },
  {
    id: 'deepseek', name: 'DeepSeek API credits', zh: 'DeepSeek API 額度', kind: 'API credits', cost: 600,
    detail: '1M tokens on a scoped key',
    guardrail: 'Spend cap, 30-day expiry, usage logged',
    gate: { label: 'Finish “Prompt safety & API keys”', ok: (s) => done(s, 'promptsafety') },
  },
  {
    id: 'badge', name: 'GBA Responsible AI Practitioner', zh: '大灣區負責任AI從業者', kind: 'Credential', cost: 800,
    detail: 'Verifiable digital badge for your CV and LinkedIn',
    guardrail: 'Revocable, lists the modules passed',
    gate: { label: 'Finish all 5 courses', ok: (s) => s.coursesDone.length >= 5 },
  },
  {
    id: 'gpu', name: 'GPU compute hours', zh: 'GPU 算力時數', kind: 'Compute', cost: 1200,
    detail: '10 hours of A100-class compute for your open-source project',
    guardrail: 'Tied to a public repo; jobs logged',
    gate: { label: 'Share a project with Trust Score 60+', ok: (s) => bestTrust(s) >= 60 },
  },
  {
    id: 'gemini', name: 'Gemini Pro access', zh: 'Gemini Pro 使用權', kind: 'Model access', cost: 1500,
    detail: 'One month of a pro-tier model plan',
    guardrail: 'Personal licence, non-transferable',
    gate: { label: 'Finish “AI Literacy 101” and “Prompt safety”', ok: (s) => done(s, 'literacy') && done(s, 'promptsafety') },
  },
  {
    id: 'incubation', name: 'Incubation fast-track', zh: '孵化快速通道', kind: 'Funding', cost: 3000,
    detail: 'Guaranteed interview with a partner incubation programme',
    guardrail: 'Panel reviews your audit report first',
    gate: { label: 'Project at Pilot maturity with Trust Score 70+', ok: (s) => bestMaturity(s) >= 2 && bestTrust(s) >= 70 },
  },
  {
    id: 'seed', name: 'HK$50,000 seed grant pitch', zh: '五萬港元種子基金', kind: 'Funding', cost: 5000,
    detail: 'A pitch slot at the quarterly Responsible AI demo day',
    guardrail: 'Funds released by milestone, audited',
    gate: { label: 'Project at Pilot maturity with Trust Score 70+', ok: (s) => bestMaturity(s) >= 2 && bestTrust(s) >= 70 },
  },
];

export const EARN_RULES = [
  { how: 'Play Checkpoint', pts: 'score ÷ 10', where: 'play' },
  { how: 'Pass a course quiz', pts: '110–160', where: 'learn' },
  { how: 'Share an AI project on GitHub', pts: '150 + audit bonus', where: 'build' },
  { how: 'Your repo earns stars', pts: '2 per star', where: 'build' },
  { how: 'An organisation adopts your project', pts: '500', where: 'ranking' },
];
