/* =========================================================
   MODULR LAB — instrument.js
   Les racks du site : de vrais petits instruments, synthétisés
   dans le navigateur (Web Audio), avec des câbles à tirer d'une
   sortie vers une entrée et un oscilloscope qui montre le vrai
   signal. Chargé par main.js seulement quand la page contient
   [data-instrument] ; la valeur de l'attribut choisit le rack :
     (vide)     l'accueil : « votre premier patch », vco, vcf, lfo, out
     cours      le cours : fréquence et amplitude, vers la leçon 1
     histoire   l'histoire : un theremin, vers le chapitre 1

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
                lfoAudio: 'trop lent pour s’entendre : le lfo est un signal de contrôle. branchez-le dans pitch ou cutoff.',
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
            readout: (f, a) => `fréquence ${f}   amplitude ${a}`,
            pad: {
                label: 'antenne du theremin : de gauche à droite, la hauteur ; de bas en haut, le volume. au clavier, les flèches.',
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
                lfoAudio: 'too slow to hear: the lfo is a control signal. patch it into pitch or cutoff.',
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
            readout: (f, a) => `frequency ${f}   amplitude ${a}`,
            pad: {
                label: 'theremin antenna: left to right, the pitch; bottom to top, the volume. with the keyboard, the arrow keys.',
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
                        { title: 'faites sonner le vco.', done: 'une note.', turn: 'tournez pitch.', why: 'la fréquence fait la hauteur. l’oscilloscope dessine l’onde.', link: ['la leçon 1', 'le-cours/intro/'] },
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
                        { title: 'make the vco sound.', done: 'a note.', turn: 'turn pitch.', why: 'frequency sets the pitch. the scope draws the wave.', link: ['lesson 1', 'le-cours/intro/'] },
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
        },

        // Le cours : les deux grandeurs d'un signal, avant la leçon 1
        cours: {
            modules: [{ id: 'vco', waves: false, wave: 'sine', onlyJacks: ['out'] }, { id: 'out', readout: true }],
            cols: '1fr 1.5fr', colsM: '1fr 1.25fr',
            steps: [
                { goal: 'patch', cables: [['vco.out', 'out.in']], reached: (r) => r.sounding(), focusDone: ['vco', 'out'] },
                { goal: 'turn', knob: 'vco.pitch', focus: ['vco', 'out'] },
                { goal: 'turn', knob: 'out.level', focus: ['out'] }
            ],
            text: {
                fr: {
                    eyebrow: 'avant la leçon 1',
                    steps: [
                        { title: 'faites sonner le vco.', why: 'une onde qui se répète : un signal. l’oscilloscope la dessine.' },
                        { title: 'changez la fréquence.', todo: 'tournez pitch, et regardez l’onde.', why: 'les cycles se resserrent, le son monte : la fréquence fait la hauteur.' },
                        { title: 'changez l’amplitude.', todo: 'tournez level.', why: 'l’onde grandit sans changer de rythme : l’amplitude fait le niveau.' }
                    ],
                    final: {
                        title: 'fréquence et amplitude.',
                        why: 'les deux grandeurs d’un signal, expliquées dans la leçon 1.',
                        primary: ['commencer la leçon 1', 'le-cours/intro/']
                    }
                },
                en: {
                    eyebrow: 'before lesson 1',
                    steps: [
                        { title: 'make the vco sound.', why: 'a wave that repeats: a signal. the scope draws it.' },
                        { title: 'change the frequency.', todo: 'turn pitch, and watch the wave.', why: 'the cycles squeeze together, the sound rises: frequency sets the pitch.' },
                        { title: 'change the amplitude.', todo: 'turn level.', why: 'the wave grows without changing its rhythm: amplitude sets the level.' }
                    ],
                    final: {
                        title: 'frequency and amplitude.',
                        why: 'the two quantities of a signal, explained in lesson 1.',
                        primary: ['start lesson 1', 'le-cours/intro/']
                    }
                }
            }
        },

        // L'histoire : jouer sans toucher, comme en 1920, avant le chapitre 1
        histoire: {
            modules: [{ id: 'theremin' }, { id: 'out' }],
            cols: '1.7fr 1fr', colsM: '1fr',
            steps: [
                { goal: 'patch', cables: [['theremin.out', 'out.in']], reached: (r) => r.reaches('theremin.out', 'out.in'), auto: true },
                { goal: 'play', focus: ['theremin', 'out'] }
            ],
            text: {
                fr: {
                    eyebrow: 'avant le chapitre 1',
                    steps: [
                        { title: 'branchez le theremin.', why: 'il attend votre main.' },
                        {
                            title: 'jouez sans toucher.',
                            todo: { mouse: 'passez la souris sur l’antenne : à gauche grave, à droite aigu, en haut fort.', touch: 'glissez le doigt sur l’antenne : à gauche grave, à droite aigu, en haut fort.' },
                            why: 'en 1920, Léon Theremin jouait ainsi, les mains dans le vide.'
                        }
                    ],
                    final: {
                        title: 'vous jouez comme en 1920.',
                        why: 'le theremin, joué sans contact. avant lui, le Telharmonium pesait 200 tonnes.',
                        primary: ['lire le chapitre 1 : origines', 'histoire/origines/']
                    }
                },
                en: {
                    eyebrow: 'before chapter 1',
                    steps: [
                        { title: 'patch the theremin.', why: 'it’s waiting for your hand.' },
                        {
                            title: 'play without touching.',
                            todo: { mouse: 'move the mouse over the antenna: left low, right high, top loud.', touch: 'slide your finger over the antenna: left low, right high, top loud.' },
                            why: 'in 1920, Leon Theremin played like this, hands in mid-air.'
                        }
                    ],
                    final: {
                        title: 'you’re playing like it’s 1920.',
                        why: 'the theremin, played without contact. before it, the Telharmonium weighed 200 tons.',
                        primary: ['read chapter 1: origins', 'histoire/origines/']
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
        let raf = 0, visible = true, destroyed = false, noteTimer = 0, suspendTimer = 0, autoTimer = 0, keyTimer = 0, lastNow = 0;

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
        let ledEl = null, scopeCanvas = null, readoutEl = null, padEl = null, handEl = null;

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
            if (m.readout) {
                readoutEl = el('p', { class: 'module-readout', 'aria-hidden': 'true' });
                controls.appendChild(readoutEl);
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
        const cableLayer = svg('g', {});
        const tempLayer = svg('g', {});
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
                updateReadout();
                knobTurned(key);
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

        // Le cours : la fréquence et l'amplitude, en chiffres, sous l'oscilloscope
        function updateReadout() {
            if (!readoutEl) return;
            const f = state.values['vco.pitch'] !== undefined ? fmtHz(pitchHz(state.values['vco.pitch'])) : '–';
            const a = state.values['out.level'] !== undefined ? Math.round(state.values['out.level'] * 100) + ' %' : '–';
            readoutEl.textContent = T.readout(f, a);
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
        function setPower(on) {
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
            updateReadout();
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
            if (state.power && A.ctx && rack.getBoundingClientRect().bottom < window.innerHeight * 0.2) setPower(false);
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
            if (visible && !document.hidden) raf = requestAnimationFrame(frame);
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

        function start() {
            if (!raf && !destroyed && state.power) { lastNow = 0; raf = requestAnimationFrame(frame); }
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

        enterStep(0);
        updateReadout();
        drawCables();
        renderGuide();
        onScroll();
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
