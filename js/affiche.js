// =====================================================================
// MinVa — affiche imprimable d'une organisation ou d'un événement
// affiche.html?o=<adresse>            → affiche du site (QR code vers le site)
// affiche.html?o=<adresse>&e=<id>     → affiche d'un événement
// =====================================================================
(function () {
  var O = window.MVO, esc = O.esc, ico = O.ico, E = window.MinVaEtoffe;
  var p = new URLSearchParams(location.search);
  var slug = (p.get('o') || '').toLowerCase(), evtId = p.get('e');
  var page = document.getElementById('affiche');
  var JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

  function heure(d) { return d.getHours() + ' h' + (d.getMinutes() ? ' ' + String(d.getMinutes()).padStart(2, '0') : ''); }
  function dateEvt(e) {
    var d = new Date(e.debut), f = e.fin ? new Date(e.fin) : null;
    return O.maj(JOURS[d.getDay()]) + ' ' + d.getDate() + ' ' + d.toLocaleDateString('fr-FR', { month: 'long' }) + ' ' + d.getFullYear() +
      ' · ' + heure(d) + (f && f.toDateString() === d.toDateString() ? ' à ' + heure(f) : '');
  }
  function ajuster() {
    // Sur téléphone, l'affiche est réduite à l'écran (l'impression garde la vraie taille)
    if (window.matchMedia('print').matches) return;
    var w = page.offsetWidth, dispo = window.innerWidth - 32, k = dispo / w;
    page.style.transform = k < 1 ? 'scale(' + k.toFixed(3) + ')' : '';
    page.style.marginBottom = k < 1 ? (-(1 - k) * page.offsetHeight + 24) + 'px' : '';
  }

  function rendre(d) {
    var o = d.org, t = window.appliquerTheme(page, o.theme), cle = o.slug || o.nom;
    var evt = evtId ? (d.evenements || []).find(function (e) { return e.id === evtId; }) : null;
    var lien = window.MV.lienSite(o.slug) + '?s=qr' + (evt ? '#agenda' : '');
    var wa = String((o.contact || {}).whatsapp || '').replace(/[^0-9]/g, '');
    document.title = 'Affiche · ' + (evt ? evt.titre : o.nom);
    var sceau = o.logo_url ? '<img src="' + esc(o.logo_url) + '" alt="">' : E.sceau(cle, o.sigle || O.sigleDe(o.nom), t);
    page.innerHTML =
      '<div class="af-etoffe" aria-hidden="true">' + E.svg(cle, t, { largeur: 800, hauteur: 260, sens: 'h' }) + '</div>' +
      '<div class="af-sceau">' + sceau + '</div>' +
      '<div class="af-corps">' +
      '<p class="af-type">' + esc(O.typeDe(o)[1]) + (o.ville ? ' · ' + esc(o.ville) : '') + '</p>' +
      '<h1 class="af-nom">' + esc(o.nom) + '</h1>' +
      (evt
        ? '<h2 class="af-titre">' + esc(evt.titre) + '</h2><div class="af-quand"><span>' + ico('evenement') + esc(dateEvt(evt)) + '</span>' + (evt.lieu ? '<span>' + ico('lieu') + esc(evt.lieu) + '</span>' : '') + '</div>' +
          (evt.description ? '<p class="af-texte">' + esc(evt.description.length > 260 ? evt.description.slice(0, 257) + '…' : evt.description) + '</p>' : '')
        : (o.slogan ? '<h2 class="af-titre">' + esc(o.slogan) + '</h2>' : '') + (o.mission ? '<p class="af-texte">' + esc(o.mission) + '</p>' : '')) +
      '<div class="af-bas"><div class="af-qr" id="qr"></div><div class="af-scan"><b>' + (evt ? (evt.inscriptions ? 'Scannez pour vous inscrire' : 'Scannez pour tous les détails') : 'Scannez pour découvrir notre site') + '</b>' +
      '<p>Avec l’appareil photo de votre téléphone.</p><p>' + esc(window.MV.lienSite(o.slug).replace(/^https?:\/\//, '')) + '</p>' +
      (wa ? '<p>WhatsApp : +' + esc(wa) + '</p>' : '') + '</div></div></div>' +
      '<div class="af-bande" aria-hidden="true">' + E.svg(cle, t, { largeur: 800, hauteur: 18, sens: 'h', motif: 12, cle: 'p', ratio: 'none' }) + '</div>' +
      '<div class="af-pied"><span>' + esc(o.nom) + '</span><span>Site créé avec MinVa</span></div>';
    page.removeAttribute('aria-busy');
    if (window.QRCode) new window.QRCode(document.getElementById('qr'), { text: lien, width: 600, height: 600, colorDark: '#14100D', colorLight: '#FFFFFF', correctLevel: window.QRCode.CorrectLevel.M });
    else document.getElementById('qr').innerHTML = '<p style="font-size:12px">QR code indisponible (connexion internet nécessaire).</p>';
    ajuster();
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-format]'), function (b) {
    b.onclick = function () {
      var a5 = b.dataset.format === 'A5';
      page.classList.toggle('a5', a5);
      document.getElementById('format-page').textContent = '@page { size: ' + (a5 ? 'A5' : 'A4') + ' portrait; margin: 0; }';
      Array.prototype.forEach.call(document.querySelectorAll('[data-format]'), function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      page.style.transform = ''; ajuster();
    };
  });
  document.getElementById('imprimer').onclick = function () { page.style.transform = ''; window.print(); setTimeout(ajuster, 500); };
  window.addEventListener('resize', function () { page.style.transform = ''; ajuster(); });

  if (!slug) { page.innerHTML = '<p class="af-charge">Adresse du site manquante.</p>'; return; }
  window.MV.site.parSlug(slug).then(function (d) {
    if (!d) { page.innerHTML = '<p class="af-charge">Ce site n’existe pas ou n’est plus en ligne.</p>'; return; }
    rendre(d);
  }).catch(function (e) { page.innerHTML = '<p class="af-charge">L’affiche n’a pas pu se préparer : ' + esc(e.message) + '</p>'; });
})();
