/* =========================================================
   MODULR LAB — main.js
   Menu burger mobile
   ========================================================= */

const burger = document.querySelector('.burger');
const menuOverlay = document.getElementById('menu-overlay');
const menuClose = document.querySelector('.menu-close');

// Ouvrir le menu
burger.addEventListener('click', () => {
    menuOverlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
});

// Fermer le menu
menuClose.addEventListener('click', () => {
    menuOverlay.classList.remove('is-open');
    document.body.style.overflow = '';
});

// Fermer le menu quand on clique sur un lien
menuOverlay.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', () => {
        menuOverlay.classList.remove('is-open');
        document.body.style.overflow = '';
    });
});