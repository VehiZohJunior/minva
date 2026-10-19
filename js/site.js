// =====================================================================
// MinVa — site public d'une organisation (association, coopérative, club…) · direction « L'Étoffe »
// Adresse : site.html?o=<adresse-du-site>   (ou /<adresse> via 404.html)
// Mode aperçu (console admin) : site.html?o=<adresse>&apercu=1
// Vague 1 : agenda + inscriptions, dons Mobile Money + mur des donateurs, « Devenir membre »,
// lecture audio, images de partage, statistiques de visite, site installable.
// =====================================================================
(function () {
  var O = window.MVO, esc = O.esc, ico = O.ico, E = window.MinVaEtoffe;
  var params = new URLSearchParams(location.search);
  var slug = (params.get('o') || '').toLowerCase();
  var apercu = params.get('apercu') === '1';
  var vitrine = params.get('vitrine') === '1'; // téléphone de démonstration du site vitrine
  var horsLigneStats = apercu || vitrine;      // l'aperçu et la démonstration ne comptent pas comme des visites
  var app = document.getElementById('app');
  var donnees = null, photos = [], idxPhoto = 0, nbActusVisibles = 5;

  // Certaines polices sont larges : on ajuste leur taille pour garder des titres équilibrés
  var ECHELLE = { 'Unbounded': 0.78, 'Syne': 0.9, 'Sora': 0.9, 'Bricolage Grotesque': 0.94 };
  var ICONES_BESOIN = { financement: 'coeur', benevoles: 'equipe', materiel: 'boite', formation: 'etincelle', partenariat: 'lien' };
  var MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  var JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
  // Moyens de paiement Mobile Money : [clé dans contact, nom affiché, couleur du repère]
  var MOYENS = [['orange', 'Orange Money', '#FF7900'], ['mtn', 'MTN MoMo', '#FFCB05'], ['moov', 'Moov Money', '#0093DD'], ['wave', 'Wave', '#1DC8F2']];
  var TTS = 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';

  function waLien(num, texte) {
    var n = String(num || '').replace(/[^0-9]/g, '');
    return n ? 'https://wa.me/' + n + (texte ? '?text=' + encodeURIComponent(texte) : '') : '';
  }
  function lienSite(source) { return window.MV.lienSite(donnees.org.slug) + (source ? '?s=' + source : ''); }
  function fil(nom, t) { return '<span class="s-fil" aria-hidden="true">' + E.svg(nom, t, { largeur: 112, hauteur: 20, sens: 'h', motif: 14 }) + '</span>'; }
  function entete(nom, t, titre, sous) {
    return '<div class="s-entete">' + fil(nom, t) + '<h2 class="titre">' + titre + '</h2>' + (sous ? '<p>' + sous + '</p>' : '') + '</div>';
  }
  function heure(d) { return d.getHours() + ' h' + (d.getMinutes() ? ' ' + String(d.getMinutes()).padStart(2, '0') : ''); }
  function moyensActifs(c) { return MOYENS.filter(function (m) { return String(c[m[0]] || '').trim(); }); }

  // ---------- Statistiques (comptes anonymes par jour) ----------
  function source() {
    var s = params.get('s'); if (s) return s.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 20) || 'direct';
    var r = document.referrer || '';
    if (!r) return 'direct';
    if (/facebook\.|fb\.me|messenger/.test(r)) return 'facebook';
    if (/whatsapp/.test(r)) return 'whatsapp';
    if (/google\.|bing\.|yahoo\./.test(r)) return 'recherche';
    if (r.indexOf(location.origin) === 0) return 'annuaire';
    return 'autre';
  }
  var SOURCE = source();
  function compter(type) { if (!horsLigneStats && donnees) window.MV.public.compter(donnees.org.id, type, type === 'vue' ? SOURCE : 'direct'); }

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
    var maintenant = new Date();
    var aVenir = (d.evenements || []).filter(function (e) { return new Date(e.fin || e.debut) >= maintenant; });
    var passes = (d.evenements || []).filter(function (e) { return new Date(e.fin || e.debut) < maintenant; }).reverse().slice(0, 3);
    var moyens = moyensActifs(contact);

    var montrer = {
      apropos: r.apropos !== false && (o.mission || o.apropos),
      agenda: r.agenda !== false && (aVenir.length || passes.length),
      actualites: r.actualites !== false && d.actualites.length,
      projets: r.projets !== false && d.projets.length,
      don: r.dons !== false && (moyens.length || contact.lien_wave),
      besoins: r.besoins !== false && (o.besoins || []).length,
      galerie: r.galerie !== false && photos.length >= 3,
      documents: r.documents !== false && (docsVerifies.length || verifiee),
      equipe: r.equipe !== false && (o.equipe || []).length,
      rejoindre: r.rejoindre !== false,
      contact: r.contact !== false && (contact.telephone || contact.whatsapp || contact.email || contact.facebook || contact.adresse)
    };
    var soutenir = montrer.don ? '#don' : montrer.projets ? '#projets' : montrer.besoins ? '#besoins' : '';
    var noms = { apropos: 'À propos', agenda: 'Agenda', actualites: 'Actualités', projets: 'Projets', don: 'Faire un don', besoins: 'Nous aider', documents: 'Confiance', equipe: 'Bureau', contact: 'Contact' };
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
      '<div class="s-badges"><span class="s-badge s-badge-type">' + esc(O.typeDe(o)[1]) + '</span>' +
      '<span class="s-badge s-badge-sect" style="--c:' + sect.c + ';--sur:' + sect.sur + '">' + ico(o.secteur) + sect.nom + '</span>' +
      (verifiee ? '<span class="s-badge s-badge-verif">' + ico('verifie') + O.accord(o, 'Vérifié', 'Vérifiée') + ' par MinVa</span>' : '') + '</div>' +
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
    if (verifiee) faits.push(['<span class="ico-lg">' + ico('bouclier', 'ico-lg') + '</span>', O.accord(o, 'Vérifié', 'Vérifiée'), 'par MinVa']);
    if (o.annee_creation) faits.push(['<span class="ico-lg">' + ico('horloge', 'ico-lg') + '</span>', 'Depuis ' + o.annee_creation, (new Date().getFullYear() - o.annee_creation) + ' ans d’action']);
    if (o.beneficiaires) faits.push(['<span class="ico-lg">' + ico('coeur', 'ico-lg') + '</span>', O.nb(o.beneficiaires), o.beneficiaires_label || 'bénéficiaires']);
    if (o.membres) faits.push(['<span class="ico-lg">' + ico('equipe', 'ico-lg') + '</span>', O.nb(o.membres), 'membres']);
    var derniere = d.actualites[0];
    if (derniere && O.joursDepuis(derniere.created_at) <= 30) faits.push(['<span class="s-pastille-vie" aria-hidden="true"></span>', O.accord(o, 'Actif', 'Active'), 'dernière nouvelle ' + O.quand(derniere.created_at)]);
    if (faits.length >= 2) {
      h += '<div class="s-passeport"><ul aria-label="' + esc(O.maj(O.typeTexte(o, 'le'))) + ' en bref">' + faits.slice(0, 5).map(function (f) { return '<li>' + f[0] + '<div><b>' + esc(f[1]) + '</b><span>' + esc(f[2]) + '</span></div></li>'; }).join('') + '</ul></div>';
    }

    h += '<main>';
    if (montrer.apropos) {
      h += '<section class="s-section" id="apropos">' + entete(nom, t, 'Notre mission') + '<div class="s-apropos">' +
        (o.mission ? '<div><p class="s-mission">' + esc(o.mission) + '</p>' + boutonEcoute([o.nom, o.slogan, o.mission, o.apropos].filter(Boolean).join('. '), 'Écouter la présentation') + '</div>' : '<div></div>') +
        '<div class="s-histoire">' + (o.apropos ? '<p>' + esc(o.apropos) + '</p>' : '') +
        '<dl class="s-faits">' + (o.zone ? '<dt>Zone d’action</dt><dd>' + esc(o.zone) + '</dd>' : '') + (o.langues ? '<dt>Langues parlées</dt><dd>' + esc(o.langues) + '</dd>' : '') +
        (o.annee_creation ? '<dt>Création</dt><dd>' + o.annee_creation + '</dd>' : '') + '</dl></div></div></section>';
    }

    // ----- Agenda : événements à venir, avec inscription -----
    if (montrer.agenda) {
      h += '<section class="s-section" id="agenda">' + entete(nom, t, 'Agenda', aVenir.length ? 'Nos prochains rendez-vous. Inscrivez-vous en un instant.' : 'Nos derniers rendez-vous.') +
        (aVenir.length ? '<div class="s-agenda">' + aVenir.map(function (e) { return carteEvt(e, false); }).join('') + '</div>' : '') +
        (passes.length ? '<details class="s-passes"' + (aVenir.length ? '' : ' open') + '><summary>Rendez-vous passés</summary><div class="s-agenda s-agenda-passe">' + passes.map(function (e) { return carteEvt(e, true); }).join('') + '</div></details>' : '') +
        '</section>';
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
            (a.texte ? '<p>' + esc(a.texte) + '</p>' : '') + grille +
            '<div class="s-entree-actions">' + (a.texte ? boutonEcoute(a.texte, 'Écouter') : '') +
            '<button type="button" class="s-mini-btn" data-image-actu="' + esc(a.id) + '">' + ico('photo') + 'Image à partager</button></div></div></li>';
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
          var bouton = montrer.don ? '<button type="button" class="s-btn s-btn-accent s-btn-sm" data-don="' + esc(p.id) + '">' + ico('coeur') + 'Soutenir ce projet</button>'
            : waP ? '<a class="s-btn s-btn-accent s-btn-sm" href="' + waP + '" target="_blank" rel="noopener">' + ico('coeur') + 'Soutenir ce projet</a>' : '';
          return '<article class="s-projet"><h3>' + esc(p.titre) + '</h3>' + (p.description ? '<p>' + esc(p.description) + '</p>' : '') +
            (p.objectif ? '<div class="s-montant">' + O.nb(p.collecte) + '<small>FCFA réunis</small></div>' + jauge +
              '<div class="s-meta"><span>' + pct + ' % de ' + O.fcfa(p.objectif) + '</span><span>' + p.donateurs + ' donateur' + (p.donateurs > 1 ? 's' : '') + '</span></div>' : '') +
            bouton + '</article>';
        }).join('') + '</div></section>';
    }

    // ----- Faire un don : Mobile Money direct, puis déclaration ; mur des donateurs -----
    if (montrer.don) {
      var dons = d.dons || [];
      h += '<section class="s-section" id="don">' + entete(nom, t, 'Faire un don', 'Envoyez votre don par Mobile Money, directement à ' + esc(O.typeTexte(o, 'le')) + '. MinVa ne prend aucune commission.') +
        '<div class="s-don"><div class="s-don-etapes"><ol class="s-etapes-don"><li><b>Envoyez</b> le montant de votre choix à l’un de ces numéros.</li><li><b>Prévenez-nous</b> avec le bouton « J’ai fait un don » : votre geste apparaîtra sur notre mur des donateurs.</li></ol>' +
        '<ul class="s-moyens">' + moyens.map(function (m) {
          return '<li><span class="s-moyen-pastille" style="background:' + m[2] + '" aria-hidden="true"></span><div><small>' + m[1] + '</small><b class="num">' + esc(contact[m[0]]) + '</b></div>' +
            '<button type="button" class="s-mini-btn" data-copier="' + esc(String(contact[m[0]]).replace(/\s+/g, '')) + '">' + ico('copier') + 'Copier</button></li>';
        }).join('') + '</ul>' +
        (/^https:\/\/(pay\.)?wave\.com\//.test(contact.lien_wave || '') ? '<a class="s-btn s-btn-ligne" href="' + esc(contact.lien_wave) + '" target="_blank" rel="noopener">' + ico('lien') + 'Payer directement avec Wave</a>' : '') +
        '<button type="button" class="s-btn s-btn-accent" data-don="">' + ico('coeur') + 'J’ai fait un don</button></div>' +
        '<div class="s-mur"><h3>Ils nous ont soutenus</h3>' + (dons.length ? '<ul>' + dons.map(function (x) {
          var p = x.projet_id && d.projets.find(function (pp) { return pp.id === x.projet_id; });
          return '<li><span class="s-mur-mono" aria-hidden="true">' + esc(x.nom ? O.sigleDe(x.nom).slice(0, 2) : '♥') + '</span><div><b>' + esc(x.nom || 'Un donateur anonyme') + '</b> <span class="num">' + O.fcfa(x.montant) + '</span>' +
            '<small>' + O.quand(x.created_at) + (p ? ' · ' + esc(p.titre) : '') + '</small>' + (x.message ? '<q>' + esc(x.message) + '</q>' : '') + '</div></li>';
        }).join('') + '</ul>' : '<p class="s-mur-vide">Soyez le premier à apparaître ici. Chaque don, même petit, compte.</p>') + '</div></div></section>';
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
      h += '<section class="s-section" id="documents">' + entete(nom, t, O.maj(O.typeTexte(o, 'un')) + ' de confiance') + '<div class="s-confiance">' +
        '<div class="s-confiance-titre"><span class="s-sceau-verif">' + ico('bouclier', 's-ico-verif') + '</span><div><b>' + (verifiee ? O.accord(o, 'Vérifié', 'Vérifiée') + ' par MinVa' : 'Documents contrôlés par MinVa') + '</b>' +
        '<span>Nos documents officiels ont été contrôlés par l’équipe MinVa.</span></div></div>' +
        (docsVerifies.length ? '<ul class="s-docs">' + docsVerifies.map(function (x) { return '<li>' + ico('verifie') + esc(noms_docs[x.type] || x.type) + (x.annee ? ' <small>' + x.annee + '</small>' : '') + '</li>'; }).join('') + '</ul>' : '<div></div>') +
        '</div></section>';
    }

    if (montrer.equipe) {
      h += '<section class="s-section" id="equipe">' + entete(nom, t, 'Le bureau') + '<ul class="s-bureau">' +
        o.equipe.map(function (m) { return '<li class="s-membre"><span class="s-anneau" aria-hidden="true">' + E.sceau(nom + m.nom, O.sigleDe(m.nom).slice(0, 2), t, { echelle: ech }) + '</span><div><b>' + esc(m.nom) + '</b><span>' + esc(m.role) + '</span></div></li>'; }).join('') + '</ul></section>';
    }

    // ----- Rejoindre : devenir membre -----
    if (montrer.rejoindre) {
      h += '<section class="s-section s-rejoindre" id="rejoindre"><div class="s-rejoindre-in"><div><h2 class="titre">Rejoignez ' + esc(O.typeTexte(o, 'le')) + '</h2>' +
        '<p>Envie de participer, de vous engager à nos côtés ? Laissez vos coordonnées : nous vous recontactons.</p></div>' +
        '<button type="button" class="s-btn s-btn-accent" data-adherer>' + ico('equipe') + 'Devenir membre</button></div></section>';
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
      '<button type="button" class="s-mini-btn" id="installer" hidden>' + ico('telecharger') + 'Installer sur mon téléphone</button>' +
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
    majInstallation();
  }

  function boutonEcoute(texte, libelle) {
    if (!TTS) return '';
    return '<button type="button" class="s-mini-btn" data-ecouter="' + esc(texte) + '" data-libelle="' + esc(libelle) + '">' + ico('actu') + esc(libelle) + '</button>';
  }

  function carteEvt(e, passe) {
    var dt = new Date(e.debut), fin = e.fin ? new Date(e.fin) : null;
    var reste = e.places ? Math.max(0, e.places - (e.inscrits || 0)) : null;
    var complet = reste === 0;
    var quand = JOURS[dt.getDay()] + ' ' + dt.getDate() + ' ' + MOIS[dt.getMonth()] + ' · ' + heure(dt) + (fin && fin.toDateString() === dt.toDateString() ? ' – ' + heure(fin) : '');
    var info = passe ? '' : e.places ? (complet ? '<span class="s-complet">Complet</span>' : '<span>' + reste + ' place' + (reste > 1 ? 's' : '') + ' restante' + (reste > 1 ? 's' : '') + '</span>')
      : (e.inscrits ? '<span>' + e.inscrits + ' inscrit' + (e.inscrits > 1 ? 's' : '') + '</span>' : '');
    return '<article class="s-evt' + (passe ? ' passe' : '') + '"><div class="s-evt-date"><b>' + dt.getDate() + '</b><span>' + MOIS[dt.getMonth()] + '</span></div>' +
      '<div class="s-evt-corps"><h3>' + esc(e.titre) + '</h3><p class="s-evt-quand">' + ico('horloge') + esc(quand) + '</p>' +
      (e.lieu ? '<p class="s-evt-quand">' + ico('lieu') + esc(e.lieu) + '</p>' : '') +
      (e.description && !passe ? '<p class="s-evt-desc">' + esc(e.description) + '</p>' : '') +
      (passe ? '' : '<div class="s-evt-pied">' + info + '<div class="s-evt-actions">' +
        (e.inscriptions && !complet ? '<button type="button" class="s-btn s-btn-accent s-btn-sm" data-inscrire="' + esc(e.id) + '">Je m’inscris</button>' : '') +
        '<button type="button" class="s-mini-btn" data-ics="' + esc(e.id) + '">' + ico('evenement') + 'Calendrier</button>' +
        '<button type="button" class="s-mini-btn" data-partager-evt="' + esc(e.id) + '">' + ico('whatsapp') + 'Inviter</button>' +
        '<button type="button" class="s-mini-btn" data-image-evt="' + esc(e.id) + '">' + ico('photo') + 'Image</button></div></div>') +
      '</div></article>';
  }

  function brancher() {
    var plus = document.getElementById('btn-plus');
    if (plus) plus.onclick = function () { nbActusVisibles += 5; rendre(); document.getElementById('actualites').scrollIntoView(); };
    Array.prototype.forEach.call(app.querySelectorAll('[data-partager]'), function (b) { b.onclick = partager; });
  }

  // ---------- Clics (délégation) ----------
  app.addEventListener('click', function (e) {
    var el;
    if ((el = e.target.closest('[data-photo]'))) { montrerPhoto(Math.max(0, photos.indexOf(el.dataset.photo))); vis.showModal(); return; }
    if ((el = e.target.closest('a[href^="https://wa.me/"]'))) { compter('whatsapp'); return; }
    if ((el = e.target.closest('[data-copier]'))) { O.copier(el.dataset.copier).then(function () { O.toast('Numéro copié : collez-le dans votre application Mobile Money.'); }); return; }
    if ((el = e.target.closest('[data-don]'))) { fenetreDon(el.dataset.don); return; }
    if ((el = e.target.closest('[data-inscrire]'))) { fenetreInscription(el.dataset.inscrire); return; }
    if ((el = e.target.closest('[data-adherer]'))) { fenetreAdhesion(); return; }
    if ((el = e.target.closest('[data-ics]'))) { calendrier(el.dataset.ics); return; }
    if ((el = e.target.closest('[data-partager-evt]'))) { inviter(el.dataset.partagerEvt); return; }
    if ((el = e.target.closest('[data-ecouter]'))) { ecouter(el); return; }
    if ((el = e.target.closest('[data-image-actu]'))) { imageActu(el); return; }
    if ((el = e.target.closest('[data-image-evt]'))) { imageEvt(el); return; }
    if ((el = e.target.closest('#installer'))) { installer(); return; }
  });

  // ---------- Fenêtre d'action (don, inscription, adhésion) ----------
  var fenA = document.getElementById('fen-action');
  fenA.querySelector('[data-fermer]').innerHTML = ico('fermer', 'ico-lg');
  fenA.querySelector('[data-fermer]').onclick = function () { fenA.close(); };
  function ouvrirAction(titre, corps) {
    document.getElementById('t-action').textContent = titre;
    document.getElementById('action-corps').innerHTML = corps;
    fenA.showModal();
    var premier = fenA.querySelector('input, select, textarea'); if (premier) premier.focus();
  }
  function champ(id, label, type, opts) {
    opts = opts || {};
    return '<div class="champ"><label for="' + id + '">' + label + (opts.facultatif ? ' <span class="facultatif">(facultatif)</span>' : '') + '</label>' +
      (type === 'zone' ? '<textarea id="' + id + '" maxlength="' + (opts.max || 300) + '"></textarea>'
        : '<input id="' + id + '" type="' + type + '"' + (opts.max ? ' maxlength="' + opts.max + '"' : '') + (opts.attr || '') + '>') +
      (opts.aide ? '<span class="aide">' + opts.aide + '</span>' : '') + '</div>';
  }
  function merci(titre, texte, partage) {
    document.getElementById('action-corps').innerHTML = '<div class="s-merci">' + ico('verifie', 'ico-lg') + '<h3>' + titre + '</h3><p>' + texte + '</p>' +
      (partage ? '<a class="btn btn-secondaire" href="https://wa.me/?text=' + encodeURIComponent(partage) + '" target="_blank" rel="noopener">' + ico('whatsapp') + 'En parler sur WhatsApp</a>' : '') +
      '<button type="button" class="btn btn-noir" data-fin>Fermer</button></div>';
    fenA.querySelector('[data-fin]').onclick = function () { fenA.close(); };
  }
  function envoyer(form, bouton, action) {
    form.onsubmit = function (ev) {
      ev.preventDefault();
      var err = form.querySelector('.erreur-form'); if (err) err.remove();
      bouton.disabled = true; var txt = bouton.innerHTML; bouton.textContent = 'Envoi…';
      action().catch(function (er) {
        bouton.disabled = false; bouton.innerHTML = txt;
        form.insertAdjacentHTML('afterbegin', '<div class="erreur-form" role="alert">' + ico('alerte') + '<span>' + esc(er.message) + '</span></div>');
      });
    };
  }

  function fenetreDon(projetId) {
    var o = donnees.org, c = o.contact || {}, moyens = moyensActifs(c);
    var projets = donnees.projets.filter(function (p) { return p.objectif; });
    ouvrirAction('J’ai fait un don',
      '<form class="pile" id="f-don" novalidate>' +
      '<p class="note">Merci ! Indiquez votre don : ' + esc(O.typeTexte(o, 'le')) + ' le confirmera dès réception, puis il apparaîtra sur le mur des donateurs.</p>' +
      '<div class="champ"><label for="d-montant">Montant envoyé (FCFA)</label><input id="d-montant" type="number" min="100" step="100" inputmode="numeric" required>' +
      '<div class="s-puces">' + [1000, 2000, 5000, 10000, 25000].map(function (v) { return '<button type="button" class="s-puce" data-montant="' + v + '">' + O.nb(v) + '</button>'; }).join('') + '</div></div>' +
      '<div class="grille-champs"><div class="champ"><label for="d-moyen">Envoyé par</label><select id="d-moyen">' + moyens.map(function (m) { return '<option value="' + m[0] + '">' + m[1] + '</option>'; }).join('') + '<option value="autre">Autre moyen</option></select></div>' +
      (projets.length ? '<div class="champ"><label for="d-projet">Pour</label><select id="d-projet"><option value="">L’ensemble de nos actions</option>' + projets.map(function (p) { return '<option value="' + esc(p.id) + '"' + (p.id === projetId ? ' selected' : '') + '>' + esc(p.titre) + '</option>'; }).join('') + '</select></div>' : '') + '</div>' +
      champ('d-nom', 'Votre nom', 'text', { max: 80 }) +
      '<label class="case"><input type="checkbox" id="d-anonyme"><span>Rester anonyme sur le mur des donateurs</span></label>' +
      champ('d-tel', 'Votre téléphone', 'tel', { max: 40, facultatif: true, aide: 'Visible seulement par l’organisation, pour vous remercier et retrouver votre envoi.' }) +
      champ('d-msg', 'Un petit mot', 'zone', { max: 300, facultatif: true }) +
      '<button type="submit" class="btn btn-principal btn-bloc" id="d-ok">' + ico('coeur') + 'Déclarer mon don</button></form>');
    var f = document.getElementById('f-don');
    f.addEventListener('click', function (ev) { var b = ev.target.closest('[data-montant]'); if (b) document.getElementById('d-montant').value = b.dataset.montant; });
    envoyer(f, document.getElementById('d-ok'), function () {
      var pr = document.getElementById('d-projet');
      return window.MV.public.don(o.id, { montant: document.getElementById('d-montant').value, moyen: document.getElementById('d-moyen').value, projet_id: pr ? pr.value || null : projetId || null,
        nom: document.getElementById('d-nom').value, anonyme: document.getElementById('d-anonyme').checked, telephone: document.getElementById('d-tel').value, message: document.getElementById('d-msg').value })
        .then(function () { compter('don'); merci('Merci pour votre générosité !', esc(O.maj(O.typeTexte(o, 'le'))) + ' va confirmer votre don. Il apparaîtra ensuite sur le mur des donateurs.', 'J’ai soutenu ' + o.nom + ' ! Vous aussi, faites un geste : ' + lienSite('wa') + '#don'); });
    });
  }

  function fenetreInscription(id) {
    var o = donnees.org, e = donnees.evenements.find(function (x) { return x.id === id; }); if (!e) return;
    var reste = e.places ? Math.max(0, e.places - (e.inscrits || 0)) : 20;
    ouvrirAction('Inscription : ' + e.titre,
      '<form class="pile" id="f-insc" novalidate><p class="note">' + esc(new Date(e.debut).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })) + (e.lieu ? ' · ' + esc(e.lieu) : '') + '</p>' +
      champ('i-nom', 'Votre nom', 'text', { max: 80 }) + champ('i-tel', 'Votre téléphone (WhatsApp de préférence)', 'tel', { max: 40, aide: 'Pour vous prévenir en cas de changement. Visible seulement par l’organisation.' }) +
      champ('i-nb', 'Nombre de personnes', 'number', { attr: ' min="1" max="' + Math.min(20, reste) + '" value="1" inputmode="numeric"' }) +
      '<button type="submit" class="btn btn-principal btn-bloc" id="i-ok">Confirmer mon inscription</button></form>');
    envoyer(document.getElementById('f-insc'), document.getElementById('i-ok'), function () {
      var n = Math.max(1, parseInt(document.getElementById('i-nb').value, 10) || 1);
      return window.MV.public.inscrire(o.id, e.id, { nom: document.getElementById('i-nom').value, telephone: document.getElementById('i-tel').value, nombre: n })
        .then(function () { compter('inscription'); e.inscrits = (e.inscrits || 0) + n; rendre(); merci('C’est noté, à bientôt !', 'Votre inscription à « ' + esc(e.titre) + ' » est enregistrée. Pensez à l’ajouter à votre calendrier.', 'Je participe à « ' + e.titre + ' » avec ' + o.nom + '. Rejoignez-nous : ' + lienSite('wa') + '#agenda'); });
    });
  }

  function fenetreAdhesion() {
    var o = donnees.org;
    ouvrirAction('Devenir membre',
      '<form class="pile" id="f-adh" novalidate><p class="note">' + esc(O.maj(O.typeTexte(o, 'le'))) + ' recevra votre demande et vous recontactera.</p>' +
      champ('m-nom', 'Votre nom complet', 'text', { max: 80 }) + champ('m-tel', 'Votre téléphone (WhatsApp de préférence)', 'tel', { max: 40 }) +
      '<div class="grille-champs">' + champ('m-email', 'Email', 'email', { max: 120, facultatif: true }) + champ('m-ville', 'Ville ou village', 'text', { max: 80, facultatif: true }) + '</div>' +
      champ('m-msg', 'Pourquoi souhaitez-vous nous rejoindre ?', 'zone', { max: 500, facultatif: true }) +
      '<button type="submit" class="btn btn-principal btn-bloc" id="m-ok">Envoyer ma demande</button></form>');
    envoyer(document.getElementById('f-adh'), document.getElementById('m-ok'), function () {
      return window.MV.public.adherer(o.id, { nom: document.getElementById('m-nom').value, telephone: document.getElementById('m-tel').value, email: document.getElementById('m-email').value,
        ville: document.getElementById('m-ville').value, message: document.getElementById('m-msg').value })
        .then(function () { compter('adhesion'); merci('Demande envoyée !', esc(O.maj(O.typeTexte(o, 'le'))) + ' vous recontactera très vite. Merci de votre engagement.'); });
    });
  }

  // ---------- Agenda : calendrier du téléphone et invitations ----------
  function icsDate(d) { return new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
  function icsTexte(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1'); }
  function calendrier(id) {
    var e = donnees.evenements.find(function (x) { return x.id === id; }); if (!e) return;
    var fin = e.fin || new Date(new Date(e.debut).getTime() + 2 * 3600000).toISOString();
    var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MinVa//Agenda//FR', 'BEGIN:VEVENT', 'UID:' + e.id + '@minva', 'DTSTAMP:' + icsDate(new Date()),
      'DTSTART:' + icsDate(e.debut), 'DTEND:' + icsDate(fin), 'SUMMARY:' + icsTexte(e.titre + ' · ' + donnees.org.nom), 'LOCATION:' + icsTexte(e.lieu),
      'DESCRIPTION:' + icsTexte((e.description ? e.description + '\n' : '') + lienSite('agenda')), 'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsTexte(e.titre), 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })); a.download = O.slugifier(e.titre).slice(0, 40) + '.ics';
    document.body.appendChild(a); a.click(); a.remove();
  }
  function inviter(id) {
    var e = donnees.evenements.find(function (x) { return x.id === id; }); if (!e) return;
    var dt = new Date(e.debut);
    var texte = '📅 ' + e.titre + '\n' + dt.toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) + (e.lieu ? '\n📍 ' + e.lieu : '') +
      '\nAvec ' + donnees.org.nom + (e.inscriptions ? '. Inscription : ' : ' : ') + lienSite('wa') + '#agenda';
    compter('partage');
    window.open('https://wa.me/?text=' + encodeURIComponent(texte), '_blank', 'noopener');
  }

  // ---------- Lecture audio (voix intégrée au téléphone, gratuite) ----------
  var lectureEnCours = null;
  function ecouter(btn) {
    var synth = window.speechSynthesis;
    if (lectureEnCours === btn) { synth.cancel(); return; }
    synth.cancel();
    var u = new SpeechSynthesisUtterance(btn.dataset.ecouter);
    u.lang = 'fr-FR'; u.rate = 0.95;
    var voix = synth.getVoices().filter(function (v) { return /^fr/i.test(v.lang); });
    if (voix.length) u.voice = voix.find(function (v) { return /fr-FR/i.test(v.lang); }) || voix[0];
    var lib = btn.dataset.libelle;
    u.onend = u.onerror = function () { if (lectureEnCours === btn) { lectureEnCours = null; btn.innerHTML = ico('actu') + esc(lib); btn.classList.remove('actif'); } };
    lectureEnCours = btn; btn.innerHTML = ico('fermer') + 'Arrêter'; btn.classList.add('actif');
    synth.speak(u); compter('ecoute');
  }

  // ---------- Images de partage ----------
  function imagePrete(btn, promesse, nomFichier, texte) {
    if (!window.MinVaImage) return;
    var txt = btn.innerHTML; btn.disabled = true; btn.textContent = 'Création…';
    promesse().then(function (blob) { compter('image'); return window.MinVaImage.partager(blob, nomFichier, texte); })
      .then(function (r) { if (r === 'telechargement') O.toast('Image enregistrée : publiez-la dans votre statut WhatsApp.'); })
      .catch(function () { O.toast('L’image n’a pas pu être créée sur cet appareil.', 'erreur'); })
      .then(function () { btn.disabled = false; btn.innerHTML = txt; });
  }
  function imageActu(btn) {
    var o = donnees.org, a = donnees.actualites.find(function (x) { return x.id === btn.dataset.imageActu; }); if (!a) return;
    var dt = new Date(a.created_at);
    imagePrete(btn, function () {
      return window.MinVaImage.carte({ org: o, surtitre: (O.TYPES_ACTU[a.type] || 'Actualité') + ' · ' + dt.getDate() + ' ' + MOIS[dt.getMonth()], texte: a.texte || '', photo: (a.photos || [])[0], lien: lienSite('wa') });
    }, O.slugifier(o.nom).slice(0, 30) + '-actualite.png', o.nom + ' : ' + lienSite('wa'));
  }
  function imageEvt(btn) {
    var o = donnees.org, e = donnees.evenements.find(function (x) { return x.id === btn.dataset.imageEvt; }); if (!e) return;
    var dt = new Date(e.debut);
    imagePrete(btn, function () {
      return window.MinVaImage.carte({ org: o, surtitre: 'Événement · ' + JOURS[dt.getDay()] + ' ' + dt.getDate() + ' ' + MOIS[dt.getMonth()] + ' · ' + heure(dt), titre: e.titre,
        texte: (e.lieu ? '📍 ' + e.lieu + '. ' : '') + (e.description || '') + (e.inscriptions ? ' Inscription sur notre site.' : ''), lien: lienSite('wa') + '#agenda' });
    }, O.slugifier(e.titre).slice(0, 30) + '.png', e.titre + ' · ' + lienSite('wa') + '#agenda');
  }

  // ---------- Site installable (application sur l'écran d'accueil) ----------
  var invite = null;
  function iOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream; }
  function dejaInstalle() { return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone; }
  function majInstallation() {
    var b = document.getElementById('installer'); if (!b) return;
    b.hidden = horsLigneStats || dejaInstalle() || !(invite || iOS());
  }
  function installer() {
    if (invite) { invite.prompt(); invite.userChoice.then(function () { invite = null; majInstallation(); }); return; }
    if (iOS()) O.toast('Sur iPhone : touchez le bouton Partager de Safari, puis « Sur l’écran d’accueil ».');
  }
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); invite = e; majInstallation(); });
  window.addEventListener('appinstalled', function () { compter('installation'); invite = null; majInstallation(); });
  function preparerApplication() {
    if (horsLigneStats || !donnees) return;
    var o = donnees.org, t = window.minvaTheme(o.theme);
    var base = location.origin + location.pathname.replace(/[^/]*$/, '');
    var depart = base + 'site.html?o=' + encodeURIComponent(o.slug) + '&s=app';
    // Icône de l'application : le sceau de l'organisation, dessiné dans le téléphone
    var svg = E.sceau(o.slug || o.nom, o.sigle || O.sigleDe(o.nom), t);
    var img = new Image();
    img.onload = function () {
      function png(cote) {
        var c = document.createElement('canvas'); c.width = c.height = cote; var x = c.getContext('2d');
        x.fillStyle = t.fond; x.fillRect(0, 0, cote, cote); x.drawImage(img, cote * 0.06, cote * 0.06, cote * 0.88, cote * 0.88);
        return c.toDataURL('image/png');
      }
      var m = { name: o.nom, short_name: (o.sigle || o.nom).slice(0, 12), id: depart, start_url: depart, scope: base, display: 'standalone', lang: 'fr',
        background_color: t.fond, theme_color: t.primaire, description: o.slogan || o.mission || o.nom,
        icons: [{ src: png(192), sizes: '192x192', type: 'image/png' }, { src: png(512), sizes: '512x512', type: 'image/png', purpose: 'any' }] };
      var l = document.querySelector('link[rel="manifest"]') || document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'manifest' }));
      l.href = URL.createObjectURL(new Blob([JSON.stringify(m)], { type: 'application/manifest+json' }));
      var ap = document.querySelector('link[rel="apple-touch-icon"]') || document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'apple-touch-icon' }));
      ap.href = png(180);
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    // Lecture hors connexion : le service worker garde la dernière version vue
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {});
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
    var lien = lienSite('wa'), o = donnees.org;
    var texte = o.nom + (o.slogan ? ' : ' + o.slogan : '') + '\n' + lien;
    compter('partage');
    if (navigator.share && !apercu) { navigator.share({ title: o.nom, text: o.slogan || o.nom, url: lien }).catch(function () {}); return; }
    document.getElementById('partage-corps').innerHTML =
      '<div class="partage-lien"><input type="text" readonly value="' + esc(lienSite()) + '" aria-label="Lien du site"><button type="button" class="btn btn-noir" id="copier-lien">' + ico('copier') + 'Copier</button></div>' +
      '<div class="partage-reseaux"><a class="btn btn-secondaire" href="https://wa.me/?text=' + encodeURIComponent(texte) + '" target="_blank" rel="noopener">' + ico('whatsapp') + 'WhatsApp</a>' +
      '<a class="btn btn-secondaire" href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(lienSite('facebook')) + '" target="_blank" rel="noopener">' + ico('facebook') + 'Facebook</a></div>';
    document.getElementById('copier-lien').onclick = function () { O.copier(lienSite()).then(function () { O.toast('Lien copié'); }); };
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
    d.evenements = d.evenements || []; d.dons = d.dons || [];
    donnees = d; rendre();
    if ((apercu || vitrine) && window.parent !== window) window.parent.postMessage({ type: 'minva-apercu-pret' }, location.origin);
    // Une visite par personne et par jour (rien de personnel n'est enregistré)
    try {
      var cleVue = 'minva-vue-' + d.org.id + '-' + new Date().toISOString().slice(0, 10);
      if (!sessionStorage.getItem(cleVue) && !localStorage.getItem(cleVue)) { localStorage.setItem(cleVue, '1'); compter('vue'); }
    } catch (e) { compter('vue'); }
    preparerApplication();
    if (location.hash) { var cible = document.getElementById(location.hash.slice(1)); if (cible) cible.scrollIntoView(); }
  }).catch(function (e) {
    window.MV.erreur('site', e.message);
    app.removeAttribute('aria-busy');
    app.innerHTML = '<div class="s-introuvable"><h1>Le site n’a pas pu se charger</h1><p>' + esc(e.message) + '</p><p><button class="btn btn-noir" onclick="location.reload()">Réessayer</button></p></div>';
  });
  window.addEventListener('error', function (e) { window.MV.erreur('site', e.message); });
})();
