import { HANS, HANT, T2S } from './strings';

export type Lang = 'en' | 'zh-Hant' | 'zh-Hans';
export const LANGS: { id: Lang; label: string; title: string }[] = [
  { id: 'en', label: 'EN', title: 'English' },
  { id: 'zh-Hant', label: '繁', title: '繁體中文' },
  { id: 'zh-Hans', label: '简', title: '简体中文' },
];

const KEY = 'gba-ai-quests-lang';
let lang: Lang = 'en';
const listeners = new Set<(l: Lang) => void>();

// Dynamic strings assembled in code. Each capture group is translated on its own.
const PATTERNS: [RegExp, (t: (s: string) => string, ...g: string[]) => string][] = [
  [/^Badge earned: (.+)$/, (t, a) => `獲得徽章：${t(a)}`],
  [/^Quest complete: (.+)$/, (t, a) => `任務完成：${t(a)}`],
  [/^Passed “(.+)”$/, (t, a) => `已通過「${t(a)}」`],
  [/^Checkpoint run: (.+) score$/, (_t, a) => `關口值班：${a} 分`],
  [/^(\d+) new stars on (.+)$/, (_t, n, p) => `${p} 新增 ${n} 顆星`],
  [/^Redeemed (.+)$/, (t, a) => `已兌換 ${t(a)}`],
  [/^Shared (.+) \(Trust (\d+)\)$/, (_t, p, n) => `已分享 ${p}（信任 ${n}）`],
  [/^(.+) adopted (.+)$/, (t, o, p) => `${t(o)} 採用了 ${p}`],
  [/^(\d+) min$/, (_t, n) => `${n} 分鐘`],
  [/^Stop (\d+) of (\d+)$/, (_t, a, b) => `第 ${a} 站，共 ${b} 站`],
  [/^(\d+) weeks$/, (_t, n) => `${n} 週`],
  [/^L(\d) (.+)$/, (t, n, a) => `L${n} ${t(a)}`],
  [/^(Minimal|Limited|High|Unacceptable) risk$/, (t, a) => `${t(a)}風險`],
  [/^(Minimal|Limited|High|Unacceptable) tier minimum( \(none\))?$/, (t, a, n) => `${t(a)}級別最低要求${n ? '（無）' : ''}`],
  [/^(Minimal|Limited|High|Unacceptable): (.+)$/, (t, a, b) => `${t(a)}：${t(b)}`],
  [/^Maturity ≥ L(\d) (.+)$/, (t, n, a) => `成熟度 ≥ L${n} ${t(a)}`],
  [/^(.+) · (\d+) min$/, (t, a, n) => `${t(a)} · ${n} 分鐘`],
  [/^Risk (\d+): (.+)$/, (_t, n, a) => `風險 ${n}：${a}`],
  [/^Concourse density (.+)$/, (_t, a) => `大堂密度 ${a}`],
  [/^Arrivals (.+) vs norm$/, (_t, a) => `到達人數比平日 ${a}`],
  [/^Forecast (.+) in 10 min$/, (_t, a) => `預測 10 分鐘後 ${a}`],
  [/^Use these (\d+) sources?$/, (_t, n) => `使用這 ${n} 個來源`],
  [/^Lesson (\d+) of (\d+)$/, (_t, a, b) => `第 ${a} 課，共 ${b} 課`],
  [/^Level (\d) of 3$/, (_t, a) => `第 ${a} 關，共 3 關`],
  [/^(\d+) of (\d+) courses passed$/, (_t, a, b) => `已通過 ${a} / ${b} 個課程`],
  [/^(.+) more points needed$/, (_t, a) => `尚欠 ${a} 分`],
  [/^Spend (.+) of your (.+) points\?$/, (_t, a, b) => `要用 ${b} 分中的 ${a} 分嗎？`],
  [/^(\d+)% of previous$/, (_t, n) => `為上一階段的 ${n}%`],
  [/^(\d+) adopted$/, (_t, n) => `${n} 個獲採用`],
  [/^(.+) before crossing$/, (t, a) => `${t(a)}（過境前）`],
  [/^Accuracy (\d+)% · (\d)\/3 operator calls right · (\d+) trips? back through the loop\.$/, (_t, a, b, c) => `準確度 ${a}% · ${b}/3 個操作決定正確 · 返回循環修正 ${c} 次。`],
  [/^ ?over (\d+) shifts?\.$/, (_t, n) => `（共 ${n} 次值班）。`],
  [/^Masked (.+)$/, (t, a) => `已遮蔽 ${a.split(', ').map(t).join('、')}`],
  [/^(.+): (.+) → human review$/, (t, a, b) => `${t(a)}：${t(b)} → 人工審核`],
  [/^(.+): (.+)$/, (t, a, b) => `${t(a)}：${t(b)}`],
];

function lookup(s: string): string | null {
  const dict = lang === 'zh-Hans' ? HANS : HANT;
  return dict[s] ?? null;
}

function toHans(s: string): string {
  let out = '';
  for (const ch of s) out += T2S[ch] ?? ch;
  return out;
}

function translateCore(s: string, depth = 0): string {
  const hit = lookup(s);
  if (hit !== null) return hit;
  if (depth < 2) {
    for (const [re, fn] of PATTERNS) {
      const m = s.match(re);
      if (m) {
        const res = fn((x) => translateCore(x, depth + 1), ...m.slice(1));
        return lang === 'zh-Hans' ? toHans(res) : res;
      }
    }
  }
  return lang === 'zh-Hans' ? toHans(s) : s;
}

export function translate(text: string): string {
  if (lang === 'en') return text;
  const m = text.match(/^(\s*)([\s\S]*?)(\s*)$/)!;
  const core = m[2].replace(/\s+/g, ' ');
  if (!core || !/[A-Za-z一-鿿]/.test(core)) return text;
  return m[1] + translateCore(core) + m[3];
}

// ---------- DOM translation ----------
// The app renders English. This layer swaps text nodes and a few attributes in place,
// remembering each node's English source so it can switch back or re-translate after React updates.
const original = new WeakMap<Text, string>();
const written = new WeakMap<Text, string>();
const ATTRS = ['placeholder', 'title', 'aria-label'];
let observer: MutationObserver | null = null;

function skip(node: Node): boolean {
  const el = node.nodeType === 1 ? (node as Element) : node.parentElement;
  return !el || !!el.closest('script,style,textarea,[data-no-i18n]');
}

function doText(node: Text) {
  if (skip(node)) return;
  const cur = node.nodeValue ?? '';
  if (written.get(node) !== cur) original.set(node, cur);
  const src = original.get(node) ?? cur;
  const next = translate(src);
  if (next !== cur) node.nodeValue = next;
  written.set(node, next);
}

function doAttrs(el: Element) {
  if (skip(el)) return;
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (v === null) continue;
    const key = `data-i18n-${a}`;
    const done = el.getAttribute(`${key}-out`);
    if (done !== v) el.setAttribute(key, v);
    const src = el.getAttribute(key) ?? v;
    const next = translate(src);
    el.setAttribute(`${key}-out`, next);
    if (next !== v) el.setAttribute(a, next);
  }
}

function walk(root: Node) {
  if (root.nodeType === 3) return doText(root as Text);
  if (root.nodeType !== 1) return;
  doAttrs(root as Element);
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n: Node | null = tw.nextNode();
  while (n) {
    if (n.nodeType === 3) doText(n as Text);
    else doAttrs(n as Element);
    n = tw.nextNode();
  }
}

function start() {
  if (observer) return;
  observer = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === 'characterData') doText(m.target as Text);
      else if (m.type === 'attributes') doAttrs(m.target as Element);
      else m.addedNodes.forEach(walk);
    }
  });
  observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}

export function getLang(): Lang {
  return lang;
}

export function setLang(next: Lang) {
  lang = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* storage unavailable */
  }
  document.documentElement.lang = next === 'en' ? 'en' : next;
  document.body.dataset.lang = next;
  document.title = next === 'en' ? 'GBA AI Quests' : translate('GBA AI Quests');
  start();
  walk(document.body);
  listeners.forEach((f) => f(next));
}

export function onLang(f: (l: Lang) => void) {
  listeners.add(f);
  return () => listeners.delete(f);
}

export function initLang() {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(KEY);
  } catch {
    /* storage unavailable */
  }
  const fromHash = location.hash.match(/^#?(en|zh-Hant|zh-Hans)$/)?.[1];
  const init = (fromHash ?? saved) as Lang | null;
  setLang(init && LANGS.some((l) => l.id === init) ? init : 'en');
}
