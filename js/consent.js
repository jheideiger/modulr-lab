/* =========================================================
   MODULR LAB — consent.js
   Consentement à la mesure d'audience (Google Analytics).
   Rien n'est chargé ni déposé avant un « accepter ».
   Le choix (accepter ou refuser) est gardé 6 mois, puis la
   question est reposée (recommandation CNIL). Le lien
   « gérer les cookies » du pied de page rouvre le bandeau.
   Chargé dans le <head> des pages françaises uniquement.
   ========================================================= */

(function () {
  'use strict';

  var GA_ID = 'G-X71P2T6L30';
  var KEY = 'modulr-consent';
  var MAX_AGE = 1000 * 60 * 60 * 24 * 182; // 6 mois

  function readChoice() {
    try {
      var saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!saved || !saved.t || Date.now() - saved.t > MAX_AGE) return null;
      return saved.v === 'granted' || saved.v === 'denied' ? saved.v : null;
    } catch (e) { return null; }
  }

  function saveChoice(value) {
    try { localStorage.setItem(KEY, JSON.stringify({ v: value, t: Date.now() })); } catch (e) { }
  }

  function loadAnalytics() {
    if (window.__modulrAnalytics) return;
    window.__modulrAnalytics = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID);
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
  }

  // Refus après une acceptation : on retire les cookies _ga déjà déposés
  function clearAnalyticsCookies() {
    var host = window.location.hostname;
    var domains = ['', host, '.' + host, '.' + host.replace(/^www\./, '')];
    document.cookie.split(';').forEach(function (c) {
      var name = c.split('=')[0].trim();
      if (name.indexOf('_ga') !== 0) return;
      domains.forEach(function (d) {
        document.cookie = name + '=; Max-Age=0; path=/' + (d ? '; domain=' + d : '');
      });
    });
  }

  function removeBanner() {
    var banner = document.getElementById('consent-banner');
    if (banner) banner.remove();
  }

  function showBanner() {
    if (document.getElementById('consent-banner')) return;
    var banner = document.createElement('div');
    banner.id = 'consent-banner';
    banner.className = 'consent-banner';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'mesure d\'audience');
    banner.innerHTML =
      '<p class="consent-text">modulr lab aimerait mesurer son audience avec Google Analytics, ' +
      'pour savoir quelles pages vous sont utiles. Rien n\'est déposé sans votre accord. ' +
      '<a href="/mentions-legales/#donnees" class="consent-more">en savoir plus</a></p>' +
      '<div class="consent-actions">' +
      '<button type="button" class="consent-btn" data-consent="denied">refuser</button>' +
      '<button type="button" class="consent-btn" data-consent="granted">accepter</button>' +
      '</div>';

    banner.addEventListener('click', function (event) {
      var btn = event.target.closest('[data-consent]');
      if (!btn) return;
      var value = btn.getAttribute('data-consent');
      saveChoice(value);
      removeBanner();
      if (value === 'granted') loadAnalytics();
      else if (window.__modulrAnalytics) {
        // L'outil tourne déjà dans cette page : on coupe l'envoi et on nettoie
        window['ga-disable-' + GA_ID] = true;
        clearAnalyticsCookies();
      } else clearAnalyticsCookies();
    });

    document.body.appendChild(banner);
  }

  // Lien « gérer les cookies » du pied de page (délégation : marche aussi
  // après une navigation sans rechargement)
  document.addEventListener('click', function (event) {
    var link = event.target.closest('[data-consent-open]');
    if (!link) return;
    event.preventDefault();
    showBanner();
  });

  // Pages anglaises (atteintes sans rechargement) : pas de mesure, pas de bandeau
  document.addEventListener('modulr:page', function () {
    if (document.documentElement.lang === 'en') removeBanner();
  });

  var choice = readChoice();
  if (choice === 'granted') loadAnalytics();
  else if (choice === null) {
    if (document.body) showBanner();
    else document.addEventListener('DOMContentLoaded', showBanner);
  }
})();
