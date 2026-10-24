import React, { useEffect, useState } from 'react';
import { LANGS, getLang, onLang, setLang, type Lang } from '../i18n';

export default function LangToggle() {
  const [lang, setL] = useState<Lang>(getLang());
  useEffect(() => {
    const off = onLang(setL);
    return () => {
      off();
    };
  }, []);
  return (
    <div className="lang" role="group" aria-label="Language 語言 语言" data-no-i18n>
      {LANGS.map((l) => (
        <button key={l.id} className={lang === l.id ? 'on' : ''} aria-pressed={lang === l.id} title={l.title} lang={l.id} onClick={() => setLang(l.id)}>
          {l.label}
        </button>
      ))}
    </div>
  );
}
