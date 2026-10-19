// =====================================================================
// MinVa — site public d'une association · direction « L'Étoffe »
// Adresse : site.html?o=<adresse-du-site>   (ou /<adresse> via 404.html)
// Mode aperçu (console admin) : site.html?o=<adresse>&apercu=1
// =====================================================================
(function () {
  var O = window.MVO, esc = O.esc, ico = O.ico, E = window.MinVaEtoffe;
  var params = new URLSearchParams(location.search);
  var slug = (params.get('o') || '').toLowerCase();
  var apercu = params.get('apercu') === '1';
  var vitrine = params.get('vitrine') === '1'; // téléphone de démonstration du site vitrine
  var app = document.getElementById('app');
  var donnees = null, photos = [], idxPhoto = 0, nbActusVisibles = 5;

  // Certaines polices sont larges : on ajuste leur taille pour garder des titres équilibrés
  var ECHELLE = { 'Unbounded': 0.78, 'Syne': 0.9, 'Sora': 0.9, 'Bricolage Grotesque': 0.94 };
  var ICONES_BESOIN = { financement: 'coeur', benevoles: 'equipe', materiel: 'boite', formation: 'etincelle', partenariat: 'lien' };
  var MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

  function waLien(num, texte) {
    var n = String(num || '').replace(/[^0-9]/g, '');
    return n ? 'https://wa.me/' + n + (texte ? '?text=' + encodeURIComponent(texte) : '') : '';
  }
  function lienSite() { return window.MV.lienSite(donnees.org.slug); }
  function fil(nom, t) { return '<span class="s-fil" aria-hidden="true">' + E.svg(nom, t, { largeur: 112, hauteur: 20, sens: 'h', motif: 14 }) + '</span>'; }
  function entete(nom, t, titre, sous) {
    return '<div class="s-entete">' + fil(nom, t) + '<h2 class="titre">' + titre + '</h2>' + (sous ? '<p>' + sous + '</p>' : '') + '</div>';
  }

  function introuvable() {
    app.removeAttribute('aria-busy');
    document.title = 'Site introuvable · MinVa';
    app.innerHTML = '<div class="s-introuvable"><h1>Ce site n’existe pas ou n’est plus en ligne</h1>' +
      '<p>Vérifiez l’adresse qu’on vous a envoyée. Vous pouvez aussi chercher l’organisation dans l’annuaire MinVa.</p>' +
      '<p><a class="btn btn-noir" href="index.html#annuaire">Voir l’annuaire des organisations</a></p></div>';
  }

  function rendre() {
    var d = donnees, o = d.org, r = o.rubriques || {};
    var t = window.appliquerTheme(app, o.theme);
    app.style.setProperty('--t-echelle', String(ECHELLE[t.police] || 1));
    document.body.style.background = t.fond;
    document.title = o.nom + (o.slogan ? ' · ' + o.slogan : '');
    var meta = document.querySelector('meta[name="description"]'); if (meta) meta.setAttribute('content', o.mission || o.slogan || o.nom);
    var theme = document.querySelector('meta[name="theme-color"]'); if (theme) theme.setAttribute('content', t.fond);

    var nom = o.slug || o.nom; // l'étoffe dépend de l'adresse : elle ne change pas si le nom est retouché
    var sect = O.SECTEURS[o.secteur] || O.SECTEURS.education;
    var contact = o.contact || {};
    var wa = waLien(contact.whatsapp, 'Bonjour ' + o.nom + ', je vous écris depuis votre site.');
    var sigle = o.sigle || O.sigleDe(o.nom);
    var ech = ECHELLE[t.police] || 1;
    var sceau = o.logo_url ? '<img src="' + esc(o.logo_url) + '" alt="Logo de ' + esc(o.nom) + '">' : E.sceau(nom, sigle, t, { echelle: ech });
    var mini = o.logo_url ? '<img src="' + esc(o.logo_url) + '" alt="">' : E.sceau(nom, sigle, t, { echelle: ech });

    photos = [];
    d.actualites.forEach(function (a) { (a.photos || []).forEach(function (p) { photos.push(p); }); });
    var docsVerifies = d.documents.filter(function (x) { return x.statut === 'verifie'; });
    var verifiee = o.statut_verification === 'verifie';

    var montrer = {
      apropos: r.apropos !== false && (o.mission || o.apropos),
      actualites: r.actualites !== false && d.actualites.length,
      projets: r.projets !== false && d.projets.length,
      besoins: r.besoins !== false && (o.besoins || []).length,
      galerie: r.galerie !== false && photos.length >= 3,
      documents: r.documents !== false && (docsVerifies.length || verifiee),
      equipe: r.equipe !== false && (o.equipe || []).length,
      contact: r.contact !== false && (contact.telephone || contact.whatsapp || contact.email || contact.facebook || contact.adresse)
    };
    var soutenir = montrer.projets ? '#projets' : montrer.besoins ? '#besoins' : '';
    var noms = { apropos: 'À propos', actualites: 'Actualités', projets: 'Projets', besoins: 'Nous aider', documents: 'Confiance', equipe: 'Bureau', contact: 'Contact' };
    var nav = Object.keys(noms).filter(function (k) { return montrer[k]; }).slice(0, 6)
      .map(function (k) { return '<a href="#' + k + '">' + noms[k] + '</a>'; }).join('');

    var h = '';
    if (apercu) h += '<div class="apercu-bandeau">Aperçu en direct · les visiteurs verront ce site une fois enregistré</div>';

    h += '<header class="s-barre"><div class="s-barre-in">' +
      '<a class="s-marque" href="#haut"><span class="s-mini" aria-hidden="true">' + mini + '</span><b>' + esc(o.nom) + '</b></a>' +
      '<nav class="s-nav" aria-label="Sections">' + nav + '</nav>' +
      '<button type="button" class="s-btn s-btn-ligne s-btn-sm s-partager" data-partager>' + ico('partage') + 'Partager</button>' +
      '</div></header>';

    // ----- Héros : le nom, la promesse, l'étoffe et le sceau -----
    h += '<section class="s-hero" id="haut"><div class="s-hero-in"><div class="s-hero-texte">' +
      '<div class="s-badges"><span class="s-badge s-badge-sect" style="--c:' + sect.c + ';--sur:' + sect.sur + '">' + ico(o.secteur) + sect.nom + '</span>' +
      (verifiee ? '<span class="s-badge s-badge-verif">' + ico('verifie') + 'Vérifiée par MinVa</span>' : '') + '</div>' +
      '<h1 class="titre">' + esc(o.nom) + '</h1>' +
      (o.slogan ? '<p class="s-slogan">' + esc(o.slogan) + '</p>' : '') +
      ((o.ville || o.region) ? '<p class="s-lieu">' + ico('lieu') + esc([o.ville, o.region].filter(Boolean).join(' · ')) + '</p>' : '') +
      '<div class="s-actions">' +
      (soutenir ? '<a class="s-btn s-btn-accent" href="' + soutenir + '">' + ico('coeur') + 'Nous soutenir</a>' : '') +
      (wa ? '<a class="s-btn s-btn-ligne" href="' + wa + '" target="_blank" rel="noopener">' + ico('whatsapp') + 'Écrire sur WhatsApp</a>' : '') +
      '</div></div>' +
      '<div class="s-visuel"><div class="s-visuel-etoffe">' + E.svg(nom, t, { largeur: 480, hauteur: 600, sens: 'v' }) + '</div>' +
      (o.couverture_url ? '<div class="s-visuel-photo"><img src="' + esc(o.couverture_url) + '" alt="Photo de ' + esc(o.nom) + '"></div>' : '') +
      '<div class="s-visuel-sceau">' + sceau + '</div></div>' +
      '</div></section>';

    // ----- Passeport : seulement des faits positifs -----
    var faits = [];
    if (verifiee) faits.push(['<span class="ico-lg">' + ico('bouclier', 'ico-lg') + '</span>', 'Vérifiée', 'par MinVa']);
    if (o.annee_creation) faits.push(['<span class="ico-lg">' + ico('horloge', 'ico-lg') + '</span>', 'Depuis ' + o.annee_creation, (new Date().getFullYear() - o.annee_creation) + ' ans d’action']);
    if (o.beneficiaires) faits.push(['<span class="ico-lg">' + ico('coeur', 'ico-lg') + '</span>', O.nb(o.beneficiaires), o.beneficiaires_label || 'bénéficiaires']);
    if (o.membres) faits.push(['<span class="ico-lg">' + ico('equipe', 'ico-lg') + '</span>', O.nb(o.membres), 'membres']);
    var derniere = d.actualites[0];
    if (derniere && O.joursDepuis(derniere.created_at) <= 30) faits.push(['<span class="s-pastille-vie" aria-hidden="true"></span>', 'Active', 'dernière nouvelle ' + O.quand(derniere.created_at)]);
    if (faits.length >= 2) {
      h += '<div class="s-passeport"><ul aria-label="L’association en bref">' + faits.slice(0, 5).map(function (f) { return '<li>' + f[0] + '<div><b>' + esc(f[1]) + '</b><span>' + esc(f[2]) + '</span></div></li>'; }).join('') + '</ul></div>';
    }

    h += '<main>';
    if (montrer.apropos) {
      h += '<section class="s-section" id="apropos">' + entete(nom, t, 'Notre mission') + '<div class="s-apropos">' +
        (o.mission ? '<p class="s-mission">' + esc(o.mission) + '</p>' : '<div></div>') +
        '<div class="s-histoire">' + (o.apropos ? '<p>' + esc(o.apropos) + '</p>' : '') +
        '<dl class="s-faits">' + (o.zone ? '<dt>Zone d’action</dt><dd>' + esc(o.zone) + '</dd>' : '') + (o.langues ? '<dt>Langues parlées</dt><dd>' + esc(o.langues) + '</dd>' : '') +
        (o.annee_creation ? '<dt>Création</dt><dd>' + o.annee_creation + '</dd>' : '') + '</dl></div></div></section>';
    }

    if (montrer.actualites) {
      var visibles = d.actualites.slice(0, nbActusVisibles);
      h += '<section class="s-section" id="actualites">' + entete(nom, t, 'Journal de bord', 'Ce que nous faisons, au fil des semaines.') + '<ol class="s-journal">' +
        visibles.map(function (a) {
          var dt = new Date(a.created_at), ph = a.photos || [];
          var grille = ph.length ? '<div class="s-photos n' + ph.length + '">' + ph.map(function (p) {
            return '<button type="button" data-photo="' + esc(p) + '" aria-label="Voir la photo en grand"><img src="' + esc(p) + '" alt="" loading="lazy"></button>';
          }).join('') + '</div>' : '';
          return '<li class="s-entree"><div class="s-date"><b>' + dt.getDate() + '</b><span>' + MOIS[dt.getMonth()] + (dt.getFullYear() !== new Date().getFullYear() ? ' ' + dt.getFullYear() : '') + '</span></div>' +
            '<div class="s-entree-corps"><span class="s-type">' + ico(a.type) + (O.TYPES_ACTU[a.type] || 'Actualité') + '</span>' +
            (a.texte ? '<p>' + esc(a.texte) + '</p>' : '') + grille + '</div></li>';
        }).join('') + '</ol>' +
        (d.actualites.length > nbActusVisibles ? '<div class="s-plus"><button type="button" class="s-btn s-btn-ligne s-btn-sm" id="btn-plus">Voir les nouvelles plus anciennes</button></div>' : '') +
        '</section>';
    }

    if (montrer.projets) {
      h += '<section class="s-section" id="projets">' + entete(nom, t, 'Nos projets', 'Chaque franc versé va au projet choisi.') + '<div class="s-projets n' + Math.min(d.projets.length, 3) + '">' +
        d.projets.map(function (p, i) {
          var pct = p.objectif ? Math.min(100, Math.round(p.collecte / p.objectif * 100)) : 0;
          var waP = waLien(contact.whatsapp, 'Bonjour, je souhaite soutenir votre projet « ' + p.titre + ' ».');
          var jauge = p.objectif ? '<div class="s-jauge" role="progressbar" aria-valuemin="0" aria-valuemax="' + p.objectif + '" aria-valuenow="' + p.collecte + '" aria-label="Collecte : ' + pct + ' %">' +
            '<div class="fond-jauge">' + E.svg(nom, t, { largeur: 600, hauteur: 18, sens: 'h', motif: 12, cle: 'j' + i, ratio: 'none' }) + '</div>' +
            '<div class="tisse" style="clip-path:inset(0 ' + (100 - pct) + '% 0 0)">' + E.svg(nom, t, { largeur: 600, hauteur: 18, sens: 'h', motif: 12, cle: 'k' + i, ratio: 'none' }) + '</div></div>' : '';
          return '<article class="s-projet"><h3>' + esc(p.titre) + '</h3>' + (p.description ? '<p>' + esc(p.description) + '</p>' : '') +
            (p.objectif ? '<div class="s-montant">' + O.nb(p.collecte) + '<small>FCFA réunis</small></div>' + jauge +
              '<div class="s-meta"><span>' + pct + ' % de ' + O.fcfa(p.objectif) + '</span><span>' + p.donateurs + ' donateur' + (p.donateurs > 1 ? 's' : '') + '</span></div>' : '') +
            (waP ? '<a class="s-btn s-btn-accent s-btn-sm" href="' + waP + '" target="_blank" rel="noopener">' + ico('coeur') + 'Soutenir ce projet</a>' : '') + '</article>';
        }).join('') + '</div></section>';
    }

    if (montrer.besoins) {
      h += '<section class="s-section" id="besoins">' + entete(nom, t, 'Comment nous aider', 'Un don, du temps ou du matériel : tout compte.') + '<ul class="s-besoins">' +
        o.besoins.map(function (b) {
          var waB = waLien(contact.whatsapp, 'Bonjour, je peux vous aider pour : ' + b.titre + '.');
          return '<li class="s-besoin"><span class="s-besoin-ico">' + ico(ICONES_BESOIN[b.type] || 'besoin', 'ico-lg') + '</span>' +
            '<div><small>' + esc(O.TYPES_BESOIN[b.type] || 'Besoin') + '</small><h3>' + esc(b.titre) + '</h3>' + (b.detail ? '<p>' + esc(b.detail) + '</p>' : '') + '</div>' +
            (waB ? '<a class="s-btn s-btn-ligne s-btn-sm" href="' + waB + '" target="_blank" rel="noopener">Je peux aider</a>' : '') + '</li>';
        }).join('') + '</ul></section>';
    }

    if (montrer.galerie) {
      h += '<section class="s-section" id="galerie">' + entete(nom, t, 'En images') + '<div class="s-galerie">' +
        photos.slice(0, 15).map(function (p) { return '<button type="button" data-photo="' + esc(p) + '" aria-label="Voir la photo en grand"><img src="' + esc(p) + '" alt="" loading="lazy"></button>'; }).join('') + '</div></section>';
    }

    if (montrer.documents) {
      var noms_docs = {}; O.DOCS.forEach(function (x) { noms_docs[x[0]] = x[1]; });
      h += '<section class="s-section" id="documents">' + entete(nom, t, 'Une association de confiance') + '<div class="s-confiance">' +
        '<div class="s-confiance-titre"><span class="s-sceau-verif">' + ico('bouclier', 's-ico-verif') + '</span><div><b>' + (verifiee ? 'Vérifiée par MinVa' : 'Documents contrôlés par MinVa') + '</b>' +
        '<span>Nos documents officiels ont été contrôlés par l’équipe MinVa.</span></div></div>' +
        (docsVerifies.length ? '<ul class="s-docs">' + docsVerifies.map(function (x) { return '<li>' + ico('verifie') + esc(noms_docs[x.type] || x.type) + (x.annee ? ' <small>' + x.annee + '</small>' : '') + '</li>'; }).join('') + '</ul>' : '<div></div>') +
        '</div></section>';
    }

    if (montrer.equipe) {
      h += '<section class="s-section" id="equipe">' + entete(nom, t, 'Le bureau') + '<ul class="s-bureau">' +
        o.equipe.map(function (m) { return '<li class="s-membre"><span class="s-anneau" aria-hidden="true">' + E.sceau(nom + m.nom, O.sigleDe(m.nom).slice(0, 2), t, { echelle: ech }) + '</span><div><b>' + esc(m.nom) + '</b><span>' + esc(m.role) + '</span></div></li>'; }).join('') + '</ul></section>';
    }

    if (montrer.contact) {
      h += '<section class="s-section" id="contact"><div class="s-contact"><div class="s-contact-texte"><h2 class="titre">Parlons-en</h2><p>Une question, une envie d’aider, un partenariat ? Écrivez-nous, nous répondons.</p>' +
        (wa ? '<a class="s-btn s-btn-accent" href="' + wa + '" target="_blank" rel="noopener">' + ico('whatsapp') + 'Écrire sur WhatsApp</a>' : '') +
        '<ul class="s-coord">' +
        (contact.telephone ? '<li>' + ico('tel', 'ico-lg') + '<span class="num">' + esc(contact.telephone) + '</span></li>' : '') +
        (contact.email ? '<li>' + ico('email', 'ico-lg') + '<a href="mailto:' + esc(contact.email) + '">' + esc(contact.email) + '</a></li>' : '') +
        (contact.facebook ? '<li>' + ico('facebook', 'ico-lg') + '<a href="' + esc(/^https?:/.test(contact.facebook) ? contact.facebook : 'https://facebook.com/' + contact.facebook) + '" target="_blank" rel="noopener">Facebook</a></li>' : '') +
        (contact.adresse ? '<li>' + ico('lieu', 'ico-lg') + '<span>' + esc(contact.adresse) + '</span></li>' : '') +
        '</ul></div><div class="s-contact-etoffe" aria-hidden="true">' + E.svg(nom, t, { largeur: 400, hauteur: 400, sens: 'v', cle: 'c' }) + '</div></div></section>';
    }
    h += '</main>';

    var vitrineUrl = (window.MINVA_CONFIG && window.MINVA_CONFIG.URL_VITRINE) || 'index.html';
    h += '<footer class="s-pied"><div class="s-pied-etoffe" aria-hidden="true">' + E.svg(nom, t, { largeur: 1400, hauteur: 14, sens: 'h', motif: 10, cle: 'p', ratio: 'none' }) + '</div>' +
      '<div class="s-pied-in"><span>© ' + new Date().getFullYear() + ' ' + esc(o.nom) + '</span>' +
      '<a class="s-minva" href="' + esc(vitrineUrl) + '" target="_top" rel="noopener"><span>Site créé avec</span><img src="assets/horizontal-noir.png" alt="MinVa" width="70" height="22"></a></div></footer>';

    // Barre d'action fixe sur téléphone : WhatsApp, Soutenir, Partager
    var actions = [];
    if (wa) actions.push('<a class="s-btn s-btn-accent" href="' + wa + '" target="_blank" rel="noopener">' + ico('whatsapp') + 'WhatsApp</a>');
    if (soutenir) actions.push('<a class="s-btn s-btn-ligne" href="' + soutenir + '">' + ico('coeur') + 'Soutenir</a>');
    actions.push('<button type="button" class="s-btn s-btn-ligne" data-partager>' + ico('partage') + 'Partager</button>');
    h += '<nav class="s-barre-action" aria-label="Actions rapides">' + actions.join('') + '</nav>';

    app.innerHTML = h;
    app.removeAttribute('aria-busy');
    brancher();
  }

  function brancher() {
    var plus = document.getElementById('btn-plus');
    if (plus) plus.onclick = function () { nbActusVisibles += 5; rendre(); document.getElementById('actualites').scrollIntoView(); };
    Array.prototype.forEach.call(app.querySelectorAll('[data-partager]'), function (b) { b.onclick = partager; });
  }

  // Visionneuse
  var vis = document.getElementById('visionneuse');
  document.getElementById('vis-fermer').innerHTML = ico('fermer', 'ico-lg');
  document.getElementById('vis-prec').innerHTML = ico('retour', 'ico-lg');
  document.getElementById('vis-suiv').innerHTML = ico('suite', 'ico-lg');
  function montrerPhoto(i) {
    idxPhoto = (i + photos.length) % photos.length;
    document.getElementById('vis-img').src = photos[idxPhoto];
    document.getElementById('vis-compte').textContent = (idxPhoto + 1) + ' / ' + photos.length;
  }
  app.addEventListener('click', function (e) {
    var b = e.target.closest('[data-photo]'); if (!b) return;
    montrerPhoto(Math.max(0, photos.indexOf(b.dataset.photo)));
    vis.showModal();
  });
  document.getElementById('vis-fermer').onclick = function () { vis.close(); };
  document.getElementById('vis-prec').onclick = function () { montrerPhoto(idxPhoto - 1); };
  document.getElementById('vis-suiv').onclick = function () { montrerPhoto(idxPhoto + 1); };
  vis.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') montrerPhoto(idxPhoto - 1); if (e.key === 'ArrowRight') montrerPhoto(idxPhoto + 1); });
  vis.addEventListener('click', function (e) { if (e.target === vis) vis.close(); });

  // Partage
  var fen = document.getElementById('fen-partage');
  fen.querySelector('[data-fermer]').innerHTML = ico('fermer', 'ico-lg');
  fen.querySelector('[data-fermer]').onclick = function () { fen.close(); };
  function partager() {
    var lien = lienSite(), o = donnees.org;
    var texte = o.nom + (o.slogan ? ' : ' + o.slogan : '') + '\n' + lien;
    if (navigator.share && !apercu) { navigator.share({ title: o.nom, text: o.slogan || o.nom, url: lien }).catch(function () {}); return; }
    document.getElementById('partage-corps').innerHTML =
      '<div class="partage-lien"><input type="text" readonly value="' + esc(lien) + '" aria-label="Lien du site"><button type="button" class="btn btn-noir" id="copier-lien">' + ico('copier') + 'Copier</button></div>' +
      '<div class="partage-reseaux"><a class="btn btn-secondaire" href="https://wa.me/?text=' + encodeURIComponent(texte) + '" target="_blank" rel="noopener">' + ico('whatsapp') + 'WhatsApp</a>' +
      '<a class="btn btn-secondaire" href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(lien) + '" target="_blank" rel="noopener">' + ico('facebook') + 'Facebook</a></div>';
    document.getElementById('copier-lien').onclick = function () { O.copier(lien).then(function () { O.toast('Lien copié'); }); };
    fen.showModal();
  }

  // Aperçu en direct depuis la console admin (et téléphone de démonstration de la vitrine)
  if (apercu || vitrine) {
    window.addEventListener('message', function (e) {
      if (e.origin !== location.origin || !e.data || e.data.type !== 'minva-apercu' || !donnees) return;
      Object.assign(donnees.org, e.data.org);
      if (e.data.actualites) donnees.actualites = e.data.actualites;
      if (e.data.projets) donnees.projets = e.data.projets;
      rendre();
    });
  }

  if (!slug) { introuvable(); return; }
  window.MV.site.parSlug(slug).then(function (d) {
    if (!d) { introuvable(); return; }
    donnees = d; rendre();
    if ((apercu || vitrine) && window.parent !== window) window.parent.postMessage({ type: 'minva-apercu-pret' }, location.origin);
  }).catch(function (e) {
    window.MV.erreur('site', e.message);
    app.removeAttribute('aria-busy');
    app.innerHTML = '<div class="s-introuvable"><h1>Le site n’a pas pu se charger</h1><p>' + esc(e.message) + '</p><p><button class="btn btn-noir" onclick="location.reload()">Réessayer</button></p></div>';
  });
  window.addEventListener('error', function (e) { window.MV.erreur('site', e.message); });
})();
