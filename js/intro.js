/* =========================================================
   MODULR LAB — intro.js
   L'ouverture de l'accueil, en three.js : « modulr lab »
   s'écrit, son point cyan s'allume, se détache et devient un
   signal ; le signal trace une dent de scie (l'onde du vco),
   l'onde se replie et dessine le rack, le rack se pose pile
   sur le vrai rack de la page. Les cercles cyan restent un
   instant sur les vrais boutons et les vraies prises, puis
   s'éteignent un à un : le rack est prêt.

   2,5 secondes, à la première visite seulement, et pour une
   arrivée directe : pas depuis un autre site (moteur de
   recherche, YouTube…). Sur l'accueil, un clic sur le logo la
   rejoue (main.js). On peut passer (bouton ou Échap). Rien si
   l'appareil demande moins d'animations, si WebGL manque, sur
   un appareil modeste (même règle que rack3d.js), ou si
   three.js n'est pas là 1 s après le début de la page : elle
   n'est alors pas marquée vue et jouera la fois suivante.

   Chargé tout en haut du body de l'accueil, sans defer : le
   voile noir couvre la page avant qu'elle s'affiche. three.js
   (js/vendor/three-r147.min.js) n'est téléchargé que si
   l'ouverture joue vraiment ; instrument.js le réutilise ensuite.

   Pendant l'ouverture, rien de lourd : instrument.js attend
   « modulr:intro-end » (envoyé à la fin, ou quand on passe)
   pour charger la 3D du rack, et sa boucle 2D est en pause.
   Le déroulé suit une horloge interne qui avance de 33 ms au
   plus par image : un gel met l'ouverture en pause au lieu de
   la faire sauter. Au-delà de 4 s réelles, elle s'efface vite.
   ========================================================= */
(function () {
    'use strict';

    const KEY = 'modulr-intro-seen';
    // three.js est rangé à côté de ce fichier
    const SRC = (document.currentScript && document.currentScript.src) || '';
    const THREE_URL = SRC ? new URL('vendor/three-r147.min.js', SRC).href : 'js/vendor/three-r147.min.js';
    const DURATION = 2500;
    const MAX_STEP = 33;      // l'horloge interne avance de 33 ms au plus par image
    const MAX_REAL = 4000;    // au-delà, en temps réel, l'ouverture s'efface vite
    const LETTER_FADE = 80;   // le fondu de chaque lettre
    const VEIL = 0.995;       // l'opacité du voile (voir .intro dans common.css)
    const THREE_BUDGET = 1000; // three.js doit être là 1 s après le début de la page (ou du clic sur le logo)

    // Le déroulé, en millisecondes
    const T = {
        type: [0, 450],          // « modulr lab » s'écrit, lettre après lettre
        dotOn: [450, 530],       // le point final s'allume
        pulse: [530, 700],       // il pulse
        wordOut: [700, 850],     // le mot s'efface, le point devient le signal
        travel: [700, 900],      // le signal rejoint le début de l'onde
        draw: [900, 1350],       // il trace la dent de scie
        morph: [1350, 1750],     // l'onde se replie en contour du rack
        details: [1500, 1900],   // rails, modules, boutons, prises se dessinent, de gauche à droite
        tilt: [700, 1950],       // la perspective se redresse
        fill: [1800, 2050],      // les panneaux se remplissent de noir
        settle: [1850, 2150],    // le rack quitte le centre de l'écran et se pose à sa place
        structOut: [2050, 2300], // le contour, les rails et les modules s'éteignent
        bgOut: [2100, 2350],     // la page apparaît autour du rack
        panelsOut: [2250, 2450], // le vrai rack apparaît sous les cercles cyan
        controlsOff: [2350, 2500] // les cercles s'éteignent un à un, de gauche à droite
    };

    const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const clamp = (x) => Math.max(0, Math.min(1, x));
    const span = (t, r) => clamp((t - r[0]) / (r[1] - r[0]));
    const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const easeOut = (x) => 1 - Math.pow(1 - x, 3);
    const lerp = (a, b, k) => a + (b - a) * k;

    // Un appareil modeste : peu de mémoire, peu de cœurs, ou économie de données demandée (comme rack3d.js)
    function modest() {
        const n = navigator, c = n.connection || {};
        return (n.deviceMemory > 0 && n.deviceMemory <= 4) || (n.hardwareConcurrency > 0 && n.hardwareConcurrency <= 4) || c.saveData === true ||
            !!(window.matchMedia && window.matchMedia('(prefers-reduced-data: reduce)').matches);
    }

    function seen() { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } }
    function markSeen() { try { localStorage.setItem(KEY, '1'); } catch (e) { } }

    function webgl() {
        try {
            const c = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
        } catch (e) { return false; }
    }

    /* ---------- le trait lumineux : un ruban plat, un cœur net et un halo doux ---------- */
    function glowTexture() {
        const h = 64, c = document.createElement('canvas');
        c.width = 4; c.height = h;
        const g = c.getContext('2d');
        const img = g.createImageData(4, h);
        for (let y = 0; y < h; y++) {
            const d = Math.abs((y + 0.5) / h - 0.5) * 2;                 // 0 au centre, 1 au bord
            const core = d < 0.11 ? 1 : d < 0.17 ? (0.17 - d) / 0.06 : 0;
            const halo = 0.34 * Math.exp(-Math.pow(d / 0.42, 2));
            const a = Math.min(1, core + halo);
            for (let x = 0; x < 4; x++) {
                const i = (y * 4 + x) * 4;
                img.data[i] = 0; img.data[i + 1] = 184; img.data[i + 2] = 217; img.data[i + 3] = Math.round(a * 255);
            }
        }
        g.putImageData(img, 0, 0);
        const tex = new THREE.CanvasTexture(c);
        tex.minFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
        return tex;
    }

    function dotTexture() {
        const n = 128, c = document.createElement('canvas');
        c.width = c.height = n;
        const g = c.getContext('2d');
        const r = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
        r.addColorStop(0, 'rgba(0,184,217,1)');
        r.addColorStop(0.14, 'rgba(0,184,217,1)');
        r.addColorStop(0.22, 'rgba(0,184,217,0.45)');
        r.addColorStop(1, 'rgba(0,184,217,0)');
        g.fillStyle = r;
        g.fillRect(0, 0, n, n);
        const tex = new THREE.CanvasTexture(c);
        tex.minFilter = THREE.LinearFilter;
        return tex;
    }

    // La lumière s'ajoute (comme sur un écran) : sur le noir, elle rayonne ; sur la page, elle se pose par-dessus
    function additive() {
        return {
            transparent: true, depthWrite: false, depthTest: false,
            blending: THREE.CustomBlending, blendEquation: THREE.AddEquation,
            blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneFactor,
            blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor
        };
    }

    // three.js, seulement quand l'ouverture joue
    let threeLoading = null;
    function loadThree() {
        if (window.THREE) return Promise.resolve();
        if (!threeLoading) threeLoading = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = THREE_URL;
            script.onload = () => (window.THREE ? resolve() : reject(new Error('three')));
            script.onerror = () => { threeLoading = null; reject(new Error('three')); };
            document.head.appendChild(script);
        });
        return threeLoading;
    }

    // Une ligne continue (l'onde, puis le contour) : deux sommets par point, mis à jour à chaque image
    function Strip(n, width, material) {
        const pos = new Float32Array(n * 2 * 3);
        const uv = new Float32Array(n * 2 * 2);
        const idx = [];
        for (let i = 0; i < n; i++) {
            uv[i * 4] = i / (n - 1); uv[i * 4 + 1] = 0;
            uv[i * 4 + 2] = i / (n - 1); uv[i * 4 + 3] = 1;
            if (i < n - 1) { const a = 2 * i; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        geo.setIndex(idx);
        const mesh = new THREE.Mesh(geo, material);
        mesh.frustumCulled = false;
        let nx = 0, ny = 1;
        return {
            mesh, geo,
            set(pts) {
                const hw = width / 2;
                for (let i = 0; i < n; i++) {
                    const p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
                    let tx = b.x - a.x, ty = b.y - a.y;
                    const len = Math.hypot(tx, ty);
                    if (len > 1e-6) { tx /= len; ty /= len; nx = -ty; ny = tx; }
                    pos[i * 6] = p.x + nx * hw; pos[i * 6 + 1] = p.y + ny * hw; pos[i * 6 + 2] = 0;
                    pos[i * 6 + 3] = p.x - nx * hw; pos[i * 6 + 4] = p.y - ny * hw; pos[i * 6 + 5] = 0;
                }
                geo.attributes.position.needsUpdate = true;
            },
            show(count) { geo.setDrawRange(0, Math.max(0, Math.min(n - 1, count)) * 6); }
        };
    }

    // Des segments indépendants, révélés de gauche à droite.
    // Chaque segment appartient à une pièce (un bouton, une prise…) qu'on peut éteindre seule.
    function Segments(segs, width, material) {
        segs.sort((a, b) => Math.min(a[0], a[2]) - Math.min(b[0], b[2]));
        const n = segs.length;
        const pos = new Float32Array(n * 4 * 3), uv = new Float32Array(n * 4 * 2), col = new Float32Array(n * 4 * 4).fill(1);
        const idx = [], mins = [];
        const hw = width / 2;
        const pieces = {};
        segs.forEach((s, k) => {
            let dx = s[2] - s[0], dy = s[3] - s[1];
            const len = Math.hypot(dx, dy) || 1;
            dx /= len; dy /= len;
            // On prolonge un peu chaque segment : les angles se referment
            const x0 = s[0] - dx * hw * 0.3, y0 = s[1] - dy * hw * 0.3, x1 = s[2] + dx * hw * 0.3, y1 = s[3] + dy * hw * 0.3;
            const nx = -dy * hw, ny = dx * hw;
            pos.set([x0 + nx, y0 + ny, 0, x0 - nx, y0 - ny, 0, x1 + nx, y1 + ny, 0, x1 - nx, y1 - ny, 0], k * 12);
            uv.set([0, 0, 0, 1, 1, 0, 1, 1], k * 8);
            const a = k * 4;
            idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
            mins.push(Math.min(s[0], s[2]));
            const id = s[4] === undefined ? 'all' : s[4];
            (pieces[id] = pieces[id] || { x: s[5] === undefined ? mins[k] : s[5], verts: [] }).verts.push(a, a + 1, a + 2, a + 3);
        });
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        geo.setAttribute('color', new THREE.BufferAttribute(col, 4));
        geo.setIndex(idx);
        material.vertexColors = true;
        const mesh = new THREE.Mesh(geo, material);
        mesh.frustumCulled = false;
        const list = Object.keys(pieces).map((k) => pieces[k]).sort((a, b) => a.x - b.x);
        return {
            mesh, geo, pieces: list,
            // Montre tous les segments qui commencent avant x
            showUpTo(x) {
                let lo = 0, hi = n;
                while (lo < hi) { const m = (lo + hi) >> 1; if (mins[m] <= x) lo = m + 1; else hi = m; }
                geo.setDrawRange(0, lo * 6);
            },
            // L'intensité d'une pièce, de 0 à 1
            dim(piece, a) {
                piece.verts.forEach((v) => { col[v * 4 + 3] = a; });
                geo.attributes.color.needsUpdate = true;
            }
        };
    }

    // Échantillonne une polyligne en n points également espacés
    function resample(pts, n) {
        const d = [0];
        for (let i = 1; i < pts.length; i++) d.push(d[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
        const total = d[d.length - 1], out = [];
        let j = 0;
        for (let i = 0; i < n; i++) {
            const t = total * i / (n - 1);
            while (j < d.length - 2 && d[j + 1] < t) j++;
            const k = (t - d[j]) / ((d[j + 1] - d[j]) || 1);
            out.push({ x: lerp(pts[j].x, pts[j + 1].x, k), y: lerp(pts[j].y, pts[j + 1].y, k) });
        }
        return out;
    }

    function roundRect(x0, y0, x1, y1, r) {
        // Contour d'un rectangle arrondi, en partant du milieu du bord gauche, sens horaire (y vers le haut)
        const pts = [{ x: x0, y: (y0 + y1) / 2 }];
        const arc = (cx, cy, a0, a1) => { for (let i = 0; i <= 6; i++) { const a = lerp(a0, a1, i / 6); pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }); } };
        pts.push({ x: x0, y: y1 - r }); arc(x0 + r, y1 - r, Math.PI, Math.PI / 2);
        pts.push({ x: x1 - r, y: y1 }); arc(x1 - r, y1 - r, Math.PI / 2, 0);
        pts.push({ x: x1, y: y0 + r }); arc(x1 - r, y0 + r, 0, -Math.PI / 2);
        pts.push({ x: x0 + r, y: y0 }); arc(x0 + r, y0 + r, -Math.PI / 2, -Math.PI);
        pts.push({ x: x0, y: (y0 + y1) / 2 });
        return pts;
    }

    /* ---------- l'ouverture ---------- */
    let running = null;

    function play(opts) {
        opts = opts || {};
        if (running) return;
        // « Déjà vue » d'abord : tester WebGL crée un contexte, inutile si l'ouverture ne joue pas
        if (!opts.force && seen()) return;
        if (reduceMotion() || modest() || !webgl()) return;
        // Vue seulement quand elle joue vraiment (voir build) : si three.js tarde, elle rejouera à la prochaine visite
        const deadline = opts.force ? performance.now() + THREE_BUDGET : THREE_BUDGET;

        const lang = (document.documentElement.lang || 'fr').indexOf('en') === 0 ? 'en' : 'fr';
        const root = document.documentElement;
        const prevOverflow = root.style.overflow;
        window.scrollTo(0, 0);
        root.style.overflow = 'hidden';

        // Le voile noir, le mot (une lettre par élément, pour l'écrire), le bouton pour passer
        const overlay = document.createElement('div');
        overlay.className = 'intro';
        const word = document.createElement('p');
        word.className = 'intro-word';
        word.setAttribute('aria-hidden', 'true');
        const letters = Array.from('modulr lab').map((ch) => {
            const l = document.createElement('span');
            l.className = 'intro-letter';
            l.textContent = ch === ' ' ? ' ' : ch;
            word.appendChild(l);
            return l;
        });
        const dot = document.createElement('span');
        dot.className = 'intro-dot';
        word.appendChild(dot);
        const skip = document.createElement('button');
        skip.type = 'button';
        skip.className = 'intro-skip';
        skip.textContent = lang === 'en' ? 'skip' : 'passer';
        overlay.appendChild(word);
        overlay.appendChild(skip);
        document.body.appendChild(overlay);

        const state = { start: 0, raf: 0, done: false };
        running = state;

        function finish(fast) {
            if (state.done) return;
            state.done = true;
            const end = () => {
                cancelAnimationFrame(state.raf);
                if (state.dispose) state.dispose();
                overlay.remove();
                root.style.overflow = prevOverflow;
                document.removeEventListener('keydown', onKey);
                window.removeEventListener('resize', onResize);
                running = null;
                // instrument.js attend ce signal pour charger la 3D du rack et relancer sa boucle
                document.dispatchEvent(new CustomEvent('modulr:intro-end'));
            };
            if (fast) {
                overlay.style.transition = 'opacity 0.3s ease';
                overlay.style.opacity = '0';
                setTimeout(end, 320);
            } else end();
        }
        const onKey = (e) => { if (e.key === 'Escape') finish(true); };
        // Si la fenêtre change de taille, le rack bouge : on termine proprement
        const onResize = () => finish(true);
        document.addEventListener('keydown', onKey);
        skip.addEventListener('click', () => finish(true));

        // On attend le vrai rack (monté par instrument.js) et les polices : sa place doit être définitive
        const ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
        const waitRack = () => new Promise((resolve) => {
            const t0 = performance.now();
            (function check() {
                const rack = document.querySelector('.stage .rack');
                if (rack && rack.querySelector('.module') && rack.getBoundingClientRect().width > 0) resolve(rack);
                else if (performance.now() - t0 > 5000) resolve(null);
                else requestAnimationFrame(check);
            })();
        });
        // three.js est demandé une fois la page lue et affichée : son titre passe avant lui.
        // En retard sur le budget (réseau lent) : on renonce pour cette visite, la page apparaît.
        const afterPaint = () => new Promise((resolve) => {
            const go = () => setTimeout(resolve, 0);
            const paint = () => requestAnimationFrame(go);
            // Là où le navigateur le dit (largest-contentful-paint), on attend que le titre soit peint ;
            // ailleurs, que la page soit lue puis affichée une fois. Garde-fou : 600 ms.
            const lcp = window.PerformanceObserver && (PerformanceObserver.supportedEntryTypes || []).indexOf('largest-contentful-paint') >= 0;
            if (lcp) {
                let done = false;
                const finish = () => { if (done) return; done = true; obs.disconnect(); go(); };
                const obs = new PerformanceObserver((list) => {
                    if (list.getEntries().some((e) => e.element && e.element.id === 'titre-accueil')) finish();
                });
                obs.observe({ type: 'largest-contentful-paint', buffered: true });
                setTimeout(finish, 600);
            } else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', paint, { once: true });
            else paint();
        });
        const threeInTime = new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('three en retard')), Math.max(0, deadline - performance.now()));
            afterPaint().then(loadThree).then(() => { clearTimeout(timer); resolve(); }, (e) => { clearTimeout(timer); reject(e); });
        });
        Promise.all([waitRack(), ready, threeInTime]).then(([rack]) => {
            if (state.done) return;
            if (!rack) { finish(true); return; }
            markSeen();
            build(rack);
            window.addEventListener('resize', onResize);
            state.start = performance.now();
            state.t = 0; state.last = 0;
            state.raf = requestAnimationFrame(frame);
        }).catch(() => finish(true));

        /* ---------- la scène ---------- */
        let renderer, scene, camera, group, wave, struct, controls, head, panels, waveTarget, contourTarget, s, N, fit, home, W;

        function build(rack) {
            const iw = window.innerWidth, ih = window.innerHeight;
            // Un canevas transparent : le noir est celui du voile, qui s'efface à la fin pour montrer la page.
            // Sans antialias (les traits sont des rubans texturés, déjà doux) ; sur écran tactile, densité 1,5 au plus.
            const coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
            renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, premultipliedAlpha: true });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2));
            renderer.setSize(iw, ih);
            renderer.setClearColor(0x000000, 0);
            renderer.domElement.className = 'intro-canvas';
            renderer.domElement.setAttribute('aria-hidden', 'true');
            overlay.insertBefore(renderer.domElement, overlay.firstChild);

            scene = new THREE.Scene();
            const fov = 30, D = 10;
            camera = new THREE.PerspectiveCamera(fov, iw / ih, 0.1, 100);
            camera.position.set(0, 0, D);
            // Un pixel de l'écran vaut s unités dans le plan du rack (z = 0) : à la fin, tout tombe au pixel près
            s = (2 * D * Math.tan(fov * Math.PI / 360)) / ih;

            const R = rack.getBoundingClientRect();
            const cx = R.left + R.width / 2, cy = R.top + R.height / 2;
            const L = (x, y) => ({ x: (x - cx) * s, y: -(y - cy) * s });   // pixels de la page → plan du rack
            W = R.width * s;
            const H = R.height * s;

            // Le rack se dessine au centre de l'écran, à une taille qui tient dans l'écran,
            // puis il rejoint sa vraie place (souvent plus bas, en partie sous la ligne de flottaison)
            fit = Math.min(1, (iw * 0.86) / R.width, (ih * 0.6) / R.height);
            home = { x: (cx - iw / 2) * s, y: -(cy - ih / 2) * s };
            group = new THREE.Group();
            scene.add(group);

            const glow = glowTexture();
            const lineMat = () => new THREE.MeshBasicMaterial(Object.assign({ map: glow }, additive()));
            const lineW = 18 * s / Math.sqrt(fit);   // halo compris ; le cœur fait environ 2 px à l'écran

            // Les panneaux, aux couleurs exactes du rack de la page
            panels = new THREE.Group();
            panels.position.z = -0.002;
            const flat = (x0, y0, x1, y1, color, radius) => {
                const a = L(x0, y0), b = L(x1, y1), shape = new THREE.Shape();
                const r = (radius || 0) * s, xl = a.x, xr = b.x, yt = a.y, yb = b.y;
                shape.moveTo(xl + r, yb); shape.lineTo(xr - r, yb); shape.quadraticCurveTo(xr, yb, xr, yb + r);
                shape.lineTo(xr, yt - r); shape.quadraticCurveTo(xr, yt, xr - r, yt); shape.lineTo(xl + r, yt);
                shape.quadraticCurveTo(xl, yt, xl, yt - r); shape.lineTo(xl, yb + r); shape.quadraticCurveTo(xl, yb, xl + r, yb);
                const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
                const geo = new THREE.ShapeGeometry(shape);
                if (Array.isArray(color)) {
                    // Dégradé vertical, comme le fond des modules
                    const p = geo.attributes.position, cols = new Float32Array(p.count * 3), top = new THREE.Color(color[0]), bot = new THREE.Color(color[1]);
                    for (let i = 0; i < p.count; i++) { const k = (yt - p.getY(i)) / ((yt - yb) || 1); const c = top.clone().lerp(bot, k); cols.set([c.r, c.g, c.b], i * 3); }
                    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
                    mat.vertexColors = true;
                } else mat.color = new THREE.Color(color);
                panels.add(new THREE.Mesh(geo, mat));
            };
            const bg = (el, fallback) => { const c = getComputedStyle(el).backgroundColor; return c && c !== 'rgba(0, 0, 0, 0)' ? c : fallback; };
            flat(R.left, R.top, R.right, R.bottom, bg(rack, '#121212'), 6);
            rack.querySelectorAll('.rack-rail').forEach((el) => { const r = el.getBoundingClientRect(); flat(r.left, r.top, r.right, r.bottom, bg(el, '#202020'), 2); });
            rack.querySelectorAll('.module').forEach((el) => { const r = el.getBoundingClientRect(); flat(r.left, r.top, r.right, r.bottom, ['#1C1C1C', '#161616'], 2); });
            group.add(panels);

            // Les détails, relevés sur la page. La structure (rails, modules, écrans) d'un côté,
            // les commandes (boutons, prises, voyant) de l'autre : ce sont elles qui restent à la fin.
            const structSegs = [], controlSegs = [];
            let pieceId = 0;
            const rect = (list, r, inset) => {
                inset = inset || 0;
                const a = L(r.left + inset, r.top + inset), b = L(r.right - inset, r.bottom - inset);
                list.push([a.x, a.y, b.x, a.y], [b.x, a.y, b.x, b.y], [b.x, b.y, a.x, b.y], [a.x, b.y, a.x, a.y]);
            };
            const circle = (list, x, y, rad, from, to, steps, id) => {
                const c = L(x, y), r = rad * s;
                for (let i = 0; i < steps; i++) {
                    const a0 = lerp(from, to, i / steps), a1 = lerp(from, to, (i + 1) / steps);
                    list.push([c.x + r * Math.cos(a0), c.y + r * Math.sin(a0), c.x + r * Math.cos(a1), c.y + r * Math.sin(a1), id, c.x]);
                }
            };
            rack.querySelectorAll('.rack-rail').forEach((el) => rect(structSegs, el.getBoundingClientRect(), 0.5));
            rack.querySelectorAll('.module').forEach((el) => rect(structSegs, el.getBoundingClientRect(), 0.5));
            rack.querySelectorAll('.module-scope, .wave-btn').forEach((el) => rect(structSegs, el.getBoundingClientRect(), 0.5));
            rack.querySelectorAll('.knob-face').forEach((el) => {
                const r = el.getBoundingClientRect(), k = r.width / 56, x = r.left + r.width / 2, y = r.top + r.height / 2, id = pieceId++;
                // La piste du bouton : 270°, ouverte en bas, comme sur la page ; puis le capot
                circle(controlSegs, x, y, 24 * k, -Math.PI * 1.25, Math.PI * 0.25, 30, id);
                circle(controlSegs, x, y, 17 * k, 0, Math.PI * 2, 22, id);
            });
            rack.querySelectorAll('.jack-nut').forEach((el) => {
                const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, id = pieceId++;
                circle(controlSegs, x, y, r.width * 0.47, 0, Math.PI * 2, 22, id);
                circle(controlSegs, x, y, r.width * 0.22, 0, Math.PI * 2, 14, id);
            });
            rack.querySelectorAll('.module-led').forEach((el) => {
                const r = el.getBoundingClientRect();
                circle(controlSegs, r.left + r.width / 2, r.top + r.height / 2, r.width / 2, 0, Math.PI * 2, 12, pieceId++);
            });
            struct = Segments(structSegs, lineW, lineMat());
            controls = Segments(controlSegs, lineW, lineMat());
            [struct, controls].forEach((m) => { m.mesh.position.z = 0.001; m.showUpTo(-Infinity); group.add(m.mesh); });

            // L'onde : une dent de scie qui traverse le rack, un cycle tous les 180 px environ (3 à 6)
            N = 260;
            const pad = Math.min(W * 0.08, 60 * s), A = Math.min(H * 0.24, 70 * s / fit);
            const cycles = Math.max(3, Math.min(6, Math.round(R.width * fit / 180)));
            const x0 = -W / 2 + pad, x1 = W / 2 - pad, P = (x1 - x0) / cycles;
            const sawPts = [];
            // Chaque cycle monte, puis la chute verticale ramène au bas du cycle suivant
            for (let c = 0; c < cycles; c++) sawPts.push({ x: x0 + c * P, y: -A }, { x: x0 + (c + 1) * P, y: A });
            sawPts.push({ x: x1, y: -A });
            waveTarget = resample(sawPts, N);
            contourTarget = resample(roundRect(-W / 2, -H / 2, W / 2, H / 2, 6 * s), N);

            wave = Strip(N, lineW, lineMat());
            wave.set(waveTarget);
            wave.show(0);
            wave.mesh.position.z = 0.0015;
            group.add(wave.mesh);

            head = new THREE.Sprite(new THREE.SpriteMaterial(Object.assign({ map: dotTexture() }, additive())));
            head.scale.set(64 * s / fit, 64 * s / fit, 1);
            head.visible = false;
            group.add(head);

            state.dispose = () => {
                scene.traverse((o) => {
                    if (o.geometry) o.geometry.dispose();
                    if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); }
                });
                renderer.dispose();
            };
        }

        // Le point de « modulr lab. » rapporté dans le plan du rack, à l'instant du passage de relais
        let handoff = null;
        function dotInRack() {
            const r = dot.getBoundingClientRect();
            const ndc = new THREE.Vector2(((r.left + r.width / 2) / window.innerWidth) * 2 - 1, -((r.top + r.height / 2) / window.innerHeight) * 2 + 1);
            const ray = new THREE.Raycaster();
            ray.setFromCamera(ndc, camera);
            group.updateMatrixWorld(true);
            const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(group.quaternion);
            const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, group.position);
            const hit = new THREE.Vector3();
            if (!ray.ray.intersectPlane(plane, hit)) return { x: 0, y: 0 };
            const local = group.worldToLocal(hit);
            return { x: local.x, y: local.y };
        }

        const tmp = [];
        function frame(now) {
            if (state.done) return;
            // Garde-fou : un appareil trop lent ne garde pas le voile plus de 4 s
            if (opts.freezeAt === undefined && now - state.start > MAX_REAL) { finish(true); return; }
            // L'horloge interne : un gel met le déroulé en pause au lieu de le faire sauter.
            // freezeAt : une image fixe du déroulé, pour les essais
            const dt = state.last ? now - state.last : 16;
            state.last = now;
            state.t += Math.min(dt, MAX_STEP);
            const t = opts.freezeAt !== undefined ? opts.freezeAt : state.t;

            // « modulr lab » s'écrit, puis son point s'allume et pulse
            const per = (T.type[1] - T.type[0]) / letters.length;
            letters.forEach((l, i) => {
                const k = easeOut(span(t, [T.type[0] + i * per, T.type[0] + i * per + LETTER_FADE]));
                l.style.opacity = String(k);
                l.style.transform = `translateY(${((1 - k) * 0.12).toFixed(3)}em)`;
            });
            const on = easeOut(span(t, T.dotOn)), pulse = Math.sin(span(t, T.pulse) * Math.PI);
            dot.style.transform = `scale(${on.toFixed(3)})`;
            dot.style.boxShadow = `0 0 ${(4 + 16 * pulse).toFixed(1)}px rgba(0,184,217,${(0.35 + 0.55 * pulse).toFixed(2)})`;
            dot.style.visibility = t < T.travel[0] ? 'visible' : 'hidden';
            word.style.opacity = String(1 - span(t, T.wordOut));

            // La perspective se redresse jusqu'à être parfaitement de face, puis le rack se pose à sa place
            const tilt = easeInOut(span(t, T.tilt));
            group.rotation.y = lerp(-0.42, 0, tilt);
            group.rotation.x = lerp(0.2, 0, tilt);
            const settle = easeInOut(span(t, T.settle));
            group.position.set(lerp(0, home.x, settle), lerp(0, home.y, settle), lerp(-2.2, 0, tilt));
            group.scale.setScalar(lerp(fit, 1, settle));

            // Le signal rejoint le début de l'onde, puis la trace
            if (t >= T.travel[0] && !handoff) handoff = dotInRack();
            if (t >= T.travel[0] && t < T.morph[0] + 200) {
                head.visible = true;
                let hx, hy;
                if (t < T.draw[0]) {
                    const k = easeInOut(span(t, T.travel));
                    hx = lerp(handoff.x, waveTarget[0].x, k);
                    hy = lerp(handoff.y, waveTarget[0].y, k) + Math.sin(k * Math.PI) * 0.15;
                    wave.show(0);
                } else {
                    const k = span(t, T.draw), f = k * (N - 1), i = Math.floor(f);
                    const a = waveTarget[Math.min(i, N - 1)], b = waveTarget[Math.min(i + 1, N - 1)];
                    hx = lerp(a.x, b.x, f - i); hy = lerp(a.y, b.y, f - i);
                    wave.show(Math.ceil(f));
                }
                head.position.set(hx, hy, 0.002);
                head.material.opacity = 1 - span(t, [T.morph[0], T.morph[0] + 200]);
            } else head.visible = false;

            // L'onde se replie : chaque point rejoint le contour du rack, de gauche à droite
            if (t >= T.morph[0]) {
                const m = span(t, T.morph);
                for (let i = 0; i < N; i++) {
                    const k = easeInOut(clamp((m - (i / N) * 0.35) / 0.65));
                    tmp[i] = { x: lerp(waveTarget[i].x, contourTarget[i].x, k), y: lerp(waveTarget[i].y, contourTarget[i].y, k) };
                }
                wave.set(tmp);
                wave.show(N - 1);
            }

            // Les détails se dessinent de gauche à droite ; la structure s'éteint quand le rack est posé
            const sweep = -W / 2 + (W * 1.05) * easeInOut(span(t, T.details));
            struct.showUpTo(sweep);
            controls.showUpTo(sweep);
            const structA = 1 - easeInOut(span(t, T.structOut));
            wave.mesh.material.opacity = structA;
            struct.mesh.material.opacity = structA * 0.9;

            // Les panneaux noirs se remplissent, couvrent le vrai rack, puis le laissent apparaître
            const panelA = easeInOut(span(t, T.fill)) * (1 - easeInOut(span(t, T.panelsOut)));
            panels.children.forEach((m) => { m.material.opacity = panelA; });

            // Les cercles cyan, posés sur les vrais boutons et les vraies prises, s'éteignent un à un
            const list = controls.pieces, d = T.controlsOff[1] - T.controlsOff[0], each = d * 0.45;
            list.forEach((p, i) => {
                const start = T.controlsOff[0] + (list.length > 1 ? (i / (list.length - 1)) * (d - each) : 0);
                controls.dim(p, 1 - easeOut(span(t, [start, start + each])));
            });

            // La page apparaît autour du rack
            overlay.style.backgroundColor = `rgba(10, 10, 10, ${(VEIL * (1 - easeInOut(span(t, T.bgOut)))).toFixed(3)})`;

            renderer.render(scene, camera);
            if (opts.freezeAt !== undefined) return;
            if (t >= DURATION) { finish(false); return; }
            state.raf = requestAnimationFrame(frame);
        }
    }

    // playing() : instrument.js le demande au montage, pour savoir s'il doit attendre la fin
    window.modulrIntro = { play, playing: () => !!running };

    // Arrivée depuis un autre site (moteur de recherche, YouTube, Instagram…) : on va droit au contenu
    function fromElsewhere() {
        if (!document.referrer) return false;
        try {
            const host = (h) => h.replace(/^www\./, '');
            return host(new URL(document.referrer).hostname) !== host(location.hostname);
        } catch (e) { return true; }
    }

    // À l'accueil, à la première visite, pour une arrivée directe (le logo la rejoue toujours, main.js)
    function auto() {
        if (!document.body || !document.body.classList.contains('page-home')) return;
        if (window.MODULR_INTRO_ALWAYS) { play({ force: true }); return; }
        if (!fromElsewhere()) play();
    }
    if (document.body) auto();
    else document.addEventListener('DOMContentLoaded', auto);
})();
