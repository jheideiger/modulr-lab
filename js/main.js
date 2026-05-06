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

// --- Curseur personnalisé ---
if (!prefersReducedMotion && window.matchMedia('(pointer: fine)').matches) {
    const cursor = document.createElement('div');
    cursor.classList.add('custom-cursor');
    document.body.appendChild(cursor);

    let mouseX = 0;
    let mouseY = 0;
    let cursorX = 0;
    let cursorY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        cursor.classList.add('is-active');
    });

    document.addEventListener('mouseleave', () => {
        cursor.classList.remove('is-active');
    });

    // Smooth follow avec requestAnimationFrame
    function animateCursor() {
        cursorX += (mouseX - cursorX) * 0.15;
        cursorY += (mouseY - cursorY) * 0.15;
        cursor.style.left = cursorX + 'px';
        cursor.style.top = cursorY + 'px';
        requestAnimationFrame(animateCursor);
    }
    animateCursor();

    // Agrandir le curseur au survol des liens
    const hoverTargets = document.querySelectorAll('a, button, .lesson-card');
    hoverTargets.forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('is-hovering'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('is-hovering'));
    });
}

// --- Validation formulaire de contact ---
const contactForm = document.getElementById('contact-form');
const contactSuccess = document.getElementById('form-success');

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

        if (isValid) {
            contactForm.style.display = 'none';
            contactSuccess.classList.add('is-visible');
        }
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