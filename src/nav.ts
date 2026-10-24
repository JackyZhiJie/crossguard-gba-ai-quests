// Navigation shared by quests and pages. Older tab names map onto quests and hubs in the 3D world.
export type TabId = string;

const ALIAS: Record<string, string> = {
  learn: 'academy',
  play: 'checkpoint',
  build: 'harbour',
  guard: 'filter',
  crossguard: 'surge',
  rewards: 'exchange',
  ranking: 'hall',
  dashboard: 'hall',
  pitch: 'about',
  overview: 'world',
};

export function go(dest: TabId) {
  window.dispatchEvent(new CustomEvent('gq-go', { detail: ALIAS[dest] ?? dest }));
}
