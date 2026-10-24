// Assemble dist/app.js + dist/app.css into one self-contained page (React from cdnjs).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const js = readFileSync('dist/app.js', 'utf8').replace(/<\/script/gi, '<\\/script');
const css = existsSync('dist/app.css') ? readFileSync('dist/app.css', 'utf8') : '';
const html = `<title>GBA AI Quests</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="A 3D quest game about building, auditing and governing responsible AI across Hong Kong, Macau and the mainland GBA.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&family=Noto+Sans+TC:wght@400;500;700&family=Noto+Sans+SC:wght@400;500;700&display=swap">
<style>${css}</style>
<div id="root"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script>${js}</script>
`;
writeFileSync('dist/gba-ai-quests.html', html);
console.log(`dist/gba-ai-quests.html  ${(html.length / 1024).toFixed(1)} KB`);

// Standalone page for static hosting (GitHub Pages): same content inside a full document.
const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${html.replace('<meta name="claude:viewport-fit-sides" content="cover">\n', '').replace(/<div id="root">[\s\S]*$/, '')}</head>
<body>
<div id="root"></div>
${html.slice(html.indexOf('<script'))}</body>
</html>
`;
writeFileSync('dist/index.html', page);
console.log(`dist/index.html  ${(page.length / 1024).toFixed(1)} KB`);
