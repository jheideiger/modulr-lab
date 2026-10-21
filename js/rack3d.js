/* =========================================================
   MODULR LAB — rack3d.js
   La 3D du site, en three.js (js/vendor/three.min.js, r147).
   Chargé à la demande par instrument.js, après three.js.

   Trois habillages, posés sous le HTML existant :
     rack(rackEl, model)   le rack « votre premier patch » de l'accueil :
                           caisse, panneaux, boutons, prises, touches
                           d'onde et câbles souples. Le guide, le son,
                           les gestes et le clavier restent ceux
                           d'instrument.js : les éléments HTML sont
                           toujours là, transparents, au même endroit.
     siteRack(rackEl)      « la suite » : caisse, panneaux, vis et vraies
                           touches pour les sorties ; textes et liens
                           restent en HTML.
     theremin(wrap, opts)  le theremin de la page histoire : un meuble en
                           noyer et laiton, vu de trois quarts ; le guide
                           reste celui d'instrument.js.

   Les deux racks s'inclinent de quelques degrés vers la souris
   (la 3D et le HTML ensemble) et la lumière glisse sur le métal.
   Unité des racks : le pixel de la page (1 unité au plan des
   panneaux = 1 px à l'écran).
   ========================================================= */
(function () {
    'use strict';

    const CYAN = '#00B8D9';
    const lin = (hex) => new THREE.Color(hex).convertSRGBToLinear();
    const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse = () => !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    // Un appareil modeste (peu de mémoire, peu de cœurs, ou économie de données demandée) :
    // pas d'ombres calculées en temps réel, mais une ombre simple et fixe, et une densité de pixels de 1
    const modest = (function () {
        const n = navigator, c = n.connection || {};
        return (n.deviceMemory > 0 && n.deviceMemory <= 4) || (n.hardwareConcurrency > 0 && n.hardwareConcurrency <= 4) || c.saveData === true ||
            !!(window.matchMedia && window.matchMedia('(prefers-reduced-data: reduce)').matches);
    })();

    function supported() {
        if (!window.THREE) return false;
        try { const c = document.createElement('canvas'); return !!(c.getContext('webgl') || c.getContext('experimental-webgl')); } catch (e) { return false; }
    }

    /* ---------- outils communs ---------- */
    function makeRenderer(opts) {
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: !!opts.alpha });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, modest ? 1 : coarse() ? 1.5 : 2));
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = opts.exposure || 1;
        renderer.shadowMap.enabled = !modest;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.setClearColor(opts.clear === undefined ? 0x000000 : opts.clear, opts.alpha ? 0 : 1);
        return renderer;
    }

    // Un studio pour les reflets : une pièce sombre et trois boîtes à lumière
    function studioEnv(renderer, warm) {
        const pmrem = new THREE.PMREMGenerator(renderer);
        const studio = new THREE.Scene();
        studio.add(new THREE.Mesh(new THREE.BoxGeometry(60, 40, 60), new THREE.MeshBasicMaterial({ color: warm ? 0x0c0a08 : 0x0b0b0b, side: THREE.BackSide })));
        [[-14, 16, 10, 22, 6, 2.2], [16, 8, 14, 10, 14, 1.1], [0, -18, 6, 30, 4, 0.35]].forEach(([x, y, z, w, h, k]) => {
            const b = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: warm ? new THREE.Color(k, k * 0.95, k * 0.88) : new THREE.Color(k, k, k) }));
            b.position.set(x, y, z); b.lookAt(0, 0, 0); studio.add(b);
        });
        const tex = pmrem.fromScene(studio, 0.04).texture;
        pmrem.dispose();
        return tex;
    }

    function disposeScene(scene) {
        if (!scene) return;
        scene.traverse((o) => {
            if (o.geometry) o.geometry.dispose();
            [].concat(o.material || []).forEach((m) => { if (m.map) m.map.dispose(); if (m.emissiveMap) m.emissiveMap.dispose(); if (m.userData.own) m.dispose(); });
        });
    }

    function canvasTexture(c) { const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; }

    // L'ombre simple et fixe des appareils modestes : une tache sombre et floue, posée sous la pièce
    // (décalée vers le bas à droite, à l'opposé de la lumière clé). Rien sur les autres appareils.
    let blobTex = null;
    function contactShadow(w, h, opacity, dx, dy) {
        if (!modest) return null;
        if (!blobTex) {
            const c = document.createElement('canvas'); c.width = c.height = 64;
            // En niveaux de gris : alphaMap lit le canal vert (blanc = opaque, noir = transparent)
            const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
            r.addColorStop(0, '#FFFFFF'); r.addColorStop(0.45, '#8C8C8C'); r.addColorStop(1, '#000000');
            g.fillStyle = r; g.fillRect(0, 0, 64, 64);
            blobTex = new THREE.CanvasTexture(c);
        }
        const mat = new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: blobTex, transparent: true, opacity, depthWrite: false, toneMapped: false });
        mat.userData.own = true;
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
        m.position.set(dx || 0, dy || 0, 0.25);
        return m;
    }

    // L'aluminium brossé d'un panneau, avec, si besoin, la graduation des boutons imprimée
    function panelTexture(w, h, ticks) {
        const k = Math.min(2, window.devicePixelRatio || 1);
        const c = document.createElement('canvas');
        c.width = Math.max(2, Math.round(w * k)); c.height = Math.max(2, Math.round(h * k));
        const g = c.getContext('2d');
        g.scale(k, k);
        const grad = g.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#1C1C1C'); grad.addColorStop(1, '#151515');
        g.fillStyle = grad; g.fillRect(0, 0, w, h);
        for (let y = 0; y < h; y += 1.5) { g.fillStyle = `rgba(255,255,255,${(Math.random() * 0.022).toFixed(3)})`; g.fillRect(0, y, w, 0.6); }
        g.fillStyle = 'rgba(255,255,255,0.09)'; g.fillRect(0, 0, w, 1);
        (ticks || []).forEach((t) => {
            g.strokeStyle = '#9A9A9A'; g.lineCap = 'round';
            for (let i = 0; i <= 10; i++) {
                const a = (-135 + i * 27 - 90) * Math.PI / 180, major = i % 5 === 0;
                const r0 = t.r * 1.02, r1 = t.r * (major ? 1.14 : 1.09);
                g.lineWidth = major ? 1.3 : 0.9;
                g.beginPath(); g.moveTo(t.x + Math.cos(a) * r0, t.y + Math.sin(a) * r0); g.lineTo(t.x + Math.cos(a) * r1, t.y + Math.sin(a) * r1); g.stroke();
            }
        });
        return canvasTexture(c);
    }

    function rackMaterials() {
        const own = (m) => { m.userData.own = true; return m; };
        return {
            frame: own(new THREE.MeshStandardMaterial({ color: lin('#121212'), roughness: 0.6, metalness: 0.55 })),
            back: own(new THREE.MeshStandardMaterial({ color: lin('#070707'), roughness: 0.9 })),
            rail: own(new THREE.MeshStandardMaterial({ color: lin('#1A1A1A'), roughness: 0.45, metalness: 0.8 })),
            side: own(new THREE.MeshStandardMaterial({ color: lin('#1C1C1C'), roughness: 0.5, metalness: 0.6 })),
            steel: own(new THREE.MeshStandardMaterial({ color: lin('#C8C8C8'), roughness: 0.32, metalness: 1.0 })),
            screw: own(new THREE.MeshStandardMaterial({ color: lin('#9A9A9A'), roughness: 0.35, metalness: 1.0 })),
            hole: own(new THREE.MeshBasicMaterial({ color: 0x000000 })),
            knob: own(new THREE.MeshStandardMaterial({ color: lin('#121212'), roughness: 0.42 })),
            knobTop: own(new THREE.MeshStandardMaterial({ color: lin('#1A1A1A'), roughness: 0.3 })),
            pointer: own(new THREE.MeshStandardMaterial({ color: lin('#EDEDED'), roughness: 0.5 })),
            keySide: own(new THREE.MeshStandardMaterial({ color: lin('#0C0C0C'), roughness: 0.5 })),
            plug: own(new THREE.MeshStandardMaterial({ color: lin('#141414'), roughness: 0.55 })),
            audio: own(new THREE.MeshStandardMaterial({ color: lin(CYAN), roughness: 0.45, emissive: lin(CYAN), emissiveIntensity: 0.12, envMapIntensity: 0.5, toneMapped: false })),
            cv: own(new THREE.MeshStandardMaterial({ color: lin('#E6E6E6'), roughness: 0.5, envMapIntensity: 0.6 }))
        };
    }

    // Une vis M3 à tête bombée, empreinte cruciforme, sur sa rondelle (r : rayon de la tête, en px)
    function screw(M, r) {
        const g = new THREE.Group();
        const washer = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.25, r * 1.25, r * 0.13, 32), M.steel);
        washer.rotation.x = Math.PI / 2; washer.position.z = r * 0.07;
        const head = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.screw);
        head.rotation.x = Math.PI / 2; head.scale.set(1, 0.42, 1); head.position.z = r * 0.13;
        const s1 = new THREE.Mesh(new THREE.BoxGeometry(r, r * 0.2, r * 0.18), M.hole), s2 = s1.clone();
        s1.position.z = s2.position.z = r * 0.52; s2.rotation.z = Math.PI / 2;
        washer.castShadow = head.castShadow = true;
        g.add(washer, head, s1, s2);
        g.rotation.z = Math.random() * Math.PI;
        return g;
    }

    function roundedKeyGeometry(w, h, rad, depth) {
        const s = new THREE.Shape();
        s.moveTo(-w / 2 + rad, -h / 2); s.lineTo(w / 2 - rad, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + rad);
        s.lineTo(w / 2, h / 2 - rad); s.quadraticCurveTo(w / 2, h / 2, w / 2 - rad, h / 2); s.lineTo(-w / 2 + rad, h / 2);
        s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - rad); s.lineTo(-w / 2, -h / 2 + rad); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + rad, -h / 2);
        return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 1.2, bevelSize: 1, bevelSegments: 3, curveSegments: 6 });
    }

    // La face d'une touche : au repos noire avec un liseré gris ; allumée, cyan, comme l'onde choisie sur le vco.
    // draw(g, w, h, on) dessine le contenu (un texte, une forme d'onde).
    function keyFace(w, h, on, draw) {
        const k = 3, c = document.createElement('canvas');
        c.width = Math.round((w + 2) * k); c.height = Math.round((h + 2) * k);
        const g = c.getContext('2d');
        g.scale(k, k);
        g.fillStyle = on ? '#06262D' : '#101010'; g.fillRect(0, 0, w + 2, h + 2);
        g.strokeStyle = on ? CYAN : '#3A3A3A'; g.lineWidth = 1.5;
        g.beginPath(); if (g.roundRect) g.roundRect(1.75, 1.75, w - 1.5, h - 1.5, 3.5); else g.rect(1.75, 1.75, w - 1.5, h - 1.5); g.stroke();
        draw(g, w + 2, h + 2, on);
        const t = canvasTexture(c);
        // Les faces d'une extrusion prennent les coordonnées de la forme : on recale la texture dessus
        t.repeat.set(1 / (w + 2), 1 / (h + 2)); t.offset.set(0.5, 0.5);
        return t;
    }
    function keyMaterials(tex) {
        return tex.map((t, i) => {
            const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.5, emissive: i ? lin(CYAN) : new THREE.Color(0), emissiveMap: i ? t : null, emissiveIntensity: i ? 0.35 : 0 });
            m.userData.own = true;
            return m;
        });
    }

    /* ---------- la caisse commune aux deux racks : cadre à plat, rails en retrait, panneaux, vis ---------- */
    // rects : les rectangles des modules (pixels de la page) ; R : celui de la caisse
    function buildCase(scene, M, R, rects, at, opts) {
        opts = opts || {};
        const W = R.width, H = R.height, DEPTH = 60;
        const box = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; scene.add(m); return m; };
        const top = Math.min.apply(null, rects.map((r) => r.top)), bottom = Math.max.apply(null, rects.map((r) => r.bottom));
        const left = Math.min.apply(null, rects.map((r) => r.left)), right = Math.max.apply(null, rects.map((r) => r.right));
        const c = at(R.left + W / 2, R.top + H / 2);
        box(W, H, 2, M.back, c.x, c.y, -DEPTH);
        const lipH = Math.max(2, Math.min(6, (top - R.top) * 0.35));
        [[R.top, top - lipH], [bottom + lipH, R.bottom]].forEach(([y0, y1]) => {
            if (y1 - y0 < 0.5) return;
            const p = at(R.left + W / 2, (y0 + y1) / 2);
            box(W, y1 - y0, DEPTH, M.frame, p.x, p.y, -DEPTH / 2);
        });
        [[R.left, left], [right, R.right]].forEach(([x0, x1]) => {
            if (x1 - x0 < 0.5) return;
            const p = at((x0 + x1) / 2, R.top + H / 2);
            box(x1 - x0, H, DEPTH, M.frame, p.x, p.y, -DEPTH / 2);
        });
        [[top - lipH, top], [bottom, bottom + lipH]].forEach(([y0, y1]) => {
            const p = at((left + right) / 2, (y0 + y1) / 2);
            box(right - left, y1 - y0 + 8, 30, M.rail, p.x, p.y, -1.4 - 15);
            const g = new THREE.Mesh(new THREE.BoxGeometry(right - left, 1.4, 0.4), M.hole);
            g.position.set(p.x, p.y, -1.2); scene.add(g);
        });
        const panels = rects.map((r, i) => {
            const p = at(r.left + r.width / 2, r.top + r.height / 2);
            const face = new THREE.MeshStandardMaterial({ map: panelTexture(r.width, r.height, opts.ticks && opts.ticks[i]), roughness: 0.6, metalness: 0.3, envMapIntensity: 0.6 });
            face.userData.own = true;
            const m = new THREE.Mesh(new THREE.BoxGeometry(r.width, r.height, 5), [M.side, M.side, M.side, M.side, face, M.side]);
            m.position.set(p.x, p.y, -2.5); m.receiveShadow = true; scene.add(m);
            const sr = opts.screw || 6;
            [[sr * 2, sr * 1.5], [r.width - sr * 2, sr * 1.5], [sr * 2, r.height - sr * 1.5], [r.width - sr * 2, r.height - sr * 1.5]].forEach(([dx, dy]) => {
                const q = at(r.left + dx, r.top + dy), s = screw(M, sr);
                s.position.set(q.x, q.y, 0); scene.add(s);
            });
            return m;
        });
        return { panels };
    }

    // L'inclinaison vers la souris, partagée par les deux racks : le HTML et la 3D pivotent ensemble
    function Tilt(el, onFrame, amount) {
        const t = { x: 0, y: 0, tx: 0, ty: 0, raf: 0, hold: false };
        function step() {
            t.raf = 0;
            t.x += (t.tx - t.x) * 0.12; t.y += (t.ty - t.y) * 0.12;
            el.style.transform = (Math.abs(t.x) < 0.001 && Math.abs(t.y) < 0.001 && !t.tx && !t.ty) ? '' : `perspective(1800px) rotateX(${(-t.y * amount.x).toFixed(3)}deg) rotateY(${(t.x * amount.y).toFixed(3)}deg)`;
            onFrame(t);
            if (Math.abs(t.tx - t.x) > 0.0015 || Math.abs(t.ty - t.y) > 0.0015) t.raf = requestAnimationFrame(step);
        }
        function aim(x, y) { t.tx = x; t.ty = y; if (!t.raf) t.raf = requestAnimationFrame(step); }
        function move(e) {
            if (e.pointerType !== 'mouse' || t.hold) return;
            const r = el.getBoundingClientRect(), m = 140;
            if (e.clientX < r.left - m || e.clientX > r.right + m || e.clientY < r.top - m || e.clientY > r.bottom + m) { if (t.tx || t.ty) aim(0, 0); return; }
            aim(Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2))), Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2))));
        }
        const leave = () => aim(0, 0);
        if (!reduceMotion()) {
            window.addEventListener('pointermove', move, { passive: true });
            document.addEventListener('pointerleave', leave);
        }
        return {
            state: t,
            // Pendant un geste (tirer un câble, tourner un bouton), le rack revient à plat : les mesures restent justes
            hold(on) { if (t.hold === on) return; t.hold = on; if (on) aim(0, 0); },
            destroy() {
                window.removeEventListener('pointermove', move);
                document.removeEventListener('pointerleave', leave);
                cancelAnimationFrame(t.raf);
                el.style.transform = '';
            }
        };
    }

    // La lumière clé, qui glisse un peu avec l'inclinaison
    function keyLight(scene, W, H, D) {
        const key = new THREE.DirectionalLight(0xffffff, 1.45);
        key.castShadow = !modest;
        key.shadow.mapSize.set(coarse() ? 1024 : 2048, coarse() ? 1024 : 2048);
        const span = Math.max(W, H) * 0.75;
        Object.assign(key.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: 1, far: D * 3 });
        key.shadow.bias = -0.0006; key.shadow.radius = 3;
        scene.add(key);
        return {
            light: key,
            place(t) { key.position.copy(new THREE.Vector3(-0.38 + (t ? t.x : 0) * 0.22, 0.62 - (t ? t.y : 0) * 0.16, 1).normalize().multiplyScalar(D * 1.2)); }
        };
    }

    // La courbe « ease » des transitions CSS (cubic-bezier(0.25, 0.1, 0.25, 1))
    function ease(x) {
        if (x <= 0) return 0;
        if (x >= 1) return 1;
        const x1 = 0.25, y1 = 0.1, x2 = 0.25, y2 = 1;
        let t = x;
        for (let i = 0; i < 8; i++) {
            const u = 1 - t;
            const dx = 3 * x1 * t * u * u + 3 * x2 * t * t * u + t * t * t - x;
            const d = 3 * x1 * u * u + 6 * (x2 - x1) * t * u + 3 * (1 - x2) * t * t;
            if (Math.abs(dx) < 1e-5 || Math.abs(d) < 1e-6) break;
            t = Math.max(0, Math.min(1, t - dx / d));
        }
        const u = 1 - t;
        return 3 * y1 * t * u * u + 3 * y2 * t * t * u + t * t * t;
    }

    // Mesurer à plat : l'inclinaison en cours fausserait les positions
    function flat(el, fn) {
        const saved = el.style.transform;
        el.style.transform = 'none';
        try { return fn(); } finally { el.style.transform = saved; }
    }

    /* =====================================================
       « LA SUITE »
       ===================================================== */
    function siteRack(rackEl) {
        if (!supported() || !rackEl || rackEl.dataset.three) return null;
        rackEl.dataset.three = '1';
        const renderer = makeRenderer({ alpha: true });
        const canvas = renderer.domElement;
        canvas.className = 'site-rack-3d';
        canvas.setAttribute('aria-hidden', 'true');
        rackEl.insertBefore(canvas, rackEl.firstChild);
        rackEl.classList.add('is-3d');
        const env = studioEnv(renderer);
        const M = rackMaterials();
        let scene = null, camera = null, light = null, keys = [], destroyed = false;
        const tilt = Tilt(rackEl, (t) => { if (light) light.place(t); render(); }, { x: 2.2, y: 3.2 });

        function build() {
            if (destroyed) return;
            flat(rackEl, () => {
                const R = rackEl.getBoundingClientRect(), W = R.width, H = R.height;
                if (W < 10 || H < 10) return;
                renderer.setSize(W, H, false);
                canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
                disposeScene(scene);
                scene = new THREE.Scene();
                scene.environment = env;
                const fov = 20, D = (H / 2) / Math.tan(fov * Math.PI / 360);
                camera = new THREE.PerspectiveCamera(fov, W / H, D * 0.5, D * 2);
                camera.position.set(0, 0, D);
                const at = (x, y) => ({ x: x - R.left - W / 2, y: -(y - R.top - H / 2) });
                scene.add(new THREE.HemisphereLight(0x3a3a3a, 0x080808, 1.0));
                light = keyLight(scene, W, H, D);
                light.place(tilt.state);
                const rects = Array.from(rackEl.querySelectorAll('.site-module')).map((el) => el.getBoundingClientRect());
                if (!rects.length) return;
                buildCase(scene, M, R, rects, at);
                // Les sorties : de vraies touches. Le lien (ou le bouton du formulaire) reste dessous, transparent.
                keys = [];
                rackEl.querySelectorAll('.module-cta').forEach((cta) => {
                    const r = cta.getBoundingClientRect();
                    if (!r.width) return;
                    const label = cta.textContent.trim() + ' →', font = getComputedStyle(cta);
                    const mats = keyMaterials([false, true].map((on) => keyFace(r.width, r.height, on, (g, w, h) => {
                        g.fillStyle = on ? '#7FEAFF' : '#E6E6E6';
                        g.font = `600 ${font.fontSize} ${font.fontFamily}`;
                        g.textAlign = 'center'; g.textBaseline = 'middle';
                        g.fillText(label, w / 2, h / 2 + 0.5);
                    })));
                    const mesh = new THREE.Mesh(roundedKeyGeometry(r.width, r.height, 4, 5), [mats[0], M.keySide]);
                    const q = at(r.left + r.width / 2, r.top + r.height / 2);
                    mesh.position.set(q.x, q.y, 0);
                    mesh.castShadow = true;
                    scene.add(mesh);
                    const sh = contactShadow(r.width + 12, r.height + 12, 0.45, 2, -3);
                    if (sh) { sh.position.x += q.x; sh.position.y += q.y; scene.add(sh); }
                    keys.push({ cta, mesh, mats, hot: false, down: false });
                });
                showKeys(true);
            });
            render();
        }
        function render() { if (scene && !destroyed) renderer.render(scene, camera); }
        function showKeys(quiet) {
            keys.forEach((k) => {
                const on = k.hot || k.down || k.cta === document.activeElement;
                k.mesh.material[0] = k.mats[on ? 1 : 0];
                k.mesh.position.z = k.down ? -3.2 : on ? -0.8 : 0;
            });
            if (!quiet) render();
        }
        const keyOf = (e) => { const cta = e.target.closest && e.target.closest('.module-cta'); return cta && keys.find((k) => k.cta === cta); };
        const on = {
            over: (e) => { const hit = keyOf(e); keys.forEach((k) => { k.hot = k === hit; }); showKeys(); },
            leave: () => { keys.forEach((k) => { k.hot = false; k.down = false; }); showKeys(); },
            down: (e) => { const k = keyOf(e); if (k) { k.down = true; showKeys(); } },
            up: () => { if (keys.some((k) => k.down)) { keys.forEach((k) => { k.down = false; }); showKeys(); } },
            focus: () => setTimeout(() => showKeys(), 0),
            key: (e) => { const k = keyOf(e); if (k && (e.key === 'Enter' || e.key === ' ')) { k.down = true; showKeys(); setTimeout(() => { k.down = false; showKeys(); }, 140); } }
        };
        rackEl.addEventListener('pointerover', on.over);
        rackEl.addEventListener('pointerleave', on.leave);
        rackEl.addEventListener('pointerdown', on.down);
        window.addEventListener('pointerup', on.up);
        rackEl.addEventListener('focusin', on.focus);
        rackEl.addEventListener('focusout', on.focus);
        rackEl.addEventListener('keydown', on.key);

        // Refaire l'image quand la rangée change de taille, ou quand le texte d'une sortie change (« reprendre la leçon 2 »)
        let timer = 0;
        const again = () => { clearTimeout(timer); timer = setTimeout(build, 60); };
        const ro = 'ResizeObserver' in window ? new ResizeObserver(again) : null;
        if (ro) ro.observe(rackEl);
        const mo = 'MutationObserver' in window ? new MutationObserver(again) : null;
        if (mo) rackEl.querySelectorAll('.module-cta').forEach((cta) => mo.observe(cta, { childList: true, characterData: true, subtree: true }));
        // Les images (la vignette de la dernière fiche) changent la hauteur en arrivant
        rackEl.querySelectorAll('img').forEach((img) => img.addEventListener('load', again, { once: true }));
        build();

        return {
            destroy() {
                destroyed = true;
                clearTimeout(timer);
                if (ro) ro.disconnect();
                if (mo) mo.disconnect();
                tilt.destroy();
                rackEl.removeEventListener('pointerover', on.over);
                rackEl.removeEventListener('pointerleave', on.leave);
                rackEl.removeEventListener('pointerdown', on.down);
                window.removeEventListener('pointerup', on.up);
                rackEl.removeEventListener('focusin', on.focus);
                rackEl.removeEventListener('focusout', on.focus);
                rackEl.removeEventListener('keydown', on.key);
                disposeScene(scene);
                env.dispose();
                renderer.dispose();
                canvas.remove();
                rackEl.classList.remove('is-3d');
                delete rackEl.dataset.three;
            }
        };
    }

    /* =====================================================
       LE RACK « VOTRE PREMIER PATCH »
       model : ce qu'instrument.js expose de son état
         cables()  [{ id, from, to, kind, born }]
         temp()    le câble qu'on tire : { from, x, y } en px du rack, ou null
         value(k)  la valeur d'un bouton (0 à 1)
         wave()    la forme d'onde choisie
       ===================================================== */
    const WAVE_ICON = {
        sine: 'M2 8 C5 1, 8 1, 10 8 S15 15, 18 8',
        triangle: 'M2 8 L6 2 L14 14 L18 8',
        sawtooth: 'M2 13 L10 3 L10 13 L18 3',
        square: 'M2 13 L2 3 L10 3 L10 13 L18 13 L18 3'
    };

    function rack(rackEl, model) {
        if (!supported() || !rackEl || rackEl.dataset.three) return null;
        rackEl.dataset.three = '1';
        const renderer = makeRenderer({ alpha: true });
        const canvas = renderer.domElement;
        canvas.className = 'rack-3d';
        canvas.setAttribute('aria-hidden', 'true');
        rackEl.insertBefore(canvas, rackEl.firstChild);
        // Un second calque, au-dessus des modules HTML (écran, étiquettes) : les câbles et leurs fiches
        const top = makeRenderer({ alpha: true });
        top.shadowMap.enabled = false;
        const topCanvas = top.domElement;
        topCanvas.className = 'rack-3d-cables';
        topCanvas.setAttribute('aria-hidden', 'true');
        rackEl.appendChild(topCanvas);
        rackEl.classList.add('is-3d');
        const env = studioEnv(renderer);
        const M = rackMaterials();
        let scene = null, camera = null, light = null, destroyed = false, visible = true, raf = 0, dirty = true;
        let knobs = {}, jacks = {}, waves = [], veils = [], modules = [], fades = [], ropes = {}, tempRope = null, unit = 1, fromRack = null;
        const tilt = Tilt(rackEl, (t) => { if (light) light.place(t); invalidate(); }, { x: 1.6, y: 2.4 });

        function build() {
            if (destroyed) return;
            flat(rackEl, () => {
                const R = rackEl.getBoundingClientRect();
                if (R.width < 10 || R.height < 10) return;
                // La zone de dessin déborde du rack, surtout en bas : les câbles pendent devant la page, pas sous elle
                const PAD = { side: 48, top: 24, bottom: 240 };
                const W = R.width + 2 * PAD.side, H = R.height + PAD.top + PAD.bottom;
                renderer.setSize(W, H, false);
                top.setSize(W, H, false);
                [canvas, topCanvas].forEach((c) => Object.assign(c.style, { width: W + 'px', height: H + 'px', left: -PAD.side + 'px', top: -PAD.top + 'px' }));
                Object.keys(ropes).forEach((id) => delete ropes[id]);
                tempRope = null;
                disposeScene(scene);
                scene = new THREE.Scene();
                scene.environment = env;
                const fov = 20, D = (H / 2) / Math.tan(fov * Math.PI / 360);
                camera = new THREE.PerspectiveCamera(fov, W / H, D * 0.3, D * 2);
                camera.position.set(0, 0, D);
                const ox = R.left - PAD.side, oy = R.top - PAD.top;
                const at = (x, y) => ({ x: x - ox - W / 2, y: -(y - oy - H / 2) });
                // Pour le câble qu'on tire : instrument.js le donne en px depuis le coin du rack
                fromRack = (x, y) => at(R.left + x, R.top + y);
                const hemi = new THREE.HemisphereLight(0x3a3a3a, 0x080808, 1.0);
                scene.add(hemi);
                light = keyLight(scene, W, H, D);
                light.place(tilt.state);
                // Les lumières éclairent les deux calques
                hemi.layers.enableAll(); light.light.layers.enableAll();

                modules = Array.from(rackEl.querySelectorAll('.rack-modules > .module'));
                const rects = modules.map((m) => m.getBoundingClientRect());
                if (!rects.length) return;
                // La taille des pièces suit celle des boutons et des prises de la page
                const faceEl = rackEl.querySelector('.knob-face'), nutEl = rackEl.querySelector('.jack-nut');
                const F = faceEl ? faceEl.getBoundingClientRect().width : 60, J = nutEl ? nutEl.getBoundingClientRect().width : 32;
                unit = J / 32;
                // La graduation des boutons, imprimée sur chaque panneau
                const ticks = modules.map((m, i) => Array.from(m.querySelectorAll('.knob-face')).map((f) => {
                    const r = f.getBoundingClientRect();
                    return { x: r.left + r.width / 2 - rects[i].left, y: r.top + r.height / 2 - rects[i].top, r: r.width * 26.4 / 56 };
                }));
                buildCase(scene, M, R, rects, at, { ticks, screw: 4.6 * unit });

                // Les boutons : jupe crantée noire, capot noir, repère blanc
                knobs = {};
                rackEl.querySelectorAll('.knob[data-knob]').forEach((node) => {
                    const f = node.querySelector('.knob-face').getBoundingClientRect();
                    const q = at(f.left + f.width / 2, f.top + f.height / 2), k = f.width / 56;
                    const g = new THREE.Group();
                    const sk = new THREE.Mesh(new THREE.CylinderGeometry(19 * k, 19.4 * k, 7 * k, 64), M.knob); sk.rotation.x = Math.PI / 2; sk.position.z = 3.5 * k;
                    const rid = new THREE.Mesh(new THREE.CylinderGeometry(17.6 * k, 18.4 * k, 2 * k, 64, 1, true), M.knobTop); rid.rotation.x = Math.PI / 2; rid.position.z = 7.6 * k;
                    const cap = new THREE.Mesh(new THREE.CylinderGeometry(12 * k, 13 * k, 22 * k, 64), M.knob); cap.rotation.x = Math.PI / 2; cap.position.z = 7 * k + 11 * k;
                    const top = new THREE.Mesh(new THREE.CylinderGeometry(11.4 * k, 12 * k, 0.8 * k, 64), M.knobTop); top.rotation.x = Math.PI / 2; top.position.z = 29.4 * k;
                    const line = new THREE.Mesh(new THREE.BoxGeometry(1.2 * k, 8.5 * k, 0.6 * k), M.pointer); line.position.set(0, 6 * k, 29.9 * k);
                    const mark = new THREE.Mesh(new THREE.BoxGeometry(1.4 * k, 4.2 * k, 0.8 * k), M.pointer); mark.position.set(0, 16.4 * k, 7.2 * k);
                    [sk, rid, cap, top, line, mark].forEach((n) => { n.castShadow = true; g.add(n); });
                    g.position.set(q.x, q.y, 0);
                    scene.add(g);
                    knobs[node.dataset.knob] = g;
                    const sh = contactShadow(60 * k, 60 * k, 0.75, 7 * k, -9 * k);
                    if (sh) { sh.position.x += q.x; sh.position.y += q.y; scene.add(sh); }
                });

                // Les prises : écrou hexagonal en acier, douille, trou noir
                jacks = {};
                rackEl.querySelectorAll('.jack[data-jack]').forEach((btn) => {
                    const r = btn.querySelector('.jack-nut').getBoundingClientRect();
                    const q = at(r.left + r.width / 2, r.top + r.height / 2), s = r.width / 32;
                    const g = new THREE.Group();
                    const nut = new THREE.Mesh(new THREE.CylinderGeometry(14.7 * s, 14.7 * s, 4 * s, 6), M.steel); nut.rotation.x = Math.PI / 2; nut.rotation.y = Math.PI / 6; nut.position.z = 2 * s;
                    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(9.6 * s, 9.6 * s, 6 * s, 32), M.steel); sleeve.rotation.x = Math.PI / 2; sleeve.position.z = 3 * s;
                    const hole = new THREE.Mesh(new THREE.CircleGeometry(5.6 * s, 32), M.hole); hole.position.z = 6.05 * s;
                    nut.castShadow = sleeve.castShadow = true;
                    g.add(nut, sleeve, hole);
                    g.position.set(q.x, q.y, 0);
                    scene.add(g);
                    const sh = contactShadow(40 * s, 40 * s, 0.5, 3 * s, -4 * s);
                    if (sh) { sh.position.x += q.x; sh.position.y += q.y; scene.add(sh); }
                    // Position dans le repère du rack (px depuis le coin haut gauche), comme les câbles d'instrument.js
                    jacks[btn.dataset.jack] = { x: q.x, y: q.y, lx: r.left + r.width / 2 - R.left, ly: r.top + r.height / 2 - R.top };
                });

                // Les touches de forme d'onde
                waves = [];
                rackEl.querySelectorAll('.wave-btn').forEach((b) => {
                    const r = b.getBoundingClientRect(), d = WAVE_ICON[b.dataset.wave];
                    const mats = keyMaterials([false, true].map((on) => keyFace(r.width, r.height, on, (g, w, h) => {
                        g.save(); g.translate(w / 2 - 10, h / 2 - 8);
                        g.strokeStyle = on ? '#7FEAFF' : '#8A8A8A'; g.lineWidth = 1.6; g.lineCap = g.lineJoin = 'round';
                        g.stroke(new Path2D(d)); g.restore();
                    })));
                    const mesh = new THREE.Mesh(roundedKeyGeometry(r.width, r.height, 3.5, 4), [mats[0], M.keySide]);
                    const q = at(r.left + r.width / 2, r.top + r.height / 2);
                    mesh.position.set(q.x, q.y, 0); mesh.castShadow = true;
                    scene.add(mesh);
                    const sh = contactShadow(r.width + 10, r.height + 10, 0.45, 2, -3);
                    if (sh) { sh.position.x += q.x; sh.position.y += q.y; scene.add(sh); }
                    waves.push({ btn: b, mesh, mats });
                });

                // La lunette de l'oscilloscope (l'écran lui-même reste celui de la page)
                rackEl.querySelectorAll('.module-scope').forEach((sc) => {
                    const r = sc.getBoundingClientRect(), q = at(r.left + r.width / 2, r.top + r.height / 2);
                    const bez = new THREE.Mesh(new THREE.BoxGeometry(r.width + 8, r.height + 8, 2.4), M.rail);
                    bez.position.set(q.x, q.y, 0.2); bez.receiveShadow = true; scene.add(bez);
                });

                // Un voile par module : il suit l'opacité du module (guide, rack éteint, mise sous tension)
                veils = rects.map((r) => {
                    const q = at(r.left + r.width / 2, r.top + r.height / 2);
                    const v = new THREE.Mesh(new THREE.PlaneGeometry(r.width, r.height), new THREE.MeshBasicMaterial({ color: 0x0a0a0a, transparent: true, opacity: 0, depthWrite: false }));
                    v.material.userData.own = true;
                    v.position.set(q.x, q.y, 34 * unit); v.renderOrder = 2;
                    scene.add(v);
                    return v;
                });
            });
        }

        /* ---------- les câbles : ils pendent entre deux prises et se balancent à la pose ----------
           La forme est celle d'un câble souple qui pend (sa flèche dépend de sa longueur) ;
           un ressort amorti la fait osciller quand on le pose, puis la stabilise. */
        const SEG = 24;
        function plugMesh(kind) {
            const s = unit, g = new THREE.Group();
            const body = new THREE.Mesh(new THREE.CylinderGeometry(10.5 * s, 11.5 * s, 34 * s, 24), M.plug); body.rotation.x = Math.PI / 2; body.position.z = 24 * s;
            const ring = new THREE.Mesh(new THREE.CylinderGeometry(11.7 * s, 11.7 * s, 4.5 * s, 24), kind === 'audio' ? M.audio : M.cv); ring.rotation.x = Math.PI / 2; ring.position.z = 10 * s;
            const tip = new THREE.Mesh(new THREE.CylinderGeometry(7.5 * s, 9 * s, 8 * s, 24), M.steel); tip.rotation.x = Math.PI / 2; tip.position.z = 6 * s;
            [body, ring, tip].forEach((n) => { n.castShadow = true; n.layers.enable(1); g.add(n); });
            const sh = contactShadow(40 * s, 40 * s, 0.6, 4 * s, -6 * s);
            if (sh) g.add(sh);
            scene.add(g);
            return g;
        }
        function Rope(a, b, kind) {
            const mesh = new THREE.Mesh(new THREE.BufferGeometry(), kind === 'audio' ? M.audio : M.cv);
            mesh.castShadow = true; mesh.layers.enable(1); scene.add(mesh);
            // La flèche part à moitié : le câble tombe, rebondit un peu, puis se pose
            const r = { mesh, kind, plugs: [plugMesh(kind), plugMesh(kind)], sag: null, vel: 0, pts: [] };
            for (let i = 0; i <= SEG; i++) r.pts.push(new THREE.Vector3());
            return r;
        }
        function dropRope(r) {
            if (!r) return;
            scene.remove(r.mesh); r.mesh.geometry.dispose();
            r.plugs.forEach((p) => { scene.remove(p); p.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); });
        }
        const anchorOf = (j) => new THREE.Vector3(j.x, j.y, 41 * unit);
        // Renvoie true tant que le câble oscille encore
        function stepRope(r, A0, B0) {
            // Un câble un peu plus long que l'écart, sans jamais pendre trop bas sous le rack
            const d = A0.distanceTo(B0), L = Math.max(d * 1.06, d + 56 * unit);
            const target = Math.min(118 * unit, Math.sqrt(3 * d * (L - d) / 8) + 10 * unit);
            // Posé et immobile, aux mêmes prises : rien à recalculer
            const where = A0.x + ',' + A0.y + ',' + B0.x + ',' + B0.y + ',' + B0.z;
            if (r.still && r.where === where) return false;
            if (r.sag === null) { r.sag = target * 0.35; r.vel = 0; }
            if (reduceMotion()) { r.sag = target; r.vel = 0; }
            r.vel = (r.vel + (target - r.sag) * 0.09) * 0.88;
            r.sag += r.vel;
            const moving = Math.abs(r.vel) > 0.03 * unit || Math.abs(target - r.sag) > 0.15 * unit;
            if (!moving) { r.sag = target; r.vel = 0; }
            r.still = !moving; r.where = where;
            // Devant les boutons et devant le voile des modules grisés par le guide
            const FRONT = 38 * unit;
            for (let i = 0; i <= SEG; i++) {
                const t = i / SEG, p = r.pts[i];
                p.copy(A0).lerp(B0, t);
                p.y -= 4 * t * (1 - t) * r.sag;
                // Le câble sort de la fiche vers l'avant, puis vient pendre contre la façade
                const out = Math.min(1, Math.min(t, 1 - t) * 6);
                p.z = A0.z + (FRONT - A0.z) * out + 6 * unit * Math.sin(Math.PI * t);
            }
            r.mesh.geometry.dispose();
            r.mesh.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(r.pts), SEG * 3, 4.6 * unit, 10, false);
            r.plugs[0].position.set(A0.x, A0.y, 0);
            r.plugs[1].position.set(B0.x, B0.y, B0.z - 41 * unit);
            return moving;
        }

        /* ---------- le voile des modules ----------
           Il suit l'opacité que le CSS donne aux modules, recalculée ici depuis l'état du guide
           (is-dim, rack éteint, survol ou focus, mise sous tension), avec les mêmes durées et
           les mêmes délais que les transitions de common.css. */
        function fadeTarget(m, i) {
            const hot = m.matches(':hover') || m.matches(':focus-within');
            if (rackEl.classList.contains('is-off')) return hot ? { op: 0.6, dur: 600, delay: 0 } : { op: 0.38, dur: 600, delay: (3 - i) * 80 };
            if (m.classList.contains('is-dim')) return { op: hot ? 0.85 : 0.4, dur: 500, delay: 0 };
            return { op: 1, dur: 500, delay: 0 };
        }
        // Renvoie true tant qu'un voile change encore
        function stepVeils(now) {
            let busy = false;
            const since = model.powering ? model.powering() : 0;
            modules.forEach((m, i) => {
                const f = fades[i] || (fades[i] = { v: null, to: null });
                if (since) {
                    // L'allumage, module par module : de 0,08 à 1 en 0,6 s
                    f.v = 0.08 + 0.92 * ease((now - since - (i * 140 + 150)) / 600);
                    f.to = null;
                    busy = true;
                } else {
                    const g = fadeTarget(m, i);
                    if (f.v === null) f.v = f.to = g.op;
                    else if (f.to === null) Object.assign(f, { from: f.v, to: g.op, t0: now, dur: 500 });
                    else if (g.op !== f.to) Object.assign(f, { from: f.v, to: g.op, t0: now + g.delay, dur: g.dur });
                    if (f.v !== f.to) {
                        const k = (now - f.t0) / f.dur;
                        f.v = k >= 1 ? f.to : f.from + (f.to - f.from) * ease(k);
                        if (f.v !== f.to) busy = true;
                    }
                }
                if (veils[i]) veils[i].material.opacity = Math.min(0.85, (1 - f.v) * 1.05);
            });
            return busy;
        }

        /* ---------- l'image : redessinée seulement quand quelque chose change ---------- */
        function invalidate() { dirty = true; start(); }
        function frame(now) {
            raf = 0;
            if (destroyed || !scene) return;
            dirty = false;
            let busy = false;
            // Les câbles posés
            const live = {};
            model.cables().forEach((c) => {
                const a = jacks[c.from], b = jacks[c.to];
                if (!a || !b) return;
                live[c.id] = true;
                if (!ropes[c.id]) ropes[c.id] = Rope(anchorOf(a), anchorOf(b), c.kind);
                if (stepRope(ropes[c.id], anchorOf(a), anchorOf(b))) busy = true;
            });
            Object.keys(ropes).forEach((id) => { if (!live[id]) { dropRope(ropes[id]); delete ropes[id]; } });
            // Le câble qu'on tire
            const t = model.temp();
            if (t && jacks[t.from]) {
                const p = fromRack(t.x, t.y), end = new THREE.Vector3(p.x, p.y, 70 * unit);
                if (!tempRope || tempRope.from !== t.from) { dropRope(tempRope); tempRope = Rope(anchorOf(jacks[t.from]), end, model.kind(t.from)); tempRope.from = t.from; }
                if (stepRope(tempRope, anchorOf(jacks[t.from]), end)) busy = true;
            } else if (tempRope) { dropRope(tempRope); tempRope = null; }
            tilt.hold(!!t || rackEl.classList.contains('is-dragging'));
            // Les boutons tournent avec leur valeur ; la touche de l'onde choisie s'allume
            Object.keys(knobs).forEach((k) => { knobs[k].rotation.z = -(-135 + model.value(k) * 270) * Math.PI / 180; });
            waves.forEach((w) => {
                const on = w.btn.getAttribute('aria-pressed') === 'true', hot = w.btn.matches(':hover') || w.btn === document.activeElement;
                w.mesh.material[0] = w.mats[on ? 1 : 0];
                w.mesh.position.z = on ? -1.6 : hot ? -0.6 : 0;
            });
            // Les modules effacés par le guide, ou le rack éteint
            if (stepVeils(now)) busy = true;
            // Dessous : le matériel (et l'ombre des câbles) ; dessus : les câbles seuls, sans les reflets du studio
            camera.layers.set(0);
            renderer.render(scene, camera);
            camera.layers.set(1);
            const envMap = scene.environment;
            scene.environment = null;
            top.render(scene, camera);
            scene.environment = envMap;
            camera.layers.set(0);
            // Un câble qui se balance, un voile qui change : on continue ; sinon la boucle s'arrête
            if (busy) dirty = true;
            if (dirty) start();
        }
        function start() { if (!raf && !destroyed && visible && !document.hidden) raf = requestAnimationFrame(frame); }

        const io = 'IntersectionObserver' in window ? new IntersectionObserver((e) => { visible = e.some((x) => x.isIntersecting); if (visible && dirty) start(); }) : null;
        if (io) io.observe(rackEl);
        const onVis = () => { if (!document.hidden && dirty) start(); };
        document.addEventListener('visibilitychange', onVis);
        // Survol et focus : les touches d'onde s'enfoncent, les modules grisés se rallument un peu
        const onHover = () => invalidate();
        ['pointerover', 'pointerout', 'focusin', 'focusout'].forEach((ev) => rackEl.addEventListener(ev, onHover));
        let timer = 0;
        const again = () => { clearTimeout(timer); timer = setTimeout(() => { build(); invalidate(); }, 60); };
        const ro = 'ResizeObserver' in window ? new ResizeObserver(again) : null;
        if (ro) ro.observe(rackEl);
        build();
        invalidate();

        return {
            // instrument.js le signale à chaque changement : câble, bouton, onde, guide, rack éteint ou allumé
            invalidate,
            destroy() {
                destroyed = true;
                cancelAnimationFrame(raf); clearTimeout(timer);
                if (io) io.disconnect();
                if (ro) ro.disconnect();
                document.removeEventListener('visibilitychange', onVis);
                ['pointerover', 'pointerout', 'focusin', 'focusout'].forEach((ev) => rackEl.removeEventListener(ev, onHover));
                tilt.destroy();
                disposeScene(scene);
                env.dispose();
                renderer.dispose();
                top.dispose();
                canvas.remove();
                topCanvas.remove();
                rackEl.classList.remove('is-3d');
                delete rackEl.dataset.three;
            }
        };
    }

    /* =====================================================
       LE THEREMIN
       opts : ce que le guide d'instrument.js expose
         stage      le dessin SVG d'origine, gardé invisible par-dessus
                    (il reçoit les gestes, le clavier et le focus)
         hand()     la main, en unités du dessin (800 × 440)
         power()    allumé ou non
         analyser() l'analyseur Web Audio (l'écran)
         pitchAt(x), volumeAt(x, y), fmtHz(hz)
         TH         les repères du dessin (antenne, boucle)
         labels     { pitch, volume }
       ===================================================== */
    function walnutNoise(seed) {
        const N = 64, grid = new Float32Array(N * N);
        let x = seed * 9301 + 49297;
        for (let i = 0; i < N * N; i++) { x = (x * 9301 + 49297) % 233280; grid[i] = x / 233280; }
        const at = (i, j) => grid[((j % N + N) % N) * N + ((i % N + N) % N)];
        return (u, v) => {
            const i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j;
            const su = fu * fu * (3 - 2 * fu), sv = fv * fv * (3 - 2 * fv);
            return (at(i, j) * (1 - su) + at(i + 1, j) * su) * (1 - sv) + (at(i, j + 1) * (1 - su) + at(i + 1, j + 1) * su) * sv;
        };
    }
    // Le noyer : un fil qui court dans la longueur, quelques veines plus sombres, un placage en miroir
    function walnut(w, h, opts) {
        opts = opts || {};
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const g = c.getContext('2d'), img = g.createImageData(w, h);
        const n1 = walnutNoise(opts.seed || 1), n2 = walnutNoise((opts.seed || 1) + 7);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const xx = opts.mirror && x >= w / 2 ? w - 1 - x : x;
            const along = opts.vertical ? y / h : xx / w, across = opts.vertical ? xx / w : y / h;
            const warp = n1(along * 3, across * 2) * 0.9 + n1(along * 9, across * 6) * 0.25;
            const grain = Math.sin((across * (opts.freq || 26) + warp * 2.2) * Math.PI * 2);
            const vein = Math.pow(Math.max(0, grain), 6);
            const fine = n2(along * 220, across * 30);
            const k = (0.78 - 0.22 * vein + 0.08 * (fine - 0.5) + 0.06 * (n1(along * 2, across * 1.5) - 0.5)) * (opts.dark || 1);
            const i = (y * w + x) * 4;
            img.data[i] = 112 * k; img.data[i + 1] = 70 * k; img.data[i + 2] = 40 * k; img.data[i + 3] = 255;
        }
        g.putImageData(img, 0, 0);
        if (opts.decorate) opts.decorate(g, w, h);
        const t = canvasTexture(c); t.anisotropy = 8; return t;
    }

    function theremin(wrap, opts) {
        if (!supported() || !wrap) return null;
        const TH = opts.TH;
        // Le meuble (unités : le centimètre, environ) et la correspondance avec le dessin d'origine
        const CAB = { w: 40, h: 11, d: 18 };
        const ROD = { x: 16, z: -4, base: CAB.h / 2, top: 34 };
        const LOOP = { y: 0.6, x0: -20.4, x1: -33, z: 2.4 };
        const FLOOR = -27.5;
        const KX = (TH.rodX - (TH.loopLeft + TH.loopRight) / 2) / (ROD.x - (LOOP.x0 + LOOP.x1) / 2);
        const KY = (TH.loopY - TH.rodTop) / (ROD.top - LOOP.y);
        const toTH = (x, y) => ({ x: TH.rodX + (x - ROD.x) * KX, y: TH.loopY - (y - LOOP.y) * KY });
        const fromTH = (x, y) => ({ x: ROD.x + (x - TH.rodX) / KX, y: LOOP.y - (y - TH.loopY) / KY });

        const renderer = makeRenderer({ exposure: 1.1, clear: 0x0a0a0a });
        const canvas = renderer.domElement;
        canvas.className = 'theremin-3d';
        canvas.setAttribute('aria-hidden', 'true');
        wrap.insertBefore(canvas, wrap.firstChild);
        wrap.classList.add('is-3d');
        const hz = document.createElement('span');
        hz.className = 'theremin-hz'; hz.hidden = true; hz.setAttribute('aria-hidden', 'true');
        wrap.appendChild(hz);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(30, 1, 1, 600);
        const env = studioEnv(renderer, true);
        scene.environment = env;
        scene.add(new THREE.HemisphereLight(0x3a332c, 0x080706, 0.9));
        const key = new THREE.DirectionalLight(0xfff1dc, 1.7);
        key.position.set(-22, 70, 42);
        key.castShadow = !modest;
        key.shadow.mapSize.set(coarse() ? 1024 : 2048, coarse() ? 1024 : 2048);
        Object.assign(key.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 260 });
        key.shadow.bias = -0.0005; key.shadow.radius = 4;
        scene.add(key);
        const back = new THREE.DirectionalLight(0xffffff, 0.6);
        back.position.set(40, 30, -40);
        scene.add(back);
        const th = new THREE.Group();
        scene.add(th);

        const own = (m) => { m.userData.own = true; return m; };
        const brass = own(new THREE.MeshStandardMaterial({ color: lin('#D9B46A'), roughness: 0.28, metalness: 1.0 }));
        const brassDark = own(new THREE.MeshStandardMaterial({ color: lin('#9C7838'), roughness: 0.35, metalness: 1.0 }));
        const bakelite = own(new THREE.MeshStandardMaterial({ color: lin('#1A0F0A'), roughness: 0.35 }));
        const blackPlastic = own(new THREE.MeshStandardMaterial({ color: lin('#111111'), roughness: 0.42 }));
        const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; th.add(m); return m; };

        // Le meuble : façade plaquée en miroir avec pilastres cannelés, dessus, flancs
        const front = own(new THREE.MeshStandardMaterial({
            map: walnut(1024, 288, {
                mirror: true, freq: 9, seed: 3, decorate: (g, w, h) => {
                    [0.025, 0.04, 0.055, 0.945, 0.96, 0.975].forEach((u) => {
                        g.fillStyle = 'rgba(20,10,4,0.55)'; g.fillRect(u * w, 0.06 * h, 3, 0.88 * h);
                        g.fillStyle = 'rgba(255,220,170,0.10)'; g.fillRect(u * w + 3, 0.06 * h, 2, 0.88 * h);
                    });
                    g.fillStyle = 'rgba(20,10,4,0.45)'; g.fillRect(w / 2 - 1, 0, 2, h);
                }
            }), roughness: 0.38, envMapIntensity: 0.9
        }));
        const top = own(new THREE.MeshStandardMaterial({ map: walnut(1024, 460, { freq: 14, seed: 5 }), roughness: 0.34 }));
        const side = own(new THREE.MeshStandardMaterial({ map: walnut(460, 288, { freq: 8, seed: 9, dark: 0.72 }), roughness: 0.45 }));
        const legWood = own(new THREE.MeshStandardMaterial({ map: walnut(64, 512, { freq: 4, seed: 11, dark: 0.8, vertical: true }), roughness: 0.45 }));
        add(new THREE.BoxGeometry(CAB.w, CAB.h, CAB.d), [side, side, top, side, front, side], 0, 0, 0);
        add(new THREE.BoxGeometry(CAB.w + 0.3, 0.32, 0.3), brass, 0, CAB.h / 2 - 0.05, CAB.d / 2 + 0.05);
        add(new THREE.BoxGeometry(CAB.w + 0.3, 0.32, 0.3), brass, 0, -CAB.h / 2 + 0.05, CAB.d / 2 + 0.05);
        add(new THREE.BoxGeometry(0.3, 0.32, CAB.d + 0.3), brass, CAB.w / 2 + 0.05, CAB.h / 2 - 0.05, 0);
        add(new THREE.BoxGeometry(0.3, 0.32, CAB.d + 0.3), brass, -CAB.w / 2 - 0.05, CAB.h / 2 - 0.05, 0);
        // Le tablier galbé, et le voyant
        const apron = new THREE.Shape();
        apron.moveTo(-CAB.w / 2 + 1, 0); apron.lineTo(CAB.w / 2 - 1, 0); apron.lineTo(CAB.w / 2 - 1, -0.9);
        apron.quadraticCurveTo(CAB.w / 4, -0.9, 0, -2.4); apron.quadraticCurveTo(-CAB.w / 4, -0.9, -CAB.w / 2 + 1, -0.9); apron.lineTo(-CAB.w / 2 + 1, 0);
        add(new THREE.ExtrudeGeometry(apron, { depth: 0.8, bevelEnabled: false }), side, 0, -CAB.h / 2, CAB.d / 2 - 0.9);
        const pilotMat = own(new THREE.MeshStandardMaterial({ color: lin('#06262D'), emissive: lin(CYAN), emissiveIntensity: 0, roughness: 0.15 }));
        add(new THREE.SphereGeometry(0.42, 24, 16), pilotMat, 0, -CAB.h / 2 - 1.15, CAB.d / 2 + 0.05);
        add(new THREE.TorusGeometry(0.56, 0.13, 12, 32), brass, 0, -CAB.h / 2 - 1.15, CAB.d / 2 + 0.02);
        const pilotLight = new THREE.PointLight(lin(CYAN), 0, 14, 2);
        pilotLight.position.set(0, -CAB.h / 2 - 1.2, CAB.d / 2 + 1.5);
        th.add(pilotLight);
        // La plaque : écran, nom, boutons
        const plateW = 26, plateH = 7.2, plateZ = CAB.d / 2 + 0.16;
        const pc = document.createElement('canvas'); pc.width = 1040; pc.height = 288;
        (function () {
            const g = pc.getContext('2d'), W = pc.width, H = pc.height, k = W / plateW;
            g.fillStyle = '#15110C'; g.fillRect(0, 0, W, H);
            g.strokeStyle = 'rgba(199,158,82,0.45)'; g.lineWidth = 3; g.strokeRect(0.35 * k, 0.35 * k, W - 0.7 * k, H - 0.7 * k);
            g.fillStyle = '#EFE4CC'; g.font = `900 ${1.25 * k}px Inter, sans-serif`; g.textAlign = 'center';
            g.fillText('theremin', 20.2 * k, 2.4 * k);
            const tw = g.measureText('theremin').width;
            g.fillStyle = CYAN; g.beginPath(); g.arc(20.2 * k + tw / 2 + 0.18 * k, 2.32 * k, 0.12 * k, 0, Math.PI * 2); g.fill();
            g.fillStyle = '#9C8E74'; g.font = `600 ${0.36 * k}px Inter, sans-serif`;
            if ('letterSpacing' in g) g.letterSpacing = `${0.08 * k}px`;
            g.fillText('modulr lab · 1920', 20.2 * k, 3.05 * k);
            g.fillStyle = '#D9CDB3'; g.font = `600 ${0.34 * k}px Inter, sans-serif`;
            g.fillText(opts.labels.pitch.toUpperCase(), 18 * k, 6.45 * k); g.fillText(opts.labels.volume.toUpperCase(), 22.4 * k, 6.45 * k);
        })();
        add(new THREE.BoxGeometry(plateW, plateH, 0.25), [blackPlastic, blackPlastic, blackPlastic, blackPlastic, own(new THREE.MeshStandardMaterial({ map: canvasTexture(pc), roughness: 0.5 })), blackPlastic], 0, 0, plateZ - 0.1);
        [[0, plateH / 2, plateW + 0.5, 0.35], [0, -plateH / 2, plateW + 0.5, 0.35]].forEach(([x, y, w, h]) => add(new THREE.BoxGeometry(w, h, 0.45), brass, x, y, plateZ));
        [-plateW / 2, plateW / 2].forEach((x) => add(new THREE.BoxGeometry(0.35, plateH + 0.5, 0.45), brass, x, 0, plateZ));
        [[-12.3, 2.9], [12.3, 2.9], [-12.3, -2.9], [12.3, -2.9]].forEach(([x, y]) => { add(new THREE.SphereGeometry(0.26, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), brass, x, y, plateZ + 0.05).rotation.x = Math.PI / 2; });
        add(new THREE.BoxGeometry(12.8, 5.5, 0.18), brassDark, -5.6, 0, plateZ - 0.06);
        const scr = document.createElement('canvas'); scr.width = 640; scr.height = 256;
        const scrTex = canvasTexture(scr);
        const screen = add(new THREE.PlaneGeometry(12.2, 4.9), own(new THREE.MeshBasicMaterial({ map: scrTex, toneMapped: false })), -5.6, 0, plateZ + 0.06);
        screen.castShadow = screen.receiveShadow = false;
        const glass = add(new THREE.PlaneGeometry(12.2, 4.9), own(new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.07 })), -5.6, 0, plateZ + 0.1);
        glass.castShadow = glass.receiveShadow = false;
        const markMat = own(new THREE.MeshStandardMaterial({ color: lin('#F3E7C9') }));
        [[5.0, 0.5], [9.4, -0.7]].forEach(([x, rot]) => {
            const g = new THREE.Group(); g.position.set(x, -0.95, plateZ + 0.05); th.add(g);
            const sk = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.04, 0.4, 48), blackPlastic); sk.rotation.x = Math.PI / 2; sk.position.z = 0.2;
            const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.72, 0.9, 48), brass); cap.rotation.x = Math.PI / 2; cap.position.z = 0.85;
            const mark = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.42, 0.06), markMat); mark.position.set(0, 0.78, 0.42);
            [sk, cap, mark].forEach((n) => { n.castShadow = true; g.add(n); });
            g.rotation.z = rot;
        });
        // Les pieds chaussés de laiton, l'étagère
        [[-17, -7], [17, -7], [-17, 7], [17, 7]].forEach(([x, z]) => {
            const len = -CAB.h / 2 - FLOOR - 0.8;
            add(new THREE.CylinderGeometry(0.8, 0.45, len, 24), legWood, x, -CAB.h / 2 - len / 2, z);
            add(new THREE.CylinderGeometry(0.5, 0.5, 0.8, 24), brass, x, FLOOR + 0.4, z);
        });
        add(new THREE.BoxGeometry(35, 0.7, 15), top, 0, -19, 0);
        add(new THREE.BoxGeometry(35.2, 0.18, 0.2), brass, 0, -18.65, 7.55);
        // L'antenne de hauteur, la boucle de volume
        add(new THREE.CylinderGeometry(0.95, 1.05, 2.2, 32), bakelite, ROD.x, ROD.base + 1.1, ROD.z);
        add(new THREE.CylinderGeometry(1.12, 1.12, 0.32, 32), brass, ROD.x, ROD.base + 2.3, ROD.z);
        add(new THREE.CylinderGeometry(0.28, 0.28, ROD.top - ROD.base - 2.3, 24), brass, ROD.x, (ROD.top + ROD.base + 2.3) / 2, ROD.z);
        add(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 24), brass, ROD.x, ROD.base + 14, ROD.z);
        add(new THREE.SphereGeometry(0.6, 32, 16), brass, ROD.x, ROD.top, ROD.z);
        const loopPath = new THREE.CurvePath();
        loopPath.add(new THREE.LineCurve3(new THREE.Vector3(LOOP.x0, LOOP.y, -LOOP.z), new THREE.Vector3(LOOP.x1 + LOOP.z, LOOP.y, -LOOP.z)));
        loopPath.add(new THREE.CubicBezierCurve3(new THREE.Vector3(LOOP.x1 + LOOP.z, LOOP.y, -LOOP.z), new THREE.Vector3(LOOP.x1 - LOOP.z * 0.35, LOOP.y, -LOOP.z), new THREE.Vector3(LOOP.x1 - LOOP.z * 0.35, LOOP.y, LOOP.z), new THREE.Vector3(LOOP.x1 + LOOP.z, LOOP.y, LOOP.z)));
        loopPath.add(new THREE.LineCurve3(new THREE.Vector3(LOOP.x1 + LOOP.z, LOOP.y, LOOP.z), new THREE.Vector3(LOOP.x0, LOOP.y, LOOP.z)));
        add(new THREE.TubeGeometry(loopPath, 120, 0.26, 16, false), brass, 0, 0, 0);
        add(new THREE.BoxGeometry(1.4, 2.6, 6.4), bakelite, -CAB.w / 2 - 0.6, LOOP.y, 0);
        const floor = modest
            // Sans ombres calculées : une ombre floue et fixe sous le meuble et ses pieds
            ? contactShadow(CAB.w * 1.25, CAB.d * 1.6, 0.6, 0, 0)
            : new THREE.Mesh(new THREE.PlaneGeometry(400, 400), own(new THREE.ShadowMaterial({ opacity: 0.55 })));
        floor.rotation.x = -Math.PI / 2; floor.position.set(0, FLOOR + (modest ? 0.02 : 0), 0); floor.receiveShadow = true;
        th.add(floor);

        // Les champs autour des antennes, et la main
        const ring = (rx, ry) => {
            const pts = new THREE.EllipseCurve(0, 0, rx, ry, 0, Math.PI * 2).getPoints(96).map((p) => new THREE.Vector3(p.x, p.y, 0));
            const m = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), own(new THREE.LineBasicMaterial({ color: lin(CYAN), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })));
            th.add(m); return m;
        };
        const pitchRings = [0, 1, 2, 3].map((i) => { const r = ring(3.6 + i * 3.4, 9.6 + i * 1.4); r.position.set(ROD.x, 18, ROD.z); r.userData.k = i; return r; });
        const volRings = [0, 1, 2].map((i) => { const r = ring(8.4 + i * 2, 2.2 + i * 1.8); r.position.set((LOOP.x0 + LOOP.x1) / 2, LOOP.y, 0); r.rotation.x = -Math.PI / 2; r.userData.k = i; return r; });
        const spriteTex = (draw) => { const c = document.createElement('canvas'); c.width = c.height = 128; draw(c.getContext('2d')); return new THREE.CanvasTexture(c); };
        const dotTex = spriteTex((g) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(0,184,217,1)'); r.addColorStop(0.16, 'rgba(0,184,217,1)'); r.addColorStop(0.26, 'rgba(0,184,217,0.4)'); r.addColorStop(1, 'rgba(0,184,217,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); });
        const ringTex = spriteTex((g) => { g.strokeStyle = 'rgba(0,184,217,1)'; g.lineWidth = 3; g.beginPath(); g.arc(64, 64, 60, 0, Math.PI * 2); g.stroke(); });
        const sprite = (map) => new THREE.Sprite(own(new THREE.SpriteMaterial({ map, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, toneMapped: false })));
        const hand = new THREE.Group(); th.add(hand);
        const dot = sprite(dotTex); dot.scale.set(4.4, 4.4, 1); hand.add(dot);
        const ripples = [sprite(ringTex), sprite(ringTex)]; ripples.forEach((s) => hand.add(s));
        hand.visible = false;

        /* ---------- la main : la souris rapportée dans le plan des antennes ---------- */
        const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane();
        function toDrawing(clientX, clientY) {
            const r = canvas.getBoundingClientRect();
            if (!r.width) return null;
            ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
            ray.setFromCamera(ndc, camera);
            th.updateMatrixWorld(true);
            plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 0, 1).applyQuaternion(th.quaternion), th.localToWorld(new THREE.Vector3()));
            const p = new THREE.Vector3();
            if (!ray.ray.intersectPlane(plane, p)) return null;
            const l = th.worldToLocal(p), d = toTH(l.x, l.y);
            return { x: Math.max(0, Math.min(800, d.x)), y: Math.max(0, Math.min(440, d.y)) };
        }

        /* ---------- cadrage : trois quarts ---------- */
        const target = new THREE.Vector3(-3, 5.5, 0);
        function resize() {
            const w = wrap.clientWidth, h = wrap.clientHeight;
            if (!w || !h) return;
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            const vfov = camera.fov * Math.PI / 180;
            // Du sol au bout de l'antenne, de la boucle à l'antenne, avec un peu d'air
            const dist = Math.max(39 / Math.tan(vfov / 2), 43 / (Math.tan(vfov / 2) * camera.aspect));
            camera.position.copy(target).addScaledVector(new THREE.Vector3(0.36, 0.2, 1).normalize(), dist * 1.02);
            camera.lookAt(target);
            camera.updateProjectionMatrix();
        }
        /* ---------- l'image : redessinée seulement quand quelque chose change ---------- */
        let raf = 0, destroyed = false, visible = true, dirty = true, last = 0, pointer = { x: 0, y: 0, inside: false };
        function invalidate() { dirty = true; start(); }
        const ro = 'ResizeObserver' in window ? new ResizeObserver(() => { resize(); invalidate(); }) : null;
        if (ro) ro.observe(wrap);
        resize();

        const tilt = { x: 0, y: 0 };
        const onMove = (e) => {
            const r = wrap.getBoundingClientRect();
            pointer = { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: ((e.clientY - r.top) / r.height) * 2 - 1, inside: e.pointerType === 'mouse' };
            invalidate();
        };
        const onLeave = () => { pointer.inside = false; invalidate(); };
        wrap.addEventListener('pointermove', onMove);
        wrap.addEventListener('pointerleave', onLeave);
        const data = new Float32Array(2048);
        function drawScreen(on) {
            const g = scr.getContext('2d'), w = scr.width, h = scr.height;
            g.fillStyle = '#031014'; g.fillRect(0, 0, w, h);
            g.strokeStyle = 'rgba(0,184,217,0.15)'; g.lineWidth = 1; g.beginPath();
            for (let i = 1; i < 8; i++) { const x = Math.round(w * i / 8) + 0.5; g.moveTo(x, 0); g.lineTo(x, h); }
            for (let i = 1; i < 4; i++) { const y = Math.round(h * i / 4) + 0.5; g.moveTo(0, y); g.lineTo(w, y); }
            g.stroke();
            const an = opts.analyser();
            let s0 = 0, has = false;
            if (an && on) { an.getFloatTimeDomainData(data); has = true; for (let i = 1; i < 1024; i++) if (data[i - 1] < 0 && data[i] >= 0) { s0 = i; break; } }
            g.beginPath();
            for (let i = 0; i < 260; i++) { const v = has ? data[s0 + i * 3] || 0 : 0; const x = (i / 259) * w, y = h / 2 - Math.max(-1, Math.min(1, v * 1.6)) * (h / 2 - 10); if (i) g.lineTo(x, y); else g.moveTo(x, y); }
            g.strokeStyle = on ? CYAN : '#0D3A42'; g.lineWidth = 3; g.shadowColor = 'rgba(0,184,217,0.9)'; g.shadowBlur = on ? 14 : 0; g.stroke(); g.shadowBlur = 0;
            scrTex.needsUpdate = true;
        }
        function frame(now) {
            raf = 0;
            if (destroyed) return;
            dirty = false;
            const dt = last ? Math.min(100, now - last) : 16; last = now;
            const k = Math.min(1, dt / 250);
            const still = reduceMotion();
            const tx = pointer.inside && !still ? pointer.y * 0.04 : 0, ty = pointer.inside && !still ? pointer.x * 0.07 : 0;
            tilt.x += (tx - tilt.x) * k;
            tilt.y += (ty - tilt.y) * k;
            const tilting = Math.abs(tx - tilt.x) > 1e-4 || Math.abs(ty - tilt.y) > 1e-4;
            if (!tilting) { tilt.x = tx; tilt.y = ty; }
            th.rotation.set(tilt.x, tilt.y, 0);
            const cls = opts.stage.classList, on = opts.power(), h = opts.hand(), playing = cls.contains('is-playing');
            const near = Math.max(0, 1 - Math.abs(TH.rodX - h.x) / 480), vol = opts.volumeAt(h.x, h.y);
            const pulse = (i) => 0.06 + 0.18 * (0.5 + 0.5 * Math.sin(now / 320 - i));
            pitchRings.forEach((r) => { r.material.opacity = playing ? near * (0.6 - r.userData.k * 0.12) : (cls.contains('is-hint-rod') && !still ? pulse(r.userData.k) : 0); });
            volRings.forEach((r) => { r.material.opacity = playing ? (1 - vol) * (0.55 - r.userData.k * 0.13) : (cls.contains('is-hint-loop') && !still ? pulse(r.userData.k) : 0); });
            // Le voyant : éteint, il pulse doucement pour dire « allumez-moi » ; allumé, cyan franc
            const hint = cls.contains('is-hint-pilot') && !still ? 0.35 + 0.35 * Math.sin(now / 300) : 0;
            pilotMat.emissiveIntensity = on ? 3 : hint;
            pilotLight.intensity = on ? 1.6 : hint * 0.4;
            hand.visible = playing;
            if (playing) {
                const w = fromTH(h.x, h.y);
                hand.position.set(w.x, w.y, 0.5);
                ripples.forEach((s, i) => { const t = ((now / 1600) + i * 0.5) % 1; s.scale.setScalar(2 + t * 7); s.material.opacity = still ? 0 : 0.8 * (1 - t); });
                const v = hand.position.clone(); th.localToWorld(v); v.project(camera);
                const r = canvas.getBoundingClientRect();
                const px = (v.x + 1) / 2 * r.width, py = (1 - v.y) / 2 * r.height;
                hz.style.transform = `translate(${(px > r.width - 110 ? px - 96 : px + 18).toFixed(0)}px, ${(py - 30).toFixed(0)}px)`;
                hz.textContent = opts.fmtHz(opts.pitchAt(h.x));
                hz.hidden = false;
            } else hz.hidden = true;
            drawScreen(on);
            renderer.render(scene, camera);
            // Ce qui bouge tout seul : l'écran allumé, les repères qui pulsent, l'inclinaison qui se pose
            const hinting = !still && (cls.contains('is-hint-pilot') || cls.contains('is-hint-rod') || cls.contains('is-hint-loop'));
            if (on || playing || hinting || tilting) dirty = true;
            else last = 0;
            if (dirty) start();
        }
        function start() { if (!raf && !destroyed && visible && !document.hidden) raf = requestAnimationFrame(frame); }
        const io = 'IntersectionObserver' in window ? new IntersectionObserver((e) => { visible = e.some((x) => x.isIntersecting); if (visible && dirty) start(); }) : null;
        if (io) io.observe(wrap);
        const onVis = () => { if (!document.hidden && dirty) start(); };
        document.addEventListener('visibilitychange', onVis);
        invalidate();

        return {
            toDrawing,
            // instrument.js le signale à chaque changement : allumé ou éteint, la main, l'étape du guide
            invalidate,
            destroy() {
                destroyed = true;
                cancelAnimationFrame(raf);
                if (io) io.disconnect();
                if (ro) ro.disconnect();
                document.removeEventListener('visibilitychange', onVis);
                wrap.removeEventListener('pointermove', onMove);
                wrap.removeEventListener('pointerleave', onLeave);
                disposeScene(scene);
                env.dispose();
                renderer.dispose();
                canvas.remove(); hz.remove();
                wrap.classList.remove('is-3d');
            }
        };
    }

    window.modulr3D = { supported, rack, siteRack, theremin };
})();
