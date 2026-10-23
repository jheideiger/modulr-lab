/* Le voile noir de l'ouverture de l'accueil, posé avant le premier affichage.
   Tout en haut du body de l'accueil ; mis en ligne dans la page par scripts/build.mjs.
   intro.js (chargé en async) le reprend et joue l'ouverture, ou le retire.
   Ne pose le voile que si l'ouverture doit jouer : première visite, arrivée directe
   (pas depuis un autre site), ni moins d'animations demandées, ni appareil modeste
   (même règle que intro.js et rack3d.js). Garde-fou : si intro.js n'a pas pris
   la main au bout de 2,5 s, le voile s'en va. */
(function () {
  var always = !!window.MODULR_INTRO_ALWAYS;
  try { if (!always && localStorage.getItem('modulr-intro-seen') === '1') return; } catch (e) { }
  var mm = function (q) { return !!(window.matchMedia && window.matchMedia(q).matches); };
  if (mm('(prefers-reduced-motion: reduce)')) return;
  var n = navigator, c = n.connection || {};
  if ((n.deviceMemory > 0 && n.deviceMemory <= 4) || (n.hardwareConcurrency > 0 && n.hardwareConcurrency <= 4) ||
    c.saveData === true || mm('(prefers-reduced-data: reduce)')) return;
  if (!always && document.referrer) {
    try {
      var host = function (h) { return h.replace(/^www\./, ''); };
      if (host(new URL(document.referrer).hostname) !== host(location.hostname)) return;
    } catch (e) { return; }
  }
  var veil = document.createElement('div');
  veil.className = 'intro';
  veil.setAttribute('data-pending', '');
  document.body.appendChild(veil);
  window.scrollTo(0, 0);
  document.documentElement.style.overflow = 'hidden';
  setTimeout(function () {
    if (!veil.hasAttribute('data-pending') || !veil.parentNode) return;
    veil.parentNode.removeChild(veil);
    document.documentElement.style.overflow = '';
    document.dispatchEvent(new CustomEvent('modulr:intro-end'));
  }, 2500);
})();
