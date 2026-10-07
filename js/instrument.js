/* =========================================================
   MODULR LAB — instrument.js
   L'instrument de l'accueil : « votre premier patch ».
   Quatre modules (vco, vcf, lfo, out), des câbles à tirer
   d'une sortie vers une entrée, un son synthétisé dans le
   navigateur (Web Audio) et un oscilloscope qui montre le
   vrai signal. Chargé par main.js seulement quand la page
   contient [data-instrument].

   Rien ne sonne avant que le visiteur ait branché un câble
   jusqu'à la sortie : c'est son geste qui lance le son.
   ========================================================= */

(function () {
    'use strict';

    /* -----------------------------------------------------
       TEXTES
       ----------------------------------------------------- */
    const TEXT = {
        fr: {
            roles: { vco: 'produire', vcf: 'transformer', lfo: 'contrôler', out: 'écouter' },
            waves: { sine: 'sinusoïde', triangle: 'triangle', sawtooth: 'dent de scie', square: 'carré' },
            waveGroup: "forme d'onde",
            input: 'entrée', output: 'sortie',
            steps: [
                {
                    todo: 'branchez le vco dans la sortie',
                    how: 'tirez un câble de vco › out jusqu’à out › in.',
                    done: 'une note. tournez pitch : la fréquence fait la hauteur, l’oscilloscope la montre.',
                    link: ['la leçon 1', 'le-cours/intro/']
                },
                {
                    todo: 'faites passer le son par le filtre',
                    how: 'vco › out vers vcf › in, puis vcf › out vers out › in. tournez cutoff.',
                    done: 'même note, autre couleur : le filtre retire des harmoniques.',
                    link: ['la leçon 2', 'le-cours/son-et-harmonique/']
                },
                {
                    todo: 'laissez le lfo tourner le bouton',
                    how: 'branchez lfo › out dans vcf › cutoff, ou dans vco › pitch.',
                    done: 'personne ne touche à rien, et le son bouge : c’est du control voltage.',
                    link: ['la leçon 4', 'le-cours/controle-en-tension/']
                }
            ],
            final: 'vous venez de faire votre premier patch.',
            finalLinks: [
                ['→ comprendre ce qui s’est passé : la leçon 1', 'le-cours/intro/'],
                ['→ refaire un vrai patch : les fiches', 'patchs/']
            ],
            hints: {
                direction: 'un câble va toujours d’une sortie (étiquette blanche) vers une entrée.',
                self: 'branchez ce module sur un autre module.',
                lfoAudio: 'rien ? normal : le lfo est trop lent pour s’entendre. c’est un signal de contrôle, branchez-le dans pitch ou cutoff.',
                muted: 'son coupé : l’oscilloscope continue de montrer le signal.',
                pick: 'choisissez maintenant où brancher l’autre bout.',
                noAudio: 'votre navigateur ne peut pas produire de son ici.'
            },
            patched: (a, b) => `câble branché : ${a} vers ${b}.`,
            unpatched: (a, b) => `câble débranché : ${a} vers ${b}.`,
            mute: 'couper le son', unmute: 'remettre le son', reset: 'tout débrancher',
            legendAudio: 'câble cyan : du son', legendCv: 'câble blanc : du contrôle',
            legendUnplug: 'toucher une entrée branchée la débranche'
        },
        en: {
            roles: { vco: 'produce', vcf: 'transform', lfo: 'control', out: 'listen' },
            waves: { sine: 'sine', triangle: 'triangle', sawtooth: 'sawtooth', square: 'square' },
            waveGroup: 'waveform',
            input: 'input', output: 'output',
            steps: [
                {
                    todo: 'patch the vco into the output',
                    how: 'drag a cable from vco › out to out › in.',
                    done: 'a note. turn pitch: frequency sets the pitch, and the scope shows it.',
                    link: ['lesson 1', 'le-cours/intro/']
                },
                {
                    todo: 'send the sound through the filter',
                    how: 'vco › out to vcf › in, then vcf › out to out › in. turn cutoff.',
                    done: 'same note, different colour: the filter removes harmonics.',
                    link: ['lesson 2', 'le-cours/son-et-harmonique/']
                },
                {
                    todo: 'let the lfo turn the knob',
                    how: 'patch lfo › out into vcf › cutoff, or into vco › pitch.',
                    done: 'nobody touches anything, and the sound moves: that’s control voltage.',
                    link: ['lesson 4', 'le-cours/controle-en-tension/']
                }
            ],
            final: 'you just made your first patch.',
            finalLinks: [
                ['→ understand what happened: lesson 1', 'le-cours/intro/'],
                ['→ build a real patch: the patch notes', 'patchs/']
            ],
            hints: {
                direction: 'a cable always goes from an output (white label) to an input.',
                self: 'patch this module into another one.',
                lfoAudio: 'nothing? that’s expected: the lfo is too slow to hear. it’s a control signal, patch it into pitch or cutoff.',
                muted: 'sound off: the scope keeps showing the signal.',
                pick: 'now choose where the other end goes.',
                noAudio: 'your browser can’t play sound here.'
            },
            patched: (a, b) => `patched: ${a} to ${b}.`,
            unpatched: (a, b) => `unpatched: ${a} to ${b}.`,
            mute: 'mute', unmute: 'unmute', reset: 'unpatch all',
            legendAudio: 'cyan cable: sound', legendCv: 'white cable: control',
            legendUnplug: 'touching a patched input unplugs it'
        }
    };

    /* -----------------------------------------------------
       MODULES
       Les valeurs des boutons vont de 0 à 1.
       ----------------------------------------------------- */
    const WAVES = ['sine', 'triangle', 'sawtooth', 'square'];
    const WAVE_GAIN = { sine: 0.5, triangle: 0.5, sawtooth: 0.3, square: 0.22 };

    const pitchHz = (v) => 55 * Math.pow(2, v * 4);          // 55 Hz → 880 Hz
    const cutoffHz = (v) => 60 * Math.pow(2, v * 7.5);        // 60 Hz → 10,9 kHz
    const resQ = (v) => 0.7 + v * 14;
    const rateHz = (v) => 0.1 * Math.pow(2, v * 7);           // 0,1 Hz → 12,8 Hz
    const fmtHz = (hz) => (hz >= 1000 ? (hz / 1000).toFixed(1) + ' kHz' : hz >= 10 ? Math.round(hz) + ' Hz' : hz.toFixed(1) + ' Hz');

    const MODULES = [
        {
            id: 'vco',
            knobs: [{ id: 'pitch', value: 0.42, text: (v) => fmtHz(pitchHz(v)), cv: { from: 'vco.pitch', span: 0.25 } }],
            waves: true,
            jacks: [{ id: 'pitch', dir: 'in', kind: 'cv' }, { id: 'out', dir: 'out', kind: 'audio' }]
        },
        {
            id: 'vcf',
            knobs: [
                { id: 'cutoff', value: 0.55, text: (v) => fmtHz(cutoffHz(v)), cv: { from: 'vcf.cutoff', span: 0.267 } },
                { id: 'res', value: 0.22, text: (v) => Math.round(v * 100) + ' %' }
            ],
            jacks: [{ id: 'in', dir: 'in', kind: 'audio' }, { id: 'cutoff', dir: 'in', kind: 'cv' }, { id: 'out', dir: 'out', kind: 'audio' }]
        },
        {
            id: 'lfo',
            knobs: [
                { id: 'rate', value: 0.42, text: (v) => fmtHz(rateHz(v)) },
                { id: 'depth', value: 0.55, text: (v) => Math.round(v * 100) + ' %' }
            ],
            led: true,
            jacks: [{ id: 'out', dir: 'out', kind: 'cv' }]
        },
        {
            id: 'out',
            knobs: [{ id: 'level', value: 0.7, text: (v) => Math.round(v * 100) + ' %' }],
            scope: true,
            jacks: [{ id: 'in', dir: 'in', kind: 'audio' }]
        }
    ];

    const JACKS = {};
    MODULES.forEach((m) => m.jacks.forEach((j) => { JACKS[m.id + '.' + j.id] = Object.assign({ module: m.id, key: m.id + '.' + j.id }, j); }));

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
        (children || []).forEach((c) => c && node.appendChild(c));
        return node;
    }

    const SVG_NS = 'http://www.w3.org/2000/svg';
    function svg(tag, attrs) {
        const node = document.createElementNS(SVG_NS, tag);
        Object.keys(attrs || {}).forEach((k) => node.setAttribute(k, attrs[k]));
        return node;
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

    function mount(root) {
        if (current && current.root === root) return;
        unmount();
        current = createInstrument(root);
    }

    function unmount() {
        if (!current) return;
        current.destroy();
        current = null;
    }

    function createInstrument(root) {
        const lang = (document.documentElement.lang || 'fr').indexOf('en') === 0 ? 'en' : 'fr';
        const T = TEXT[lang];
        const base = root.getAttribute('data-base') || './';
        const guideRoot = document.querySelector('[data-guide]');

        const state = {
            values: {},
            wave: 'sawtooth',
            cables: [],
            pending: null,
            muted: false,
            done: [false, false, false],
            nextId: 1
        };
        MODULES.forEach((m) => m.knobs.forEach((k) => { state.values[m.id + '.' + k.id] = k.value; }));

        const A = {};              // nœuds Web Audio
        const cleanups = [];
        const waveButtons = [];
        let raf = 0, visible = true, destroyed = false;

        /* ---------- construction du rack ---------- */
        root.innerHTML = '';
        root.classList.add('is-ready');

        const rack = el('div', { class: 'rack' });
        const modulesRow = el('div', { class: 'rack-modules' });
        const knobEls = {}, jackEls = {};
        let ledEl = null, scopeCanvas = null;

        MODULES.forEach((m, index) => {
            const mod = el('section', { class: 'module module--' + m.id, 'data-module': m.id, 'aria-label': m.id + ', ' + T.roles[m.id], style: '--i:' + index });
            mod.appendChild(el('header', { class: 'module-head' }, [
                el('span', { class: 'module-name', text: m.id }),
                el('span', { class: 'module-role', text: T.roles[m.id] }),
                m.led ? (ledEl = el('span', { class: 'module-led', 'aria-hidden': 'true' })) : null
            ]));

            const controls = el('div', { class: 'module-controls' });
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
        const cableLayer = svg('g', {});
        const tempLayer = svg('g', {});
        cablesSvg.appendChild(cableLayer);
        cablesSvg.appendChild(tempLayer);

        rack.appendChild(el('div', { class: 'rack-rail', 'aria-hidden': 'true' }));
        rack.appendChild(modulesRow);
        rack.appendChild(el('div', { class: 'rack-rail', 'aria-hidden': 'true' }));
        rack.appendChild(cablesSvg);
        root.appendChild(rack);

        // Barre d'outils : légende, couper le son, tout débrancher
        const muteBtn = el('button', { type: 'button', class: 'patch-tool', 'aria-pressed': 'false', text: T.mute });
        const resetBtn = el('button', { type: 'button', class: 'patch-tool', text: T.reset });
        root.appendChild(el('div', { class: 'patch-tools' }, [
            el('p', { class: 'patch-legend' }, [
                el('span', { class: 'legend-item legend-item--audio', text: T.legendAudio }),
                el('span', { class: 'legend-item legend-item--cv', text: T.legendCv }),
                el('span', { class: 'legend-item legend-item--unplug', text: T.legendUnplug })
            ]),
            el('span', { class: 'patch-tool-group' }, [muteBtn, resetBtn])
        ]));
        const live = el('p', { class: 'visually-hidden', 'aria-live': 'polite' });
        root.appendChild(live);

        // Le guide (colonne de gauche)
        let guideItems = [], hintEl = null, finalEl = null;
        if (guideRoot) {
            guideRoot.innerHTML = '';
            const list = el('ol', { class: 'guide-steps' });
            T.steps.forEach((s, i) => {
                const item = el('li', { class: 'guide-step' }, [
                    el('span', { class: 'guide-jack', 'aria-hidden': 'true' }),
                    el('div', { class: 'guide-text' }, [
                        el('p', { class: 'guide-todo', text: s.todo }),
                        el('p', { class: 'guide-how', text: s.how })
                    ])
                ]);
                item.dataset.step = String(i);
                guideItems.push(item);
                list.appendChild(item);
            });
            hintEl = el('p', { class: 'guide-hint', 'aria-live': 'polite' });
            finalEl = el('div', { class: 'guide-final', hidden: '' }, [
                el('p', { class: 'guide-final-title', text: T.final })
            ].concat(T.finalLinks.map((l) => el('p', { class: 'guide-final-item' }, [
                el('a', { class: 'guide-final-link', href: base + l[1], text: l[0] })
            ]))));
            guideRoot.appendChild(list);
            guideRoot.appendChild(hintEl);
            guideRoot.appendChild(finalEl);
        }

        /* ---------- boutons rotatifs ---------- */
        function buildKnob(key, def) {
            const node = el('div', {
                class: 'knob', role: 'slider', tabindex: '0',
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
            };
            knob.update = update;
            update();

            const set = (v) => {
                state.values[key] = Math.max(0, Math.min(1, v));
                update();
                applyKnob(key);
            };

            // Glisser vers le haut ou vers la droite pour tourner
            node.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                ensureAudio();
                const startX = e.clientX, startY = e.clientY, startV = state.values[key];
                node.setPointerCapture(e.pointerId);
                node.classList.add('is-turning');
                const move = (ev) => set(startV + ((ev.clientX - startX) - (ev.clientY - startY)) / 160);
                const up = () => {
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

        /* ---------- audio ---------- */
        function ensureAudio() {
            if (destroyed) return null;
            if (A.ctx) {
                if (A.ctx.state === 'suspended') A.ctx.resume().catch(() => { });
                return A.ctx;
            }
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) { hint(T.hints.noAudio); return null; }
            let ctx;
            try { ctx = new Ctx(); } catch (e) { hint(T.hints.noAudio); return null; }
            A.ctx = ctx;
            const now = ctx.currentTime;

            // Sortie : in → level → oscilloscope → coupure → limiteur → enceintes
            A.outIn = ctx.createGain();
            A.level = ctx.createGain();
            A.analyser = ctx.createAnalyser();
            A.analyser.fftSize = 2048;
            A.scopeData = new Float32Array(A.analyser.fftSize);
            A.mute = ctx.createGain();
            A.mute.gain.value = state.muted ? 0 : 1;
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
            A.analyser.connect(A.mute);
            A.mute.connect(A.comp);
            A.comp.connect(A.master);
            A.master.connect(ctx.destination);

            // vco
            A.osc = ctx.createOscillator();
            A.osc.type = state.wave;
            A.oscNorm = ctx.createGain();
            A.oscNorm.gain.value = WAVE_GAIN[state.wave];
            A.osc.connect(A.oscNorm);

            // vcf
            A.filter = ctx.createBiquadFilter();
            A.filter.type = 'lowpass';

            // lfo
            A.lfo = ctx.createOscillator();
            A.lfo.type = 'triangle';
            A.lfoDepth = ctx.createGain();
            A.lfoTap = ctx.createAnalyser();
            A.lfoTap.fftSize = 256;
            A.lfoData = new Float32Array(A.lfoTap.fftSize);
            A.lfo.connect(A.lfoDepth);
            A.lfoDepth.connect(A.lfoTap);

            Object.keys(state.values).forEach((key) => applyKnob(key, true));
            A.osc.start();
            A.lfo.start();
            state.cables.forEach(wire);

            // Un seul son à la fois : l'ambiance du site s'efface devant l'instrument
            const ambient = document.getElementById('ambient-audio');
            if (ambient && !ambient.paused) ambient.pause();
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
            return { 'vco.out': A.oscNorm, 'vcf.out': A.filter, 'lfo.out': A.lfoDepth }[key];
        }

        function targetOf(key) {
            switch (key) {
                case 'vco.pitch': return { param: A.osc.detune, scale: 1200 };
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
            state.cables.push(cable);
            ensureAudio();
            wire(cable);
            drawCables();
            refreshJacks();
            announce(T.patched(from.replace('.', ' › '), to.replace('.', ' › ')));
            if (from === 'lfo.out' && (to === 'out.in' || to === 'vcf.in')) hint(T.hints.lfoAudio);
            else hint('');
            evaluate();
        }

        function removeCable(cable, silent) {
            state.cables = state.cables.filter((c) => c !== cable);
            unwire(cable);
            drawCables();
            refreshJacks();
            if (!silent) announce(T.unpatched(cable.from.replace('.', ' › '), cable.to.replace('.', ' › ')));
        }

        function jackCenter(key) {
            const jack = jackEls[key];
            if (!jack) return { x: 0, y: 0 };
            const nut = jack.querySelector('.jack-nut');
            const r = nut.getBoundingClientRect(), base = rack.getBoundingClientRect();
            return { x: r.left + r.width / 2 - base.left, y: r.top + r.height / 2 - base.top };
        }

        function cablePath(p, q, wobble) {
            const sag = (22 + Math.abs(q.x - p.x) * 0.2 + Math.abs(q.y - p.y) * 0.06) * (wobble || 1);
            return `M${p.x.toFixed(1)} ${p.y.toFixed(1)} C${p.x.toFixed(1)} ${(p.y + sag).toFixed(1)}, ${q.x.toFixed(1)} ${(q.y + sag).toFixed(1)}, ${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
        }

        function drawCables() {
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
        }

        function refreshJacks() {
            Object.keys(jackEls).forEach((key) => {
                const used = JACKS[key].dir === 'in' ? !!cableAt(key) : state.cables.some((c) => c.from === key);
                jackEls[key].classList.toggle('is-patched', used);
                jackEls[key].classList.toggle('is-pending', state.pending === key);
                const target = state.pending && !connectionFor(state.pending, key).error && connectionFor(state.pending, key).from;
                jackEls[key].classList.toggle('is-target', !!target);
            });
            const first = jackEls['vco.out'];
            if (first) first.classList.toggle('is-invite', state.cables.length === 0 && !state.pending);
        }

        /* ---------- gestes : glisser, toucher-toucher, clavier ---------- */
        let drag = null;
        let pointerAt = -1e9;   // dernier geste à la souris ou au doigt sur une prise

        function tempCable(from, point) {
            tempLayer.innerHTML = '';
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
            ensureAudio();
            const key = jack.getAttribute('data-jack');
            drag = { key, x: e.clientX, y: e.clientY, moved: false, pointerId: e.pointerId, from: null };
            try { jack.setPointerCapture(e.pointerId); } catch (err) { }
            jack.addEventListener('pointermove', onDragMove);
            jack.addEventListener('pointerup', onDragEnd);
            jack.addEventListener('pointercancel', onDragCancel);
            drag.node = jack;
        }

        function onDragMove(e) {
            if (!drag) return;
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
            drag = null;
        }

        function onDragCancel() {
            state.pending = null;
            endDrag();
            refreshJacks();
        }

        function onDragEnd(e) {
            if (!drag) return;
            const d = drag;
            if (!d.moved) {
                endDrag();
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
                if (link.error) hint(T.hints[link.error]);
                else addCable(link.from, link.to);
            }
            refreshJacks();
        }

        // Toucher une prise : premier bout, puis second bout. Toucher une entrée branchée la débranche.
        function tapJack(key) {
            if (state.pending) {
                const from = state.pending;
                state.pending = null;
                if (from !== key) {
                    const link = connectionFor(from, key);
                    if (link.error) hint(T.hints[link.error]);
                    else addCable(link.from, link.to);
                }
                refreshJacks();
                return;
            }
            const occupied = JACKS[key].dir === 'in' ? cableAt(key) : null;
            if (occupied) { removeCable(occupied); evaluate(); return; }
            state.pending = key;
            hint(T.hints.pick);
            refreshJacks();
        }

        function onJackClick(e) {
            // Clavier (Entrée, Espace) seulement : la souris et le doigt passent par pointerdown/up,
            // et le clic qui suit un toucher ne doit pas compter une seconde fois
            const jack = e.target.closest('.jack');
            if (!jack || e.detail > 0 || performance.now() - pointerAt < 500) return;
            ensureAudio();
            tapJack(jack.getAttribute('data-jack'));
        }

        function onKey(e) {
            if (e.key === 'Escape' && state.pending) {
                state.pending = null;
                hint('');
                refreshJacks();
            }
        }

        function onOutsidePointer(e) {
            if (state.pending && !drag && !e.target.closest('.jack')) {
                state.pending = null;
                refreshJacks();
            }
        }

        rack.addEventListener('pointerdown', onJackPointerDown);
        rack.addEventListener('click', onJackClick);
        document.addEventListener('keydown', onKey);
        document.addEventListener('pointerdown', onOutsidePointer, true);
        cleanups.push(() => {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('pointerdown', onOutsidePointer, true);
        });

        muteBtn.addEventListener('click', () => {
            state.muted = !state.muted;
            muteBtn.setAttribute('aria-pressed', state.muted ? 'true' : 'false');
            muteBtn.textContent = state.muted ? T.unmute : T.mute;
            if (A.mute) A.mute.gain.setTargetAtTime(state.muted ? 0 : 1, A.ctx.currentTime, 0.03);
            hint(state.muted ? T.hints.muted : '');
        });

        resetBtn.addEventListener('click', () => {
            state.cables.slice().forEach((c) => removeCable(c, true));
            state.pending = null;
            refreshJacks();
            hint('');
        });

        /* ---------- le guide ---------- */
        function audioReaches(fromKey, toKey, seen) {
            // Le son suit les câbles audio ; le vcf le laisse passer de son entrée à sa sortie
            seen = seen || {};
            if (seen[fromKey]) return false;
            seen[fromKey] = true;
            return state.cables.filter((c) => c.from === fromKey && c.kind === 'audio').some((c) => {
                if (c.to === toKey) return true;
                if (c.to === 'vcf.in') return audioReaches('vcf.out', toKey, seen);
                return false;
            });
        }

        function evaluate() {
            const sounding = audioReaches('vco.out', 'out.in');
            const filtered = sounding && audioReaches('vco.out', 'vcf.in') && audioReaches('vcf.out', 'out.in');
            const moving = sounding && state.cables.some((c) => c.from === 'lfo.out' && (c.to === 'vcf.cutoff' || c.to === 'vco.pitch'));
            const now = [sounding, filtered, moving];
            now.forEach((ok, i) => { if (ok) state.done[i] = true; });
            renderGuide();
        }

        function renderGuide() {
            if (!guideItems.length) return;
            const currentStep = state.done.indexOf(false);
            guideItems.forEach((item, i) => {
                const s = T.steps[i];
                const done = state.done[i];
                item.classList.toggle('is-done', done);
                item.classList.toggle('is-current', i === currentStep);
                const how = item.querySelector('.guide-how');
                if (done && !item.dataset.shown) {
                    item.dataset.shown = '1';
                    how.textContent = s.done + ' ';
                    how.appendChild(el('a', { href: base + s.link[1], class: 'guide-link', text: s.link[0] + ' →' }));
                }
            });
            if (finalEl) finalEl.hidden = currentStep !== -1;
        }

        function hint(text) {
            if (hintEl) hintEl.textContent = text || '';
        }

        function announce(text) {
            live.textContent = text;
        }

        /* ---------- animation : câbles, voyant, oscilloscope ---------- */
        function frame(now) {
            raf = 0;
            if (destroyed) return;
            const motion = !reduceMotion();

            // Valeur actuelle du lfo (voyant, aiguilles de modulation, câbles blancs)
            let lfoValue = 0, depth = state.values['lfo.depth'];
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
            MODULES.forEach((m) => m.knobs.forEach((k) => {
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
                    if (motion) flow.style.strokeDashoffset = String(-(now / 1000) * 22 * (0.4 + rateHz(state.values['lfo.rate'])));
                } else if (motion) {
                    flow.style.strokeDashoffset = String(-(now / 1000) * 60);
                }
            });

            drawScope();
            if (visible && !document.hidden) raf = requestAnimationFrame(frame);
        }

        function drawScope() {
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

        function start() {
            if (!raf && !destroyed) raf = requestAnimationFrame(frame);
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
            setTimeout(() => rack.classList.remove('is-powering'), 1600);
        }

        drawCables();
        refreshJacks();
        renderGuide();
        start();

        return {
            root,
            destroy() {
                destroyed = true;
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
