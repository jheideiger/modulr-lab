/* =========================================================
   MODULR LAB — lang.js
   Détection de langue + redirection FR/EN
   Doit être chargé en synchrone, tôt dans le <head>,
   AVANT le rendu de la page, pour éviter le flash de la
   mauvaise langue.
   ========================================================= */

/* Correspondances explicites pour les paires FR/EN dont le
   nom de dossier diffère (tous les autres suivent la règle
   simple préfixe /en/). */
var FR_TO_EN_OVERRIDES = {
  '/a-propos/': '/en/about/',
  '/mentions-legales/': '/en/legal-notice/'
};
var EN_TO_FR_OVERRIDES = {
  '/en/about/': '/a-propos/',
  '/en/legal-notice/': '/mentions-legales/'
};

function toEnglishPath(p) {
  if (FR_TO_EN_OVERRIDES[p]) return FR_TO_EN_OVERRIDES[p];
  return '/en' + p;
}

function toFrenchPath(p) {
  if (EN_TO_FR_OVERRIDES[p]) return EN_TO_FR_OVERRIDES[p];
  var stripped = p.replace(/^\/en/, '');
  return stripped === '' ? '/' : stripped;
}

/* Le JavaScript tourne : le haut de page joue son apparition au chargement
   (voir .js .reveal dans common.css). */
document.documentElement.className += ' js';

/* Apparitions au défilement, là où le CSS ne sait pas les piloter seul (sans
   animation-timeline: view(), Firefox aujourd'hui) : main.js les révèle avec un
   IntersectionObserver, et cette feuille les masque en attendant. Feuille « adoptée » :
   elle n'existe que pendant que la page tourne et n'est ni enregistrée avec la page,
   ni appliquée à l'impression ; sans elle, tout le contenu reste affiché. */
(function () {
  try {
    if (window.CSS && CSS.supports && CSS.supports('animation-timeline: view()')) return;
    if (!('IntersectionObserver' in window) || !('adoptedStyleSheets' in document)) return;
    var sheet = new CSSStyleSheet();
    sheet.replaceSync('@media screen and (prefers-reduced-motion: no-preference) {' +
      ' .reveal:not(.is-visible) { opacity: 0; transform: translateY(14px); } }');
    document.adoptedStyleSheets = document.adoptedStyleSheets.concat(sheet);
  } catch (e) { }
})();

/* localStorage peut être indisponible (stockage bloqué) : on ne plante pas. */
function langGet(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
function langSet(key, value) { try { localStorage.setItem(key, value); } catch (e) { } }

(function () {
  var LANG_KEY = 'modulr-lang';
  var path = window.location.pathname;
  var isEnglishPage = path.indexOf('/en/') === 0 || path === '/en';

  /* Robots des moteurs de recherche et outils d'analyse : jamais de
     redirection. Googlebot se présente en anglais ; sans cette garde,
     il serait renvoyé vers /en/ et n'indexerait pas les pages françaises. */
  var ua = navigator.userAgent || '';
  if (/bot|crawl|spider|slurp|google|bing|lighthouse|facebookexternalhit|preview/i.test(ua)) return;

  var stored = langGet(LANG_KEY);

  if (stored === 'en' && !isEnglishPage) {
    window.location.replace(toEnglishPath(path));
    return;
  }

  if (stored === 'fr' && isEnglishPage) {
    window.location.replace(toFrenchPath(path));
    return;
  }

  if (!stored) {
    var browserLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
    var prefersFrench = browserLang.indexOf('fr') === 0;

    if (!prefersFrench && !isEnglishPage) {
      langSet(LANG_KEY, 'en');
      window.location.replace(toEnglishPath(path));
      return;
    }

    langSet(LANG_KEY, isEnglishPage ? 'en' : 'fr');
  }
})();

/* --- Fonction utilitaire pour le sélecteur manuel FR/EN --- */
function switchLang(target) {
  langSet('modulr-lang', target);
  var path = window.location.pathname;
  var isEnglishPage = path.indexOf('/en/') === 0 || path === '/en';

  if (target === 'en' && !isEnglishPage) {
    window.location.href = toEnglishPath(path);
  } else if (target === 'fr' && isEnglishPage) {
    window.location.href = toFrenchPath(path);
  }
}

/* Sélecteur FR / EN : les boutons portent data-lang-target="en" ou "fr". Un seul écouteur, posé
   dès le <head> (le bouton marche avant main.js), plutôt que des onclick en ligne : la
   Content-Security-Policy n'autorise aucun gestionnaire d'événement écrit dans le HTML.
   window.switchLang : celle-ci, ou celle de main.js, qui passe par la navigation sans rechargement. */
document.addEventListener('click', function (e) {
  var button = e.target && e.target.closest ? e.target.closest('button[data-lang-target]') : null;
  if (!button) return;
  e.preventDefault();
  window.switchLang(button.getAttribute('data-lang-target'));
});
