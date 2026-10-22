/* =========================================================
   MODULR LAB — instrument.js
   Les racks du site : de vrais petits instruments, synthétisés
   dans le navigateur (Web Audio), avec des câbles à tirer d'une
   sortie vers une entrée et un oscilloscope qui montre le vrai
   signal. Chargé par main.js seulement quand la page contient
   [data-instrument] ; la valeur de l'attribut choisit le rack :
     (vide)     l'accueil : « votre premier patch », vco, vcf, lfo, out
     histoire   l'histoire : un vrai theremin (pas un rack), vers le chapitre 1

   Chaque rack a son guide : une étape à la fois (brancher,
   tourner un bouton, jouer), puis une sortie vers la suite du
   site. Rien ne sonne avant le premier geste du visiteur.
   ========================================================= */

(function () {
    'use strict';

    /* -----------------------------------------------------
       TEXTES COMMUNS À TOUS LES RACKS
       ----------------------------------------------------- */
    const COMMON = {
        fr: {
            roles: { vco: 'produire', vcf: 'transformer', lfo: 'contrôler', out: 'écouter', theremin: 'jouer' },
            waves: { sine: 'sinusoïde', triangle: 'triangle', sawtooth: 'dent de scie', square: 'carré' },
            waveGroup: "forme d'onde",
            input: 'entrée', output: 'sortie',
            stepOf: (i, n) => `étape ${i} sur ${n} : `,
            gesture: {
                touch: 'touchez {1}, puis {2}.',
                mouse: 'glissez un câble de {1} à {2}.',
                pending: 'maintenant, {2}.',
                other: 'choisissez où brancher l’autre bout.'
            },
            cableOf: (i, n) => `câble ${i} sur ${n}`,
            spoken: (a, b) => `reliez ${a} à ${b}.`,
            more: 'en détail : ',
            next: 'continuer →',
            hints: {
                direction: 'un câble va d’une sortie (étiquette blanche) vers une entrée.',
                self: 'branchez ce module sur un autre module.',
                lfoAudio: 'trop lent pour s’entendre : le lfo est un signal de contrôle. Branchez-le dans pitch ou cutoff.',
                unplugged: 'câble débranché.',
                noAudio: 'votre navigateur ne peut pas produire de son ici.'
            },
            patched: (a, b) => `câble branché : ${a} vers ${b}.`,
            unpatched: (a, b) => `câble débranché : ${a} vers ${b}.`,
            reset: 'recommencer',
            powerOff: 'éteindre le rack', powerOn: 'rallumer le rack',
            off: { touch: 'rack éteint : touchez une prise ou un bouton pour le rallumer.', mouse: 'rack éteint : cliquez sur une prise ou un bouton pour le rallumer.' },
            offSaid: 'rack éteint.', onSaid: 'rack rallumé.',
            legendAudio: 'câble cyan : du son', legendCv: 'câble blanc : du contrôle',
            legendUnplug: { touch: 'touchez une entrée branchée pour la débrancher', mouse: 'cliquez sur une entrée branchée pour la débrancher' },
            pad: {
                label: 'antenne du theremin : de gauche à droite, la hauteur ; de bas en haut, le volume. Au clavier, les flèches.',
                low: 'grave', high: 'aigu', loud: 'fort'
            }
        },
        en: {
            roles: { vco: 'produce', vcf: 'transform', lfo: 'control', out: 'listen', theremin: 'play' },
            waves: { sine: 'sine', triangle: 'triangle', sawtooth: 'sawtooth', square: 'square' },
            waveGroup: 'waveform',
            input: 'input', output: 'output',
            stepOf: (i, n) => `step ${i} of ${n}: `,
            gesture: {
                touch: 'tap {1}, then {2}.',
                mouse: 'drag a cable from {1} to {2}.',
                pending: 'now {2}.',
                other: 'now choose where the other end goes.'
            },
            cableOf: (i, n) => `cable ${i} of ${n}`,
            spoken: (a, b) => `patch ${a} to ${b}.`,
            more: 'in depth: ',
            next: 'continue →',
            hints: {
                direction: 'a cable goes from an output (white label) to an input.',
                self: 'patch this module into another one.',
                lfoAudio: 'too slow to hear: the lfo is a control signal. Patch it into pitch or cutoff.',
                unplugged: 'cable unplugged.',
                noAudio: 'your browser can’t play sound here.'
            },
            patched: (a, b) => `patched: ${a} to ${b}.`,
            unpatched: (a, b) => `unpatched: ${a} to ${b}.`,
            reset: 'start over',
            powerOff: 'switch off the rack', powerOn: 'switch the rack back on',
            off: { touch: 'rack off: tap a jack or a knob to switch it back on.', mouse: 'rack off: click a jack or a knob to switch it back on.' },
            offSaid: 'rack switched off.', onSaid: 'rack back on.',
            legendAudio: 'cyan cable: sound', legendCv: 'white cable: control',
            legendUnplug: { touch: 'tap a patched input to unplug it', mouse: 'click a patched input to unplug it' },
            pad: {
                label: 'theremin antenna: left to right, the pitch; bottom to top, the volume. With the keyboard, the arrow keys.',
                low: 'low', high: 'high', loud: 'loud'
            }
        }
    };

    /* -----------------------------------------------------
       LES RACKS
       Une étape a un but :
         patch  poser un ou des câbles (puis, éventuellement, tourner un bouton)
         turn   tourner un bouton
         play   jouer sur l'antenne du theremin
       Ses textes sont dans text.fr / text.en, dans le même ordre.
       ----------------------------------------------------- */
    const RACKS = {
        // L'accueil : le premier patch, en trois câbles
        home: {
            modules: [{ id: 'vco' }, { id: 'vcf' }, { id: 'lfo' }, { id: 'out' }],
            legend: true,
            steps: [
                { goal: 'patch', cables: [['vco.out', 'out.in']], reached: (r) => r.sounding(), knob: 'vco.pitch', focusDone: ['vco', 'out'] },
                { goal: 'patch', cables: [['vco.out', 'vcf.in'], ['vcf.out', 'out.in']], reached: (r) => r.filtered(), knob: 'vcf.cutoff', focusDone: ['vcf', 'out'] },
                {
                    goal: 'patch', cables: [['lfo.out', 'vcf.cutoff']], reached: (r) => r.moving(), knob: 'lfo.rate', focusDone: ['lfo', 'vcf', 'out'],
                    // Le lfo n'a d'effet sur cutoff que si le son passe déjà par le filtre
                    pre: [['vco.out', 'vcf.in'], ['vcf.out', 'out.in']], preWhen: (r) => !r.filtered()
                }
            ],
            text: {
                fr: {
                    eyebrow: 'votre premier patch',
                    // Une étape = une phrase. Puis, une fois branchée : ce qu'on entend, le bouton à tourner,
                    // et seulement après l'avoir tourné, l'explication.
                    steps: [
                        { title: 'faites sonner le vco.', done: 'une note.', turn: 'tournez pitch.', why: 'la fréquence fait la hauteur. L’oscilloscope dessine l’onde.', link: ['la leçon 1', 'le-cours/intro/'] },
                        { title: 'filtrez le son.', done: 'même note, autre couleur.', turn: 'tournez cutoff.', why: 'le filtre retire des harmoniques : l’onde s’arrondit.', link: ['la leçon 2', 'le-cours/son-et-harmonique/'] },
                        { title: 'laissez le lfo tourner cutoff.', done: 'le son bouge tout seul.', turn: 'tournez rate.', why: 'un signal lent tourne cutoff à votre place : c’est du control voltage.', link: ['la leçon 4', 'le-cours/controle-en-tension/'] }
                    ],
                    final: {
                        title: 'voilà votre premier patch.',
                        why: 'produire, transformer, contrôler : tout le modulaire part de ces trois gestes.',
                        links: [['comprendre ce qui s’est passé : la leçon 1 →', 'le-cours/intro/'], ['la suite du lab ↓', '#la-suite']]
                    }
                },
                en: {
                    eyebrow: 'your first patch',
                    steps: [
                        { title: 'make the vco sound.', done: 'a note.', turn: 'turn pitch.', why: 'frequency sets the pitch. The scope draws the wave.', link: ['lesson 1', 'le-cours/intro/'] },
                        { title: 'filter the sound.', done: 'same note, different colour.', turn: 'turn cutoff.', why: 'the filter removes harmonics: the wave gets rounder.', link: ['lesson 2', 'le-cours/son-et-harmonique/'] },
                        { title: 'let the lfo turn cutoff.', done: 'the sound moves on its own.', turn: 'turn rate.', why: 'a slow signal turns cutoff for you: that’s control voltage.', link: ['lesson 4', 'le-cours/controle-en-tension/'] }
                    ],
                    final: {
                        title: 'that’s your first patch.',
                        why: 'produce, transform, control: all of modular starts from these three moves.',
                        links: [['understand what happened: lesson 1 →', 'le-cours/intro/'], ['the rest of the lab ↓', '#whats-next']]
                    }
                }
            }
        }
    };

    /* -----------------------------------------------------
       LA BIBLIOTHÈQUE DE MODULES
       Les valeurs des boutons vont de 0 à 1.
       ----------------------------------------------------- */
    const WAVES = ['sine', 'triangle', 'sawtooth', 'square'];
    const WAVE_GAIN = { sine: 0.5, triangle: 0.5, sawtooth: 0.3, square: 0.22 };

    const pitchHz = (v) => 55 * Math.pow(2, v * 4);          // 55 Hz → 880 Hz
    const cutoffHz = (v) => 60 * Math.pow(2, v * 7.5);        // 60 Hz → 10,9 kHz
    const resQ = (v) => 0.7 + v * 14;
    const rateHz = (v) => 0.1 * Math.pow(2, v * 7);           // 0,1 Hz → 12,8 Hz
    const thereminHz = (x) => 130 * Math.pow(2, x * 3.5);     // 130 Hz → 1,5 kHz
    const thereminGain = (y) => Math.pow(Math.max(0, y), 1.3) * 0.6;
    const fmtHz = (hz) => (hz >= 1000 ? (hz / 1000).toFixed(1) + ' kHz' : hz >= 10 ? Math.round(hz) + ' Hz' : hz.toFixed(1) + ' Hz');

    const LIBRARY = {
        vco: {
            knobs: [{ id: 'pitch', value: 0.42, text: (v) => fmtHz(pitchHz(v)), cv: { from: 'vco.pitch', span: 0.25 } }],
            waves: true,
            jacks: [{ id: 'pitch', dir: 'in', kind: 'cv' }, { id: 'out', dir: 'out', kind: 'audio' }]
        },
        vcf: {
            knobs: [
                { id: 'cutoff', value: 0.55, text: (v) => fmtHz(cutoffHz(v)), cv: { from: 'vcf.cutoff', span: 0.267 } },
                { id: 'res', value: 0.22, text: (v) => Math.round(v * 100) + ' %' }
            ],
            jacks: [{ id: 'in', dir: 'in', kind: 'audio' }, { id: 'cutoff', dir: 'in', kind: 'cv' }, { id: 'out', dir: 'out', kind: 'audio' }]
        },
        lfo: {
            knobs: [
                { id: 'rate', value: 0.42, text: (v) => fmtHz(rateHz(v)) },
                { id: 'depth', value: 0.55, text: (v) => Math.round(v * 100) + ' %' }
            ],
            led: true,
            jacks: [{ id: 'out', dir: 'out', kind: 'cv' }]
        },
        out: {
            knobs: [{ id: 'level', value: 0.7, text: (v) => Math.round(v * 100) + ' %' }],
            scope: true,
            jacks: [{ id: 'in', dir: 'in', kind: 'audio' }]
        },
        theremin: {
            knobs: [],
            pad: true,
            jacks: [{ id: 'out', dir: 'out', kind: 'audio' }]
        }
    };

    // Le son traverse certains modules : ce qui entre ici ressort là
    const THROUGH = { 'vcf.in': 'vcf.out' };

    const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* -----------------------------------------------------
       PETITS OUTILS
       ----------------------------------------------------- */
    function el(tag, attrs, children) {
        const node = document.createElement(tag);
        if (attrs) Object.keys(attrs).forEach((k) => {
            if (k === 'text') node.textContent = attrs[k];
            else if (k === 'html') node.innerHTML = attrs[k];
            else node.setAttribute(k, attrs[k]);
        });
        (children || []).forEach((c) => c && node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
        return node;
    }

    const SVG_NS = 'http://www.w3.org/2000/svg';
    function svg(tag, attrs) {
        const node = document.createElementNS(SVG_NS, tag);
        Object.keys(attrs || {}).forEach((k) => node.setAttribute(k, attrs[k]));
        return node;
    }

    // Un titre du site : les deux-points et le point final en cyan
    function punctuated(text) {
        const m = text.match(/^([\s\S]*?)([.?!])$/);
        const body = m ? m[1] : text;
        const out = [];
        body.split(':').forEach((part, i) => {
            if (i) out.push(el('span', { class: 'title-dot', text: ':' }));
            if (part) out.push(part);
        });
        out.push(el('span', { class: 'title-dot', text: m ? m[2] : '.' }));
        return out;
    }

    const WAVE_ICON = {
        sine: 'M2 8 C5 1, 8 1, 10 8 S15 15, 18 8',
        triangle: 'M2 8 L6 2 L14 14 L18 8',
        sawtooth: 'M2 13 L10 3 L10 13 L18 3',
        square: 'M2 13 L2 3 L10 3 L10 13 L18 13 L18 3'
    };

    /* -----------------------------------------------------
       L'INSTRUMENT
       ----------------------------------------------------- */
    let current = null;

    /* -----------------------------------------------------
       LA 3D (js/rack3d.js, puis three.js) : chargée à la demande,
       elle habille le rack et le theremin quand WebGL est là.
       Sans elle, tout fonctionne comme avant. rack3d.js est lu
       d'abord : il dit si la 3D est voulue (MOBILE_3D, en tête du
       fichier) ; three.js (600 Ko) n'est téléchargé que si oui.
       ----------------------------------------------------- */
    const SCRIPT_BASE = (function () {
        const own = document.currentScript || document.querySelector('script[src*="instrument.js"]');
        return own && own.src ? own.src.replace(/instrument\.js.*$/, '') : 'js/';
    })();
    function addScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = SCRIPT_BASE + src;
            script.onload = resolve;
            script.onerror = () => reject(new Error(src));
            document.head.appendChild(script);
        });
    }
    let loadingSkin = null, loading3D = null;
    function loadSkin() {
        if (window.modulr3D) return Promise.resolve(window.modulr3D);
        if (!loadingSkin) loadingSkin = addScript('rack3d.js').then(() => {
            if (!window.modulr3D) throw new Error('rack3d');
            return window.modulr3D;
        }).catch((e) => { loadingSkin = null; throw e; });
        return loadingSkin;
    }
    function load3D() {
        if (!loading3D) loading3D = loadSkin().then((three) => {
            if (!three.wanted()) throw new Error('3D désactivée sur cet appareil (MOBILE_3D)');
            return window.THREE ? three : addScript('vendor/three.min.js').then(() => three);
        }).catch((e) => { loading3D = null; throw e; });
        return loading3D;
    }

    // three.js (600 Ko) arrive après le premier affichage, quand le navigateur est libre :
    // en attendant, l'instrument en HTML fonctionne déjà (gestes, son, guide, clavier)
    function whenIdle() {
        return new Promise((resolve) => {
            const go = () => (window.requestIdleCallback ? window.requestIdleCallback(() => resolve(), { timeout: 4000 }) : setTimeout(resolve, 300));
            if (document.readyState === 'complete') requestAnimationFrame(() => setTimeout(go, 0));
            else window.addEventListener('load', () => setTimeout(go, 0), { once: true });
        });
    }

    // La 3D ne se construit pas sous le doigt : il faut 300 ms sans défilement ni toucher
    // (avant de lire three.js, puis à nouveau avant de bâtir la scène)
    let lastGesture = -Infinity;
    ['scroll', 'wheel', 'touchstart', 'touchmove', 'pointerdown'].forEach((t) => window.addEventListener(t, () => { lastGesture = performance.now(); }, { passive: true, capture: true }));
    function whenCalm(value) {
        return new Promise((resolve) => {
            const check = () => { const left = lastGesture + 300 - performance.now(); if (left <= 0) resolve(value); else setTimeout(check, left + 20); };
            check();
        });
    }

    function mount(root) {
        if (current && current.root === root) return;
        unmount();
        current = root.getAttribute('data-instrument') === 'histoire' ? createTheremin(root) : createInstrument(root);
    }

    function unmount() {
        if (!current) return;
        current.destroy();
        current = null;
    }

    function createInstrument(root) {
        const lang = (document.documentElement.lang || 'fr').indexOf('en') === 0 ? 'en' : 'fr';
        const cfg = RACKS[root.getAttribute('data-instrument')] || RACKS.home;
        const T = Object.assign({}, COMMON[lang], cfg.text[lang]);
        const STEPS = cfg.steps;
        const base = root.getAttribute('data-base') || './';
        // Au doigt on touche deux prises, à la souris on tire le câble : le guide le dit avec les bons mots
        const touch = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

        // Les modules de ce rack, avec leurs réglages propres
        const MODS = cfg.modules.map((m) => {
            const def = Object.assign({}, LIBRARY[m.id], m);
            if (m.onlyJacks) def.jacks = def.jacks.filter((j) => m.onlyJacks.indexOf(j.id) !== -1);
            return def;
        });
        const has = (id) => MODS.some((m) => m.id === id);
        const JACKS = {};
        MODS.forEach((m) => m.jacks.forEach((j) => { JACKS[m.id + '.' + j.id] = Object.assign({ module: m.id, key: m.id + '.' + j.id }, j); }));
        const vcoDef = MODS.find((m) => m.id === 'vco');
        const WAVE0 = (vcoDef && vcoDef.wave) || 'sawtooth';

        const state = {
            values: {},
            wave: WAVE0,
            cables: [],
            pending: null,
            power: true,        // le rack est allumé ; éteint, il se tait et l'oscilloscope s'arrête
            nextId: 1,
            step: 0,            // l'étape en cours ; STEPS.length : guide terminé, jeu libre
            phase: 'todo',      // 'todo' : but à atteindre ; 'done' : étape réussie
            turned: false,      // après un branchement : le bouton de l'étape a été tourné
            acted: false,       // étape « tourner » ou « jouer » : c'est fait
            turnFrom: 0,
            playMs: 0,          // temps passé à jouer sur l'antenne
            hand: { x: 0.5, y: 0.6, on: false },
            note: ''
        };
        MODS.forEach((m) => m.knobs.forEach((k) => { state.values[m.id + '.' + k.id] = k.value; }));
        const DEFAULTS = Object.assign({}, state.values);

        const A = {};              // nœuds Web Audio
        const cleanups = [];
        const waveButtons = [];
        let raf = 0, visible = true, destroyed = false, noteTimer = 0, suspendTimer = 0, autoTimer = 0, keyTimer = 0, lastNow = 0, idleFrom = 0;
        // La 3D (le rack, et sur l'accueil « la suite ») : elle ne redessine que quand on le lui signale
        let skin = null, siteSkin = null, poweringAt = 0;
        // lazy : le rendu 3D peut attendre la fin d'un défilement
        const redraw3D = (lazy) => { if (skin) skin.invalidate(lazy === true); };

        /* ---------- construction ---------- */
        root.innerHTML = '';
        root.classList.add('is-ready');

        // L'afficheur, au-dessus du rack : une étape, une phrase, le geste à faire.
        // Sur téléphone il reste collé en haut de l'écran pendant qu'on joue.
        const dNum = el('span', { class: 'display-num', 'aria-hidden': 'true' });
        const dSegs = STEPS.map(() => el('span', { class: 'display-seg' }));
        const dTitle = el('p', { class: 'display-title', tabindex: '-1' });
        const dLine = el('p', { class: 'display-line' });
        const dFoot = el('div', { class: 'display-foot' });
        const display = el('div', { class: 'patch-display' }, [
            el('div', { class: 'display-head' }, [
                el('h2', { class: 'display-eyebrow', text: T.eyebrow }),
                el('span', { class: 'display-progress', 'aria-hidden': 'true' }, dSegs)
            ]),
            dNum, dTitle, dLine, dFoot
        ]);
        root.appendChild(display);

        const rack = el('div', { class: 'rack' });
        const modulesRow = el('div', { class: 'rack-modules' });
        if (cfg.cols) modulesRow.style.setProperty('--cols', cfg.cols);
        if (cfg.colsM) modulesRow.style.setProperty('--cols-m', cfg.colsM);
        const knobEls = {}, jackEls = {};
        let ledEl = null, scopeCanvas = null, padEl = null, handEl = null;

        MODS.forEach((m, index) => {
            const mod = el('section', { class: 'module module--' + m.id, 'data-module': m.id, 'aria-label': m.id + ', ' + T.roles[m.id], style: '--i:' + index });
            mod.appendChild(el('header', { class: 'module-head' }, [
                el('span', { class: 'module-name', text: m.id }),
                el('span', { class: 'module-role', text: T.roles[m.id] }),
                m.led ? (ledEl = el('span', { class: 'module-led', 'aria-hidden': 'true' })) : null
            ]));

            const controls = el('div', { class: 'module-controls' });
            if (m.pad) controls.appendChild(buildPad());
            m.knobs.forEach((k) => {
                const key = m.id + '.' + k.id;
                const knob = buildKnob(key, k);
                knobEls[key] = knob;
                controls.appendChild(knob.node);
            });
            if (m.waves) controls.appendChild(buildWaves());
            if (m.scope) {
                scopeCanvas = el('canvas', { class: 'module-scope', 'aria-hidden': 'true' });
                controls.appendChild(scopeCanvas);
            }
            mod.appendChild(controls);

            const jacks = el('div', { class: 'module-jacks' });
            m.jacks.forEach((j) => {
                const key = m.id + '.' + j.id;
                const btn = el('button', {
                    type: 'button',
                    class: 'jack jack--' + j.dir + ' jack--' + j.kind,
                    'data-jack': key,
                    'aria-label': m.id + ' › ' + j.id + ', ' + (j.dir === 'out' ? T.output : T.input)
                }, [
                    el('span', { class: 'jack-nut', 'aria-hidden': 'true' }),
                    el('span', { class: 'jack-label', text: j.id, 'aria-hidden': 'true' })
                ]);
                jackEls[key] = btn;
                jacks.appendChild(btn);
            });
            mod.appendChild(jacks);
            modulesRow.appendChild(mod);
        });

        const cablesSvg = svg('svg', { class: 'rack-cables', 'aria-hidden': 'true' });
        const guideLayer = svg('g', { class: 'guide-layer' });
        const cableLayer = svg('g', { class: 'cable-layer' });
        const tempLayer = svg('g', { class: 'temp-layer' });
        const badgeLayer = svg('g', { class: 'guide-layer' });
        cablesSvg.appendChild(guideLayer);
        cablesSvg.appendChild(cableLayer);
        cablesSvg.appendChild(tempLayer);
        cablesSvg.appendChild(badgeLayer);

        rack.appendChild(el('div', { class: 'rack-rail', 'aria-hidden': 'true' }));
        rack.appendChild(modulesRow);
        rack.appendChild(el('div', { class: 'rack-rail', 'aria-hidden': 'true' }));
        rack.appendChild(cablesSvg);
        root.appendChild(rack);

        // Sous le rack : éteindre ou rallumer, recommencer, et la légende une fois le guide terminé
        const powerBtn = el('button', { type: 'button', class: 'patch-tool', text: T.powerOff });
        const resetBtn = el('button', { type: 'button', class: 'patch-tool', text: T.reset });
        const legend = el('p', { class: 'patch-legend', hidden: '' }, [
            el('span', { class: 'legend-item legend-item--audio', text: T.legendAudio }),
            el('span', { class: 'legend-item legend-item--cv', text: T.legendCv }),
            el('span', { class: 'legend-item', text: T.legendUnplug[touch ? 'touch' : 'mouse'] })
        ]);
        root.appendChild(el('div', { class: 'patch-tools' }, [
            el('span', { class: 'patch-tool-group' }, [powerBtn, resetBtn]),
            legend
        ]));
        const live = el('p', { class: 'visually-hidden', 'aria-live': 'polite' });
        root.appendChild(live);

        /* ---------- boutons rotatifs ---------- */
        function buildKnob(key, def) {
            const node = el('div', {
                class: 'knob', role: 'slider', tabindex: '0', 'data-knob': key,
                'aria-label': key.replace('.', ' › '),
                'aria-valuemin': '0', 'aria-valuemax': '100'
            });
            const face = svg('svg', { class: 'knob-face', viewBox: '0 0 56 56', 'aria-hidden': 'true' });
            const track = svg('path', { class: 'knob-track', d: arcPath(0, 1) });
            const fill = svg('path', { class: 'knob-fill' });
            const cap = svg('circle', { class: 'knob-cap', cx: 28, cy: 28, r: 17 });
            const needle = svg('line', { class: 'knob-needle', x1: 28, y1: 28, x2: 28, y2: 14 });
            const cvDot = svg('circle', { class: 'knob-cv', cx: 28, cy: 4, r: 3 });
            [track, fill, cap, needle, cvDot].forEach((n) => face.appendChild(n));
            node.appendChild(face);
            node.appendChild(el('span', { class: 'knob-label', text: def.id }));

            const knob = { node, def, needle, fill, cvDot };
            const update = () => {
                const v = state.values[key];
                const angle = -135 + v * 270;
                needle.setAttribute('transform', `rotate(${angle} 28 28)`);
                fill.setAttribute('d', arcPath(0, v));
                node.setAttribute('aria-valuenow', String(Math.round(v * 100)));
                node.setAttribute('aria-valuetext', def.text(v));
                redraw3D();
            };
            knob.update = update;
            update();

            const set = (v) => {
                state.values[key] = Math.max(0, Math.min(1, v));
                start();
                update();
                applyKnob(key);
                knobTurned(key);
            };

            // À la souris, glisser vers le haut ou vers la droite pour tourner ; au doigt, vers la droite
            // seulement : glisser vers le haut ou le bas fait défiler la page (touch-action: pan-y).
            node.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                const horizontal = e.pointerType === 'touch';
                // Au doigt, le bouton ne bouge qu'au-delà de 6 px vers la gauche ou la droite : un pouce
                // qui fait défiler la page ne tourne rien et ne rallume pas un rack éteint ; un simple toucher,
                // lui, le rallume (pointerup n'arrive pas quand le navigateur a pris le geste pour défiler)
                let turning = !horizontal;
                if (turning) ensureAudio();
                const startX = e.clientX, startY = e.clientY, startV = state.values[key];
                node.setPointerCapture(e.pointerId);
                if (turning) node.classList.add('is-turning');
                const move = (ev) => {
                    if (!turning) {
                        if (Math.abs(ev.clientX - startX) < 6) return;
                        turning = true;
                        ensureAudio();
                        node.classList.add('is-turning');
                    }
                    set(startV + ((ev.clientX - startX) - (horizontal ? 0 : (ev.clientY - startY))) / 160);
                };
                const up = (ev) => {
                    if (!turning && ev.type === 'pointerup') ensureAudio();
                    node.classList.remove('is-turning');
                    node.removeEventListener('pointermove', move);
                    node.removeEventListener('pointerup', up);
                    node.removeEventListener('pointercancel', up);
                };
                node.addEventListener('pointermove', move);
                node.addEventListener('pointerup', up);
                node.addEventListener('pointercancel', up);
            });
            node.addEventListener('keydown', (e) => {
                const step = { ArrowUp: 0.02, ArrowRight: 0.02, ArrowDown: -0.02, ArrowLeft: -0.02, PageUp: 0.1, PageDown: -0.1 }[e.key];
                if (step !== undefined) { e.preventDefault(); ensureAudio(); set(state.values[key] + step); }
                else if (e.key === 'Home') { e.preventDefault(); set(0); }
                else if (e.key === 'End') { e.preventDefault(); set(1); }
            });
            return knob;
        }

        function arcPath(from, to) {
            // Arc de -135° à +135°, rayon 24, centre (28, 28)
            const a0 = (-135 + from * 270 - 90) * Math.PI / 180;
            const a1 = (-135 + to * 270 - 90) * Math.PI / 180;
            const r = 24;
            const x0 = 28 + r * Math.cos(a0), y0 = 28 + r * Math.sin(a0);
            const x1 = 28 + r * Math.cos(a1), y1 = 28 + r * Math.sin(a1);
            const large = (to - from) * 270 > 180 ? 1 : 0;
            if (to - from < 0.001) return `M${x0.toFixed(2)} ${y0.toFixed(2)}`;
            return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
        }

        /* ---------- formes d'onde ---------- */
        function buildWaves() {
            const group = el('div', { class: 'wave-select', role: 'group', 'aria-label': T.waveGroup });
            WAVES.forEach((w) => {
                const icon = svg('svg', { viewBox: '0 0 20 16', 'aria-hidden': 'true' });
                icon.appendChild(svg('path', { d: WAVE_ICON[w] }));
                const b = el('button', { type: 'button', class: 'wave-btn', 'data-wave': w, 'aria-label': T.waves[w], title: T.waves[w], 'aria-pressed': w === state.wave ? 'true' : 'false' });
                b.appendChild(icon);
                b.addEventListener('click', () => {
                    state.wave = w;
                    waveButtons.forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
                    redraw3D();
                    ensureAudio();
                    if (A.osc) {
                        A.osc.type = w;
                        A.oscNorm.gain.setTargetAtTime(WAVE_GAIN[w], A.ctx.currentTime, 0.02);
                    }
                });
                waveButtons.push(b);
                group.appendChild(b);
            });
            return group;
        }

        /* ---------- l'antenne du theremin ---------- */
        // À la souris, on joue en survolant, sans cliquer : comme le theremin, sans toucher.
        // Au doigt, on glisse sur l'antenne. Au clavier, les flèches déplacent la main.
        function buildPad() {
            handEl = el('span', { class: 'pad-hand', 'aria-hidden': 'true' });
            padEl = el('div', { class: 'theremin-pad', tabindex: '0', role: 'group', 'aria-label': T.pad.label }, [
                el('span', { class: 'pad-axis pad-axis--loud', text: T.pad.loud, 'aria-hidden': 'true' }),
                el('span', { class: 'pad-axis pad-axis--low', text: T.pad.low, 'aria-hidden': 'true' }),
                el('span', { class: 'pad-axis pad-axis--high', text: T.pad.high, 'aria-hidden': 'true' }),
                el('span', { class: 'pad-antenna', 'aria-hidden': 'true' }),
                handEl
            ]);
            let touching = false;
            const at = (e) => {
                const r = padEl.getBoundingClientRect();
                return {
                    x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
                    y: Math.max(0, Math.min(1, 1 - (e.clientY - r.top) / r.height))
                };
            };
            padEl.addEventListener('pointermove', (e) => {
                if (e.pointerType === 'mouse') { if (state.power) play(at(e)); }
                else if (touching) play(at(e));
            });
            padEl.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') stopPlaying(); });
            padEl.addEventListener('pointerdown', (e) => {
                ensureAudio();
                if (e.pointerType === 'mouse') { play(at(e)); return; }
                e.preventDefault();
                touching = true;
                try { padEl.setPointerCapture(e.pointerId); } catch (err) { }
                play(at(e));
            });
            const release = (e) => { if (e.pointerType !== 'mouse') { touching = false; stopPlaying(); } };
            padEl.addEventListener('pointerup', release);
            padEl.addEventListener('pointercancel', release);
            padEl.addEventListener('keydown', (e) => {
                const move = { ArrowLeft: [-0.05, 0], ArrowRight: [0.05, 0], ArrowUp: [0, 0.05], ArrowDown: [0, -0.05] }[e.key];
                if (e.key === 'Escape') { stopPlaying(); return; }
                if (!move) return;
                e.preventDefault();
                ensureAudio();
                play({ x: Math.max(0, Math.min(1, state.hand.x + move[0])), y: Math.max(0, Math.min(1, state.hand.y + move[1])) });
                clearTimeout(keyTimer);
                keyTimer = setTimeout(stopPlaying, 1600);
            });
            padEl.addEventListener('blur', () => { clearTimeout(keyTimer); stopPlaying(); });
            return padEl;
        }

        function play(p) {
            state.hand.x = p.x;
            state.hand.y = p.y;
            state.hand.on = true;
            handEl.style.left = (p.x * 100).toFixed(2) + '%';
            handEl.style.top = ((1 - p.y) * 100).toFixed(2) + '%';
            padEl.classList.add('is-playing');
            if (A.th) {
                const t = A.ctx.currentTime;
                A.th.frequency.setTargetAtTime(thereminHz(p.x), t, 0.03);
                A.thVol.gain.setTargetAtTime(thereminGain(p.y), t, 0.04);
            }
            start();
        }

        function stopPlaying() {
            if (!padEl || !state.hand.on) return;
            state.hand.on = false;
            padEl.classList.remove('is-playing');
            if (A.thVol) A.thVol.gain.setTargetAtTime(0, A.ctx.currentTime, 0.12);
        }
        cleanups.push(() => clearTimeout(keyTimer));

        /* ---------- audio ---------- */
        function ensureAudio() {
            if (destroyed) return null;
            if (!state.power) setPower(true);
            if (A.ctx) {
                if (A.ctx.state === 'suspended') A.ctx.resume().catch(() => { });
                return A.ctx;
            }
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) { note(T.hints.noAudio); return null; }
            let ctx;
            try { ctx = new Ctx(); } catch (e) { note(T.hints.noAudio); return null; }
            A.ctx = ctx;
            const now = ctx.currentTime;
            // Le moteur audio démarre (ou repart) après coup : la boucle reprend pour l'oscilloscope
            ctx.addEventListener('statechange', () => start());

            // Sortie : in → level → oscilloscope → limiteur → enceintes
            A.outIn = ctx.createGain();
            A.level = ctx.createGain();
            A.analyser = ctx.createAnalyser();
            A.analyser.fftSize = 2048;
            A.scopeData = new Float32Array(A.analyser.fftSize);
            A.comp = ctx.createDynamicsCompressor();
            A.comp.threshold.value = -14;
            A.comp.knee.value = 6;
            A.comp.ratio.value = 10;
            A.comp.attack.value = 0.003;
            A.comp.release.value = 0.25;
            A.master = ctx.createGain();
            A.master.gain.value = 0;
            A.master.gain.setTargetAtTime(0.85, now, 0.3);
            A.outIn.connect(A.level);
            A.level.connect(A.analyser);
            A.analyser.connect(A.comp);
            A.comp.connect(A.master);
            A.master.connect(ctx.destination);

            const starts = [];
            if (has('vco')) {
                A.osc = ctx.createOscillator();
                A.osc.type = state.wave;
                A.oscNorm = ctx.createGain();
                A.oscNorm.gain.value = WAVE_GAIN[state.wave];
                A.osc.connect(A.oscNorm);
                starts.push(A.osc);
            }
            if (has('vcf')) {
                A.filter = ctx.createBiquadFilter();
                A.filter.type = 'lowpass';
            }
            if (has('lfo')) {
                A.lfo = ctx.createOscillator();
                A.lfo.type = 'triangle';
                A.lfoDepth = ctx.createGain();
                A.lfoTap = ctx.createAnalyser();
                A.lfoTap.fftSize = 256;
                A.lfoData = new Float32Array(A.lfoTap.fftSize);
                A.lfo.connect(A.lfoDepth);
                A.lfoDepth.connect(A.lfoTap);
                starts.push(A.lfo);
            }
            if (has('theremin')) {
                // Une sinusoïde, un léger vibrato, et un volume qui suit la main
                A.th = ctx.createOscillator();
                A.th.type = 'sine';
                A.th.frequency.value = thereminHz(state.hand.x);
                A.thVib = ctx.createOscillator();
                A.thVib.frequency.value = 5.6;
                A.thVibDepth = ctx.createGain();
                A.thVibDepth.gain.value = 14;
                A.thVib.connect(A.thVibDepth);
                A.thVibDepth.connect(A.th.detune);
                A.thVol = ctx.createGain();
                A.thVol.gain.value = state.hand.on ? thereminGain(state.hand.y) : 0;
                A.th.connect(A.thVol);
                starts.push(A.th, A.thVib);
            }

            Object.keys(state.values).forEach((key) => applyKnob(key, true));
            starts.forEach((o) => o.start());
            state.cables.forEach(wire);
            return ctx;
        }

        function applyKnob(key, instant) {
            if (!A.ctx) return;
            const v = state.values[key];
            const t = A.ctx.currentTime;
            const set = (param, value) => {
                if (instant) param.value = value;
                else param.setTargetAtTime(value, t, 0.02);
            };
            switch (key) {
                case 'vco.pitch': set(A.osc.frequency, pitchHz(v)); break;
                case 'vcf.cutoff': set(A.filter.frequency, cutoffHz(v)); break;
                case 'vcf.res': set(A.filter.Q, resQ(v)); break;
                case 'lfo.rate': set(A.lfo.frequency, rateHz(v)); break;
                case 'lfo.depth': set(A.lfoDepth.gain, v); break;
                case 'out.level': set(A.level.gain, v * v * 1.2); break;
            }
        }

        function sourceNode(key) {
            return { 'vco.out': A.oscNorm, 'vcf.out': A.filter, 'lfo.out': A.lfoDepth, 'theremin.out': A.thVol }[key];
        }

        function targetOf(key) {
            switch (key) {
                case 'vco.pitch': return A.osc ? { param: A.osc.detune, scale: 1200 } : null;
                case 'vcf.in': return { node: A.filter, scale: 1 };
                case 'vcf.cutoff': return { param: A.filter.detune, scale: 2400 };
                case 'out.in': return { node: A.outIn, scale: 1 };
            }
            return null;
        }

        function wire(cable) {
            if (!A.ctx || cable.audio) return;
            const src = sourceNode(cable.from), dst = targetOf(cable.to);
            if (!src || !dst) return;
            // Un petit délai dans chaque câble rend les boucles de rétroaction possibles
            const gain = A.ctx.createGain();
            const delay = A.ctx.createDelay(0.05);
            gain.gain.value = 0;
            delay.delayTime.value = 0;
            src.connect(gain);
            gain.connect(delay);
            if (dst.param) delay.connect(dst.param); else delay.connect(dst.node);
            gain.gain.setTargetAtTime(dst.scale, A.ctx.currentTime, 0.015);
            cable.audio = { gain, delay };
        }

        function unwire(cable) {
            if (!cable.audio || !A.ctx) { cable.audio = null; return; }
            const { gain, delay } = cable.audio;
            cable.audio = null;
            gain.gain.setTargetAtTime(0, A.ctx.currentTime, 0.015);
            setTimeout(() => { try { gain.disconnect(); delay.disconnect(); } catch (e) { } }, 150);
        }

        /* ---------- câbles ---------- */
        function connectionFor(a, b) {
            const ja = JACKS[a], jb = JACKS[b];
            if (!ja || !jb || a === b) return { error: null };
            if (ja.dir === jb.dir) return { error: 'direction' };
            if (ja.module === jb.module) return { error: 'self' };
            return ja.dir === 'out' ? { from: a, to: b } : { from: b, to: a };
        }

        function cableAt(inputKey) {
            return state.cables.find((c) => c.to === inputKey) || null;
        }

        function addCable(from, to) {
            const existing = cableAt(to);
            if (existing) removeCable(existing, true);
            const cable = { id: state.nextId++, from, to, kind: JACKS[from].kind, born: performance.now() };
            start();
            state.cables.push(cable);
            ensureAudio();
            wire(cable);
            drawCables();
            refreshJacks();
            const said = T.patched(spokenJack(from), spokenJack(to));
            if (from === 'lfo.out' && (to === 'out.in' || to === 'vcf.in')) note(T.hints.lfoAudio, true);
            else note('', true);
            evaluate(said);
        }

        function removeCable(cable, silent) {
            state.cables = state.cables.filter((c) => c !== cable);
            start();
            unwire(cable);
            drawCables();
            refreshJacks();
            if (!silent) announce(T.unpatched(spokenJack(cable.from), spokenJack(cable.to)));
        }

        const spokenJack = (key) => key.replace('.', ' › ');

        function jackCenter(key) {
            const jack = jackEls[key];
            if (!jack) return { x: 0, y: 0 };
            const nut = jack.querySelector('.jack-nut');
            const r = nut.getBoundingClientRect(), base = rack.getBoundingClientRect();
            return { x: r.left + r.width / 2 - base.left, y: r.top + r.height / 2 - base.top };
        }

        function cablePath(p, q, wobble) {
            // Le câble pend, mais pas plus bas que le rack : au-delà, il passerait sur les commandes
            const sag = (22 + Math.min(Math.abs(q.x - p.x) * 0.2, 96) + Math.abs(q.y - p.y) * 0.06) * (wobble || 1);
            return `M${p.x.toFixed(1)} ${p.y.toFixed(1)} C${p.x.toFixed(1)} ${(p.y + sag).toFixed(1)}, ${q.x.toFixed(1)} ${(q.y + sag).toFixed(1)}, ${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
        }

        function drawCables() {
            redraw3D();
            const base = rack.getBoundingClientRect();
            cablesSvg.setAttribute('viewBox', `0 0 ${base.width.toFixed(1)} ${base.height.toFixed(1)}`);
            cablesSvg.setAttribute('width', base.width.toFixed(1));
            cablesSvg.setAttribute('height', base.height.toFixed(1));
            cableLayer.innerHTML = '';
            state.cables.forEach((c) => {
                const g = svg('g', { class: 'cable cable--' + c.kind });
                const p = jackCenter(c.from), q = jackCenter(c.to);
                const d = cablePath(p, q, 1);
                const shadow = svg('path', { class: 'cable-shadow', d });
                const body = svg('path', { class: 'cable-body', d });
                const flow = svg('path', { class: 'cable-flow', d });
                g.appendChild(shadow); g.appendChild(body); g.appendChild(flow);
                [p, q].forEach((pt) => {
                    g.appendChild(svg('circle', { class: 'cable-plug', cx: pt.x.toFixed(1), cy: pt.y.toFixed(1), r: 9 }));
                    g.appendChild(svg('circle', { class: 'cable-plug-core', cx: pt.x.toFixed(1), cy: pt.y.toFixed(1), r: 4 }));
                });
                c.paths = [shadow, body, flow];
                c.ends = [p, q];
                cableLayer.appendChild(g);
            });
            drawGuide();
        }

        // Le câble à poser maintenant : un tracé en pointillés de ① à ②, deux anneaux, deux pastilles.
        // Les anneaux et le tracé passent sous les câbles, les pastilles au-dessus.
        function drawGuide() {
            guideLayer.innerHTML = '';
            badgeLayer.innerHTML = '';
            const next = guideCable();
            if (!next) return;
            const p = jackCenter(next[0]), q = jackCenter(next[1]);
            const armed = state.pending === next[0];
            guideLayer.appendChild(svg('path', { class: 'guide-ghost' + (armed ? ' is-armed' : ''), d: cablePath(p, q, 1) }));
            [p, q].forEach((pt, i) => {
                const mod = i === 0 ? (armed ? ' is-armed' : '') : (armed ? ' is-awaited' : '');
                const g = svg('g', { class: 'guide-mark' + mod });
                g.appendChild(svg('circle', { class: 'guide-ring', cx: pt.x.toFixed(1), cy: pt.y.toFixed(1), r: 21 }));
                g.appendChild(svg('circle', { class: 'guide-pulse', cx: pt.x.toFixed(1), cy: pt.y.toFixed(1), r: 21 }));
                guideLayer.appendChild(g);
                const bx = pt.x + 17, by = pt.y - 17;
                const b = svg('g', { class: 'guide-badge' + mod });
                b.appendChild(svg('circle', { cx: bx.toFixed(1), cy: by.toFixed(1), r: 10 }));
                const t = svg('text', { x: bx.toFixed(1), y: (by + 0.5).toFixed(1) });
                t.textContent = String(i + 1);
                b.appendChild(t);
                badgeLayer.appendChild(b);
            });
        }

        function refreshJacks() {
            // Pendant le guide, seule la prise ② s'allume ; hors guide, toutes les entrées possibles
            const next = guideCable();
            const onScript = next && state.pending === next[0];
            Object.keys(jackEls).forEach((key) => {
                const used = JACKS[key].dir === 'in' ? !!cableAt(key) : state.cables.some((c) => c.from === key);
                jackEls[key].classList.toggle('is-patched', used);
                jackEls[key].classList.toggle('is-pending', state.pending === key);
                const link = state.pending ? connectionFor(state.pending, key) : { error: true };
                jackEls[key].classList.toggle('is-target', !onScript && !link.error && !!link.from);
            });
        }

        /* ---------- gestes : glisser, toucher-toucher, clavier ---------- */
        let drag = null;
        let pointerAt = -1e9;   // dernier geste à la souris ou au doigt sur une prise

        // Le câble qu'on tire, tel que la 3D le dessine (px du rack)
        let tempState = null;
        function tempCable(from, point) {
            tempLayer.innerHTML = '';
            tempState = from ? { from, x: point.x, y: point.y } : null;
            start();
            redraw3D();
            if (!from) return;
            const kind = JACKS[from].kind;
            const p = jackCenter(from);
            const g = svg('g', { class: 'cable cable--temp cable--' + kind });
            g.appendChild(svg('path', { class: 'cable-shadow', d: cablePath(p, point, 0.6) }));
            g.appendChild(svg('path', { class: 'cable-body', d: cablePath(p, point, 0.6) }));
            g.appendChild(svg('circle', { class: 'cable-plug', cx: point.x.toFixed(1), cy: point.y.toFixed(1), r: 9 }));
            tempLayer.appendChild(g);
        }

        function rackPoint(e) {
            const base = rack.getBoundingClientRect();
            return { x: e.clientX - base.left, y: e.clientY - base.top };
        }

        function onJackPointerDown(e) {
            const jack = e.target.closest('.jack');
            if (!jack || !rack.contains(jack)) return;
            if (e.button !== undefined && e.button !== 0) return;
            e.preventDefault();
            pointerAt = performance.now();
            // Au doigt, une prise se branche en deux touchers, sans glisser : le geste peut devenir
            // un défilement de la page (touch-action: manipulation), le son attend donc le toucher
            const touch = e.pointerType === 'touch';
            if (!touch) ensureAudio();
            const key = jack.getAttribute('data-jack');
            drag = { key, x: e.clientX, y: e.clientY, moved: false, touch, pointerId: e.pointerId, from: null };
            try { jack.setPointerCapture(e.pointerId); } catch (err) { }
            jack.addEventListener('pointermove', onDragMove);
            jack.addEventListener('pointerup', onDragEnd);
            jack.addEventListener('pointercancel', onDragCancel);
            drag.node = jack;
        }

        function onDragMove(e) {
            if (!drag || drag.touch) return;
            if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
            if (!drag.moved) {
                drag.moved = true;
                // Saisir une entrée déjà branchée : on reprend le câble par ce bout
                const occupied = JACKS[drag.key].dir === 'in' ? cableAt(drag.key) : null;
                if (occupied) {
                    drag.from = occupied.from;
                    removeCable(occupied, true);
                } else {
                    drag.from = drag.key;
                }
                state.pending = drag.from;
                refreshJacks();
                renderGuide();
                rack.classList.add('is-dragging');
            }
            tempCable(drag.from, rackPoint(e));
        }

        function endDrag() {
            if (!drag) return;
            const n = drag.node;
            n.removeEventListener('pointermove', onDragMove);
            n.removeEventListener('pointerup', onDragEnd);
            n.removeEventListener('pointercancel', onDragCancel);
            rack.classList.remove('is-dragging');
            tempLayer.innerHTML = '';
            tempState = null;
            drag = null;
            redraw3D();
        }

        // Le navigateur annule le geste quand le doigt fait défiler la page : la prise ① déjà touchée
        // reste en attente. Seul un câble qu'on tirait est abandonné.
        function onDragCancel() {
            const pulling = drag && drag.moved;
            endDrag();
            if (!pulling) return;
            state.pending = null;
            refreshJacks();
            renderGuide();
        }

        function onDragEnd(e) {
            if (!drag) return;
            const d = drag;
            if (!d.moved) {
                endDrag();
                if (d.touch) ensureAudio();
                tapJack(d.key);
                return;
            }
            const under = document.elementFromPoint(e.clientX, e.clientY);
            const target = under && under.closest ? under.closest('.jack') : null;
            const targetKey = target && rack.contains(target) ? target.getAttribute('data-jack') : null;
            state.pending = null;
            endDrag();
            if (targetKey && targetKey !== d.from) {
                const link = connectionFor(d.from, targetKey);
                if (link.error) note(T.hints[link.error]);
                else addCable(link.from, link.to);
            }
            refreshJacks();
            renderGuide();
        }

        // Toucher une prise : premier bout, puis second bout. Toucher une entrée branchée la débranche.
        function tapJack(key) {
            if (state.pending) {
                const from = state.pending;
                state.pending = null;
                if (from !== key) {
                    const link = connectionFor(from, key);
                    if (link.error) note(T.hints[link.error]);
                    else addCable(link.from, link.to);
                }
                refreshJacks();
                renderGuide();
                return;
            }
            const occupied = JACKS[key].dir === 'in' ? cableAt(key) : null;
            if (occupied) {
                removeCable(occupied);
                note(T.hints.unplugged, true);
                evaluate();
                return;
            }
            state.pending = key;
            refreshJacks();
            renderGuide();
            // Sur téléphone, la prise ② peut être sous le pli : on l'amène à l'écran
            const next = guideCable();
            if (next && next[0] === key) bringIntoView(jackEls[next[1]]);
        }

        function onJackClick(e) {
            // Clavier (Entrée, Espace) seulement : la souris et le doigt passent par pointerdown/up,
            // et le clic qui suit un toucher ne doit pas compter une seconde fois
            const jack = e.target.closest('.jack');
            if (!jack || e.detail > 0 || performance.now() - pointerAt < 500) return;
            ensureAudio();
            tapJack(jack.getAttribute('data-jack'));
        }

        function cancelPending() {
            if (!state.pending) return;
            state.pending = null;
            refreshJacks();
            renderGuide();
        }

        function onKey(e) {
            if (e.key === 'Escape') cancelPending();
        }

        // Un toucher à côté des prises annule le premier bout. Un clic, pas un pointerdown :
        // sur téléphone, faire défiler la page entre les deux prises ne doit rien annuler.
        function onOutsideClick(e) {
            if (state.pending && !drag && !(e.target.closest && e.target.closest('.jack'))) cancelPending();
        }

        rack.addEventListener('pointerdown', onJackPointerDown);
        rack.addEventListener('click', onJackClick);
        document.addEventListener('keydown', onKey);
        document.addEventListener('click', onOutsideClick, true);
        cleanups.push(() => {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('click', onOutsideClick, true);
        });

        // Éteindre : le son s'efface, puis le moteur audio s'arrête ; l'oscilloscope et le voyant
        // s'éteignent, les modules s'assombrissent. Rallumer : tout repart, avec les câbles en place.
        function setPower(on, lazy) {
            if (state.power === on || destroyed) return;
            state.power = on;
            rack.classList.toggle('is-off', !on);
            clearTimeout(suspendTimer);
            if (!on) stopPlaying();
            if (A.ctx) {
                const gain = A.master.gain, t = A.ctx.currentTime;
                gain.cancelScheduledValues(t);
                gain.setValueAtTime(gain.value, t);
                if (on) {
                    A.ctx.resume().catch(() => { });
                    gain.setTargetAtTime(0.85, t, 0.25);
                } else {
                    gain.setTargetAtTime(0, t, 0.08);
                    suspendTimer = setTimeout(() => {
                        if (!state.power && A.ctx && !destroyed) A.ctx.suspend().catch(() => { });
                    }, 600);
                }
            }
            powerBtn.textContent = on ? T.powerOff : T.powerOn;
            announce(on ? T.onSaid : T.offSaid);
            if (on) start(); else frame(performance.now());
            renderGuide();
            redraw3D(lazy);
        }
        cleanups.push(() => clearTimeout(suspendTimer));

        powerBtn.addEventListener('click', () => setPower(!state.power));

        // Recommencer : tout débrancher, remettre les boutons à leur place, revenir à l'étape 1
        function startOver() {
            if (!state.power) setPower(true);
            clearTimeout(autoTimer);
            stopPlaying();
            state.cables.slice().forEach((c) => removeCable(c, true));
            state.pending = null;
            Object.keys(DEFAULTS).forEach((key) => {
                state.values[key] = DEFAULTS[key];
                knobEls[key].update();
                applyKnob(key);
            });
                state.wave = WAVE0;
            waveButtons.forEach((b) => b.setAttribute('aria-pressed', b.getAttribute('data-wave') === state.wave ? 'true' : 'false'));
            if (A.osc) {
                A.osc.type = state.wave;
                A.oscNorm.gain.setTargetAtTime(WAVE_GAIN[state.wave], A.ctx.currentTime, 0.02);
            }
            enterStep(0);
            note('', true);
            refreshJacks();
            renderGuide();
            announce(stepAnnouncement());
        }
        resetBtn.addEventListener('click', startOver);

        /* ---------- le guide ---------- */
        function audioReaches(fromKey, toKey, seen) {
            // Le son suit les câbles audio, et traverse les modules qui le laissent passer (le vcf)
            seen = seen || {};
            if (seen[fromKey]) return false;
            seen[fromKey] = true;
            return state.cables.filter((c) => c.from === fromKey && c.kind === 'audio').some((c) => {
                if (c.to === toKey) return true;
                if (THROUGH[c.to]) return audioReaches(THROUGH[c.to], toKey, seen);
                return false;
            });
        }

        const hasCable = (from, to) => state.cables.some((c) => c.from === from && c.to === to);
        const R = {
            reaches: (a, b) => audioReaches(a, b),
            sounding: () => audioReaches('vco.out', 'out.in'),
            filtered: () => R.sounding() && audioReaches('vco.out', 'vcf.in') && audioReaches('vcf.out', 'out.in'),
            // Le lfo sur cutoff ne s'entend que si le son passe par le filtre
            moving: () => R.sounding() && state.cables.some((c) => c.from === 'lfo.out' &&
                (c.to === 'vco.pitch' || (c.to === 'vcf.cutoff' && R.filtered())))
        };

        function enterStep(i) {
            state.step = i;
            state.phase = 'todo';
            state.turned = false;
            state.acted = false;
            state.playMs = 0;
            const step = STEPS[i];
            state.turnFrom = step && step.knob ? state.values[step.knob] : 0;
        }

        // Le prochain câble à poser pour l'étape en cours, ou null
        function guideCable() {
            const step = STEPS[state.step];
            if (!step || step.goal !== 'patch' || state.phase !== 'todo') return null;
            if (step.reached(R)) return null;
            if (step.pre && step.preWhen(R)) {
                const missing = step.pre.find((c) => !hasCable(c[0], c[1]));
                if (missing) return missing;
            }
            return step.cables.find((c) => !hasCable(c[0], c[1])) || step.cables[0];
        }

        function evaluate(said) {
            const before = state.phase;
            const step = STEPS[state.step];
            if (step) {
                const ok = step.goal === 'patch' ? step.reached(R) : state.acted;
                if (ok && state.phase === 'todo') {
                    state.phase = 'done';
                    if (step.goal === 'patch') {
                        state.turned = false;
                        state.turnFrom = step.knob ? state.values[step.knob] : 0;
                    }
                    if (step.auto) {
                        const at = state.step;
                        clearTimeout(autoTimer);
                        autoTimer = setTimeout(() => { if (state.step === at && state.phase === 'done') goNext(); }, 1100);
                    }
                } else if (!ok && state.phase === 'done') {
                    state.phase = 'todo';
                }
            }
            renderGuide();
            if (state.phase !== before && state.phase === 'done') announce((said ? said + ' ' : '') + doneSpeech());
            else if (state.phase !== before) announce((said ? said + ' ' : '') + stepAnnouncement());
            else if (said) announce(said + (state.phase === 'todo' && guideCable() ? ' ' + stepAnnouncement(true) : ''));
        }
        cleanups.push(() => clearTimeout(autoTimer));

        function doneSpeech() {
            const step = STEPS[state.step], s = T.steps[state.step];
            return step.goal === 'patch' && step.knob ? s.done + ' ' + s.turn : s.why;
        }

        function knobTurned(key) {
            const step = STEPS[state.step];
            if (!step || key !== step.knob) return;
            const moved = Math.abs(state.values[key] - state.turnFrom);
            // Étape « tourner » : un vrai quart de tour, pour voir et entendre la différence
            if (step.goal === 'turn' && state.phase === 'todo' && moved >= 0.12) {
                state.acted = true;
                evaluate();
                return;
            }
            // Après un branchement : le bouton tourné fait apparaître l'explication
            if (step.goal === 'patch' && state.phase === 'done' && !state.turned && moved >= 0.04) {
                state.turned = true;
                renderGuide();
                announce(T.steps[state.step].why);
            }
        }

        function goNext() {
            const hadFocus = display.contains(document.activeElement);
            clearTimeout(autoTimer);
            enterStep(state.step + 1);
            note('', true);
            evaluate();
            if (state.phase === 'todo') announce(stepAnnouncement());
            if (state.step >= STEPS.length) announce(T.final.title + ' ' + T.final.why);
            if (hadFocus) dTitle.focus({ preventScroll: true });
            const step = STEPS[state.step];
            if (!step) return;
            const next = guideCable();
            if (next) bringIntoView(jackEls[next[0]]);
            else if (step.goal === 'turn') bringIntoView(knobEls[step.knob].node);
            else if (step.goal === 'play') bringIntoView(padEl);
        }

        function stepAnnouncement(short) {
            if (state.step >= STEPS.length) return T.final.title;
            const step = STEPS[state.step], s = T.steps[state.step];
            let what = '';
            if (step.goal === 'patch') {
                const next = guideCable();
                what = next ? T.spoken(spokenJack(next[0]), spokenJack(next[1])) : '';
            } else if (step.goal === 'turn') what = s.todo;
            else if (step.goal === 'play') what = s.todo[touch ? 'touch' : 'mouse'];
            if (short) return what;
            return T.stepOf(state.step + 1, STEPS.length) + s.title + ' ' + what;
        }

        // « touchez {1}, puis {2}. » → du texte et deux pastilles. Pour les lecteurs d'écran,
        // les pastilles se lisent comme le nom des prises.
        function withBadges(template, next) {
            const out = [];
            template.split(/(\{1\}|\{2\})/).forEach((part) => {
                if (part === '{1}' || part === '{2}') {
                    const i = part === '{1}' ? 0 : 1;
                    out.push(el('span', { class: 'display-badge' + (i ? ' display-badge--to' : ''), 'aria-hidden': 'true', text: String(i + 1) }));
                    out.push(el('span', { class: 'visually-hidden', text: spokenJack(next[i]) }));
                } else if (part) {
                    out.push(document.createTextNode(part));
                }
            });
            return out;
        }

        function fill(node, children) {
            node.textContent = '';
            children.forEach((c) => c && node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
        }

        const knobIcon = () => el('span', { class: 'display-knob', 'aria-hidden': 'true' });

        function renderGuide() {
            redraw3D();
            const final = state.step >= STEPS.length;
            const step = final ? null : STEPS[state.step];
            const s = final ? null : T.steps[state.step];
            const done = !final && state.phase === 'done';
            const next = guideCable();

            display.classList.toggle('is-done', done || final);
            display.classList.toggle('is-final', final);
            root.classList.toggle('is-guided', !final);

            // Le numéro de l'étape, ou une coche à la fin
            if (final) {
                const check = svg('svg', { viewBox: '0 0 40 40', class: 'display-check' });
                check.appendChild(svg('path', { d: 'M8 21 L16 29 L32 11' }));
                fill(dNum, [check]);
            } else {
                fill(dNum, [String(state.step + 1)]);
            }
            dSegs.forEach((seg, i) => {
                seg.classList.toggle('is-done', final || i < state.step || (i === state.step && done));
                seg.classList.toggle('is-current', !final && i === state.step && !done);
            });

            // La phrase de l'étape : elle ne change qu'avec l'étape, l'afficheur ne saute pas
            const position = el('span', { class: 'visually-hidden', text: final ? '' : T.stepOf(state.step + 1, STEPS.length) });
            fill(dTitle, [position].concat(punctuated(final ? T.final.title : s.title)));

            // La ligne du dessous : le geste, le bouton à tourner, l'explication, ou une remarque
            dLine.classList.toggle('is-note', !!state.note || (!state.power && !final));
            if (state.note) fill(dLine, [state.note]);
            else if (final) fill(dLine, [T.final.why]);
            else if (!state.power) fill(dLine, [T.off[touch ? 'touch' : 'mouse']]);
            else if (done) {
                if (step.goal === 'patch' && step.knob && !state.turned) {
                    fill(dLine, [el('strong', { class: 'display-heard', text: s.done }), ' ', knobIcon(), s.turn]);
                } else fill(dLine, [s.why]);
            } else if (step.goal === 'turn') {
                fill(dLine, [knobIcon(), s.todo]);
            } else if (step.goal === 'play') {
                fill(dLine, [s.todo[touch ? 'touch' : 'mouse']]);
            } else if (next) {
                let template = touch ? T.gesture.touch : T.gesture.mouse;
                if (state.pending === next[0]) template = T.gesture.pending;
                else if (state.pending) template = T.gesture.other;
                fill(dLine, template.indexOf('{') === -1 ? [template] : withBadges(template, next));
            } else fill(dLine, []);

            // Le pied : la suite à la fin ; « continuer » une étape réussie ; le trajet du câble à poser
            const foot = [];
            if (final) {
                const primary = T.final.primary;
                if (primary) foot.push(el('a', { class: 'display-cta', href: base + primary[1], text: primary[0] + ' →' }));
                const icon = svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' });
                icon.appendChild(svg('path', { d: 'M12 3v8M6.6 6.6a8 8 0 1 0 10.8 0' }));
                const power = el('button', { type: 'button', class: 'display-power' + (primary ? ' is-secondary' : '') + (state.power ? '' : ' is-off') },
                    [icon, state.power ? T.powerOff : T.powerOn]);
                power.addEventListener('click', () => {
                    setPower(!state.power);
                    const again = dFoot.querySelector('.display-power');
                    if (again) again.focus({ preventScroll: true });
                });
                foot.push(power);
                (T.final.links || []).forEach((l) => {
                    const local = l[1].charAt(0) === '#';
                    const link = el('a', { class: 'display-link', href: local ? l[1] : base + l[1], text: l[0] });
                    if (local) link.addEventListener('click', goToNext);
                    foot.push(link);
                });
            } else if (done && !step.auto) {
                const nextBtn = el('button', { type: 'button', class: 'display-next', text: T.next });
                nextBtn.addEventListener('click', goNext);
                foot.push(nextBtn);
                if (s.link) foot.push(el('span', { class: 'display-caption' }, [
                    document.createTextNode(T.more),
                    el('a', { class: 'display-link', href: base + s.link[1], text: s.link[0] + ' →' })
                ]));
            } else if (next) {
                // Le trajet du câble, avec le nom des prises : ① vco › out → ② out › in
                const list = step.cables;
                const index = list.findIndex((c) => c[0] === next[0] && c[1] === next[1]);
                if (index !== -1 && list.length > 1) foot.push(el('span', { class: 'display-caption', 'aria-hidden': 'true', text: T.cableOf(index + 1, list.length) }));
                foot.push(el('span', { class: 'display-route', 'aria-hidden': 'true' }, [
                    el('span', { class: 'display-badge display-badge--small', text: '1' }), spokenJack(next[0]),
                    el('span', { class: 'display-route-arrow', text: '→' }),
                    el('span', { class: 'display-badge display-badge--small', text: '2' }), spokenJack(next[1])
                ]));
            }
            fill(dFoot, foot);
            legend.hidden = !(final && cfg.legend);

            // Les modules utiles à l'étape restent allumés, les autres s'effacent un peu
            let focus = null;
            if (!final) {
                if (done) focus = step.focusDone || step.focus || null;
                else if (step.goal === 'patch') focus = next ? [JACKS[next[0]].module, JACKS[next[1]].module] : null;
                else focus = step.focus || null;
            }
            rack.querySelectorAll('.module').forEach((m) => {
                m.classList.toggle('is-dim', !!focus && focus.indexOf(m.getAttribute('data-module')) === -1);
            });
            const hinted = final ? null
                : (done && step.goal === 'patch' && step.knob && !state.turned) ? step.knob
                    : (!done && step.goal === 'turn') ? step.knob : null;
            Object.keys(knobEls).forEach((key) => knobEls[key].node.classList.toggle('is-hinted', key === hinted));
            if (padEl) padEl.classList.toggle('is-hinted', !final && !done && step.goal === 'play');

            refreshJacks();
            drawGuide();
        }

        // « la suite du lab ↓ » : on descend jusqu'à la deuxième rangée du rack, qui s'allume au passage
        function goToNext(e) {
            const next = document.querySelector('.site-rack-section');
            if (!next) return;
            e.preventDefault();
            next.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
            const row = next.querySelector('.site-rack');
            if (row) {
                row.classList.remove('is-lit');
                setTimeout(() => row.classList.add('is-lit'), reduceMotion() ? 0 : 450);
            }
            const first = next.querySelector('a, button, input');
            if (first) setTimeout(() => first.focus({ preventScroll: true }), reduceMotion() ? 0 : 700);
        }

        function note(text, quiet) {
            clearTimeout(noteTimer);
            const changed = state.note !== (text || '');
            state.note = text || '';
            if (state.note) {
                noteTimer = setTimeout(() => { state.note = ''; renderGuide(); }, 5200);
                if (!quiet) announce(state.note);
            }
            if (changed) renderGuide();
        }
        cleanups.push(() => clearTimeout(noteTimer));

        function announce(text) {
            live.textContent = text;
        }

        // Amène un élément du rack à l'écran, sous l'afficheur collé en haut, s'il n'y est pas :
        // le plus petit défilement possible
        function bringIntoView(node) {
            if (!node) return;
            const margin = 24;
            const r = node.getBoundingClientRect();
            const top = display.getBoundingClientRect().height + margin;   // l'afficheur peut se coller en haut
            const bottom = window.innerHeight - margin;
            let delta = 0;
            if (r.bottom > bottom) delta = Math.min(r.bottom - bottom, r.top - top);
            else if (r.top < top) delta = r.top - top;
            if (Math.abs(delta) > 2) window.scrollBy({ top: delta, behavior: reduceMotion() ? 'auto' : 'smooth' });
        }

        // L'afficheur collé en haut prend un fond et un filet. Et quand on descend dans la page
        // au point de laisser le rack derrière soi, il s'éteint : plus de son, plus d'onde.
        function onScroll() {
            const t = display.getBoundingClientRect().top;
            display.classList.toggle('is-stuck', t <= 0.5 && root.getBoundingClientRect().top < -0.5);
            if (state.power && A.ctx && rack.getBoundingClientRect().bottom < window.innerHeight * 0.2) setPower(false, true);
        }
        window.addEventListener('scroll', onScroll, { passive: true });
        cleanups.push(() => window.removeEventListener('scroll', onScroll));

        /* ---------- animation : câbles, voyant, oscilloscope, antenne ---------- */
        function frame(now) {
            raf = 0;
            if (destroyed) return;
            if (!state.power) {
                // Éteint : voyant éteint, écran vide, et plus aucune image calculée
                if (ledEl) ledEl.style.opacity = '0.08';
                drawScope(true);
                return;
            }
            const motion = !reduceMotion();
            const dt = lastNow ? Math.min(100, now - lastNow) : 16;
            lastNow = now;

            // Valeur actuelle du lfo (voyant, aiguilles de modulation, câbles blancs)
            let lfoValue = 0;
            const depth = state.values['lfo.depth'] || 0;
            if (A.lfoTap) {
                A.lfoTap.getFloatTimeDomainData(A.lfoData);
                lfoValue = A.lfoData[A.lfoData.length - 1];
            }
            const norm = depth > 0.01 ? lfoValue / depth : 0;
            if (ledEl) {
                const glow = A.ctx ? 0.5 + 0.5 * norm : 0.15;
                ledEl.style.opacity = String(0.15 + 0.85 * Math.max(0, glow));
            }

            // Aiguilles cyan : là où le control voltage pousse le bouton
            MODS.forEach((m) => m.knobs.forEach((k) => {
                if (!k.cv) return;
                const knob = knobEls[m.id + '.' + k.id];
                const driven = state.cables.some((c) => c.to === k.cv.from && c.from === 'lfo.out');
                knob.node.classList.toggle('is-modulated', driven);
                if (driven) {
                    const v = Math.max(0, Math.min(1, state.values[m.id + '.' + k.id] + lfoValue * k.cv.span));
                    const a = (-135 + v * 270 - 90) * Math.PI / 180;
                    knob.cvDot.setAttribute('cx', (28 + 24 * Math.cos(a)).toFixed(2));
                    knob.cvDot.setAttribute('cy', (28 + 24 * Math.sin(a)).toFixed(2));
                }
            }));

            // Câbles : un léger balancement à la pose, le signal qui circule
            state.cables.forEach((c) => {
                if (!c.paths) return;
                const age = (now - c.born) / 1000;
                if (motion && age < 1.4) {
                    const wobble = 1 + 0.4 * Math.exp(-age * 4.5) * Math.cos(age * 13);
                    const d = cablePath(c.ends[0], c.ends[1], wobble);
                    c.paths.forEach((p) => p.setAttribute('d', d));
                } else if (c.wobbling !== false) {
                    c.wobbling = false;
                    const d = cablePath(c.ends[0], c.ends[1], 1);
                    c.paths.forEach((p) => p.setAttribute('d', d));
                }
                const flow = c.paths[2];
                if (c.kind === 'cv') {
                    flow.style.opacity = String(0.2 + 0.8 * Math.abs(norm));
                    if (motion) flow.style.strokeDashoffset = String(-(now / 1000) * 22 * (0.4 + rateHz(state.values['lfo.rate'] || 0)));
                } else if (motion) {
                    flow.style.strokeDashoffset = String(-(now / 1000) * 60);
                }
            });

            // L'antenne : le temps joué, branché sur la sortie, compte pour l'étape « jouer »
            const step = STEPS[state.step];
            if (step && step.goal === 'play' && state.phase === 'todo' && state.hand.on && state.hand.y > 0.1 &&
                A.ctx && A.ctx.state === 'running' && audioReaches('theremin.out', 'out.in')) {
                state.playMs += dt;
                if (state.playMs >= 2200) { state.acted = true; evaluate(); }
            }

            drawScope();
            // La boucle ne continue que si quelque chose bouge : du son vers la sortie, le lfo branché,
            // un câble qui se balance ou qu'on tire, un bouton qu'on tourne. Sinon, encore 300 ms (le temps
            // que l'oscilloscope retombe à plat), puis plus aucune image : un geste la relance (start).
            const running = A.ctx && A.ctx.state === 'running';
            const moving = (running && state.cables.some((c) => c.to === 'out.in' || c.from === 'lfo.out')) ||
                (motion && state.cables.some((c) => now - c.born < 1600)) ||
                !!tempState || !!rack.querySelector('.knob.is-turning') || state.hand.on;
            if (moving) idleFrom = now + 300;
            if (now < idleFrom && visible && !document.hidden) raf = requestAnimationFrame(frame);
        }

        function drawScope(off) {
            if (!scopeCanvas) return;
            const ratio = Math.min(window.devicePixelRatio || 1, 2);
            const w = Math.round(scopeCanvas.clientWidth * ratio), h = Math.round(scopeCanvas.clientHeight * ratio);
            if (!w || !h) return;
            if (scopeCanvas.width !== w || scopeCanvas.height !== h) { scopeCanvas.width = w; scopeCanvas.height = h; }
            const g = scopeCanvas.getContext('2d');
            g.clearRect(0, 0, w, h);

            // Graticule discret
            g.strokeStyle = 'rgba(0, 184, 217, 0.12)';
            g.lineWidth = 1;
            g.beginPath();
            for (let i = 1; i < 4; i++) { const y = Math.round(h * i / 4) + 0.5; g.moveTo(0, y); g.lineTo(w, y); }
            for (let i = 1; i < 6; i++) { const x = Math.round(w * i / 6) + 0.5; g.moveTo(x, 0); g.lineTo(x, h); }
            g.stroke();
            if (off) return;

            const data = A.analyser ? (A.analyser.getFloatTimeDomainData(A.scopeData), A.scopeData) : null;
            const span = 1024;
            let start = 0;
            if (data) {
                // Déclenchement sur un passage par zéro montant : l'onde reste immobile à l'écran
                for (let i = 1; i < data.length - span; i++) {
                    if (data[i - 1] < 0 && data[i] >= 0) { start = i; break; }
                }
            }
            g.beginPath();
            for (let i = 0; i < 240; i++) {
                const v = data ? data[start + Math.floor(i * span / 240)] : 0;
                const x = (i / 239) * w;
                const y = h / 2 - Math.max(-1, Math.min(1, v * 2.2)) * (h / 2 - 3 * ratio);
                if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
            }
            g.strokeStyle = '#00B8D9';
            g.lineWidth = 1.6 * ratio;
            g.lineJoin = 'round';
            g.shadowColor = 'rgba(0, 184, 217, 0.6)';
            g.shadowBlur = 6 * ratio;
            g.stroke();
            g.shadowBlur = 0;
        }

        // Une image au moins, puis la boucle décide elle-même si elle continue (idleFrom)
        function start() {
            if (!raf && !destroyed && state.power) { lastNow = 0; idleFrom = Math.max(idleFrom, performance.now() + 50); raf = requestAnimationFrame(frame); }
        }

        // Ne rien calculer quand l'instrument n'est pas à l'écran
        const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
            visible = entries.some((e) => e.isIntersecting);
            if (visible) start();
        }) : null;
        if (io) io.observe(rack);
        const onVisibility = () => { if (!document.hidden) start(); };
        document.addEventListener('visibilitychange', onVisibility);
        cleanups.push(() => document.removeEventListener('visibilitychange', onVisibility));

        const ro = 'ResizeObserver' in window ? new ResizeObserver(() => drawCables()) : null;
        if (ro) ro.observe(rack);
        else {
            window.addEventListener('resize', drawCables);
            cleanups.push(() => window.removeEventListener('resize', drawCables));
        }

        // Mise sous tension : les modules s'allument l'un après l'autre (une seule fois)
        if (!reduceMotion()) {
            rack.classList.add('is-powering');
            poweringAt = performance.now();
            setTimeout(() => { rack.classList.remove('is-powering'); redraw3D(); }, 1600);
        }

        enterStep(0);
        drawCables();
        renderGuide();
        onScroll();
        start();

        // La 3D : le rack, et sur l'accueil « la suite » en dessous
        whenIdle().then(() => whenCalm()).then(load3D).then(whenCalm).then((three) => {
            if (destroyed) return;
            skin = three.rack(rack, {
                cables: () => state.cables,
                temp: () => tempState,
                value: (k) => state.values[k] || 0,
                kind: (k) => (JACKS[k] ? JACKS[k].kind : 'audio'),
                // L'allumage en cours (le moment où il a commencé), sinon 0
                powering: () => (rack.classList.contains('is-powering') ? poweringAt : 0)
            });
            if (cfg === RACKS.home) siteSkin = three.siteRack(document.querySelector('.site-rack'));
        }).catch(() => { });

        return {
            root,
            destroy() {
                destroyed = true;
                if (skin) skin.destroy();
                if (siteSkin) siteSkin.destroy();
                if (raf) cancelAnimationFrame(raf);
                if (io) io.disconnect();
                if (ro) ro.disconnect();
                cleanups.forEach((fn) => fn());
                if (A.ctx) {
                    const ctx = A.ctx;
                    try { A.master.gain.setTargetAtTime(0, ctx.currentTime, 0.05); } catch (e) { }
                    setTimeout(() => { ctx.close().catch(() => { }); }, 300);
                }
            }
        };
    }

    /* -----------------------------------------------------
       LE THEREMIN (page histoire)
       Pas un rack : l'instrument de 1920, un meuble en bois et
       deux antennes. La main ne touche rien : plus elle approche
       l'antenne droite, plus la note monte ; plus elle descend
       vers la boucle de gauche, plus le son s'éteint.
       À la souris on joue en survolant, sans cliquer ; au doigt,
       en glissant ; au clavier, avec les flèches.
       ----------------------------------------------------- */
    const THEREMIN_TEXT = {
        fr: {
            eyebrow: 'avant le chapitre 1',
            label: 'un theremin : la main approche l’antenne de droite pour monter la note, descend vers la boucle de gauche pour baisser le volume. Au clavier, les flèches.',
            pitch: 'hauteur', volume: 'volume',
            powerOff: 'éteindre le theremin', powerOn: 'allumer le theremin',
            off: { touch: 'theremin éteint : touchez l’appareil pour le rallumer.', mouse: 'theremin éteint : cliquez sur l’appareil pour le rallumer.' },
            offSaid: 'theremin éteint.', onSaid: 'theremin allumé.',
            steps: [
                { title: 'allumez le theremin.', todo: { mouse: 'cliquez sur l’appareil : le voyant s’allume.', touch: 'touchez l’appareil : le voyant s’allume.' }, why: 'en 1920, il fallait le laisser chauffer. Ici, c’est immédiat.' },
                { title: 'jouez sans toucher.', todo: { mouse: 'approchez la souris de l’antenne de droite, sans cliquer : plus vous êtes près, plus la note monte.', touch: 'glissez le doigt vers l’antenne de droite : plus vous êtes près, plus la note monte.' }, why: 'la main ne touche rien : elle modifie le champ autour de l’antenne.' },
                { title: 'faites taire la note.', todo: { mouse: 'descendez vers la boucle de gauche : le son s’éteint.', touch: 'descendez le doigt vers la boucle de gauche : le son s’éteint.' }, why: 'deux antennes, deux mains : la hauteur à droite, le volume à gauche.' }
            ],
            final: { title: 'vous jouez comme en 1920.', why: 'le theremin, joué sans contact. Avant lui, le Telharmonium pesait 200 tonnes.', primary: ['lire le chapitre 1 : origines', 'histoire/origines/'] }
        },
        en: {
            eyebrow: 'before chapter 1',
            label: 'a theremin: the hand moves towards the right antenna to raise the note, down towards the left loop to lower the volume. With the keyboard, the arrow keys.',
            pitch: 'pitch', volume: 'volume',
            powerOff: 'switch off the theremin', powerOn: 'switch the theremin on',
            off: { touch: 'theremin off: tap the instrument to switch it back on.', mouse: 'theremin off: click the instrument to switch it back on.' },
            offSaid: 'theremin switched off.', onSaid: 'theremin on.',
            steps: [
                { title: 'switch the theremin on.', todo: { mouse: 'click the instrument: the pilot light comes on.', touch: 'tap the instrument: the pilot light comes on.' }, why: 'in 1920 it had to warm up first. Here it’s instant.' },
                { title: 'play without touching.', todo: { mouse: 'move the mouse towards the right antenna, without clicking: the closer you get, the higher the note.', touch: 'slide your finger towards the right antenna: the closer you get, the higher the note.' }, why: 'your hand touches nothing: it changes the field around the antenna.' },
                { title: 'silence the note.', todo: { mouse: 'move down towards the left loop: the sound fades out.', touch: 'slide your finger down towards the left loop: the sound fades out.' }, why: 'two antennas, two hands: pitch on the right, volume on the left.' }
            ],
            final: { title: 'you’re playing like it’s 1920.', why: 'the theremin, played without contact. Before it, the Telharmonium weighed 200 tons.', primary: ['read chapter 1: origins', 'histoire/origines/'] }
        }
    };

    // Le dessin, en unités du viewBox (800 × 440)
    const TH = { rodX: 552, rodTop: 44, rodBottom: 246, loopY: 286, loopLeft: 96, loopRight: 232 };

    function createTheremin(root) {
        const lang = (document.documentElement.lang || 'fr').indexOf('en') === 0 ? 'en' : 'fr';
        const T = Object.assign({}, COMMON[lang], THEREMIN_TEXT[lang]);
        const base = root.getAttribute('data-base') || './';
        const touch = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
        const N = T.steps.length;
        const state = { step: 0, phase: 'todo', power: false, hand: { x: 380, y: 140, on: false }, playMs: 0, quietMs: 0, wasLoud: false, note: '' };
        const A = {};
        const cleanups = [];
        let raf = 0, destroyed = false, visible = true, lastNow = 0, autoTimer = 0, keyTimer = 0, suspendTimer = 0, playUntil = 0;

        root.innerHTML = '';
        root.classList.add('is-ready');

        // L'afficheur, le même que sur les racks
        const dNum = el('span', { class: 'display-num', 'aria-hidden': 'true' });
        const dSegs = T.steps.map(() => el('span', { class: 'display-seg' }));
        const dTitle = el('p', { class: 'display-title', tabindex: '-1' });
        const dLine = el('p', { class: 'display-line' });
        const dFoot = el('div', { class: 'display-foot' });
        const display = el('div', { class: 'patch-display' }, [
            el('div', { class: 'display-head' }, [
                el('h2', { class: 'display-eyebrow', text: T.eyebrow }),
                el('span', { class: 'display-progress', 'aria-hidden': 'true' }, dSegs)
            ]),
            dNum, dTitle, dLine, dFoot
        ]);
        root.appendChild(display);

        /* ---------- le dessin ---------- */
        const stage = svg('svg', { class: 'theremin', viewBox: '0 0 800 440', role: 'img', tabindex: '0', 'aria-label': T.label });
        const defs = svg('defs', {});
        defs.innerHTML =
            '<linearGradient id="th-front" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6A4428"/><stop offset="0.5" stop-color="#4E321E"/><stop offset="1" stop-color="#341F12"/></linearGradient>' +
            '<linearGradient id="th-top" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8A5C36"/><stop offset="1" stop-color="#5E3D24"/></linearGradient>' +
            '<linearGradient id="th-side" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2E1D12"/><stop offset="1" stop-color="#1A0F08"/></linearGradient>' +
            '<linearGradient id="th-leg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2A1A0F"/><stop offset="0.45" stop-color="#6A4428"/><stop offset="1" stop-color="#22150C"/></linearGradient>' +
            '<linearGradient id="th-brass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4DC9A"/><stop offset="0.22" stop-color="#D9B46A"/><stop offset="0.55" stop-color="#9C7838"/><stop offset="0.85" stop-color="#6A4F22"/><stop offset="1" stop-color="#3E2E14"/></linearGradient>' +
            '<linearGradient id="th-rod" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4E3A1A"/><stop offset="0.32" stop-color="#E6C474"/><stop offset="0.45" stop-color="#FFF7DE"/><stop offset="0.7" stop-color="#B08A3E"/><stop offset="1" stop-color="#3E2E14"/></linearGradient>' +
            '<linearGradient id="th-bakelite" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0A0605"/><stop offset="0.4" stop-color="#3A2418"/><stop offset="1" stop-color="#080504"/></linearGradient>' +
            '<radialGradient id="th-ball" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="#FFF7DE"/><stop offset="0.4" stop-color="#D9B46A"/><stop offset="1" stop-color="#4E3A1A"/></radialGradient>' +
            '<radialGradient id="th-skirt" cx="0.4" cy="0.35" r="0.75"><stop offset="0" stop-color="#3B3631"/><stop offset="0.55" stop-color="#151311"/><stop offset="1" stop-color="#050505"/></radialGradient>' +
            '<radialGradient id="th-cap" cx="0.36" cy="0.3" r="0.8"><stop offset="0" stop-color="#FFF3CC"/><stop offset="0.3" stop-color="#E6C474"/><stop offset="0.7" stop-color="#A47A34"/><stop offset="1" stop-color="#5A4220"/></radialGradient>' +
            '<radialGradient id="th-screen" cx="0.5" cy="0.5" r="0.7"><stop offset="0" stop-color="#06232A"/><stop offset="0.7" stop-color="#03100F"/><stop offset="1" stop-color="#010505"/></radialGradient>' +
            '<linearGradient id="th-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.1"/><stop offset="0.35" stop-color="#FFFFFF" stop-opacity="0.02"/><stop offset="0.36" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>' +
            '<radialGradient id="th-lamp" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#7FEAFF" stop-opacity="0.9"/><stop offset="0.25" stop-color="#00B8D9" stop-opacity="0.55"/><stop offset="1" stop-color="#00B8D9" stop-opacity="0"/></radialGradient>' +
            '<linearGradient id="th-light" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE7B8" stop-opacity="0.12"/><stop offset="0.5" stop-color="#FFE7B8" stop-opacity="0"/></linearGradient>' +
            '<radialGradient id="th-floor" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#000" stop-opacity="0.8"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>';
        stage.appendChild(defs);
        const add = (parent, tag, attrs) => { const n = svg(tag, attrs); parent.appendChild(n); return n; };

        add(stage, 'ellipse', { cx: 410, cy: 426, rx: 250, ry: 14, fill: 'url(#th-floor)' });
        // Les champs autour des antennes : ils s'éclairent quand la main approche
        const pitchField = add(stage, 'g', { class: 'th-field th-field--pitch' });
        [36, 70, 104, 138].forEach((r, i) => add(pitchField, 'ellipse', { cx: TH.rodX, cy: 150, rx: r, ry: 96 + i * 14, style: '--k:' + i }));
        const volumeField = add(stage, 'g', { class: 'th-field th-field--volume' });
        [22, 40, 58].forEach((r, i) => add(volumeField, 'ellipse', { cx: 164, cy: TH.loopY, rx: 84 + i * 20, ry: r, style: '--k:' + i }));

        // Les pieds de derrière et l'étagère basse
        add(stage, 'polygon', { points: '266,350 277,350 274,416 269,416', fill: 'url(#th-leg)', opacity: 0.7 });
        add(stage, 'polygon', { points: '578,330 589,330 586,416 581,416', fill: 'url(#th-leg)', opacity: 0.7 });
        add(stage, 'polygon', { points: '246,392 554,392 570,380 262,380', fill: 'url(#th-top)', opacity: 0.85 });
        add(stage, 'rect', { x: 246, y: 392, width: 308, height: 6, fill: '#3B2618' });
        add(stage, 'rect', { x: 246, y: 392, width: 308, height: 1, fill: '#D9B46A', opacity: 0.7 });

        // Le meuble en noyer, vu de trois quarts : le flanc, le dessus, la façade plaquée en miroir
        const cabinet = add(stage, 'g', { class: 'th-cabinet' });
        add(cabinet, 'polygon', { points: '574,250 592,232 592,328 574,346', fill: 'url(#th-side)' });
        add(cabinet, 'polygon', { points: '226,250 574,250 592,232 244,232', fill: 'url(#th-top)' });
        ['M250 242 C340 238 430 244 586 236', 'M240 247 C350 243 470 248 578 244', 'M262 237 C380 234 470 239 590 234'].forEach((d) =>
            add(cabinet, 'path', { d, fill: 'none', stroke: '#2A170C', 'stroke-opacity': 0.35 }));
        add(cabinet, 'rect', { x: 226, y: 250, width: 348, height: 96, fill: 'url(#th-front)' });
        const veneer = ['M398 253 C386 268 380 296 390 343', 'M394 253 C376 270 368 300 380 343', 'M388 253 C362 274 350 306 364 343',
            'M378 253 C346 278 330 312 344 343', 'M364 253 C326 282 306 318 318 343', 'M346 253 C304 286 282 322 290 343',
            'M322 253 C282 286 262 314 258 334', 'M292 253 C270 272 258 290 254 304'];
        ['', 'translate(800 0) scale(-1 1)'].forEach((transform) => {
            const half = add(cabinet, 'g', { fill: 'none', stroke: '#1A0F08', 'stroke-width': 0.9, transform });
            veneer.forEach((d, i) => add(half, 'path', { d, opacity: [0.35, 0.3, 0.35, 0.25, 0.3, 0.22, 0.25, 0.18][i] }));
        });
        add(cabinet, 'line', { x1: 400, y1: 252, x2: 400, y2: 344, stroke: '#1A0F08', 'stroke-opacity': 0.5 });
        // Les filets de laiton
        add(cabinet, 'rect', { x: 224, y: 247, width: 352, height: 4, fill: 'url(#th-brass)' });
        add(cabinet, 'rect', { x: 224, y: 343, width: 352, height: 4, fill: 'url(#th-brass)' });
        add(cabinet, 'polygon', { points: '574,247 592,229 594,232 576,250', fill: '#C79E52' });
        // Les pilastres cannelés
        [236, 241, 246, 554, 559, 564].forEach((x) => {
            add(cabinet, 'line', { x1: x, y1: 258, x2: x, y2: 338, stroke: '#1A0F08', 'stroke-opacity': 0.55, 'stroke-width': 1.2 });
            add(cabinet, 'line', { x1: x + 1.5, y1: 258, x2: x + 1.5, y2: 338, stroke: '#FFD9A8', 'stroke-opacity': 0.12 });
        });
        // La plaque : un écran, le nom, deux boutons
        add(cabinet, 'rect', { x: 264, y: 263, width: 276, height: 76, rx: 8, fill: '#000', opacity: 0.45 });
        add(cabinet, 'rect', { x: 262, y: 260, width: 276, height: 76, rx: 8, fill: '#15110C', stroke: 'url(#th-brass)', 'stroke-width': 2.5 });
        add(cabinet, 'rect', { x: 267, y: 265, width: 266, height: 66, rx: 5, fill: 'none', stroke: '#C79E52', 'stroke-opacity': 0.3 });
        add(cabinet, 'rect', { x: 274, y: 268, width: 146, height: 56, rx: 4, class: 'th-screen' });
        const grid = add(cabinet, 'g', { class: 'th-grid' });
        [303, 332, 361, 390].forEach((x) => add(grid, 'line', { x1: x, y1: 268, x2: x, y2: 324 }));
        [282, 310].forEach((y) => add(grid, 'line', { x1: 274, y1: y, x2: 420, y2: y }));
        add(grid, 'line', { x1: 274, y1: 296, x2: 420, y2: 296, class: 'is-axis' });
        const wave = add(cabinet, 'polyline', { class: 'th-wave', points: '' });
        add(cabinet, 'rect', { x: 274, y: 268, width: 146, height: 56, rx: 4, fill: 'url(#th-glass)' });
        const brand = add(cabinet, 'text', { x: 484, y: 282, class: 'th-brand' });
        brand.textContent = 'theremin';
        add(brand, 'tspan', { class: 'th-brand-dot' }).textContent = '.';
        [[458, T.pitch, 20], [510, T.volume, -40]].forEach(([x, label, angle]) => {
            add(cabinet, 'circle', { cx: x + 1, cy: 304, r: 11.5, fill: '#000', opacity: 0.5 });
            add(cabinet, 'circle', { cx: x, cy: 302, r: 11, fill: 'url(#th-skirt)' });
            add(cabinet, 'circle', { cx: x, cy: 302, r: 10.4, fill: 'none', stroke: '#000', 'stroke-opacity': 0.6, 'stroke-width': 1.4, 'stroke-dasharray': '0.8 0.9' });
            add(cabinet, 'circle', { cx: x, cy: 302, r: 7.4, fill: 'url(#th-cap)' });
            add(cabinet, 'line', { x1: x, y1: 299, x2: x, y2: 295.6, class: 'th-knob-needle', transform: `rotate(${angle} ${x} 302)` });
            add(cabinet, 'line', { x1: x, y1: 293.4, x2: x, y2: 291.6, class: 'th-knob-mark', transform: `rotate(${angle} ${x} 302)` });
            const t = add(cabinet, 'text', { x, y: 326, class: 'th-silk' }); t.textContent = label;
        });
        [[268, 266], [532, 266], [268, 330], [532, 330]].forEach(([x, y]) => add(cabinet, 'circle', { cx: x, cy: y, r: 2.6, fill: 'url(#th-ball)' }));
        // Le tablier galbé, et son voyant
        add(cabinet, 'path', { d: 'M232 347 H568 V354 C520 354 500 366 400 366 C300 366 280 354 232 354 Z', fill: '#3B2618' });
        add(cabinet, 'path', { d: 'M232 354 C280 354 300 366 400 366 C500 366 520 354 568 354', fill: 'none', stroke: '#D9B46A', 'stroke-opacity': 0.5 });
        add(cabinet, 'circle', { cx: 400, cy: 356, r: 18, fill: 'url(#th-lamp)', class: 'th-pilot-bloom' });
        add(cabinet, 'circle', { cx: 400, cy: 356, r: 6, fill: '#1A140C', stroke: '#C79E52', 'stroke-width': 1.2 });
        add(cabinet, 'circle', { cx: 400, cy: 356, r: 4, class: 'th-pilot' });
        add(cabinet, 'rect', { x: 226, y: 232, width: 366, height: 134, fill: 'url(#th-light)', 'pointer-events': 'none' });

        // Les pieds de devant, chaussés de laiton
        add(stage, 'polygon', { points: '238,352 256,352 252,428 242,428', fill: 'url(#th-leg)' });
        add(stage, 'polygon', { points: '544,352 562,352 558,428 548,428', fill: 'url(#th-leg)' });
        add(stage, 'rect', { x: 241, y: 420, width: 12, height: 8, rx: 1.5, fill: 'url(#th-brass)' });
        add(stage, 'rect', { x: 547, y: 420, width: 12, height: 8, rx: 1.5, fill: 'url(#th-brass)' });

        // L'antenne de hauteur, à droite : une tige de laiton sur son isolant en bakélite
        add(stage, 'rect', { x: TH.rodX - 9, y: 226, width: 18, height: 20, rx: 2, fill: 'url(#th-bakelite)' });
        add(stage, 'rect', { x: TH.rodX - 10, y: 223, width: 20, height: 4, rx: 1.5, fill: 'url(#th-brass)' });
        add(stage, 'rect', { x: TH.rodX - 3, y: TH.rodTop, width: 6, height: 224 - TH.rodTop, fill: 'url(#th-rod)' });
        add(stage, 'rect', { x: TH.rodX - 4.5, y: 150, width: 9, height: 3, rx: 1, fill: 'url(#th-rod)' });
        add(stage, 'circle', { cx: TH.rodX, cy: TH.rodTop, r: 6, fill: 'url(#th-ball)' });
        const pitchNote = add(stage, 'text', { x: TH.rodX + 14, y: TH.rodTop + 4, class: 'th-note' }); pitchNote.textContent = T.pitch;
        // La boucle de volume, à gauche, sur son support
        const loopD = `M220 ${TH.loopY - 12} H${TH.loopLeft + 14} a14 14 0 0 0 0 28 H220`;
        add(stage, 'path', { class: 'th-loop-edge', d: loopD });
        add(stage, 'path', { class: 'th-loop', d: loopD });
        add(stage, 'path', { class: 'th-loop-shine', d: `M220 ${TH.loopY - 13.2} H${TH.loopLeft + 14} a12.8 12.8 0 0 0 -10 4.6` });
        add(stage, 'rect', { x: 214, y: TH.loopY - 17, width: 14, height: 34, rx: 2, fill: 'url(#th-bakelite)' });
        add(stage, 'rect', { x: 214, y: TH.loopY - 17, width: 14, height: 3, fill: '#C79E52' });
        const volumeNote = add(stage, 'text', { x: (TH.loopLeft + TH.loopRight) / 2, y: TH.loopY + 36, class: 'th-note', 'text-anchor': 'middle' }); volumeNote.textContent = T.volume;
        // La main, et le fil invisible qui la relie à l'antenne
        const reach = add(stage, 'line', { class: 'th-reach', x1: 0, y1: 0, x2: 0, y2: 0 });
        const hand = add(stage, 'g', { class: 'th-hand' });
        add(hand, 'circle', { r: 26, class: 'th-hand-ring' });
        add(hand, 'circle', { r: 26, class: 'th-hand-ring th-hand-ring--late' });
        add(hand, 'circle', { r: 9, class: 'th-hand-dot' });
        const hz = add(hand, 'text', { x: 16, y: -16, class: 'th-hz' });
        const wrap = el('div', { class: 'theremin-stage' }, [stage]);
        // La 3D : le meuble en noyer et laiton. Le dessin d'origine reste par-dessus, invisible :
        // il reçoit les gestes, le clavier et le focus ; la 3D dit où la main se trouve dans ce dessin.
        let view = null;
        root.appendChild(wrap);

        const powerBtn = el('button', { type: 'button', class: 'patch-tool', text: T.powerOn });
        const resetBtn = el('button', { type: 'button', class: 'patch-tool', text: T.reset });
        root.appendChild(el('div', { class: 'patch-tools' }, [el('span', { class: 'patch-tool-group' }, [powerBtn, resetBtn])]));
        const live = el('p', { class: 'visually-hidden', 'aria-live': 'polite' });
        root.appendChild(live);
        const announce = (t) => { live.textContent = t; };

        /* ---------- le son : une sinusoïde, un vibrato, un volume qui suit la main ---------- */
        const pitchAt = (x) => {
            const d = Math.min(Math.abs(TH.rodX - x), 480);
            return 110 * Math.pow(2, 3.7 * (1 - d / 480));       // loin : 110 Hz ; tout près : 1,4 kHz
        };
        const volumeAt = (x, y) => {
            const cx = Math.max(TH.loopLeft, Math.min(TH.loopRight, x));
            const d = Math.hypot(x - cx, y - TH.loopY);
            return Math.max(0, Math.min(1, (d - 18) / 200));      // sur la boucle : silence
        };

        function ensureAudio() {
            if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume().catch(() => { }); return A.ctx; }
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return null;
            let ctx;
            try { ctx = new Ctx(); } catch (e) { return null; }
            A.ctx = ctx;
            A.osc = ctx.createOscillator();
            A.osc.type = 'sine';
            A.osc.frequency.value = pitchAt(state.hand.x);
            A.vib = ctx.createOscillator();
            A.vib.frequency.value = 5.6;
            A.vibDepth = ctx.createGain();
            A.vibDepth.gain.value = 12;
            A.vib.connect(A.vibDepth);
            A.vibDepth.connect(A.osc.detune);
            // Un soupçon de saturation : le timbre un peu chaud des lampes
            A.shape = ctx.createWaveShaper();
            const curve = new Float32Array(512);
            for (let i = 0; i < 512; i++) { const x = i / 255.5 - 1; curve[i] = Math.tanh(1.6 * x) / Math.tanh(1.6); }
            A.shape.curve = curve;
            A.vol = ctx.createGain();
            A.vol.gain.value = 0;
            A.analyser = ctx.createAnalyser();
            A.analyser.fftSize = 2048;
            A.data = new Float32Array(A.analyser.fftSize);
            A.master = ctx.createGain();
            A.master.gain.value = 0.5;
            A.osc.connect(A.shape);
            A.shape.connect(A.vol);
            A.vol.connect(A.analyser);
            A.analyser.connect(A.master);
            A.master.connect(ctx.destination);
            A.osc.start();
            A.vib.start();
            return ctx;
        }

        function sound() {
            if (!A.ctx) return;
            const t = A.ctx.currentTime;
            const on = state.power && state.hand.on;
            A.osc.frequency.setTargetAtTime(pitchAt(state.hand.x), t, 0.035);
            A.vol.gain.setTargetAtTime(on ? 0.55 * Math.pow(volumeAt(state.hand.x, state.hand.y), 1.4) : 0, t, on ? 0.05 : 0.15);
        }

        function setPower(on) {
            if (state.power === on || destroyed) return;
            state.power = on;
            stage.classList.toggle('is-on', on);
            clearTimeout(suspendTimer);
            if (on) {
                ensureAudio();
                if (A.ctx) A.ctx.resume().catch(() => { });
                start();
            } else {
                sound();
                suspendTimer = setTimeout(() => { if (!state.power && A.ctx && !destroyed) A.ctx.suspend().catch(() => { }); }, 600);
            }
            powerBtn.textContent = on ? T.powerOff : T.powerOn;
            sound();
            announce(on ? T.onSaid : T.offSaid);
            if (on && state.step === 0 && state.phase === 'todo') done();
            render();
            if (view) view.invalidate();
        }
        cleanups.push(() => clearTimeout(suspendTimer));

        /* ---------- la main ---------- */
        function point(e) {
            if (view) { const p = view.toDrawing(e.clientX, e.clientY); if (p) return p; }
            const m = stage.getScreenCTM();
            if (!m) return null;
            const p = stage.createSVGPoint();
            p.x = e.clientX; p.y = e.clientY;
            const q = p.matrixTransform(m.inverse());
            return { x: Math.max(0, Math.min(800, q.x)), y: Math.max(0, Math.min(440, q.y)) };
        }

        function moveHand(p, on) {
            state.hand.x = p.x; state.hand.y = p.y; state.hand.on = on;
            stage.classList.toggle('is-playing', on && state.power);
            sound();
            draw();
            start();
            if (view) view.invalidate();
        }

        let touching = false;
        stage.addEventListener('pointermove', (e) => {
            const p = point(e); if (!p) return;
            if (e.pointerType === 'mouse') moveHand(p, true);
            else if (touching) moveHand(p, true);
        });
        stage.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') moveHand(state.hand, false); });
        stage.addEventListener('pointerdown', (e) => {
            const p = point(e); if (!p) return;
            if (e.pointerType !== 'mouse') {
                e.preventDefault();
                touching = true;
                try { stage.setPointerCapture(e.pointerId); } catch (err) { }
            }
            if (!state.power) setPower(true);
            moveHand(p, true);
        });
        const release = (e) => { if (e.pointerType !== 'mouse') { touching = false; moveHand(state.hand, false); } };
        stage.addEventListener('pointerup', release);
        stage.addEventListener('pointercancel', release);
        stage.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPower(!state.power); return; }
            const mv = { ArrowLeft: [-24, 0], ArrowRight: [24, 0], ArrowUp: [0, -20], ArrowDown: [0, 20] }[e.key];
            if (!mv) return;
            e.preventDefault();
            if (!state.power) setPower(true);
            moveHand({ x: Math.max(0, Math.min(800, state.hand.x + mv[0])), y: Math.max(0, Math.min(440, state.hand.y + mv[1])) }, true);
            clearTimeout(keyTimer);
            keyTimer = setTimeout(() => moveHand(state.hand, false), 1600);
        });
        stage.addEventListener('blur', () => { clearTimeout(keyTimer); if (state.hand.on && !touching) moveHand(state.hand, false); });
        cleanups.push(() => clearTimeout(keyTimer));

        powerBtn.addEventListener('click', () => setPower(!state.power));
        resetBtn.addEventListener('click', () => {
            clearTimeout(autoTimer);
            Object.assign(state, { step: 0, phase: 'todo', playMs: 0, quietMs: 0, wasLoud: false });
            setPower(false);
            render();
        });

        /* ---------- le dessin qui suit la main et le son ---------- */
        function draw() {
            const h = state.hand, on = h.on && state.power;
            const near = Math.max(0, 1 - Math.abs(TH.rodX - h.x) / 480);
            const vol = volumeAt(h.x, h.y);
            pitchField.style.setProperty('--near', on ? near.toFixed(3) : '0');
            volumeField.style.setProperty('--near', on ? (1 - vol).toFixed(3) : '0');
            hand.setAttribute('transform', `translate(${h.x.toFixed(1)} ${h.y.toFixed(1)})`);
            const ry = Math.max(TH.rodTop, Math.min(TH.rodBottom, h.y));
            reach.setAttribute('x1', h.x.toFixed(1)); reach.setAttribute('y1', h.y.toFixed(1));
            reach.setAttribute('x2', TH.rodX); reach.setAttribute('y2', ry.toFixed(1));
            reach.style.opacity = on ? (0.15 + 0.6 * near).toFixed(2) : '0';
            hz.textContent = fmtHz(pitchAt(h.x));
            hz.setAttribute('x', h.x > 640 ? -70 : 16);
        }

        function drawWave() {
            if (!A.analyser || !state.power) { wave.setAttribute('points', ''); return; }
            A.analyser.getFloatTimeDomainData(A.data);
            let start = 0;
            for (let i = 1; i < 1024; i++) if (A.data[i - 1] < 0 && A.data[i] >= 0) { start = i; break; }
            const pts = [];
            for (let i = 0; i < 80; i++) {
                const v = A.data[start + i * 8] || 0;
                pts.push((276 + i * 1.8).toFixed(1) + ',' + (296 - Math.max(-1, Math.min(1, v * 1.6)) * 22).toFixed(1));
            }
            wave.setAttribute('points', pts.join(' '));
        }

        function frame(now) {
            raf = 0;
            if (destroyed) return;
            const dt = lastNow ? Math.min(100, now - lastNow) : 16;
            lastNow = now;
            const h = state.hand, on = h.on && state.power && A.ctx && A.ctx.state === 'running';
            const vol = volumeAt(h.x, h.y);
            if (state.phase === 'todo' && on) {
                if (state.step === 1 && vol > 0.15) {
                    state.playMs += dt;
                    if (state.playMs >= 2200) done();
                } else if (state.step === 2) {
                    if (vol > 0.3) state.wasLoud = true;
                    if (state.wasLoud && vol < 0.08) { state.quietMs += dt; if (state.quietMs >= 350) done(); }
                    else state.quietMs = 0;
                }
            }
            drawWave();
            // Seulement pendant qu’on joue, puis 900 ms : le son s’éteint en 0,15 s de constante, l’onde retombe à plat
            if (h.on) playUntil = now + 900;
            if (state.power && now < playUntil && visible && !document.hidden) raf = requestAnimationFrame(frame);
        }

        function start() {
            if (!raf && !destroyed && state.power) { lastNow = 0; playUntil = Math.max(playUntil, performance.now() + 50); raf = requestAnimationFrame(frame); }
        }

        /* ---------- le guide ---------- */
        function done() {
            if (state.phase === 'done') return;
            state.phase = 'done';
            announce(T.steps[state.step].why);
            render();
            if (state.step === 0) {
                clearTimeout(autoTimer);
                autoTimer = setTimeout(() => { if (state.step === 0) goNext(); }, 1400);
            }
        }
        cleanups.push(() => clearTimeout(autoTimer));

        function goNext() {
            const hadFocus = display.contains(document.activeElement);
            clearTimeout(autoTimer);
            state.step += 1;
            state.phase = 'todo';
            state.playMs = 0; state.quietMs = 0; state.wasLoud = false;
            render();
            if (state.step >= N) announce(T.final.title + ' ' + T.final.why);
            else announce(T.stepOf(state.step + 1, N) + T.steps[state.step].title + ' ' + T.steps[state.step].todo[touch ? 'touch' : 'mouse']);
            if (hadFocus) dTitle.focus({ preventScroll: true });
        }

        function fill(node, children) {
            node.textContent = '';
            children.forEach((c) => c && node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
        }

        function render() {
            if (view) view.invalidate();
            const final = state.step >= N;
            const s = final ? null : T.steps[state.step];
            const isDone = !final && state.phase === 'done';
            display.classList.toggle('is-done', isDone || final);
            display.classList.toggle('is-final', final);
            if (final) {
                const check = svg('svg', { viewBox: '0 0 40 40', class: 'display-check' });
                check.appendChild(svg('path', { d: 'M8 21 L16 29 L32 11' }));
                fill(dNum, [check]);
            } else fill(dNum, [String(state.step + 1)]);
            dSegs.forEach((seg, i) => {
                seg.classList.toggle('is-done', final || i < state.step || (i === state.step && isDone));
                seg.classList.toggle('is-current', !final && i === state.step && !isDone);
            });
            fill(dTitle, [el('span', { class: 'visually-hidden', text: final ? '' : T.stepOf(state.step + 1, N) })].concat(punctuated(final ? T.final.title : s.title)));
            const off = !state.power && state.step > 0 && !final;
            dLine.classList.toggle('is-note', off);
            if (final) fill(dLine, [T.final.why]);
            else if (off) fill(dLine, [T.off[touch ? 'touch' : 'mouse']]);
            else fill(dLine, [isDone ? s.why : s.todo[touch ? 'touch' : 'mouse']]);
            const foot = [];
            if (final) {
                foot.push(el('a', { class: 'display-cta', href: base + T.final.primary[1], text: T.final.primary[0] + ' →' }));
                const icon = svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' });
                icon.appendChild(svg('path', { d: 'M12 3v8M6.6 6.6a8 8 0 1 0 10.8 0' }));
                const power = el('button', { type: 'button', class: 'display-power is-secondary' + (state.power ? '' : ' is-off') }, [icon, state.power ? T.powerOff : T.powerOn]);
                power.addEventListener('click', () => { setPower(!state.power); const b = dFoot.querySelector('.display-power'); if (b) b.focus({ preventScroll: true }); });
                foot.push(power);
            } else if (isDone && state.step > 0) {
                const next = el('button', { type: 'button', class: 'display-next', text: T.next });
                next.addEventListener('click', goNext);
                foot.push(next);
            }
            fill(dFoot, foot);
            stage.classList.toggle('is-hint-pilot', !final && state.step === 0 && !state.power);
            stage.classList.toggle('is-hint-rod', !final && state.step === 1 && state.phase === 'todo');
            stage.classList.toggle('is-hint-loop', !final && state.step === 2 && state.phase === 'todo');
        }

        // Collé en haut sur téléphone ; on descend dans la page : le theremin s'éteint
        function onScroll() {
            const t = display.getBoundingClientRect().top;
            display.classList.toggle('is-stuck', t <= 0.5 && root.getBoundingClientRect().top < -0.5);
            if (state.power && wrap.getBoundingClientRect().bottom < window.innerHeight * 0.2) setPower(false);
        }
        window.addEventListener('scroll', onScroll, { passive: true });
        cleanups.push(() => window.removeEventListener('scroll', onScroll));

        const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
            visible = entries.some((e) => e.isIntersecting);
            if (visible) start();
        }) : null;
        if (io) io.observe(wrap);
        const onVisibility = () => { if (!document.hidden) start(); };
        document.addEventListener('visibilitychange', onVisibility);
        cleanups.push(() => document.removeEventListener('visibilitychange', onVisibility));

        // Sur téléphone, on resserre le cadre autour de l'instrument : plus de place pour la main
        function frameStage() {
            stage.setAttribute('viewBox', wrap.clientWidth < 600 ? '80 24 600 416' : '0 0 800 440');
        }
        const ro = 'ResizeObserver' in window ? new ResizeObserver(frameStage) : null;
        if (ro) ro.observe(wrap);
        frameStage();

        draw();
        render();
        onScroll();

        // Le cadre prend tout de suite les proportions de la 3D : la page ne bouge pas quand elle arrive.
        // Sur écran tactile, rack3d.js est lu tout de suite : s'il ne veut pas de 3D ici (MOBILE_3D),
        // le cadre reprend aussitôt les proportions du dessin.
        if (window.WebGLRenderingContext) wrap.classList.add('is-3d-soon');
        if (touch) loadSkin().then((three) => { if (!three.wanted()) wrap.classList.remove('is-3d-soon'); }).catch(() => { });
        whenIdle().then(() => whenCalm()).then(load3D).then(whenCalm).then((three) => {
            if (destroyed) return;
            view = three.theremin(wrap, {
                stage, TH,
                hand: () => state.hand,
                power: () => state.power,
                analyser: () => A.analyser,
                pitchAt, volumeAt, fmtHz,
                labels: { pitch: T.pitch, volume: T.volume }
            });
            if (!view) wrap.classList.remove('is-3d-soon');
        }).catch(() => { wrap.classList.remove('is-3d-soon'); });

        return {
            root,
            destroy() {
                destroyed = true;
                if (view) view.destroy();
                if (raf) cancelAnimationFrame(raf);
                if (io) io.disconnect();
                if (ro) ro.disconnect();
                cleanups.forEach((fn) => fn());
                if (A.ctx) {
                    const ctx = A.ctx;
                    try { A.master.gain.setTargetAtTime(0, ctx.currentTime, 0.05); } catch (e) { }
                    setTimeout(() => { ctx.close().catch(() => { }); }, 300);
                }
            }
        };
    }

    /* -----------------------------------------------------
       BRANCHEMENT SUR LE SITE
       Monté au chargement, puis à chaque changement de page
       sans rechargement (événement modulr:page de main.js).
       ----------------------------------------------------- */
    function sync() {
        const root = document.querySelector('[data-instrument]');
        if (root) mount(root); else unmount();
    }

    window.modulrInstrument = { sync };
    document.addEventListener('modulr:page', sync);
    sync();
})();
