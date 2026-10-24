// Copie le site dans dist/ pour Cloudflare Pages (Node seul, sans dépendance).
// Usage : node scripts/build.mjs
//
// Reste hors de dist/ : ce qui n'est pas le site (.git, _drafts, scripts, dist, CNAME, wrangler.jsonc,
// .gitignore, les .md de la racine) et, comme le faisait GitHub Pages, tout ce qui commence
// par « _ » ou « . » (patchs/_gabarit, .DS_Store…), sauf _redirects et _headers,
// qui sont les réglages de Cloudflare Pages. lang.js et intro-veil.js sont mis en ligne dans les pages.
import { createHash } from 'node:crypto';
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'dist');

const KEEP = new Set(['_redirects', '_headers']);
const SKIP_AT_ROOT = new Set(['scripts', 'dist', 'node_modules', 'CNAME', 'package.json', 'package-lock.json', 'wrangler.jsonc', 'wrangler.json', 'wrangler.toml']);

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

// Petits scripts mis en ligne dans les pages (une requête bloquante de moins chacun) :
// les pages du dépôt gardent <script src="…/js/lang.js">, la seule source reste js/lang.js.
// Leur empreinte sha256 rejoint la Content-Security-Policy de dist/_headers.
const INLINE = ['lang.js', 'intro-veil.js'];
const hashes = [];
const inlined = Object.fromEntries(INLINE.map((name) => {
    const code = readFileSync(join(ROOT, 'js', name), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')          // commentaires (aucun « /* » dans les chaînes de ces fichiers)
        .replace(/^\s*\n/gm, '')
        .trim();
    if (/<\/script/i.test(code)) throw new Error(`${name} contient </script>`);
    hashes.push(`'sha256-${createHash('sha256').update(code, 'utf8').digest('base64')}'`);
    return [name, code];
}));
const counts = Object.fromEntries(INLINE.map((n) => [n, 0]));
let charsets = 0;
(function walk(dir) {
    for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) { walk(p); continue; }
        if (!name.endsWith('.html')) continue;
        const original = readFileSync(p, 'utf8');
        let html = original;
        for (const js of INLINE) {
            const re = new RegExp(`<script src="[^"]*js/${js.replace('.', '\\.')}"></script>`, 'g');
            html = html.replace(re, () => { counts[js]++; return `<script>${inlined[js]}</script>`; });
        }
        // <meta charset> en toute première ligne du <head>, avant tout script en ligne :
        // le navigateur doit la trouver dans les 1 024 premiers octets
        const charset = html.match(/[ \t]*<meta charset="[^"]*">\n?/i);
        if (charset && /<head>/i.test(html)) {
            html = html.replace(charset[0], '').replace(/<head>\n?/i, (h) => `${h.trimEnd()}\n  ${charset[0].trim()}\n`);
            charsets++;
        }
        if (html !== original) writeFileSync(p, html);
    }
})(OUT);
const headersPath = join(OUT, '_headers');
const headers = readFileSync(headersPath, 'utf8');
if (!headers.includes("script-src 'self'")) throw new Error("_headers : « script-src 'self' » introuvable dans la CSP");
writeFileSync(headersPath, headers.replace("script-src 'self'", `script-src 'self' ${hashes.join(' ')}`));
console.log('en ligne : ' + INLINE.map((n) => `${n} dans ${counts[n]} pages (${Buffer.byteLength(inlined[n])} octets)`).join(', '));
console.log(`<meta charset> en tête du <head> : ${charsets} pages`);

let files = 0, bytes = 0;
(function count(dir) {
    for (const name of readdirSync(dir)) {
        const p = join(dir, name), s = statSync(p);
        if (s.isDirectory()) count(p); else { files++; bytes += s.size; }
    }
})(OUT);
console.log(`dist/ : ${files} fichiers, ${(bytes / 1024 / 1024).toFixed(1)} Mo`);
