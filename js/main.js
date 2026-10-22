/* =========================================================
   MODULR LAB — main.js
   Menu burger, lien actif, animations au scroll, formulaires,
   immersion sonore, et navigation sans rechargement pour que
   le son continue d'une page à l'autre.
   ========================================================= */

(function () {
    'use strict';

    const isEnglish = () => document.documentElement.lang === 'en';
    // Dossier des scripts du site (pour charger instrument.js à la demande)
    const scriptBase = document.currentScript && document.currentScript.src
        ? document.currentScript.src.replace(/[^/]*$/, '')
        : null;
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

        // La barre du navigateur (téléphone) passe au noir avec le menu, puis reprend sa couleur
        const setBarColor = (color) => {
            let meta = document.querySelector('meta[name="theme-color"]');
            if (!meta) {
                meta = document.createElement('meta');
                meta.name = 'theme-color';
                meta.content = '#0A0A0A';
                document.head.appendChild(meta);
            }
            if (color) {
                if (!meta.dataset.pageColor) meta.dataset.pageColor = meta.content;
                meta.content = color;
            } else if (meta.dataset.pageColor) {
                meta.content = meta.dataset.pageColor;
                delete meta.dataset.pageColor;
            }
        };

        const close = (returnFocus) => {
            const wasOpen = menuOverlay.classList.contains('is-open');
            if (wasOpen) setBarColor(null);
            menuOverlay.classList.remove('is-open');
            menuOverlay.setAttribute('inert', '');
            menuOverlay.setAttribute('aria-hidden', 'true');
            burger.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
            if (wasOpen && returnFocus === true) burger.focus();
        };

        burger.addEventListener('click', () => {
            menuOverlay.classList.add('is-open');
            menuOverlay.removeAttribute('inert');
            menuOverlay.setAttribute('aria-hidden', 'false');
            burger.setAttribute('aria-expanded', 'true');
            document.body.style.overflow = 'hidden';
            setBarColor('#0A0A0A');
            menuClose.focus();
        });
        menuClose.addEventListener('click', () => close(true));
        menuOverlay.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => close(false)));
        // Échap ferme le menu (un seul écouteur pour tout le site, le menu change à chaque page)
        menuState.close = close;
        if (!menuState.bound) {
            menuState.bound = true;
            document.addEventListener('keydown', (event) => {
                if (event.key === 'Escape' && menuState.close) menuState.close(true);
            });
        }
    }
    const menuState = { close: null, bound: false };

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

    // Là où le CSS pilote les apparitions par le défilement (animation-timeline: view()), rien à faire ici
    const cssReveal = !!(window.CSS && CSS.supports && CSS.supports('animation-timeline: view()'));
    const cssProgress = !!(window.CSS && CSS.supports && CSS.supports('animation-timeline: scroll()'));

    function initReveal() {
        if (revealObserver) revealObserver.disconnect();
        if (cssReveal) return;
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


                facade.replaceWith(iframe);
                iframe.focus();
            });
        });
    }

    // --- Schéma des fiches : quand il déborde, un dégradé à droite et « faites glisser → » ---
    // La mention disparaît au premier défilement ; le dégradé, une fois au bout.
    let figureObservers = [];
    function initFigureScroll() {
        figureObservers.forEach((o) => o.disconnect());
        figureObservers = [];
        document.querySelectorAll('.patch-figure-frame').forEach((frame) => {
            const scroller = frame.querySelector('.patch-figure-scroll');
            if (!scroller) return;
            const update = () => {
                const over = scroller.scrollWidth > scroller.clientWidth + 1;
                frame.classList.toggle('is-overflowing', over);
                frame.classList.toggle('is-end', over && scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 2);
            };
            scroller.addEventListener('scroll', () => {
                if (scroller.scrollLeft > 8) frame.classList.add('is-scrolled');
                update();
            }, { passive: true });
            if ('ResizeObserver' in window) {
                const ro = new ResizeObserver(update);
                ro.observe(scroller);
                figureObservers.push(ro);
            } else window.addEventListener('resize', update, { passive: true });
            update();
        });
    }

    function initPage() {
        initMenu();
        setActiveNavLink();
        initReveal();
        initContactForm();
        initNewsletterForms();
        initVideos();
        initFigureScroll();
        initCables();
        initScopes();
        initProgress();
        initLessonProgress();
        initInstrument();
        initToc();
    }

    // --- Instrument de l'accueil : chargé seulement sur la page qui le contient ---
    function initInstrument() {
        if (!document.querySelector('[data-instrument]')) return;
        if (window.modulrInstrument) { window.modulrInstrument.sync(); return; }
        if (!scriptBase || document.getElementById('instrument-script')) return;
        const script = document.createElement('script');
        script.id = 'instrument-script';
        script.src = scriptBase + 'instrument.js';
        document.head.appendChild(script);
    }

    // --- Progression du cours : les leçons ouvertes, mémorisées dans ce navigateur seulement ---
    const LESSONS = ['intro', 'son-et-harmonique', 'les-modules', 'controle-en-tension'];

    function initLessonProgress() {
        let seen = [];
        try { seen = JSON.parse(store.get('modulr-progress') || '[]'); } catch (e) { seen = []; }
        if (!Array.isArray(seen)) seen = [];

        const match = window.location.pathname.match(/\/le-cours\/([^/]+)\/?$/);
        if (match && LESSONS.includes(match[1]) && !seen.includes(match[1])) {
            seen.push(match[1]);
            store.set('modulr-progress', JSON.stringify(seen));
        }

        document.querySelectorAll('[data-lesson]').forEach((link) => {
            link.classList.toggle('is-seen', seen.includes(link.getAttribute('data-lesson')));
        });

        const resume = document.querySelector('[data-resume]');
        const next = LESSONS.find((lesson) => !seen.includes(lesson));
        if (resume && seen.length && next) {
            resume.setAttribute('href', resume.getAttribute('href').replace(/intro\/$/, next + '/'));
            resume.textContent = (resume.getAttribute('data-resume-label') || '→ ') + (LESSONS.indexOf(next) + 1);
        }
    }

    /* =====================================================
       2. MÉMOIRE DU NAVIGATEUR
       Ce que le site retient d'une visite à l'autre (langue, leçons ouvertes),
       dans ce navigateur seulement. Il n'y a plus d'ambiance sonore : le son du
       site, ce sont les racks.
       ===================================================== */

    const store = {
        get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
        set(key, value) { try { localStorage.setItem(key, value); } catch (e) { } },
        getSession(key) { try { return sessionStorage.getItem(key); } catch (e) { return null; } },
        setSession(key, value) { try { sessionStorage.setItem(key, value); } catch (e) { } }
    };

    /* =====================================================
       3. NAVIGATION SANS RECHARGEMENT
       Un clic sur un lien interne charge la page suivante en arrière-plan et remplace le
       contenu affiché ; le bandeau des cookies et le bouton de remontée restent en place.
       Adresse, retour arrière, titre, langue et statistiques suivent normalement.
       En cas de problème, on bascule sur une navigation classique.
       ===================================================== */

    // L'ouverture de l'accueil : déjà là si la visite a commencé sur l'accueil, sinon on la charge
    function replayIntro() {
        const play = () => { if (window.modulrIntro) window.modulrIntro.play({ force: true }); };
        if (window.modulrIntro) { play(); return; }
        const own = document.querySelector('script[src*="main.js"]');
        const script = document.createElement('script');
        script.src = own ? new URL('intro.js', own.src).href : 'js/intro.js';
        script.onload = play;
        document.head.appendChild(script);
    }

    function initNavigation() {
        if (!window.fetch || !window.DOMParser || !window.history || !history.pushState) return;
        if (window.location.protocol === 'file:') return;

        const PERSISTENT = ['consent-banner', 'to-top'];
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
            document.body.className = doc.body.className;
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

            const theme = doc.querySelector('meta[name="theme-color"]');
            let currentTheme = document.querySelector('meta[name="theme-color"]');
            if (!currentTheme) {
                currentTheme = document.createElement('meta');
                currentTheme.name = 'theme-color';
                document.head.appendChild(currentTheme);
            }
            currentTheme.content = theme ? theme.content : '#0A0A0A';
            delete currentTheme.dataset.pageColor;

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

        // Le point cyan d'un titre (.title-dot) visible à l'écran : celui qui « voyage » d'une page à l'autre
        const dotOnScreen = () => Array.from(document.querySelectorAll('main .title-dot')).find((dot) => {
            const r = dot.getBoundingClientRect();
            return r.width > 0 && r.bottom > 0 && r.top < window.innerHeight;
        });
        const clearSignal = () => document.querySelectorAll('.title-dot.is-signal').forEach((dot) => dot.classList.remove('is-signal'));

        async function navigate(href, { push = true, scrollY = 0 } = {}) {
            const token = ++navToken;
            const target = new URL(href, window.location.href);
            // Transition native là où elle existe (le contenu change à l'intérieur de startViewTransition) ;
            // ailleurs, le fondu de sortie pendant que la page suivante se charge, puis le fondu d'entrée.
            // Moins d'animations demandées : ni l'une ni l'autre.
            const native = !reduceMotion() && typeof document.startViewTransition === 'function';
            const fade = !reduceMotion() && !native;
            const fading = () => Array.from(document.querySelectorAll('main, body > .site-header, body > .footer'));
            const leaving = fading();
            if (fade) leaving.forEach((el) => el.classList.add('is-leaving'));
            try {
                const [response] = await Promise.all([
                    fetch(target.href, { headers: { 'Accept': 'text/html' } }),
                    new Promise((resolve) => setTimeout(resolve, fade ? 240 : 0))   // 240 ms : --dur-enter
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

                // Tout le site est noir aujourd'hui : ce cas ne se présente plus, mais il reste prêt
                // si une page change un jour de fond (le texte attend alors que le fond ait glissé)
                const themeChanges = document.body.classList.contains('page-home') !== doc.body.classList.contains('page-home');

                const anchorId = finalUrl.hash ? decodeURIComponent(finalUrl.hash.slice(1)) : '';
                const show = () => {
                    swap(doc);
                    currentPath = window.location.pathname;
                    // Fondu d'entrée de la nouvelle page (le fond, lui, glisse du noir au blanc ou l'inverse)
                    // Quand le fond change de couleur, le texte attend qu'il ait fini de glisser
                    if (fade) {
                        const entering = fading();
                        entering.forEach((el) => el.classList.add('is-entering'));
                        const reveal = () => entering.forEach((el) => el.classList.remove('is-entering'));
                        requestAnimationFrame(() => requestAnimationFrame(() => {
                            if (themeChanges) setTimeout(reveal, 280); else reveal();
                        }));
                    }
                    initPage();
                    document.dispatchEvent(new Event('modulr:page'));

                    const anchor = anchorId ? document.getElementById(anchorId) : null;
                    if (anchor) anchor.scrollIntoView();
                    else window.scrollTo(0, scrollY);

                    focusNewPage();
                };

                if (native) {
                    // Le point cyan voyage seulement s'il est à l'écran au départ et attendu à l'arrivée
                    // (haut de la page suivante) : un seul couple de noms « signal » à la fois.
                    clearSignal();
                    const from = !anchorId && !scrollY && doc.querySelector('main .title-dot') ? dotOnScreen() : null;
                    if (from) from.classList.add('is-signal');
                    const transition = document.startViewTransition(() => {
                        show();
                        const to = from ? dotOnScreen() : null;
                        if (to) {
                            to.classList.add('is-signal');
                            // Son titre est déjà là quand le point arrive : pas de seconde apparition
                            const title = to.closest('.reveal');
                            if (title) title.classList.add('is-visible', 'is-arrived');
                        }
                    });
                    // Une transition remplacée par la suivante (clic rapide) : rien à signaler
                    transition.ready.catch(() => { });
                    transition.finished.then(clearSignal, clearSignal);
                    await transition.updateCallbackDone;
                } else show();

                if (tracked) pageView();
            } catch (error) {
                leaving.forEach((el) => el.classList.remove('is-leaving'));
                if (token === navToken) window.location.assign(target.href);
            }
        }

        document.addEventListener('click', (event) => {
            const link = event.target.closest('a');
            // Sur l'accueil, le logo rejoue l'ouverture (js/intro.js, chargé à la demande)
            if (link && link.classList.contains('logo-link') && document.body.classList.contains('page-home') &&
                !event.defaultPrevented && event.button === 0 && !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) {
                event.preventDefault();
                replayIntro();
                return;
            }
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
        const value = getComputedStyle(document.body || document.documentElement).getPropertyValue(name).trim();
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
                    path.style.transition = `stroke-dashoffset var(--dur-cable) var(--ease-signal) ${0.15 + i * 0.25}s`;
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

    // --- Oscilloscope du pied de page : une onde lente, au repos ---
    const scope = { canvases: [], visible: new Set(), running: false, observer: null };

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
        const t = time / 1000;
        g.beginPath();
        for (let i = 0; i < points; i++) {
            const x = i / (points - 1);
            // Une onde lente, presque immobile
            const y = Math.sin(x * Math.PI * 4 + t * 0.6) * (0.5 + 0.5 * Math.sin(t * 0.25 + x * 3)) * 0.28;
            const px = x * w;
            const py = h / 2 - y * (h / 2 - 2 * ratio);
            if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.strokeStyle = cssVar('--color-border', 'rgba(255,255,255,0.16)');
        g.lineWidth = 1.5 * ratio;
        g.lineJoin = 'round';
        g.stroke();
    }

    function startScope() {
        if (scope.running || document.hidden || !scope.visible.size || reduceMotion()) return;
        scope.running = true;
        const frame = (time) => {
            if (document.hidden || !scope.visible.size) { scope.running = false; return; }
            scope.visible.forEach((canvas) => drawScope(canvas, time));
            requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
    }
    // De retour sur l'onglet, l'onde repart
    document.addEventListener('visibilitychange', () => { if (!document.hidden) startScope(); });


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
        // La barre suit le défilement en CSS (animation-timeline: scroll()) : pas d'écouteur
        if (cssProgress) return;
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

    /* =====================================================
       5. SIGNALÉTIQUE : LE SOMMAIRE DU RAIL
       Sur les pages longues, la colonne de gauche devient un sommaire qui reste à
       l'écran : le fil d'Ariane en tête, puis les sections de la page, celle en
       cours en cyan. Il part de la deuxième section, se fixe en haut de l'écran
       et s'arrête avant le pied de page. Ordinateur seulement (voir common.css).
       ===================================================== */

    const toc = { nav: null, items: [], sections: [], bound: false };

    function tocText(node) {
        return node.textContent.replace(/\s+/g, ' ').trim().replace(/[.:]$/, '').trim();
    }

    function slugify(text) {
        return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
    }

    function initToc() {
        const old = document.getElementById('rail-toc');
        if (old) old.remove();
        document.body.classList.remove('has-toc');
        toc.nav = null;
        toc.items = [];

        const sections = Array.from(document.querySelectorAll('main > section'));
        if (sections.length < 3) return;

        // Une entrée par section ; une section qui a plusieurs intertitres en donne un par intertitre
        const entries = [];
        sections.slice(1).forEach((section) => {
            const headings = section.querySelectorAll('h2');
            const label = section.querySelector('.row-grid > .rail-label');
            if (headings.length >= 2) headings.forEach((h) => entries.push({ text: tocText(h), target: h }));
            else if (label && tocText(label)) entries.push({ text: tocText(label), target: section });
        });
        // Seulement pour les pages qui se lisent (leçons, fiches, histoire) : au moins quatre sections
        if (entries.length < 4 || document.body.classList.contains('page-home')) return;
        if (document.documentElement.scrollHeight < window.innerHeight * 2.2) return;

        const used = new Set(Array.from(document.querySelectorAll('[id]')).map((n) => n.id));
        const nav = document.createElement('nav');
        nav.id = 'rail-toc';
        nav.className = 'rail-toc';
        nav.setAttribute('aria-label', isEnglish() ? 'on this page' : 'sur cette page');

        const head = document.createElement('div');
        head.className = 'rail-toc-head';
        // En tête : le fil d'Ariane de la page (ou, à défaut, le libellé de la rubrique)
        const crumbs = sections[0].querySelector('.crumbs ol') || sections[0].querySelector('.row-grid > .rail-label');
        if (crumbs) {
            const wrap = document.createElement('div');
            wrap.className = 'crumbs';
            if (crumbs.tagName === 'OL') wrap.appendChild(crumbs.cloneNode(true));
            else wrap.textContent = crumbs.textContent.trim();
            head.appendChild(wrap);
            head.setAttribute('aria-hidden', 'true');
            nav.appendChild(head);
        }

        const list = document.createElement('ol');
        list.className = 'rail-toc-list';
        entries.forEach((entry) => {
            if (!entry.target.id) {
                let id = slugify(entry.text), n = 2;
                while (used.has(id)) id = slugify(entry.text) + '-' + n++;
                used.add(id);
                entry.target.id = id;
            }
            entry.target.setAttribute('data-toc-target', '');
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = '#' + entry.target.id;
            a.textContent = entry.text;
            a.addEventListener('click', (event) => {
                event.preventDefault();
                entry.target.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
                history.replaceState(history.state, '', '#' + entry.target.id);
                if (!entry.target.hasAttribute('tabindex')) entry.target.setAttribute('tabindex', '-1');
                entry.target.focus({ preventScroll: true });
            });
            li.appendChild(a);
            list.appendChild(li);
            entry.link = a;
        });
        nav.appendChild(list);
        document.body.appendChild(nav);
        document.body.classList.add('has-toc');

        toc.nav = nav;
        toc.items = entries;
        toc.sections = sections;
        updateToc();

        if (!toc.bound) {
            toc.bound = true;
            let ticking = false;
            const onScroll = () => {
                if (ticking) return;
                ticking = true;
                requestAnimationFrame(() => { ticking = false; updateToc(); });
            };
            window.addEventListener('scroll', onScroll, { passive: true });
            window.addEventListener('resize', onScroll, { passive: true });
        }
    }

    function updateToc() {
        const nav = toc.nav;
        if (!nav || !nav.isConnected || getComputedStyle(nav).display === 'none') return;

        // Position : alignée sur le rail, part de la 2e section, se fixe, s'arrête avant le pied de page
        const grid = toc.sections[0].querySelector('.row-grid') || toc.sections[0];
        const railLeft = grid.getBoundingClientRect().left;
        const railWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--rail-width')) || 200;
        const second = toc.sections[1].querySelector('.row-grid') || toc.sections[1];
        // La liste (et non l'en-tête, encore invisible) s'aligne sur la 2e section
        const list = nav.querySelector('.rail-toc-list');
        const start = second.getBoundingClientRect().top + 12 - (list ? list.offsetTop : 0);
        let top = Math.max(40, start);
        const footer = document.querySelector('footer');
        if (footer) top = Math.min(top, footer.getBoundingClientRect().top - nav.offsetHeight - 48);
        nav.style.width = railWidth + 'px';
        nav.style.transform = `translate(${Math.round(railLeft)}px, ${Math.round(top)}px)`;

        // Le fil d'Ariane du sommaire apparaît quand celui de la page est sorti de l'écran
        nav.classList.toggle('show-head', toc.sections[0].getBoundingClientRect().bottom < 40);

        // Section en cours : la dernière dont le haut a passé le tiers de l'écran
        const line = window.innerHeight * 0.35;
        let current = -1;
        toc.items.forEach((item, i) => { if (item.target.getBoundingClientRect().top <= line) current = i; });
        if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) current = toc.items.length - 1;
        toc.items.forEach((item, i) => {
            if (i === current) item.link.setAttribute('aria-current', 'location');
            else item.link.removeAttribute('aria-current');
        });
    }

    // --- Le bouton de remontée reste cliquable quand le bandeau des cookies est affiché ---
    // Tant que le bandeau est là (première visite, avant le choix), le bouton remonte au-dessus ;
    // il redescend dans son coin dès que le bandeau disparaît.
    function initCornerClearance() {
        if (!window.MutationObserver) return;
        const update = () => {
            const banner = document.getElementById('consent-banner');
            const toTop = document.getElementById('to-top');
            if (!toTop) return;
            const r = banner ? banner.getBoundingClientRect() : null;
            if (!r || !r.height) { toTop.style.removeProperty('bottom'); return; }
            toTop.style.bottom = Math.round(window.innerHeight - r.top + 12) + 'px';
        };
        new MutationObserver(update).observe(document.body, { childList: true });
        window.addEventListener('resize', update, { passive: true });
        update();
    }

    // --- Remonter en haut de la page ---
    // Un rond dans le coin, qui n'apparaît qu'après un écran et demi de lecture.
    // Créé une fois pour toutes : il reste en place d'une page à l'autre.
    function initToTop() {
        if (document.getElementById('to-top')) return;
        const button = document.createElement('button');
        button.id = 'to-top';
        button.type = 'button';
        button.className = 'to-top';
        button.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 13V3M3.5 7.5 8 3l4.5 4.5"/></svg>';
        const label = () => {
            const text = isEnglish() ? 'Back to top' : 'Revenir en haut de la page';
            button.setAttribute('aria-label', text);
            button.setAttribute('title', text);
        };
        label();
        document.body.appendChild(button);

        const update = () => {
            button.classList.toggle('is-visible', window.scrollY > window.innerHeight * 1.5);
        };
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => { ticking = false; update(); });
        }, { passive: true });
        document.addEventListener('modulr:page', () => { label(); update(); });

        button.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' });
            // Le clavier repart du titre de la page, pas du bouton
            const title = document.querySelector('main h1') || document.querySelector('main');
            if (title) {
                if (!title.hasAttribute('tabindex')) title.setAttribute('tabindex', '-1');
                title.focus({ preventScroll: true });
            }
        });
        update();
    }

    initPage();
    initToTop();
    initCornerClearance();
    initNavigation();
})();
