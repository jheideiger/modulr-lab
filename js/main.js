/* =========================================================
   MODULR LAB — main.js
   Menu burger, animations au scroll, curseur custom,
   validation formulaires
   ========================================================= */

// --- Menu burger ---
const burger = document.querySelector('.burger');
const menuOverlay = document.getElementById('menu-overlay');
const menuClose = document.querySelector('.menu-close');

if (burger && menuOverlay && menuClose) {
    burger.addEventListener('click', () => {
        menuOverlay.classList.add('is-open');
        menuOverlay.removeAttribute('inert');
        menuOverlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    });

    menuClose.addEventListener('click', () => {
        menuOverlay.classList.remove('is-open');
        menuOverlay.setAttribute('inert', '');
        menuOverlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    });

    menuOverlay.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', () => {
            menuOverlay.classList.remove('is-open');
            menuOverlay.setAttribute('inert', '');
            menuOverlay.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        });
    });
}
function setActiveNavLink() {
  const normalize = (path) => (path.endsWith('/') || path.includes('.') ? path : path + '/');
  const currentPath = normalize(window.location.pathname);
  const navLinks = document.querySelectorAll('.nav-link, .menu-overlay nav a');

  navLinks.forEach(link => {
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

setActiveNavLink();

// --- Animations au scroll (IntersectionObserver) ---
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!prefersReducedMotion) {
    const reveals = document.querySelectorAll('.reveal');

    if (reveals.length > 0) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.15,
            rootMargin: '0px 0px -40px 0px'
        });

        reveals.forEach(el => observer.observe(el));
    }
}

// --- Validation formulaire de contact ---
const contactForm = document.getElementById('contact-form');
const contactSuccess = document.getElementById('form-success');
const contactNetworkError = document.getElementById('form-network-error');

if (contactForm && contactSuccess) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        let isValid = true;

        contactForm.querySelectorAll('.form-input').forEach(input => {
            input.classList.remove('is-invalid');
        });
        contactForm.querySelectorAll('.form-error').forEach(error => {
            error.classList.remove('is-visible');
        });

        const name = contactForm.querySelector('#name');
        if (!name.value.trim()) {
            name.classList.add('is-invalid');
            document.getElementById('name-error').classList.add('is-visible');
            isValid = false;
        }

        const email = contactForm.querySelector('#email');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.value.trim())) {
            email.classList.add('is-invalid');
            document.getElementById('email-error').classList.add('is-visible');
            isValid = false;
        }

        const subject = contactForm.querySelector('#subject');
        if (!subject.value) {
            subject.classList.add('is-invalid');
            document.getElementById('subject-error').classList.add('is-visible');
            isValid = false;
        }

        const message = contactForm.querySelector('#message');
        if (!message.value.trim()) {
            message.classList.add('is-invalid');
            document.getElementById('message-error').classList.add('is-visible');
            isValid = false;
        }

        if (!isValid) return;

        // Envoi réel vers Formspree
        const submitBtn = contactForm.querySelector('.form-submit');
        submitBtn.disabled = true;
        submitBtn.textContent = 'envoi en cours...';

        fetch(contactForm.action, {
            method: 'POST',
            body: new FormData(contactForm),
            headers: { 'Accept': 'application/json' }
        })
            .then(response => {
                if (response.ok) {
                    contactForm.style.display = 'none';
                    contactSuccess.classList.add('is-visible');
                } else {
                    contactNetworkError.classList.add('is-visible');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'envoyer le message →';
                }
            })
            .catch(() => {
                contactNetworkError.classList.add('is-visible');
                submitBtn.disabled = false;
                submitBtn.textContent = 'envoyer le message →';
            });
    });

    contactForm.querySelectorAll('.form-input').forEach(input => {
        input.addEventListener('input', () => {
            input.classList.remove('is-invalid');
            const errorEl = input.closest('.form-group')?.querySelector('.form-error');
            if (errorEl) errorEl.classList.remove('is-visible');
        });
    });
}

// --- Newsletter : tous les formulaires de la page (corps, pied de page, notes de patch) ---
// Chaque formulaire .newsletter-form est suivi, dans le même parent, d'un bloc .form-success
// et d'un message .form-error (erreur réseau). L'erreur de saisie est le .form-error interne au formulaire.
document.querySelectorAll('form.newsletter-form').forEach((form) => {
    const box = form.parentElement;
    const email = form.querySelector('input[type="email"]');
    const inputError = form.querySelector('.form-error');
    const success = Array.from(box.children).find((el) => el.classList.contains('form-success'));
    const networkError = Array.from(box.children).find((el) => el !== form && el.classList.contains('form-error'));
    const submitBtn = form.querySelector('.form-submit');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
// --- Toggle son immersif (préférence mémorisée entre les pages) ---
const soundToggle = document.getElementById('sound-toggle');
const ambientAudio = document.getElementById('ambient-audio');

if (soundToggle && ambientAudio) {

    // Au chargement de CHAQUE page : si le son était activé avant de naviguer, on le relance
    if (sessionStorage.getItem('modulr-sound-on') === 'true') {
        ambientAudio.volume = 0.5;
        ambientAudio.play().catch(() => {
            // Si le navigateur bloque la reprise automatique, l'état visuel reste correct au clic suivant
        });
        soundToggle.setAttribute('aria-pressed', 'true');
        soundToggle.setAttribute('aria-label', "Couper l'immersion sonore");
    }

    soundToggle.addEventListener('click', () => {
        const isActive = soundToggle.getAttribute('aria-pressed') === 'true';

        if (isActive) {
            ambientAudio.pause();
            soundToggle.setAttribute('aria-pressed', 'false');
            soundToggle.setAttribute('aria-label', "Activer l'immersion sonore");
            sessionStorage.setItem('modulr-sound-on', 'false');
        } else {
            ambientAudio.volume = 0.5;
            ambientAudio.play().catch(() => { });
            soundToggle.setAttribute('aria-pressed', 'true');
            soundToggle.setAttribute('aria-label', "Couper l'immersion sonore");
            sessionStorage.setItem('modulr-sound-on', 'true');
        }
    });

    window.addEventListener('pagehide', () => {
        ambientAudio.pause();
    });
}