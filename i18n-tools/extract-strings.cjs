const ts = require('/home/user/gba-ai-quests/node_modules/typescript');
const fs = require('fs'); const path = require('path');
const root = '/home/user/gba-ai-quests/src';
const files = [];
(function walk(d){ for (const f of fs.readdirSync(d)) { const p=path.join(d,f); if (fs.statSync(p).isDirectory()) walk(p); else if (/\.tsx?$/.test(f)) files.push(p);} })(root);
const SKIP_ATTR = new Set(['className','id','key','type','role','href','target','rel','viewBox','d','fill','stroke','name','transform','textAnchor','strokeLinecap','strokeLinejoin','points','preserveAspectRatio','mode','strokeDasharray']);
const out = new Set();
const add = (s) => { s = s.replace(/\s+/g,' ').trim(); if (!s) return; if (!/[A-Za-z]{2}/.test(s)) return; if (/^[a-z0-9_\-:.\/#()%,]+$/.test(s) && !s.includes(' ')) return; if (/^(var\(|#|rgba?\(|M\d|translate|\d)/.test(s)) return; out.add(s); };
for (const f of files) {
  if (f.includes('/world/') || f.endsWith('main.tsx') || f.endsWith('nav.ts')) continue;
  const src = ts.createSourceFile(f, fs.readFileSync(f,'utf8'), ts.ScriptTarget.Latest, true, f.endsWith('x')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  const visit = (n) => {
    if (ts.isJsxText(n)) add(n.text);
    else if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
      const p = n.parent;
      let skip = false;
      if (p && ts.isJsxAttribute(p) && SKIP_ATTR.has(p.name.getText())) skip = true;
      if (p && ts.isJsxExpression(p) && p.parent && ts.isJsxAttribute(p.parent) && SKIP_ATTR.has(p.parent.name.getText())) skip = true;
      if (p && (ts.isImportDeclaration(p) || ts.isExportDeclaration(p))) skip = true;
      if (p && ts.isPropertyAssignment(p) && p.name === n) skip = true;
      if (p && ts.isPropertyAssignment(p) && ['id','color','key','where','kind','tier','region','part','category','correct','to','from','owner','level'].includes(p.name.getText?.() ?? '') ) skip = true;
      if (p && ts.isBinaryExpression(p) && /===|!==/.test(p.operatorToken.getText())) skip = true;
      if (p && ts.isCaseClause(p)) skip = true;
      if (p && ts.isElementAccessExpression(p)) skip = true;
      if (p && ts.isCallExpression(p) && /(querySelector|getItem|setItem|addEventListener|removeEventListener|getElementById|replaceState|CustomEvent|matchMedia|toLocaleTimeString|toLocaleString|createElement)/.test(p.expression.getText())) skip = true;
      if (ts.isLiteralTypeNode(p) || ts.isUnionTypeNode(p)) skip = true;
      if (!skip) add(n.text);
    } else if (ts.isTemplateExpression(n)) {
      add(n.head.text); for (const s of n.templateSpans) add(s.literal.text);
    }
    ts.forEachChild(n, visit);
  };
  visit(src);
}
const arr=[...out].sort();
fs.writeFileSync(process.argv[2], JSON.stringify(arr,null,0));
console.log(arr.length, arr.join('').length);
