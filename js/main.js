/* =========================================================
   MODULR LAB — main.js
   Menu burger + validation formulaires
   ========================================================= */

// --- Menu burger ---
const burger = document.querySelector('.burger');
const menuOverlay = document.getElementById('menu-overlay');
const menuClose = document.querySelector('.menu-close');

if (burger && menuOverlay && menuClose) {
    burger.addEventListener('click', () => {
        menuOverlay.classList.add('is-open');
        document.body.style.overflow = 'hidden';
    });

    menuClose.addEventListener('click', () => {
        menuOverlay.classList.remove('is-open');
        document.body.style.overflow = '';
    });

    menuOverlay.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', () => {
            menuOverlay.classList.remove('is-open');
            document.body.style.overflow = '';
        });
    });
}

// --- Validation formulaire de contact ---
const contactForm = document.getElementById('contact-form');
const contactSuccess = document.getElementById('form-success');

if (contactForm && contactSuccess) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        let isValid = true;

        // Reset
        contactForm.querySelectorAll('.form-input').forEach(input => {
            input.classList.remove('is-invalid');
        });
        contactForm.querySelectorAll('.form-error').forEach(error => {
            error.classList.remove('is-visible');
        });

        // Nom
        const name = contactForm.querySelector('#name');
        if (!name.value.trim()) {
            name.classList.add('is-invalid');
            document.getElementById('name-error').classList.add('is-visible');
            isValid = false;
        }

        // Email
        const email = contactForm.querySelector('#email');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.value.trim())) {
            email.classList.add('is-invalid');
            document.getElementById('email-error').classList.add('is-visible');
            isValid = false;
        }

        // Sujet
        const subject = contactForm.querySelector('#subject');
        if (!subject.value) {
            subject.classList.add('is-invalid');
            document.getElementById('subject-error').classList.add('is-visible');
            isValid = false;
        }

        // Message
        const message = contactForm.querySelector('#message');
        if (!message.value.trim()) {
            message.classList.add('is-invalid');
            document.getElementById('message-error').classList.add('is-visible');
            isValid = false;
        }

        if (isValid) {
            contactForm.style.display = 'none';
            contactSuccess.classList.add('is-visible');
        }
    });

    // Retirer l'erreur quand on tape
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

        newsletterForm.style.display = 'none';
        newsletterSuccess.classList.add('is-visible');
    });

    newsletterForm.querySelector('#newsletter-email').addEventListener('input', () => {
        newsletterForm.querySelector('#newsletter-email').classList.remove('is-invalid');
        document.getElementById('newsletter-error').classList.remove('is-visible');
    });
}