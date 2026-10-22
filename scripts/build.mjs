// Copie le site dans dist/ pour Cloudflare Pages (Node seul, sans dépendance).
// Usage : node scripts/build.mjs
//
// Reste hors de dist/ : ce qui n'est pas le site (.git, _drafts, scripts, dist, CNAME,
// .gitignore, les .md de la racine) et, comme le faisait GitHub Pages, tout ce qui commence
// par « _ » ou « . » (patchs/_gabarit, .DS_Store…), sauf _redirects et _headers,
// qui sont les réglages de Cloudflare Pages.
import { cpSync, existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'dist');

const KEEP = new Set(['_redirects', '_headers']);
const SKIP_AT_ROOT = new Set(['scripts', 'dist', 'node_modules', 'CNAME', 'package.json', 'package-lock.json']);

function skipped(path) {
    const rel = relative(ROOT, path);
    if (!rel) return false;
    const name = basename(path);
    if (KEEP.has(rel)) return false;
    if (name.startsWith('_') || name.startsWith('.')) return true;
    if (!rel.includes(sep) && (SKIP_AT_ROOT.has(name) || name.endsWith('.md'))) return true;
    return false;
}

for (const f of KEEP) if (!existsSync(join(ROOT, f))) throw new Error(`${f} manque à la racine`);

rmSync(OUT, { recursive: true, force: true });
for (const name of readdirSync(ROOT)) {
    const src = join(ROOT, name);
    if (!skipped(src)) cpSync(src, join(OUT, name), { recursive: true, filter: (p) => !skipped(p) });
}

let files = 0, bytes = 0;
(function count(dir) {
    for (const name of readdirSync(dir)) {
        const p = join(dir, name), s = statSync(p);
        if (s.isDirectory()) count(p); else { files++; bytes += s.size; }
    }
})(OUT);
console.log(`dist/ : ${files} fichiers, ${(bytes / 1024 / 1024).toFixed(1)} Mo`);
