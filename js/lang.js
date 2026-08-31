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

(function () {
  var LANG_KEY = 'modulr-lang';
  var stored = localStorage.getItem(LANG_KEY);
  var path = window.location.pathname;
  var isEnglishPage = path.indexOf('/en/') === 0 || path === '/en';

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
      localStorage.setItem(LANG_KEY, 'en');
      window.location.replace(toEnglishPath(path));
      return;
    }

    localStorage.setItem(LANG_KEY, isEnglishPage ? 'en' : 'fr');
  }
})();

/* --- Fonction utilitaire pour le sélecteur manuel FR/EN --- */
function switchLang(target) {
  localStorage.setItem('modulr-lang', target);
  var path = window.location.pathname;
  var isEnglishPage = path.indexOf('/en/') === 0 || path === '/en';

  if (target === 'en' && !isEnglishPage) {
    window.location.href = toEnglishPath(path);
  } else if (target === 'fr' && isEnglishPage) {
    window.location.href = toFrenchPath(path);
  }
}