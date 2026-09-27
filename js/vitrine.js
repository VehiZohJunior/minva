// =====================================================================
// MinVa — site vitrine
// =====================================================================
(function () {
  var O = window.MVO, MV = window.MV, C = window.MINVA_CONFIG, esc = O.esc, ico = O.ico;
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) { MV.erreur('vitrine', e.message); });
  $('annee').textContent = new Date().getFullYear();

  if (MV.mode === 'demo') $('bandeau-demo').innerHTML = '<div class="bandeau-demo">Mode démonstration : les organisations présentées sont fictives.</div>';

  // Fonctionnalités
  var F = [
    ['pinceau', 'Un site à votre image', 'Votre logo, vos photos, vos textes et 8 thèmes de couleurs inspirés des pagnes et des toiles d’Afrique de l’Ouest.'],
    ['actu', 'Des actualités comme sur les réseaux', 'Un texte, jusqu’à 4 photos, et c’est publié. Les photos sont allégées pour les petites connexions.'],
    ['cible', 'Projets et collectes', 'Montrez ce que vous voulez réaliser, l’objectif en FCFA et le montant déjà réuni. Un bouton ouvre WhatsApp pour soutenir.'],
    ['bouclier', 'Documents vérifiés', 'Statuts, récépissé, rapports : MinVa les contrôle et votre site affiche « Vérifié ». Les fichiers restent privés.'],
    ['equipe', '3 administrateurs', 'La présidente, le trésorier, la secrétaire : chacun son compte, chacun peut publier.'],
    ['qr', 'Votre lien et votre QR code', 'Un lien court à partager sur WhatsApp et Facebook, un QR code à imprimer sur vos affiches.']
  ];
  $('v-fonctions').innerHTML = F.map(function (f) { return '<article class="v-fonction">' + ico(f[0], 'ico-xl') + '<h3>' + f[1] + '</h3><p>' + f[2] + '</p></article>'; }).join('');

  // Tarifs
  $('v-tarifs').innerHTML = C.TARIFS.map(function (t) {
    return '<article class="v-tarif' + (t.recommande ? ' reco' : '') + '">' + (t.recommande ? '<span class="badge b-avant ruban">' + ico('avant') + 'Le plus choisi</span>' : '') +
      '<h3>' + esc(t.nom) + '</h3><p class="pour">' + esc(t.pour) + '</p><div class="v-prix">' + O.nb(t.prix) + ' <small>FCFA / ' + esc(t.periode) + '</small></div>' +
      '<ul>' + t.inclus.map(function (i) { return '<li>' + ico('verifie') + '<span>' + esc(i) + '</span></li>'; }).join('') + '</ul>' +
      '<a class="btn ' + (t.recommande ? 'btn-principal' : 'btn-secondaire') + '" href="#abonnement" data-plan="' + t.id + '">Choisir ' + esc(t.nom) + '</a></article>';
  }).join('');
  $('v-tarifs').addEventListener('click', function (e) { var a = e.target.closest('[data-plan]'); if (a) $('f-plan').value = a.dataset.plan; });

  // Formulaire : listes
  $('f-sect').innerHTML = Object.keys(O.SECTEURS).map(function (k) { return '<option value="' + k + '">' + O.SECTEURS[k].nom + '</option>'; }).join('');
  $('f-plan').innerHTML = C.TARIFS.map(function (t) { return '<option value="' + t.id + '"' + (t.recommande ? ' selected' : '') + '>' + esc(t.nom) + ' · ' + O.nb(t.prix) + ' FCFA / ' + t.periode + '</option>'; }).join('');
  $('v-sect').innerHTML += Object.keys(O.SECTEURS).map(function (k) { return '<option value="' + k + '">' + O.SECTEURS[k].nom + '</option>'; }).join('');
  if (C.WHATSAPP_COMMERCIAL) $('v-abo-wa').innerHTML = 'Pressé ? <a href="https://wa.me/' + esc(C.WHATSAPP_COMMERCIAL) + '?text=' + encodeURIComponent('Bonjour MinVa, je souhaite un site pour mon organisation.') + '" target="_blank" rel="noopener">Écrivez-nous sur WhatsApp</a>.';

  // Aperçu de l'adresse que MinVa attribuera automatiquement (nom, puis ville si besoin)
  function futurLien() {
    var sl = O.attribuerSlug($('f-org').value, $('f-ville').value, orgs.map(function (o) { return o.slug; }));
    $('f-futur').hidden = !sl; if (sl) $('f-lien').textContent = MV.lienSite(sl);
  }
  $('f-org').addEventListener('input', futurLien); $('f-ville').addEventListener('input', futurLien); $('f-ville').addEventListener('change', futurLien);

  $('v-form').onsubmit = function (e) {
    e.preventDefault();
    var btn = $('f-ok'), retour = $('f-retour');
    var d = { nom_organisation: $('f-org').value.trim(), secteur: $('f-sect').value, ville: $('f-ville').value.trim(), responsable: $('f-resp').value.trim(),
      telephone: $('f-tel').value.trim(), email: $('f-email').value.trim(), plan: $('f-plan').value, message: $('f-msg').value.trim() };
    if (!d.nom_organisation || !d.responsable || !d.telephone) {
      retour.innerHTML = '<div class="erreur-form" role="alert">' + ico('alerte') + '<span>Indiquez au moins le nom de l’organisation, votre nom et votre téléphone.</span></div>'; return;
    }
    btn.disabled = true; btn.textContent = 'Envoi…'; retour.innerHTML = '';
    MV.demande.creer(d).then(function () {
      $('v-form').innerHTML = '<div class="v-succes" role="status">' + ico('verifie', 'ico-lg') + '<div><b>Merci ' + esc(d.responsable.split(' ')[0]) + ', votre demande est bien envoyée.</b><br>Nous appelons le ' + esc(d.telephone) + ' sous 48 heures pour créer le site de ' + esc(d.nom_organisation) + '.</div></div>';
    }).catch(function (er) {
      btn.disabled = false; btn.textContent = 'Envoyer ma demande';
      retour.innerHTML = '<div class="erreur-form" role="alert">' + ico('alerte') + '<span>' + esc(er.message) + '</span></div>';
    });
  };

  // Annuaire, exemples et téléphone de démonstration : tout vient des vraies organisations
  var orgs = [];
  function actifDepuis(o) { return O.joursDepuis(o.derniere_actualite); }
  function rendreAnnuaire() {
    var q = O.norm($('v-q').value), s = $('v-sect').value;
    var l = orgs.filter(function (o) { return (!s || o.secteur === s) && (!q || O.norm([o.nom, o.ville, o.region, o.mission, o.slogan].join(' ')).indexOf(q) >= 0); });
    $('v-annuaire').innerHTML = l.length ? l.map(function (o) {
      var sect = O.SECTEURS[o.secteur] || O.SECTEURS.education, j = actifDepuis(o);
      return '<a class="v-org" href="' + esc(MV.lienSite(o.slug)) + '" style="--c:' + sect.c + '"><span class="mono">' + (o.logo_url ? '<img src="' + esc(o.logo_url) + '" alt="">' : esc(o.sigle || O.sigleDe(o.nom))) + '</span>' +
        '<div><b>' + esc(o.nom) + (o.statut_verification === 'verifie' ? ' <span class="sr">vérifiée</span>' : '') + '</b><p>' + esc(o.mission || o.slogan || '') + '</p>' +
        '<small class="' + (j <= 7 ? 'frais' : '') + '">' + esc([o.ville, sect.nom].filter(Boolean).join(' · ')) + (o.derniere_actualite ? ' · actualité ' + O.quand(o.derniere_actualite) : '') + (o.statut_verification === 'verifie' ? ' · Vérifiée' : '') + '</small></div></a>';
    }).join('') : '<div class="v-vide">' + (orgs.length ? 'Aucune organisation ne correspond à votre recherche.' : 'Les premières organisations arrivent très bientôt. La vôtre peut être la première.') + '</div>';
  }
  $('v-q').oninput = rendreAnnuaire; $('v-sect').onchange = rendreAnnuaire;

  function rendreExemples() {
    var ex = orgs.slice().sort(function (a, b) { return actifDepuis(a) - actifDepuis(b); }).slice(0, 3);
    if (!ex.length) { $('exemples').hidden = true; return; }
    $('v-exemples').innerHTML = ex.map(function (o) {
      var t = window.minvaTheme(o.theme), sect = O.SECTEURS[o.secteur] || O.SECTEURS.education;
      return '<a class="v-exemple" href="' + esc(MV.lienSite(o.slug)) + '"><div class="v-ex-haut" style="background:' + t.primaire + ';color:' + t.surPrimaire + '">' +
        (o.couverture_url ? '<img src="' + esc(o.couverture_url) + '" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.45">' : '<div class="bogolan"></div>') +
        '<span class="mono" style="background:' + t.surPrimaire + ';color:' + t.primaire + '">' + (o.logo_url ? '<img src="' + esc(o.logo_url) + '" alt="">' : esc(o.sigle || O.sigleDe(o.nom))) + '</span><b>' + esc(o.nom) + '</b></div>' +
        '<div class="v-ex-bas"><span>' + esc(o.slogan || o.mission || '') + '</span><small>' + esc(sect.nom) + ' · ' + esc(o.ville || '') + ' · thème ' + esc(t.nom) + '</small><span class="lien">Visiter le site' + ico('suite') + '</span></div></a>';
    }).join('');
    if (MV.mode === 'demo') $('v-ex-note').textContent = 'Organisations fictives, pour la démonstration.';
  }

  function telephone() {
    var ex = orgs.slice().sort(function (a, b) { return actifDepuis(a) - actifDepuis(b); })[0];
    if (!ex) { $('v-demo').hidden = true; return; }
    var iframe = $('v-iframe'), themeActuel = ex.theme;
    iframe.src = 'site.html?o=' + encodeURIComponent(ex.slug) + '&vitrine=1';
    $('v-pastilles').innerHTML = window.MINVA_THEMES.map(function (t) {
      return '<button type="button" class="v-pastille" data-t="' + t.id + '" aria-pressed="' + (t.id === themeActuel) + '" aria-label="Thème ' + esc(t.nom) + '" title="' + esc(t.nom) + '" style="background:' + t.primaire + ';--acc:' + t.accent + '"></button>';
    }).join('');
    $('v-pastilles').onclick = function (e) {
      var b = e.target.closest('[data-t]'); if (!b) return;
      Array.prototype.forEach.call($('v-pastilles').children, function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      iframe.contentWindow.postMessage({ type: 'minva-apercu', org: { theme: b.dataset.t } }, location.origin);
    };
  }

  MV.site.annuaire().then(function (l) {
    orgs = l || []; rendreAnnuaire(); rendreExemples(); telephone();
  }).catch(function (e) {
    MV.erreur('vitrine', e.message);
    $('v-annuaire').innerHTML = '<div class="v-vide">L’annuaire n’a pas pu se charger. Réessayez dans un instant.</div>';
    $('v-demo').hidden = true; $('exemples').hidden = true;
  });
})();
