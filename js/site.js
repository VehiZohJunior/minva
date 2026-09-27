// =====================================================================
// MinVa — site public d'une organisation
// Adresse : site.html?o=<adresse-du-site>   (ou /<adresse> via 404.html)
// Mode aperçu (console admin) : site.html?o=<adresse>&apercu=1
// =====================================================================
(function () {
  var O = window.MVO, esc = O.esc, ico = O.ico;
  var params = new URLSearchParams(location.search);
  var slug = (params.get('o') || '').toLowerCase();
  var apercu = params.get('apercu') === '1';
  var vitrine = params.get('vitrine') === '1'; // téléphone de démonstration du site vitrine
  var app = document.getElementById('app');
  var donnees = null, photos = [], idxPhoto = 0, nbActusVisibles = 6;

  function waLien(num, texte) {
    var n = String(num || '').replace(/[^0-9]/g, '');
    return n ? 'https://wa.me/' + n + (texte ? '?text=' + encodeURIComponent(texte) : '') : '';
  }
  function lienSite() { return window.MV.lienSite(donnees.org.slug); }

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
    document.body.style.background = t.fond;
    document.title = o.nom + (o.slogan ? ' · ' + o.slogan : '');
    var meta = document.querySelector('meta[name="description"]'); if (meta) meta.setAttribute('content', o.mission || o.slogan || o.nom);
    var sect = O.SECTEURS[o.secteur] || O.SECTEURS.education;
    var contact = o.contact || {};
    var wa = waLien(contact.whatsapp, 'Bonjour ' + o.nom + ', je vous écris depuis votre site MinVa.');
    var sigle = o.sigle || O.sigleDe(o.nom);
    var logo = o.logo_url ? '<img src="' + esc(o.logo_url) + '" alt="">' : esc(sigle);

    photos = [];
    d.actualites.forEach(function (a) { (a.photos || []).forEach(function (p) { photos.push(p); }); });
    var docsVerifies = d.documents.filter(function (x) { return x.statut === 'verifie'; }).length;

    var montrer = {
      apropos: r.apropos !== false && (o.mission || o.apropos),
      actualites: r.actualites !== false && d.actualites.length,
      projets: r.projets !== false && d.projets.length,
      besoins: r.besoins !== false && (o.besoins || []).length,
      galerie: r.galerie !== false && photos.length >= 3,
      documents: r.documents !== false && d.documents.length,
      equipe: r.equipe !== false && (o.equipe || []).length,
      contact: r.contact !== false && (contact.telephone || contact.whatsapp || contact.email || contact.facebook || contact.adresse)
    };
    var noms = { apropos: 'À propos', actualites: 'Actualités', projets: 'Projets', besoins: 'Nous aider', galerie: 'Photos', documents: 'Transparence', equipe: 'Équipe', contact: 'Contact' };
    var nav = Object.keys(noms).filter(function (k) { return montrer[k] && k !== 'galerie'; }).slice(0, 6)
      .map(function (k) { return '<a href="#' + k + '">' + noms[k] + '</a>'; }).join('');

    var h = '';
    if (apercu) h += '<div class="apercu-bandeau">Aperçu en direct · les visiteurs verront ce site une fois enregistré</div>';

    h += '<header class="s-barre"><div class="s-barre-in">' +
      '<a class="s-marque" href="#haut"><span class="mono">' + logo + '</span><b>' + esc(o.nom) + '</b></a>' +
      '<nav class="s-nav" aria-label="Sections">' + nav + '</nav>' +
      '<button type="button" class="s-btn s-btn-clair s-btn-sm s-partager" id="btn-partager">' + ico('partage') + 'Partager</button>' +
      '</div></header>';

    // Héros
    h += '<section class="s-hero' + (o.couverture_url ? '' : ' sans-photo') + '" id="haut">' +
      (o.couverture_url ? '<img class="s-hero-photo" src="' + esc(o.couverture_url) + '" alt="">' : '<div class="s-hero-motif bogolan"></div>') +
      '<div class="s-hero-voile"></div><div class="s-hero-in">' +
      '<span class="mono s-logo">' + logo + '</span>' +
      '<div class="badges"><span class="badge b-sect" style="--c:' + sect.c + ';--sur:' + sect.sur + '">' + ico(o.secteur) + sect.nom + '</span>' +
      (o.statut_verification === 'verifie' ? '<span class="badge b-verifie">' + ico('verifie') + 'Vérifié par MinVa</span>' : '') + '</div>' +
      '<h1>' + esc(o.nom) + '</h1>' +
      (o.slogan ? '<p class="s-slogan">' + esc(o.slogan) + '</p>' : '') +
      ((o.ville || o.region) ? '<p class="s-lieu">' + ico('lieu') + esc([o.ville, o.region].filter(Boolean).join(' · ')) + (o.annee_creation ? ' · depuis ' + o.annee_creation : '') + '</p>' : '') +
      '<div class="s-actions">' +
      (montrer.projets || montrer.besoins ? '<a class="s-btn s-btn-accent" href="#' + (montrer.projets ? 'projets' : 'besoins') + '">' + ico('coeur') + 'Nous soutenir</a>' : '') +
      (wa ? '<a class="s-btn s-btn-clair" href="' + wa + '" target="_blank" rel="noopener">' + ico('whatsapp') + 'Nous écrire sur WhatsApp</a>' : '') +
      '</div></div></section>';

    // Chiffres
    var annees = o.annee_creation ? (new Date().getFullYear() - o.annee_creation) : null;
    var chiffres = [];
    if (o.beneficiaires) chiffres.push([O.nb(o.beneficiaires), o.beneficiaires_label || 'bénéficiaires']);
    if (o.membres) chiffres.push([O.nb(o.membres), 'membres']);
    if (annees) chiffres.push([annees, annees > 1 ? 'années d’action' : 'année d’action']);
    if (d.actualites.length) chiffres.push([d.actualites.length, d.actualites.length > 1 ? 'actualités publiées' : 'actualité publiée']);
    if (d.projets.length && chiffres.length < 4) chiffres.push([d.projets.length, 'projets en cours']);
    if (chiffres.length >= 2) {
      h += '<div class="s-chiffres"><div class="s-chiffres-in">' + chiffres.slice(0, 4).map(function (c) { return '<div><b>' + c[0] + '</b><span>' + esc(c[1]) + '</span></div>'; }).join('') + '</div></div>';
    }

    h += '<main>';
    if (montrer.apropos) {
      h += '<section class="s-section" id="apropos"><div class="s-titre"><h2>À propos</h2></div><div class="s-apropos">' +
        (o.mission ? '<p class="s-mission">' + esc(o.mission) + '</p>' : '<div></div>') +
        '<div class="s-apropos-texte">' + (o.apropos ? '<p>' + esc(o.apropos) + '</p>' : '') +
        '<dl class="s-def">' + (o.zone ? '<dt>Zone d’action</dt><dd>' + esc(o.zone) + '</dd>' : '') + (o.langues ? '<dt>Langues parlées</dt><dd>' + esc(o.langues) + '</dd>' : '') +
        (o.annee_creation ? '<dt>Création</dt><dd>' + o.annee_creation + '</dd>' : '') + '</dl></div></div></section>';
    }

    if (montrer.actualites) {
      var visibles = d.actualites.slice(0, nbActusVisibles);
      h += '<section class="s-section" id="actualites"><div class="s-titre"><h2>Actualités</h2><p>Dernière publication ' + O.quand(d.actualites[0].created_at) + '</p></div><div class="s-fil">' +
        visibles.map(function (a) {
          var ph = a.photos || [];
          var grille = ph.length ? '<div class="s-photos n' + ph.length + '">' + ph.map(function (p) {
            return '<button type="button" data-photo="' + esc(p) + '" aria-label="Voir la photo en grand"><img src="' + esc(p) + '" alt="" loading="lazy"></button>';
          }).join('') + '</div>' : '';
          return '<article class="s-carte s-post"><div class="s-post-tete"><span class="s-type">' + ico(a.type) + (O.TYPES_ACTU[a.type] || 'Actualité') + '</span><time datetime="' + a.created_at + '" title="' + esc(O.dateLongue(a.created_at)) + '">' + O.quand(a.created_at) + '</time></div>' +
            grille + (a.texte ? '<p>' + esc(a.texte) + '</p>' : '') + '</article>';
        }).join('') + '</div>' +
        (d.actualites.length > nbActusVisibles ? '<div class="s-plus"><button type="button" class="s-btn s-btn-ligne" id="btn-plus">Voir les actualités plus anciennes</button></div>' : '') +
        '</section>';
    }

    if (montrer.projets) {
      h += '<section class="s-section" id="projets"><div class="s-titre"><h2>Nos projets</h2><p>Chaque franc versé va au projet choisi.</p></div><div class="s-projets">' +
        d.projets.map(function (p) {
          var pct = p.objectif ? Math.min(100, Math.round(p.collecte / p.objectif * 100)) : 0;
          var waP = waLien(contact.whatsapp, 'Bonjour, je souhaite soutenir votre projet « ' + p.titre + ' ».');
          return '<article class="s-carte s-projet"><h3>' + esc(p.titre) + '</h3>' + (p.description ? '<p>' + esc(p.description) + '</p>' : '') +
            (p.objectif ? '<span class="s-montant">' + O.fcfa(p.collecte) + '</span><div class="piste" role="progressbar" aria-valuemin="0" aria-valuemax="' + p.objectif + '" aria-valuenow="' + p.collecte + '" aria-label="Collecte"><i style="width:' + pct + '%"></i></div>' +
              '<div class="s-meta"><span>' + pct + ' % de ' + O.fcfa(p.objectif) + '</span><span>' + p.donateurs + ' donateur' + (p.donateurs > 1 ? 's' : '') + '</span></div>' : '') +
            (waP ? '<a class="s-btn s-btn-accent s-btn-sm" href="' + waP + '" target="_blank" rel="noopener">' + ico('coeur') + 'Soutenir ce projet</a>' : '') + '</article>';
        }).join('') + '</div></section>';
    }

    if (montrer.besoins) {
      h += '<section class="s-section" id="besoins"><div class="s-titre"><h2>Comment nous aider</h2><p>Un don, du temps ou du matériel : tout compte.</p></div><div class="s-besoins">' +
        o.besoins.map(function (b) {
          var waB = waLien(contact.whatsapp, 'Bonjour, je peux vous aider pour : ' + b.titre + '.');
          return '<article class="s-carte s-besoin">' + ico('besoin', 'ico-xl') + '<small>' + esc(O.TYPES_BESOIN[b.type] || 'Besoin') + '</small><h3>' + esc(b.titre) + '</h3><p>' + esc(b.detail || '') + '</p>' +
            (waB ? '<a href="' + waB + '" target="_blank" rel="noopener">Je peux aider</a>' : '') + '</article>';
        }).join('') + '</div></section>';
    }

    if (montrer.galerie) {
      h += '<section class="s-section" id="galerie"><div class="s-titre"><h2>En images</h2><p>' + photos.length + ' photos publiées</p></div><div class="s-galerie">' +
        photos.slice(0, 16).map(function (p) { return '<button type="button" data-photo="' + esc(p) + '" aria-label="Voir la photo en grand"><img src="' + esc(p) + '" alt="" loading="lazy"></button>'; }).join('') + '</div></section>';
    }

    if (montrer.documents) {
      h += '<section class="s-section" id="documents"><div class="s-titre"><h2>Transparence</h2></div><div class="s-docs">' +
        '<div class="s-confiance"><b>' + docsVerifies + '/6</b><p>documents officiels contrôlés par l’équipe MinVa : statuts, déclaration, bureau, assemblée générale et rapports.</p></div>' +
        '<ul class="s-carte s-doc-liste">' + O.DOCS.map(function (dd) {
          var doc = d.documents.find(function (x) { return x.type === dd[0]; });
          var e = !doc ? 'manquant' : doc.statut === 'verifie' ? 'ok' : 'attente';
          var etat = e === 'ok' ? '<span class="etat etat-ok">' + ico('verifie') + '</span>' : e === 'attente' ? '<span class="etat etat-attente">' + ico('horloge') + '</span>' : '<span class="etat etat-manquant"></span>';
          var txt = e === 'ok' ? 'Vérifié' + (doc.annee ? ' · ' + doc.annee : '') : e === 'attente' ? 'En cours de contrôle' : 'Non fourni';
          return '<li>' + etat + '<span>' + dd[1] + '</span><small>' + txt + '</small></li>';
        }).join('') + '</ul></div></section>';
    }

    if (montrer.equipe) {
      h += '<section class="s-section" id="equipe"><div class="s-titre"><h2>L’équipe</h2></div><div class="s-equipe">' +
        o.equipe.map(function (m) { return '<div class="s-carte s-membre"><span class="mono">' + esc(O.sigleDe(m.nom).slice(0, 2)) + '</span><div><b>' + esc(m.nom) + '</b><span>' + esc(m.role) + '</span></div></div>'; }).join('') + '</div></section>';
    }

    if (montrer.contact) {
      h += '<section class="s-section" id="contact"><div class="s-contact"><div class="s-hero-motif bogolan"></div><div><h2>Parlons-en</h2><p>Une question, une envie d’aider, un partenariat ? Écrivez-nous, nous répondons.</p>' +
        (wa ? '<p style="margin-top:20px"><a class="s-btn s-btn-accent" href="' + wa + '" target="_blank" rel="noopener">' + ico('whatsapp') + 'WhatsApp</a></p>' : '') + '</div>' +
        '<ul class="s-coord">' +
        (contact.telephone ? '<li>' + ico('tel', 'ico-lg') + '<span class="num">' + esc(contact.telephone) + '</span></li>' : '') +
        (contact.email ? '<li>' + ico('email', 'ico-lg') + '<a href="mailto:' + esc(contact.email) + '">' + esc(contact.email) + '</a></li>' : '') +
        (contact.facebook ? '<li>' + ico('facebook', 'ico-lg') + '<a href="' + esc(/^https?:/.test(contact.facebook) ? contact.facebook : 'https://facebook.com/' + contact.facebook) + '" target="_blank" rel="noopener">Facebook</a></li>' : '') +
        (contact.adresse ? '<li>' + ico('lieu', 'ico-lg') + '<span>' + esc(contact.adresse) + '</span></li>' : '') +
        '</ul></div></section>';
    }
    h += '</main>';

    h += '<footer class="s-pied"><div class="s-pied-in"><span>© ' + new Date().getFullYear() + ' ' + esc(o.nom) + '</span>' +
      '<a class="s-minva" href="' + esc((window.MINVA_CONFIG && window.MINVA_CONFIG.URL_VITRINE) || 'index.html') + '" target="_top" rel="noopener"><span>Site créé avec</span><img src="assets/horizontal-noir.png" alt="MinVa" width="70" height="22"></a></div></footer>';

    app.innerHTML = h;
    app.removeAttribute('aria-busy');
    brancher();
  }

  function brancher() {
    var plus = document.getElementById('btn-plus');
    if (plus) plus.onclick = function () { nbActusVisibles += 6; rendre(); document.getElementById('actualites').scrollIntoView(); };
    document.getElementById('btn-partager').onclick = partager;
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

  // Aperçu en direct depuis la console admin
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
