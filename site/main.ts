// Landing page: forwards old game links, and switches the page between English, Traditional and Simplified Chinese.
import '../src/theme.css';
import './landing.css';
import { TEXT, type Lang } from './text';

// Links made before the game moved to /quests/ used hash routes on this page (e.g. #surge). Send them on.
const GAME_ROUTES = ['surge', 'seals', 'checkpoint', 'filter', 'harbour', 'academy', 'exchange', 'hall', 'educator', 'about', 'tour',
  'learn', 'play', 'build', 'guard', 'crossguard', 'rewards', 'ranking', 'dashboard', 'pitch', 'overview', 'world'];
const hash = location.hash.slice(1);
if (GAME_ROUTES.includes(hash)) location.replace(`quests/#${hash}`);

// Same storage key as the game, so a language picked in one is used in the other.
const KEY = 'gba-ai-quests-lang';
const LANGS: Lang[] = ['en', 'zh-Hant', 'zh-Hans'];

function stored(): Lang {
  try {
    const v = localStorage.getItem(KEY) as Lang | null;
    return v && LANGS.includes(v) ? v : 'en';
  } catch {
    return 'en';
  }
}

function apply(lang: Lang) {
  document.documentElement.lang = lang;
  document.documentElement.dataset.lang = lang;
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const t = TEXT[el.dataset.i18n!];
    if (t) el.textContent = t[lang];
  });
  document.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach((el) => {
    const t = TEXT[el.dataset.i18nAria!];
    if (t) el.setAttribute('aria-label', t[lang]);
  });
  document.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
}

document.querySelectorAll<HTMLButtonElement>('[data-lang]').forEach((b) =>
  b.addEventListener('click', () => {
    const lang = b.dataset.lang as Lang;
    try {
      localStorage.setItem(KEY, lang);
    } catch {
      /* storage blocked: the choice lasts for this page view */
    }
    apply(lang);
  }),
);

apply(stored());
