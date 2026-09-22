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

                fetch(form.action, {
                    method: 'POST',
                    body: new FormData(form),
                    headers: { 'Accept': 'application/json' }
                })
                    .then((response) => {
                        if (!response.ok) throw new Error('formspree');
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

    function initPage() {
        initMenu();
        setActiveNavLink();
        initReveal();
        initContactForm();
        initNewsletterForms();
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

        const PERSISTENT = ['sound-toggle', 'ambient-audio'];
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
            try {
                const response = await fetch(target.href, { headers: { 'Accept': 'text/html' } });
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

                // Statistiques : seulement si la page chargée les inclut elle-même (pages françaises)
                const tracked = !!doc.querySelector('script[src*="googletagmanager.com"]');

                swap(doc);
                currentPath = window.location.pathname;
                initPage();
                document.dispatchEvent(new Event('modulr:page'));

                const anchor = finalUrl.hash ? document.getElementById(decodeURIComponent(finalUrl.hash.slice(1))) : null;
                if (anchor) anchor.scrollIntoView();
                else window.scrollTo(0, scrollY);

                focusNewPage();
                if (tracked) pageView();
            } catch (error) {
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

    initPage();
    initSound();
    initNavigation();
})();
