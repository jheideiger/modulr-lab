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
    const openMenu = () => {
        menuOverlay.classList.add('is-open');
        menuOverlay.removeAttribute('inert');
        menuOverlay.setAttribute('aria-hidden', 'false');
        burger.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
    };

    const closeMenu = () => {
        menuOverlay.classList.remove('is-open');
        menuOverlay.setAttribute('inert', '');
        menuOverlay.setAttribute('aria-hidden', 'true');
        burger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
    };

    burger.addEventListener('click', openMenu);
    menuClose.addEventListener('click', closeMenu);

    menuOverlay.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', closeMenu);
    });
}

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

// --- Validation newsletter ---
const newsletterForm = document.getElementById('newsletter-form');
const newsletterSuccess = document.getElementById('newsletter-success');
const newsletterNetworkError = document.getElementById('newsletter-network-error');

if (newsletterForm && newsletterSuccess) {
    newsletterForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const email = newsletterForm.querySelector('#newsletter-email');
        const error = document.getElementById('newsletter-error');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        email.classList.remove('is-invalid');
        error.classList.remove('is-visible');

        if (!emailRegex.test(email.value.trim())) {
            email.classList.add('is-invalid');
            error.classList.add('is-visible');
            return;
        }

        const submitBtn = newsletterForm.querySelector('.form-submit');
        submitBtn.disabled = true;

        fetch(newsletterForm.action, {
            method: 'POST',
            body: new FormData(newsletterForm),
            headers: { 'Accept': 'application/json' }
        })
            .then(response => {
                if (response.ok) {
                    newsletterForm.style.display = 'none';
                    newsletterSuccess.classList.add('is-visible');
                } else {
                    newsletterNetworkError.classList.add('is-visible');
                    submitBtn.disabled = false;
                }
            })
            .catch(() => {
                newsletterNetworkError.classList.add('is-visible');
                submitBtn.disabled = false;
            });
    });

    newsletterForm.querySelector('#newsletter-email').addEventListener('input', () => {
        newsletterForm.querySelector('#newsletter-email').classList.remove('is-invalid');
        document.getElementById('newsletter-error').classList.remove('is-visible');
    });
}