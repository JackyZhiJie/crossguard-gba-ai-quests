// Assemble dist/app.js + dist/app.css into one self-contained page (React from cdnjs).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const js = readFileSync('dist/app.js', 'utf8').replace(/<\/script/gi, '<\\/script');
const css = existsSync('dist/app.css') ? readFileSync('dist/app.css', 'utf8') : '';
const html = `<title>GBA AI Quests</title>
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='2 6 60 48'><path d='M14 20 L6 14 M50 20 L58 14' stroke='%230d3b52' stroke-width='3' stroke-linecap='round'/><circle cx='6' cy='14' r='3.4' fill='%23ffcf4a'/><circle cx='58' cy='14' r='3.4' fill='%23ffcf4a'/><rect x='10' y='16' width='44' height='34' rx='16' fill='%23fff' stroke='%230d3b52' stroke-width='3'/><rect x='16' y='22' width='32' height='20' rx='10' fill='%230d3b52'/><path d='M21 33 q3.5 -5 7 0 M36 33 q3.5 -5 7 0' stroke='%235ff2c9' stroke-width='3' fill='none' stroke-linecap='round'/><circle cx='32' cy='12' r='4' fill='%23e04848' stroke='%230d3b52' stroke-width='2.5'/></svg>">
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
