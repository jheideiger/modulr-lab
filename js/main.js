/* =========================================================
   MODULR LAB — main.js
   Menu burger, lien actif, animations au scroll, formulaires,
   immersion sonore, et navigation sans rechargement pour que
   le son continue d'une page à l'autre.
   ========================================================= */

(function () {
    'use strict';

    const isEnglish = () => document.documentElement.lang === 'en';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    /* =====================================================
       1. INITIALISATIONS PROPRES À CHAQUE PAGE
       (rejouées après chaque changement de page)
       ===================================================== */

    // --- Menu burger ---
    function initMenu() {
        const burger = document.querySelector('.burger');
        const menuOverlay = document.getElementById('menu-overlay');
        const menuClose = document.querySelector('.menu-close');
        document.body.style.overflow = '';
        if (!burger || !menuOverlay || !menuClose) return;

        const close = () => {
            menuOverlay.classList.remove('is-open');
            menuOverlay.setAttribute('inert', '');
            menuOverlay.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        };

        burger.addEventListener('click', () => {
            menuOverlay.classList.add('is-open');
            menuOverlay.removeAttribute('inert');
            menuOverlay.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
        });
        menuClose.addEventListener('click', close);
        menuOverlay.querySelectorAll('nav a').forEach((link) => link.addEventListener('click', close));
    }

    // --- Rubrique active dans la navigation ---
    function setActiveNavLink() {
        const normalize = (path) => (path.endsWith('/') || path.includes('.') ? path : path + '/');
        const currentPath = normalize(window.location.pathname);

        document.querySelectorAll('.nav-link, .menu-overlay nav a').forEach((link) => {
            const href = link.getAttribute('href');
            if (!href) return;

            const linkPath = normalize(new URL(href, window.location.href).pathname);
            const isHomeLink = linkPath === '/' || linkPath === '/en/';
            const isActive = isHomeLink
                ? currentPath === linkPath
                : currentPath === linkPath || currentPath.startsWith(linkPath);

            if (isActive) {
                link.classList.add('nav-link--active');
                link.setAttribute('aria-current', 'page');
            }
        });
    }

    // --- Animations au scroll (IntersectionObserver) ---
    let revealObserver = null;

    function initReveal() {
        if (revealObserver) revealObserver.disconnect();
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const reveals = document.querySelectorAll('.reveal');
        if (reveals.length === 0) return;

        revealObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.15,
            rootMargin: '0px 0px -40px 0px'
        });

        reveals.forEach((el) => revealObserver.observe(el));
    }

    // --- Formulaire de contact ---
    function initContactForm() {
        const contactForm = document.getElementById('contact-form');
        const contactSuccess = document.getElementById('form-success');
        const contactNetworkError = document.getElementById('form-network-error');
        if (!contactForm || !contactSuccess) return;

        const submitBtn = contactForm.querySelector('.form-submit');
        const submitLabel = submitBtn.textContent;

        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            let isValid = true;

            contactForm.querySelectorAll('.form-input').forEach((input) => input.classList.remove('is-invalid'));
            contactForm.querySelectorAll('.form-error').forEach((error) => error.classList.remove('is-visible'));

            const fail = (field, errorId) => {
                field.classList.add('is-invalid');
                document.getElementById(errorId).classList.add('is-visible');
                isValid = false;
            };

            const name = contactForm.querySelector('#name');
            if (!name.value.trim()) fail(name, 'name-error');

            const email = contactForm.querySelector('#email');
            if (!emailRegex.test(email.value.trim())) fail(email, 'email-error');

            const subject = contactForm.querySelector('#subject');
            if (!subject.value) fail(subject, 'subject-error');

            const message = contactForm.querySelector('#message');
            if (!message.value.trim()) fail(message, 'message-error');

            if (!isValid) return;

            // Envoi réel vers Formspree
            submitBtn.disabled = true;
            submitBtn.textContent = isEnglish() ? 'sending...' : 'envoi en cours...';

            const restore = () => {
                if (contactNetworkError) contactNetworkError.classList.add('is-visible');
                submitBtn.disabled = false;
                submitBtn.textContent = submitLabel;
            };

            fetch(contactForm.action, {
                method: 'POST',
                body: new FormData(contactForm),
                headers: { 'Accept': 'application/json' }
            })
                .then((response) => {
                    if (!response.ok) return restore();
                    contactForm.style.display = 'none';
                    contactSuccess.classList.add('is-visible');
                })
                .catch(restore);
        });

        contactForm.querySelectorAll('.form-input').forEach((input) => {
            input.addEventListener('input', () => {
                input.classList.remove('is-invalid');
                const errorEl = input.closest('.form-group')?.querySelector('.form-error');
                if (errorEl) errorEl.classList.remove('is-visible');
            });
        });
    }

    // --- Newsletter : tous les formulaires de la page ---
    // Chaque formulaire .newsletter-form est suivi, dans le même parent, d'un bloc .form-success
    // et d'un message .form-error (erreur réseau). L'erreur de saisie est le .form-error interne.
    function initNewsletterForms() {
        document.querySelectorAll('form.newsletter-form').forEach((form) => {
            const box = form.parentElement;
            const email = form.querySelector('input[type="email"]');
            const inputError = form.querySelector('.form-error');
            const success = Array.from(box.children).find((el) => el.classList.contains('form-success'));
            const networkError = Array.from(box.children).find((el) => el !== form && el.classList.contains('form-error'));
            const submitBtn = form.querySelector('.form-submit');
            if (!email || !success || !submitBtn) return;

            form.addEventListener('submit', (e) => {
                e.preventDefault();

                email.classList.remove('is-invalid');
                if (inputError) inputError.classList.remove('is-visible');
                if (networkError) networkError.classList.remove('is-visible');

                if (!emailRegex.test(email.value.trim())) {
                    email.classList.add('is-invalid');
                    if (inputError) inputError.classList.add('is-visible');
                    return;
                }

                submitBtn.disabled = true;

                // Inscription envoyée à MailerLite (formulaire intégré, simple opt-in)
                const data = new FormData();
                data.append('fields[email]', email.value.trim());
                const source = form.querySelector('input[name="source"]');
                if (source) data.append('fields[origine]', source.value);
                data.append('ml-submit', '1');
                data.append('anticsrf', 'true');

                fetch(form.action, { method: 'POST', body: data })
                    .then((response) => response.json())
                    .then((result) => {
                        if (!result || !result.success) throw new Error('mailerlite');
                        form.style.display = 'none';
                        success.classList.add('is-visible');
                    })
                    .catch(() => {
                        if (networkError) networkError.classList.add('is-visible');
                        submitBtn.disabled = false;
                    });
            });

            email.addEventListener('input', () => {
                email.classList.remove('is-invalid');
                if (inputError) inputError.classList.remove('is-visible');
            });
        });
    }

    // --- Vidéos : façade légère, le lecteur YouTube n'est chargé qu'au clic ---
    function initVideos() {
        document.querySelectorAll('.yt-facade').forEach((facade) => {
            const id = facade.dataset.yt;
            if (!id) return;

            // Miniature absente (vidéo privée ou encore en traitement) : YouTube renvoie
            // une image grise de 120 px ; on garde alors le fond noir et le bouton.
            const img = facade.querySelector('img');
            const checkThumb = () => { if (img.naturalWidth && img.naturalWidth <= 120) img.hidden = true; };
            if (img) {
                if (img.complete) checkThumb();
                else img.addEventListener('load', checkThumb, { once: true });
                img.addEventListener('error', () => { img.hidden = true; }, { once: true });
                if (img.complete && !img.naturalWidth) img.hidden = true;
            }

            facade.addEventListener('click', (event) => {
                event.preventDefault();
                const iframe = document.createElement('iframe');
                iframe.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?autoplay=1&rel=0';
                iframe.title = facade.dataset.title || '';
                iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
                iframe.allowFullscreen = true;
                iframe.setAttribute('frameborder', '0');

                // Un seul son à la fois : l'ambiance s'arrête (sans changer la préférence du visiteur)
                const ambient = document.getElementById('ambient-audio');
                if (ambient && !ambient.paused) ambient.pause();

                facade.replaceWith(iframe);
                iframe.focus();
            });
        });
    }

    function initPage() {
        initMenu();
        setActiveNavLink();
        initReveal();
        initContactForm();
        initNewsletterForms();
        initVideos();
        initCables();
        initScopes();
        initProgress();
    }

    /* =====================================================
       2. IMMERSION SONORE (initialisée une seule fois)
       Par défaut le son est activé dès l'arrivée sur le site. Si le visiteur l'arrête,
       ce choix est gardé pour ses prochaines visites (localStorage). Les navigateurs
       bloquent souvent le son avant toute interaction : la lecture démarre alors au
       premier clic ou à la première touche. Le bouton affiche l'état réel : violet et
       onde fixe à l'arrêt, cyan et onde animée en lecture.
       ===================================================== */

    const store = {
        get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
        set(key, value) { try { localStorage.setItem(key, value); } catch (e) { } },
        getSession(key) { try { return sessionStorage.getItem(key); } catch (e) { return null; } },
        setSession(key, value) { try { sessionStorage.setItem(key, value); } catch (e) { } }
    };

    function initSound() {
        const soundToggle = document.getElementById('sound-toggle');
        const ambientAudio = document.getElementById('ambient-audio');
        if (!soundToggle || !ambientAudio) return;

        const VOLUME = 0.5;
        const wantsSound = () => store.get('modulr-sound') !== 'off';

        // Le bouton suit la lecture réelle, dans la langue de la page affichée
        const render = () => {
            const playing = !ambientAudio.paused;
            const en = isEnglish();
            soundToggle.setAttribute('aria-pressed', playing ? 'true' : 'false');
            soundToggle.setAttribute('aria-label', playing
                ? (en ? 'Turn off ambient sound' : "Couper l'immersion sonore")
                : (en ? 'Turn on ambient sound' : "Activer l'immersion sonore"));
            soundToggle.setAttribute('title', en ? 'ambient sound' : 'immersion sonore');
        };
        ambientAudio.addEventListener('play', render);
        ambientAudio.addEventListener('pause', render);
        document.addEventListener('modulr:page', render);

        // Montée progressive du volume, pour une arrivée en douceur
        const fadeIn = () => {
            ambientAudio.volume = 0;
            const start = performance.now();
            const step = (now) => {
                const k = Math.max(0, Math.min((now - start) / 1500, 1));
                ambientAudio.volume = VOLUME * k;
                if (k < 1 && !ambientAudio.paused) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
        };
        const play = () => ambientAudio.play().then(fadeIn);

        // Après un rechargement complet (retour sur le site, lien externe…), reprend la boucle
        // là où elle en était
        const savedTime = parseFloat(store.getSession('modulr-sound-time') || '0');
        if (savedTime > 0) {
            ambientAudio.addEventListener('loadedmetadata', () => {
                if (ambientAudio.duration) ambientAudio.currentTime = savedTime % ambientAudio.duration;
            }, { once: true });
        }

        // Lecture bloquée par le navigateur : on démarre au premier geste
        // (sauf un clic sur le bouton lui-même, qui gère son propre état)
        const startOnFirstGesture = () => {
            const onGesture = (event) => {
                if (soundToggle.contains(event.target)) return;
                document.removeEventListener('pointerdown', onGesture, true);
                document.removeEventListener('keydown', onGesture, true);
                if (wantsSound() && ambientAudio.paused) play().catch(() => { });
            };
            document.addEventListener('pointerdown', onGesture, true);
            document.addEventListener('keydown', onGesture, true);
        };

        render();
        if (wantsSound()) play().catch(startOnFirstGesture);

        soundToggle.addEventListener('click', () => {
            if (!ambientAudio.paused) {
                ambientAudio.pause();
                store.set('modulr-sound', 'off');
            } else {
                store.set('modulr-sound', 'on');
                play().catch(() => { });
            }
        });

        // Un clic dans une vidéo intégrée (YouTube) lui donne le focus : on coupe l'ambiance
        // pour ne pas jouer deux sons à la fois. La préférence du visiteur n'est pas modifiée.
        window.addEventListener('blur', () => {
            setTimeout(() => {
                const active = document.activeElement;
                if (active && active.tagName === 'IFRAME' && !ambientAudio.paused) ambientAudio.pause();
            }, 0);
        });

        window.addEventListener('pagehide', () => {
            store.setSession('modulr-sound-time', String(ambientAudio.currentTime || 0));
            ambientAudio.pause();
        });

        // Retour arrière depuis le cache du navigateur : on relance si le son était voulu
        window.addEventListener('pageshow', (event) => {
            if (event.persisted && wantsSound() && ambientAudio.paused) play().catch(startOnFirstGesture);
        });
    }

    /* =====================================================
       3. NAVIGATION SANS RECHARGEMENT
       Un clic sur un lien interne charge la page suivante en arrière-plan et remplace le
       contenu affiché, sans toucher au bouton son ni au lecteur audio : la musique continue.
       Adresse, retour arrière, titre, langue et statistiques suivent normalement.
       En cas de problème, on bascule sur une navigation classique.
       ===================================================== */

    function initNavigation() {
        if (!window.fetch || !window.DOMParser || !window.history || !history.pushState) return;
        if (window.location.protocol === 'file:') return;

        const PERSISTENT = ['sound-toggle', 'ambient-audio', 'consent-banner'];
        let navToken = 0;
        let currentPath = window.location.pathname;

        if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
        const rememberScroll = () => {
            history.replaceState(Object.assign({}, history.state, { modulr: true, scrollY: window.scrollY }), '');
        };
        rememberScroll();

        const isPageLink = (link, event) => {
            if (!link || !link.href) return false;
            if (event.defaultPrevented || event.button !== 0) return false;
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
            if (link.target && link.target !== '_self') return false;
            if (link.hasAttribute('download') || link.hasAttribute('data-no-swap')) return false;
            const url = new URL(link.href, window.location.href);
            if (url.origin !== window.location.origin) return false;
            if (!/(\/|\.html)$/.test(url.pathname)) return false;
            if (url.pathname === window.location.pathname && url.hash) return false;
            return true;
        };

        const swap = (doc) => {
            document.title = doc.title;
            if (doc.documentElement.lang) document.documentElement.lang = doc.documentElement.lang;

            const keep = PERSISTENT.map((id) => document.getElementById(id)).filter(Boolean);
            const fresh = document.createDocumentFragment();
            Array.from(doc.body.childNodes).forEach((node) => {
                if (node.nodeType === 1 && PERSISTENT.includes(node.id)) return;
                fresh.appendChild(document.importNode(node, true));
            });
            Array.from(document.body.childNodes).forEach((node) => {
                if (!keep.includes(node)) node.remove();
            });
            document.body.appendChild(fresh);

            const description = doc.querySelector('meta[name="description"]');
            const current = document.querySelector('meta[name="description"]');
            if (description && current) current.setAttribute('content', description.getAttribute('content'));
        };

        const focusNewPage = () => {
            const target = document.querySelector('main h1') || document.querySelector('main');
            if (!target) return;
            if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
            target.focus({ preventScroll: true });
        };

        const pageView = () => {
            if (typeof window.gtag === 'function') {
                window.gtag('event', 'page_view', {
                    page_location: window.location.href,
                    page_path: window.location.pathname,
                    page_title: document.title
                });
            }
        };

        async function navigate(href, { push = true, scrollY = 0 } = {}) {
            const token = ++navToken;
            const target = new URL(href, window.location.href);
            // Fondu de sortie, pendant que la page suivante se charge
            const leaving = document.querySelector('main');
            if (leaving && !reduceMotion()) leaving.classList.add('is-leaving');
            try {
                const [response] = await Promise.all([
                    fetch(target.href, { headers: { 'Accept': 'text/html' } }),
                    new Promise((resolve) => setTimeout(resolve, reduceMotion() ? 0 : 220))
                ]);
                const type = response.headers.get('content-type') || '';
                if (!response.ok || !type.includes('text/html')) throw new Error('page');
                const html = await response.text();
                if (token !== navToken) return;

                const doc = new DOMParser().parseFromString(html, 'text/html');
                // Pages de redirection (anciennes adresses) : le navigateur s'en charge
                if (doc.querySelector('meta[http-equiv="refresh"]')) throw new Error('redirect');

                const finalUrl = new URL(response.url || target.href);
                finalUrl.hash = target.hash;
                if (push) history.pushState({ modulr: true, scrollY: 0 }, '', finalUrl.href);

                // Statistiques : seulement sur les pages qui les prévoient (pages françaises, consent.js),
                // et seulement si le visiteur a accepté (window.gtag n'existe qu'après son accord)
                const tracked = !!doc.querySelector('script[src*="consent.js"]');

                swap(doc);
                currentPath = window.location.pathname;
                // Fondu d'entrée de la nouvelle page
                const entering = document.querySelector('main');
                if (entering && !reduceMotion()) {
                    entering.classList.add('is-entering');
                    requestAnimationFrame(() => requestAnimationFrame(() => entering.classList.remove('is-entering')));
                }
                initPage();
                document.dispatchEvent(new Event('modulr:page'));

                const anchor = finalUrl.hash ? document.getElementById(decodeURIComponent(finalUrl.hash.slice(1))) : null;
                if (anchor) anchor.scrollIntoView();
                else window.scrollTo(0, scrollY);

                focusNewPage();
                if (tracked) pageView();
            } catch (error) {
                if (leaving) leaving.classList.remove('is-leaving');
                if (token === navToken) window.location.assign(target.href);
            }
        }

        document.addEventListener('click', (event) => {
            const link = event.target.closest('a');
            if (!isPageLink(link, event)) return;
            event.preventDefault();
            rememberScroll();
            navigate(link.href);
        });

        window.addEventListener('popstate', (event) => {
            // Simple changement d'ancre sur la même page : le navigateur gère
            if (window.location.pathname === currentPath) return;
            const scrollY = event.state && typeof event.state.scrollY === 'number' ? event.state.scrollY : 0;
            navigate(window.location.href, { push: false, scrollY });
        });

        window.addEventListener('pagehide', () => {
            if ('scrollRestoration' in history) history.scrollRestoration = 'auto';
        });

        // Sélecteur FR / EN : même principe, sans couper le son
        if (typeof window.toEnglishPath === 'function' && typeof window.toFrenchPath === 'function') {
            window.switchLang = function (targetLang) {
                store.set('modulr-lang', targetLang);
                const path = window.location.pathname;
                const onEnglishPage = path.indexOf('/en/') === 0 || path === '/en';
                let destination = null;
                if (targetLang === 'en' && !onEnglishPage) destination = window.toEnglishPath(path);
                else if (targetLang === 'fr' && onEnglishPage) destination = window.toFrenchPath(path);
                if (!destination) return;
                rememberScroll();
                navigate(destination);
            };
        }
    }


    /* =====================================================
       4. IMMERSION VISUELLE
       Trois effets discrets, tous désactivés si le visiteur demande moins
       d'animations (prefers-reduced-motion) :
       - les câbles des schémas se tracent quand le schéma arrive à l'écran ;
       - une trace d'oscilloscope (accueil et pied de page) suit la nappe sonore,
         et ondule lentement quand le son est coupé ;
       - une fine barre de lecture sur les pages longues (leçons, histoire, fiches).
       ===================================================== */

    const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cssVar = (name, fallback) => {
        const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        return value || fallback;
    };

    // --- Les câbles des schémas se tracent ---
    function initCables() {
        if (reduceMotion() || !('IntersectionObserver' in window)) return;
        const schemas = document.querySelectorAll('main svg[role="img"]');
        if (!schemas.length) return;
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                observer.unobserve(entry.target);
                entry.target.querySelectorAll('[data-cable]').forEach((path, i) => {
                    path.style.transition = `stroke-dashoffset 0.9s ease ${0.15 + i * 0.25}s`;
                    path.style.strokeDashoffset = '0';
                });
            });
        }, { threshold: 0.35 });
        schemas.forEach((svg) => {
            const cables = Array.from(svg.querySelectorAll('path')).filter((p) => {
                const style = p.getAttribute('style') || '';
                return style.includes('fill:none') && style.includes('--color-accent');
            });
            if (!cables.length) return;
            cables.forEach((path) => {
                let length = 0;
                try { length = path.getTotalLength(); } catch (e) { return; }
                if (!length) return;
                path.setAttribute('data-cable', '');
                path.style.strokeDasharray = `${length}`;
                path.style.strokeDashoffset = `${length}`;
            });
            observer.observe(svg);
        });
    }

    // --- Oscilloscope ---
    const scope = { canvases: [], visible: new Set(), analyser: null, ctx: null, data: null, smooth: null, mix: 0, running: false, observer: null };

    function connectAnalyser() {
        const audio = document.getElementById('ambient-audio');
        if (!audio || scope.analyser || !(window.AudioContext || window.webkitAudioContext)) return;
        try {
            if (!scope.ctx) scope.ctx = new (window.AudioContext || window.webkitAudioContext)();
            scope.ctx.resume().then(() => {
                // On ne branche le son sur l'analyseur que si le contexte tourne vraiment :
                // sinon la nappe deviendrait muette.
                if (scope.analyser || scope.ctx.state !== 'running') return;
                const source = scope.ctx.createMediaElementSource(audio);
                const analyser = scope.ctx.createAnalyser();
                analyser.fftSize = 2048;
                source.connect(analyser);
                analyser.connect(scope.ctx.destination);
                scope.analyser = analyser;
                scope.data = new Float32Array(analyser.fftSize);
                scope.smooth = new Float32Array(256);
            }).catch(() => { });
        } catch (e) { scope.analyser = null; }
    }

    function initSoundScope() {
        const audio = document.getElementById('ambient-audio');
        if (!audio) return;
        audio.addEventListener('play', () => {
            connectAnalyser();
            if (scope.ctx && scope.ctx.state !== 'running') scope.ctx.resume().catch(() => { });
        });
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && scope.ctx && scope.ctx.state !== 'running' && !audio.paused) scope.ctx.resume().catch(() => { });
            if (!document.hidden) startScope();
        });
    }

    function makeScope(parent, before, className) {
        const canvas = document.createElement('canvas');
        canvas.className = 'scope ' + className;
        canvas.setAttribute('aria-hidden', 'true');
        parent.insertBefore(canvas, before);
        return canvas;
    }

    function initScopes() {
        if (scope.observer) scope.observer.disconnect();
        scope.canvases = [];
        scope.visible.clear();
        if (!window.HTMLCanvasElement) return;

        const isHome = /^\/(en\/)?$/.test(window.location.pathname);
        const heroActions = document.querySelector('.hero-actions');
        if (isHome && heroActions) scope.canvases.push(makeScope(heroActions.parentNode, heroActions.nextSibling, 'scope--hero'));
        const footer = document.querySelector('footer.footer');
        if (footer) scope.canvases.push(makeScope(footer, footer.firstChild, 'scope--footer'));
        if (!scope.canvases.length) return;

        if (reduceMotion()) { scope.canvases.forEach((c) => drawScope(c, 0)); return; }

        scope.observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) scope.visible.add(entry.target); else scope.visible.delete(entry.target);
            });
            startScope();
        });
        scope.canvases.forEach((c) => scope.observer.observe(c));
    }

    function sizeCanvas(canvas) {
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const w = Math.round(canvas.clientWidth * ratio);
        const h = Math.round(canvas.clientHeight * ratio);
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
        return ratio;
    }

    function drawScope(canvas, time) {
        const ratio = sizeCanvas(canvas);
        const g = canvas.getContext('2d');
        const w = canvas.width, h = canvas.height;
        if (!w || !h) return;
        g.clearRect(0, 0, w, h);

        const points = 256;
        const live = scope.mix;
        const t = time / 1000;
        g.beginPath();
        for (let i = 0; i < points; i++) {
            const x = i / (points - 1);
            // Repos : une onde lente, presque immobile
            const idle = Math.sin(x * Math.PI * 4 + t * 0.6) * (0.5 + 0.5 * Math.sin(t * 0.25 + x * 3)) * 0.28;
            const sound = scope.smooth ? scope.smooth[i] : 0;
            const y = idle * (1 - live) + sound * live;
            const px = x * w;
            const py = h / 2 - y * (h / 2 - 2 * ratio);
            if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        const accent = cssVar('--color-accent', '#00B8D9');
        g.strokeStyle = live > 0.5 ? accent : cssVar('--color-border', 'rgba(10,10,10,0.15)');
        g.globalAlpha = live > 0.5 ? 0.4 + 0.6 * live : 1;
        g.lineWidth = 1.5 * ratio;
        g.lineJoin = 'round';
        g.stroke();
        g.globalAlpha = 1;
    }

    function startScope() {
        if (scope.running || document.hidden || !scope.visible.size || reduceMotion()) return;
        scope.running = true;
        const audio = document.getElementById('ambient-audio');
        const frame = (time) => {
            if (document.hidden || !scope.visible.size) { scope.running = false; return; }
            const playing = audio && !audio.paused && scope.analyser;
            // Passage en douceur entre l'onde au repos et la trace du son
            scope.mix += ((playing ? 1 : 0) - scope.mix) * 0.03;
            if (playing) {
                scope.analyser.getFloatTimeDomainData(scope.data);
                const step = scope.data.length / scope.smooth.length;
                let peak = 0;
                for (let i = 0; i < scope.data.length; i++) peak = Math.max(peak, Math.abs(scope.data[i]));
                const gain = peak > 0.001 ? Math.min(0.85 / peak, 12) : 0;
                for (let i = 0; i < scope.smooth.length; i++) {
                    const v = scope.data[Math.floor(i * step)] * gain;
                    scope.smooth[i] += (v - scope.smooth[i]) * 0.15;
                }
            }
            scope.visible.forEach((canvas) => drawScope(canvas, time));
            requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
    }


    // --- Ouverture de l'accueil : le rideau ---
    function initIntro() {
        const root = document.documentElement;
        if (!root.classList.contains('intro')) return;

        const curtain = document.createElement('div');
        curtain.className = 'intro-curtain';
        curtain.setAttribute('aria-hidden', 'true');
        // Un seul voile, une seule toile : pas de raccord au centre
        const veil = document.createElement('div');
        veil.className = 'intro-veil';
        const canvas = document.createElement('canvas');
        veil.appendChild(canvas);
        curtain.appendChild(veil);
        const mark = document.createElement('div');
        mark.className = 'intro-mark';
        mark.textContent = 'modulr lab';
        curtain.appendChild(mark);
        document.body.appendChild(curtain);
        root.classList.remove('intro');

        const accent = cssVar('--color-accent', '#00B8D9');
        const waves = [
            { f: 1.5, s: 0.35, a: 0.30, c: accent, o: 0.9 },
            { f: 2.3, s: -0.22, a: 0.20, c: '#FFFFFF', o: 0.35 },
            { f: 3.1, s: 0.18, a: 0.14, c: accent, o: 0.45 },
            { f: 0.9, s: -0.12, a: 0.38, c: '#FFFFFF', o: 0.18 },
            { f: 4.2, s: 0.27, a: 0.08, c: accent, o: 0.3 }
        ];
        const start = performance.now();
        const OPEN_AT = 2200, OPEN_FOR = 2200;
        let opened = false, done = false;

        const draw = (now) => {
            if (done) return;
            const t = (now - start) / 1000;
            const fadeIn = Math.min(t / 0.9, 1);
            const ratio = Math.min(window.devicePixelRatio || 1, 2);
            const W = window.innerWidth * ratio, H = window.innerHeight * ratio;
            {
                const w = W;
                if (canvas.width !== w || canvas.height !== H) { canvas.width = w; canvas.height = H; }
                const g = canvas.getContext('2d');
                g.clearRect(0, 0, w, H);
                const offset = 0;
                waves.forEach((wave, k) => {
                    g.beginPath();
                    for (let x = 0; x <= w; x += 3 * ratio) {
                        const gx = (x - offset) / W;
                        const env = Math.sin(Math.PI * gx);
                        const breathe = 0.75 + 0.25 * Math.sin(t * 0.8 + k);
                        const y = H / 2 + Math.sin(gx * Math.PI * 2 * wave.f + t * wave.s * 6 + k) * wave.a * H * 0.5 * env * breathe;
                        if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
                    }
                    g.strokeStyle = wave.c;
                    g.globalAlpha = wave.o * fadeIn;
                    g.lineWidth = 1.5 * ratio;
                    g.stroke();
                });
                g.globalAlpha = 1;
            }
            requestAnimationFrame(draw);
        };
        requestAnimationFrame(draw);

        const open = () => {
            if (opened) return;
            opened = true;
            curtain.classList.add('is-open');
            setTimeout(() => { done = true; curtain.remove(); }, OPEN_FOR + 100);
            ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => window.removeEventListener(ev, open));
        };
        setTimeout(open, OPEN_AT);
        // Le visiteur pressé ouvre le rideau d'un geste
        ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => window.addEventListener(ev, open, { passive: true }));
    }

    // --- Barre de lecture ---
    let progressBound = false;
    function initProgress() {
        const old = document.getElementById('reading-progress');
        if (old) old.remove();
        if (/^\/(en\/)?$/.test(window.location.pathname)) return;
        if (!document.querySelector('main article, main .note-title')) return;
        const bar = document.createElement('div');
        bar.id = 'reading-progress';
        bar.className = 'reading-progress';
        bar.setAttribute('aria-hidden', 'true');
        document.body.appendChild(bar);
        const update = () => {
            const el = document.getElementById('reading-progress');
            if (!el) return;
            const max = document.documentElement.scrollHeight - window.innerHeight;
            el.style.transform = `scaleX(${max > 0 ? Math.min(window.scrollY / max, 1) : 0})`;
        };
        update();
        if (!progressBound) {
            progressBound = true;
            window.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
            window.addEventListener('resize', update, { passive: true });
        }
    }

    initIntro();
    initPage();
    initSound();
    initSoundScope();
    initNavigation();
})();
