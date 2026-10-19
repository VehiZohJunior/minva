// =====================================================================
// MinVa — console admin de l'organisation cliente
// =====================================================================
(function () {
  var O = window.MVO, MV = window.MV, esc = O.esc, ico = O.ico;
  var racine = document.getElementById('racine');
  var S = { profil: null, org: null, brouillon: null, actus: [], projets: [], docs: [], admins: [], journal: [], dons: [], evts: [], adhesions: [], filtreDons: 'declare', filtreMembres: 'nouvelle', periode: 30,
    ongletSite: 'identite', appareil: 'tel', composer: { type: 'actu', fichiers: [], apercus: [] }, envoi: false };

  var PAGES = [
    ['accueil', 'Accueil', 'maison'],
    ['site', 'Mon site', 'pinceau'],
    ['actualites', 'Actualités', 'actu'],
    ['agenda', 'Agenda', 'evenement'],
    ['projets', 'Projets', 'cible'],
    ['dons', 'Dons', 'coeur'],
    ['besoins', 'Besoins & équipe', 'besoin'],
    ['membres', 'Membres', 'plus'],
    ['documents', 'Documents', 'rapport'],
    ['stats', 'Statistiques', 'graph'],
    null,
    ['admins', 'Administrateurs', 'equipe'],
    ['acces', 'Accès développeur', 'cle'],
    ['parametres', 'Paramètres', 'reglages']
  ];

  window.addEventListener('error', function (e) { MV.erreur('admin', e.message); });
  window.addEventListener('unhandledrejection', function (e) { MV.erreur('admin', (e.reason && e.reason.message) || String(e.reason)); });

  function page() { var h = location.hash.slice(1); return PAGES.some(function (p) { return p && p[0] === h; }) ? h : 'accueil'; }
  function erreur(e) { O.toast(e.message || String(e), 'erreur'); }
  function occupe(btn, oui, texte) {
    if (!btn) return;
    if (oui) { btn.dataset.txt = btn.innerHTML; btn.disabled = true; btn.innerHTML = texte || 'Un instant…'; }
    else { btn.disabled = false; if (btn.dataset.txt) btn.innerHTML = btn.dataset.txt; }
  }
  function sigle(o) { return o.sigle || O.sigleDe(o.nom); }
  function logoHtml(o) { return o.logo_url ? '<img src="' + esc(o.logo_url) + '" alt="">' : esc(sigle(o)); }
  function lien() { return MV.lienSite(S.org.slug); }
  function lienAffiche(evtId) { return 'affiche.html?o=' + encodeURIComponent(S.org.slug) + (evtId ? '&e=' + encodeURIComponent(evtId) : '') + (MV.mode === 'demo' ? '&demo=1' : ''); }
  function waLien(num, texte) { var n = String(num || '').replace(/[^0-9]/g, ''); if (n.length === 10) n = '225' + n; return n ? 'https://wa.me/' + n + '?text=' + encodeURIComponent(texte) : ''; }
  function acesOuvert(o) { return !!(o.acces_support_actif && o.acces_support_expire && new Date(o.acces_support_expire) > new Date()); }

  // ---------------- Fenêtre ----------------
  var fen = document.getElementById('fenetre');
  document.getElementById('fen-fermer').innerHTML = ico('fermer', 'ico-lg');
  document.getElementById('fen-fermer').onclick = function () { fen.close(); };
  function ouvrirFenetre(titre, corps, pied) {
    document.getElementById('fen-titre').textContent = titre;
    document.getElementById('fen-corps').innerHTML = corps;
    document.getElementById('fen-pied').innerHTML = pied || '';
    document.getElementById('fen-pied').hidden = !pied;
    fen.showModal();
  }

  // ---------------- Connexion ----------------
  function ecranConnexion(msg) {
    var demo = MV.mode === 'demo';
    racine.innerHTML =
      (demo ? '<div class="bandeau-demo">Mode démonstration : organisations fictives, rien n’est envoyé sur internet.</div>' : '') +
      '<div class="cx"><section class="cx-marque"><div class="bogolan"></div><img src="assets/horizontal-blanc.png" alt="MinVa – Gestion d’Organisations" width="220" height="70">' +
      '<div><h1>Votre site, votre vitrine, vos soutiens.</h1><p>Publiez vos actualités, présentez vos projets et vos documents de confiance. Vos proches et vos partenaires suivent tout depuis votre lien.</p></div></section>' +
      '<div class="cx-form"><form id="f-cx" novalidate><h2>Console de votre organisation</h2><p class="sous">Réservée aux administrateurs désignés (3 au maximum).</p>' +
      (msg ? '<div class="erreur-form" role="alert">' + ico('alerte') + '<span>' + esc(msg) + '</span></div>' : '') +
      '<div class="champ"><label for="cx-email">Email</label><input id="cx-email" type="email" autocomplete="username" required></div>' +
      '<div class="champ"><label for="cx-mdp">Mot de passe</label><input id="cx-mdp" type="password" autocomplete="current-password" required></div>' +
      '<button class="btn btn-principal btn-bloc" type="submit" id="cx-ok">Se connecter</button>' +
      '<p class="note">Mot de passe oublié ? Demandez à un autre administrateur de votre organisation, ou contactez MinVa.</p>' +
      (demo ? '<div class="cx-demo"><b>Comptes de démonstration</b> (mot de passe : demo1234)' +
        '<button type="button" data-demo="admin@cfv-daloa.demo">Coopérative de Daloa <span>admin@cfv-daloa.demo</span></button>' +
        '<button type="button" data-demo="admin@lire-a-man.demo">Lire à Man <span>admin@lire-a-man.demo</span></button>' +
        '<button type="button" data-demo="admin@eau-korhogo.demo">Eau Propre Korhogo <span>admin@eau-korhogo.demo</span></button></div>' : '') +
      '</form></div></div>';
    Array.prototype.forEach.call(racine.querySelectorAll('[data-demo]'), function (b) {
      b.onclick = function () { document.getElementById('cx-email').value = b.dataset.demo; document.getElementById('cx-mdp').value = 'demo1234'; document.getElementById('cx-ok').focus(); };
    });
    document.getElementById('f-cx').onsubmit = function (e) {
      e.preventDefault();
      var btn = document.getElementById('cx-ok'); occupe(btn, true, 'Connexion…');
      MV.auth.connexion(document.getElementById('cx-email').value, document.getElementById('cx-mdp').value)
        .then(demarrer).catch(function (err) { ecranConnexion(err.message); });
    };
  }

  // ---------------- Démarrage ----------------
  function demarrer() {
    return Promise.all([MV.auth.profil(), MV.org.mienne()]).then(function (r) {
      S.profil = r[0]; S.org = r[1]; S.brouillon = JSON.parse(JSON.stringify(r[1]));
      // Agenda, dons et membres : s'ils ne répondent pas (base pas encore à jour), la console fonctionne quand même
      var souple = function (pr) { return pr.catch(function () { return []; }); };
      return Promise.all([MV.actu.lister(), MV.projet.lister(), MV.doc.lister(), MV.admins.lister(), MV.support.journal(), souple(MV.dons.lister()), souple(MV.evts.lister()), souple(MV.adhesions.lister())]);
    }).then(function (r) {
      S.actus = r[0]; S.projets = r[1]; S.docs = r[2]; S.admins = r[3]; S.journal = r[4]; S.dons = r[5]; S.evts = r[6]; S.adhesions = r[7];
      coque(); afficher();
    });
  }
  function recharger(quoi) {
    var t = { actus: MV.actu.lister, projets: MV.projet.lister, docs: MV.doc.lister, admins: MV.admins.lister, journal: MV.support.journal, org: MV.org.mienne, dons: MV.dons.lister, evts: MV.evts.lister, adhesions: MV.adhesions.lister };
    return t[quoi]().then(function (v) { S[quoi] = v; if (quoi === 'org') S.brouillon = JSON.parse(JSON.stringify(v)); });
  }

  // ---------------- Coque ----------------
  function coque() {
    var o = S.org;
    racine.innerHTML =
      (MV.mode === 'demo' ? '<div class="bandeau-demo">Mode démonstration : vos essais restent sur cet appareil.<button type="button" id="demo-reset">Remettre la démo à zéro</button></div>' : '') +
      '<div class="haut-mobile"><button type="button" class="btn-icone" id="menu-ouvrir" aria-label="Ouvrir le menu">' + ico('menu', 'ico-lg') + '</button><img src="assets/horizontal-blanc.png" alt="MinVa" width="88" height="28"><b id="haut-titre"></b></div>' +
      '<div class="voile-menu" id="voile"></div>' +
      '<div class="coque"><aside class="lat" id="lat"><div class="lat-tete"><img src="assets/horizontal-blanc.png" alt="MinVa" width="128" height="40">' +
      '<div class="lat-org"><span class="mono" id="lat-logo">' + logoHtml(o) + '</span><div><b id="lat-nom">' + esc(o.nom) + '</b><span>Console admin</span></div></div></div>' +
      '<nav aria-label="Console" id="nav"></nav>' +
      '<div class="lat-pied"><a class="btn btn-secondaire btn-sm" href="' + esc(lien()) + '" target="_blank" rel="noopener" id="voir-site">' + ico('oeil') + 'Voir mon site</a>' +
      '<p class="qui">Connecté : ' + esc(S.profil.nom) + '</p><button type="button" class="lat-sortie" id="sortie">' + ico('sortie') + 'Se déconnecter</button></div></aside>' +
      '<main class="contenu" id="contenu" tabindex="-1"></main></div>';
    document.getElementById('sortie').onclick = function () { MV.auth.deconnexion().then(function () { location.hash = ''; ecranConnexion(); }); };
    var r = document.getElementById('demo-reset');
    if (r) r.onclick = function () { MV.reinitialiserDemo(); location.hash = ''; location.reload(); };
    var lat = document.getElementById('lat'), voile = document.getElementById('voile');
    function menu(ouvert) { lat.classList.toggle('ouvert', ouvert); voile.classList.toggle('ouvert', ouvert); }
    document.getElementById('menu-ouvrir').onclick = function () { menu(true); };
    voile.onclick = function () { menu(false); };
    document.getElementById('nav').addEventListener('click', function (e) { if (e.target.closest('a')) menu(false); });
  }

  function majNav() {
    var p = page(), o = S.org;
    var docsAttente = S.docs.filter(function (d) { return d.statut === 'refuse'; }).length;
    document.getElementById('nav').innerHTML = PAGES.map(function (x) {
      if (!x) return '<span class="sep" role="presentation"></span>';
      var pastille = '';
      if (x[0] === 'acces' && acesOuvert(o)) pastille = '<span class="pastille-nav">ouvert</span>';
      if (x[0] === 'documents' && docsAttente) pastille = '<span class="pastille-nav">' + docsAttente + '</span>';
      var nbDons = S.dons.filter(function (d) { return d.statut === 'declare'; }).length, nbMembres = S.adhesions.filter(function (a) { return a.statut === 'nouvelle'; }).length;
      if (x[0] === 'dons' && nbDons) pastille = '<span class="pastille-nav">' + nbDons + '</span>';
      if (x[0] === 'membres' && nbMembres) pastille = '<span class="pastille-nav">' + nbMembres + '</span>';
      return '<a href="#' + x[0] + '"' + (x[0] === p ? ' aria-current="page"' : '') + '>' + ico(x[2]) + x[1] + pastille + '</a>';
    }).join('');
    document.getElementById('lat-logo').innerHTML = logoHtml(o);
    document.getElementById('lat-nom').textContent = o.nom;
    document.getElementById('voir-site').href = lien();
    var titre = PAGES.find(function (x) { return x && x[0] === p; });
    document.getElementById('haut-titre').textContent = titre ? titre[1] : '';
  }

  function afficher() {
    if (!S.org) return;
    if (page() !== 'site' && modifie()) { S.brouillon = JSON.parse(JSON.stringify(S.org)); }
    majNav();
    var c = document.getElementById('contenu');
    var rendus = { accueil: pAccueil, site: pSite, actualites: pActus, agenda: pAgenda, projets: pProjets, dons: pDons, besoins: pBesoins, membres: pMembres, documents: pDocuments, stats: pStats, admins: pAdmins, acces: pAcces, parametres: pParametres };
    rendus[page()](c);
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', function () { if (S.org) afficher(); });
  window.addEventListener('beforeunload', function (e) { if (S.org && modifie()) { e.preventDefault(); e.returnValue = ''; } });

  function tete(titre, sous, actions) {
    return '<div class="page-tete"><div><h1>' + titre + '</h1>' + (sous ? '<p>' + sous + '</p>' : '') + '</div>' + (actions || '') + '</div>';
  }

  // =================================================================
  // ACCUEIL
  // =================================================================
  function etapesCompletion() {
    var o = S.org, c = o.contact || {};
    var docsOk = S.docs.filter(function (d) { return d.statut !== 'refuse'; }).length;
    return [
      [!!o.logo_url, 'Ajouter votre logo', 'site', 'identite'],
      [!!o.couverture_url, 'Ajouter une photo de couverture', 'site', 'identite'],
      [!!o.slogan, 'Écrire votre slogan', 'site', 'identite'],
      [!!(o.mission && o.apropos), 'Présenter votre mission', 'site', 'textes'],
      [!!(c.whatsapp || c.telephone), 'Indiquer votre WhatsApp', 'site', 'contact'],
      [S.actus.length > 0, 'Publier votre première actualité', 'actualites'],
      [S.projets.length > 0 || (o.besoins || []).length > 0, 'Présenter un projet ou un besoin', 'projets'],
      [(o.equipe || []).length > 0, 'Présenter votre équipe', 'besoins'],
      [docsOk >= 3, 'Envoyer au moins 3 documents officiels', 'documents']
    ];
  }

  function pAccueil(c) {
    var o = S.org, et = etapesCompletion(), faites = et.filter(function (e) { return e[0]; }).length;
    var pct = Math.round(faites / et.length * 100);
    var derniere = S.actus[0];
    var docsVerif = S.docs.filter(function (d) { return d.statut === 'verifie'; }).length;
    var abo = '';
    if (o.abonnement_fin) {
      var jours = Math.ceil((new Date(o.abonnement_fin) - new Date()) / 86400000);
      if (jours < 0) abo = '<div class="alerte-abo expire" role="alert">' + ico('alerte', 'ico-lg') + '<div><b>Votre abonnement a pris fin le ' + O.dateLongue(o.abonnement_fin) + '.</b> Votre site reste en ligne pendant quelques jours. Contactez MinVa pour le renouveler par Mobile Money.</div></div>';
      else if (jours <= 15) abo = '<div class="alerte-abo">' + ico('horloge', 'ico-lg') + '<div><b>Votre abonnement se termine dans ' + jours + ' jour' + (jours > 1 ? 's' : '') + '</b> (le ' + O.dateLongue(o.abonnement_fin) + '). Pensez à le renouveler auprès de MinVa.</div></div>';
    }
    var prenom = String(S.profil.nom || '').split(' ')[0];
    c.innerHTML = tete('Bonjour ' + esc(prenom), 'Voici où en est le site de ' + esc(o.nom) + '.') + abo +
      '<section class="bloc"><h2>Votre site est en ligne</h2><div class="lien-site"><code>' + esc(lien()) + '</code>' +
      '<button type="button" class="btn btn-principal btn-sm" id="a-copier">' + ico('copier') + 'Copier le lien</button>' +
      '<a class="btn btn-secondaire btn-sm" href="https://wa.me/?text=' + encodeURIComponent(o.nom + ' : ' + lien() + '?s=wa') + '" target="_blank" rel="noopener">' + ico('whatsapp') + 'Envoyer sur WhatsApp</a>' +
      '<button type="button" class="btn btn-secondaire btn-sm" id="a-qr">' + ico('qr') + 'QR code</button>' +
      '<a class="btn btn-secondaire btn-sm" href="' + lienAffiche() + '" target="_blank" rel="noopener">' + ico('rapport') + 'Affiche à imprimer</a></div>' +
      '<p class="note" style="margin-top:12px">Imprimez le QR code sur vos affiches et vos cartes de visite : on le scanne avec l’appareil photo du téléphone pour ouvrir votre site.</p></section>' +
      '<div class="tuiles">' +
      '<a class="tuile" href="#actualites"><b>' + S.actus.length + '</b><span>actualités' + (derniere ? ' · dernière ' + O.quand(derniere.created_at) : '') + '</span></a>' +
      '<a class="tuile" href="#projets"><b>' + S.projets.length + '</b><span>projets présentés</span></a>' +
      '<a class="tuile" href="#documents"><b>' + docsVerif + '/6</b><span>documents vérifiés</span></a>' +
      '<a class="tuile" href="#admins"><b>' + S.admins.length + '/3</b><span>administrateurs</span></a></div>' + nouveautes() +
      '<div class="grille-2"><section class="bloc"><h2>Complétez votre site</h2><div class="progres-tete"><b>' + pct + '%</b><div class="piste" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '" aria-label="Site complété"><i style="width:' + pct + '%"></i></div></div>' +
      '<ul class="etapes">' + et.map(function (e, i) {
        return '<li class="' + (e[0] ? 'fait' : '') + '"><a href="#' + e[2] + '" data-onglet="' + (e[3] || '') + '"><span class="rond">' + (e[0] ? ico('verifie') : '') + '</span><span>' + e[1] + '</span>' + ico('suite') + '</a></li>';
      }).join('') + '</ul></section>' +
      '<section class="bloc"><h2>Un site qui vit attire les soutiens</h2><ul class="conseils">' +
      '<li>Publiez <b>au moins une actualité par semaine</b> : les organisations actives apparaissent en premier dans l’annuaire MinVa.</li>' +
      '<li>Une photo vaut mieux qu’un long texte. Montrez vos membres au travail, vos réalisations, vos réunions.</li>' +
      '<li>Envoyez vos documents officiels : le badge <b>« Vérifié par MinVa »</b> rassure les bailleurs.</li>' +
      '<li>Partagez votre lien dans vos groupes WhatsApp après chaque nouvelle actualité.</li></ul>' +
      '<p style="margin-top:20px"><a class="btn btn-principal" href="#actualites">' + ico('plus') + 'Publier une actualité</a></p></section></div>';
    document.getElementById('a-copier').onclick = function () { O.copier(lien()).then(function () { O.toast('Lien copié. Collez-le dans WhatsApp, Facebook ou un SMS.'); }); };
    document.getElementById('a-qr').onclick = fenetreQR;
    Array.prototype.forEach.call(c.querySelectorAll('[data-onglet]'), function (a) {
      a.addEventListener('click', function () { if (a.dataset.onglet) S.ongletSite = a.dataset.onglet; });
    });
  }

  function fenetreQR() {
    ouvrirFenetre('QR code de votre site',
      '<div class="qr-zone"><div id="qr"></div><p class="note">' + esc(lien()) + '</p></div>',
      '<button type="button" class="btn btn-secondaire" id="qr-fermer">Fermer</button><button type="button" class="btn btn-principal" id="qr-dl">' + ico('telecharger') + 'Télécharger l’image</button>');
    var zone = document.getElementById('qr');
    if (window.QRCode) new window.QRCode(zone, { text: lien() + '?s=qr', width: 440, height: 440, colorDark: '#14100D', colorLight: '#FFFFFF', correctLevel: window.QRCode.CorrectLevel.M });
    else zone.innerHTML = '<p class="note">Le générateur de QR code n’a pas pu se charger. Vérifiez votre connexion internet.</p>';
    document.getElementById('qr-fermer').onclick = function () { fen.close(); };
    document.getElementById('qr-dl').onclick = function () {
      var cv = zone.querySelector('canvas'); if (!cv) return;
      var out = document.createElement('canvas'); out.width = 520; out.height = 600;
      var x = out.getContext('2d'); x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, 520, 600); x.drawImage(cv, 40, 40, 440, 440);
      x.fillStyle = '#14100D'; x.font = '600 20px "Work Sans", sans-serif'; x.textAlign = 'center';
      x.fillText(S.org.nom.length > 40 ? S.org.nom.slice(0, 38) + '…' : S.org.nom, 260, 525);
      x.fillStyle = '#6B6B6B'; x.font = '15px "Work Sans", sans-serif'; x.fillText('Scannez pour voir notre site', 260, 555);
      var a = document.createElement('a'); a.download = 'qr-' + S.org.slug + '.png'; a.href = out.toDataURL('image/png'); a.click();
    };
  }

  // =================================================================
  // MON SITE (éditeur + aperçu en direct)
  // =================================================================
  var CHAMPS_SITE = ['nom', 'sigle', 'type_structure', 'secteur', 'ville', 'region', 'annee_creation', 'slogan', 'logo_url', 'couverture_url', 'theme', 'rubriques', 'mission', 'apropos', 'zone', 'langues', 'beneficiaires', 'beneficiaires_label', 'membres', 'contact'];
  function modifie() {
    if (!S.brouillon || !S.org) return false;
    return CHAMPS_SITE.some(function (k) { return JSON.stringify(S.brouillon[k]) !== JSON.stringify(S.org[k]); });
  }
  function envoyerApercu() {
    var f = document.getElementById('apercu-cadre');
    if (f && f.contentWindow) f.contentWindow.postMessage({ type: 'minva-apercu', org: S.brouillon }, location.origin);
    var e = document.getElementById('etat-enreg');
    if (e) { var m = modifie(); e.className = 'etat-enreg' + (m ? ' modifie' : ''); e.innerHTML = m ? ico('crayon') + 'Modifications non enregistrées' : ico('verifie') + 'Tout est enregistré'; }
    var b = document.getElementById('site-enreg'); if (b) b.disabled = !modifie();
    var a = document.getElementById('site-annuler'); if (a) a.disabled = !modifie();
  }

  function pSite(c) {
    var ong = [['identite', 'Identité'], ['apparence', 'Apparence'], ['rubriques', 'Rubriques'], ['textes', 'Textes'], ['contact', 'Contact']];
    c.innerHTML = tete('Mon site', 'Chaque modification s’affiche tout de suite dans l’aperçu. Enregistrez pour la publier.',
      '<button type="button" class="btn btn-secondaire btn-apercu-mobile" id="apercu-ouvrir">' + ico('oeil') + 'Voir l’aperçu</button>') +
      '<div class="editeur"><section class="bloc"><div class="onglets" role="tablist">' +
      ong.map(function (x) { return '<button type="button" role="tab" data-ong="' + x[0] + '" aria-selected="' + (S.ongletSite === x[0]) + '">' + x[1] + '</button>'; }).join('') +
      '</div><div id="ong-corps"></div>' +
      '<div class="barre-enreg"><span class="etat-enreg" id="etat-enreg"></span><button type="button" class="btn btn-secondaire btn-sm" id="site-annuler">Annuler</button><button type="button" class="btn btn-principal btn-sm" id="site-enreg">Enregistrer</button></div></section>' +
      '<aside class="apercu" id="apercu" aria-label="Aperçu du site"><div class="apercu-tete"><b>Aperçu en direct</b><div class="seg" role="group" aria-label="Taille de l’aperçu">' +
      '<button type="button" data-app="tel" aria-pressed="' + (S.appareil === 'tel') + '">Téléphone</button><button type="button" data-app="ordi" aria-pressed="' + (S.appareil === 'ordi') + '">Ordinateur</button></div>' +
      '<button type="button" class="btn-icone btn-apercu-mobile" id="apercu-fermer" aria-label="Fermer l’aperçu" style="color:inherit">' + ico('fermer', 'ico-lg') + '</button></div>' +
      '<div class="cadre ' + (S.appareil === 'tel' ? 'tel' : '') + '" id="cadre"><iframe id="apercu-cadre" title="Aperçu de votre site" src="site.html?o=' + encodeURIComponent(S.org.slug) + '&apercu=1' + (MV.mode === 'demo' ? '&demo=1' : '') + '"></iframe></div></aside></div>';

    Array.prototype.forEach.call(c.querySelectorAll('[data-ong]'), function (b) {
      b.onclick = function () { S.ongletSite = b.dataset.ong; Array.prototype.forEach.call(c.querySelectorAll('[data-ong]'), function (x) { x.setAttribute('aria-selected', String(x === b)); }); rendreOnglet(); };
    });
    Array.prototype.forEach.call(c.querySelectorAll('[data-app]'), function (b) {
      b.onclick = function () { S.appareil = b.dataset.app; document.getElementById('cadre').classList.toggle('tel', S.appareil === 'tel'); Array.prototype.forEach.call(c.querySelectorAll('[data-app]'), function (x) { x.setAttribute('aria-pressed', String(x === b)); }); };
    });
    document.getElementById('apercu-ouvrir').onclick = function () { document.getElementById('apercu').classList.add('plein'); };
    document.getElementById('apercu-fermer').onclick = function () { document.getElementById('apercu').classList.remove('plein'); };
    document.getElementById('site-annuler').onclick = function () { S.brouillon = JSON.parse(JSON.stringify(S.org)); rendreOnglet(); envoyerApercu(); };
    document.getElementById('site-enreg').onclick = function () {
      var btn = this, patch = {};
      if (!String(S.brouillon.nom || '').trim()) { O.toast('Le nom de l’organisation est obligatoire.', 'erreur'); S.ongletSite = 'identite'; pSite(c); return; }
      CHAMPS_SITE.forEach(function (k) { if (JSON.stringify(S.brouillon[k]) !== JSON.stringify(S.org[k])) patch[k] = S.brouillon[k]; });
      occupe(btn, true, 'Enregistrement…');
      MV.org.maj(patch).then(function (o) { S.org = o; S.brouillon = JSON.parse(JSON.stringify(o)); majNav(); O.toast('Enregistré. Votre site est à jour.'); })
        .catch(erreur).then(function () { occupe(btn, false); envoyerApercu(); });
    };
    window.onmessage = function (e) { if (e.origin === location.origin && e.data && e.data.type === 'minva-apercu-pret') envoyerApercu(); };
    rendreOnglet(); envoyerApercu();
  }

  function champ(id, label, valeur, opts) {
    opts = opts || {};
    var attr = ' id="' + id + '" data-champ="' + (opts.cle || id.replace(/^s-/, '')) + '"' + (opts.max ? ' maxlength="' + opts.max + '"' : '') + (opts.placeholder ? ' placeholder="' + esc(opts.placeholder) + '"' : '');
    var input = opts.zone ? '<textarea' + attr + '>' + esc(valeur || '') + '</textarea>'
      : '<input type="' + (opts.type || 'text') + '"' + attr + ' value="' + esc(valeur == null ? '' : valeur) + '"' + (opts.type === 'number' ? ' min="0" inputmode="numeric"' : '') + '>';
    return '<div class="champ"><label for="' + id + '">' + label + '</label>' + input + (opts.aide ? '<span class="aide">' + opts.aide + '</span>' : '') + '</div>';
  }

  function rendreOnglet() {
    var b = S.brouillon, z = document.getElementById('ong-corps'), h = '';
    if (S.ongletSite === 'identite') {
      h = '<div class="pile">' + champ('s-nom', 'Nom de l’organisation', b.nom, { max: 120 }) +
        '<div class="grille-champs"><div class="champ"><label for="s-type">Type de structure</label><select id="s-type" data-champ="type_structure">' + O.TYPES_STRUCTURE.map(function (x) { return '<option value="' + x[0] + '"' + (O.typeDe(b)[0] === x[0] ? ' selected' : '') + '>' + esc(x[1]) + '</option>'; }).join('') + '</select><span class="aide">Votre site s’accorde : « un club de confiance », « une coopérative de confiance »…</span></div>' +
        champ('s-sigle', 'Sigle', b.sigle, { max: 8, aide: 'Affiché tant que vous n’avez pas de logo.' }) + '</div>' +
        '<div class="grille-champs"><div class="champ"><label for="s-secteur">Secteur</label><select id="s-secteur" data-champ="secteur">' + Object.keys(O.SECTEURS).map(function (k) { return '<option value="' + k + '"' + (b.secteur === k ? ' selected' : '') + '>' + O.SECTEURS[k].nom + '</option>'; }).join('') + '</select></div></div>' +
        champ('s-slogan', 'Slogan', b.slogan, { max: 120, placeholder: 'Une phrase qui dit ce que vous changez', aide: 'Affiché en grand sous votre nom.' }) +
        '<div class="grille-champs">' + champ('s-ville', 'Ville', b.ville, { max: 60 }) +
        '<div class="champ"><label for="s-region">Région</label><select id="s-region" data-champ="region"><option value="">Choisir…</option>' + O.REGIONS.map(function (r) { return '<option' + (b.region === r ? ' selected' : '') + '>' + esc(r) + '</option>'; }).join('') + '</select></div>' +
        champ('s-annee', 'Année de création', b.annee_creation, { type: 'number', cle: 'annee_creation' }) + '</div>' +
        '<div class="champ"><span class="etiquette">Logo</span><div class="televerser"><span class="vignette">' + (b.logo_url ? '<img src="' + esc(b.logo_url) + '" alt="Logo actuel">' : ico('photo', 'ico-lg')) + '</span>' +
        '<div class="actions"><label class="btn btn-secondaire btn-sm btn-fichier">' + ico('photo') + (b.logo_url ? 'Changer' : 'Ajouter un logo') + '<input type="file" accept="image/*" data-image="logo_url"></label>' +
        (b.logo_url ? '<button type="button" class="btn btn-lien" data-retirer="logo_url">Retirer</button>' : '') + '</div></div><span class="aide">Image carrée de préférence.</span></div>' +
        '<div class="champ"><span class="etiquette">Photo de couverture</span><div class="televerser"><span class="vignette large">' + (b.couverture_url ? '<img src="' + esc(b.couverture_url) + '" alt="Couverture actuelle">' : ico('photo', 'ico-lg')) + '</span>' +
        '<div class="actions"><label class="btn btn-secondaire btn-sm btn-fichier">' + ico('photo') + (b.couverture_url ? 'Changer' : 'Ajouter une photo') + '<input type="file" accept="image/*" data-image="couverture_url"></label>' +
        (b.couverture_url ? '<button type="button" class="btn btn-lien" data-retirer="couverture_url">Retirer</button>' : '') + '</div></div><span class="aide">Une vraie photo de vos membres en action, en format paysage. Sans photo, votre site affiche un motif bogolan aux couleurs de votre thème.</span></div></div>';
    } else if (S.ongletSite === 'apparence') {
      h = '<p class="note" style="margin-bottom:16px">Choisissez l’ambiance de votre site. Chaque thème est pensé pour rester lisible sur tous les téléphones.</p><div class="themes">' +
        window.MINVA_THEMES.map(function (t) {
          return '<button type="button" class="theme" data-theme="' + t.id + '" aria-pressed="' + (b.theme === t.id) + '"><span class="theme-mini"><span class="h" style="background:' + t.primaire + '"><i style="background:' + t.surPrimaire + '"></i><i style="background:' + t.surPrimaire + ';opacity:.6"></i><span class="p" style="background:' + t.accent + '"></span></span>' +
            '<span class="f" style="background:' + t.fond + '"><span style="background:' + t.surface + ';border:1px solid ' + t.filet + '"></span><span style="background:' + t.surface + ';border:1px solid ' + t.filet + '"></span></span></span>' +
            '<span class="theme-nom"><b>' + esc(t.nom) + '</b><span>' + esc(t.inspiration) + '</span></span></button>';
        }).join('') + '</div>';
    } else if (S.ongletSite === 'rubriques') {
      var R = [['apropos', 'À propos', 'Votre mission et votre histoire'], ['actualites', 'Actualités', 'Vos publications, avec photos'], ['projets', 'Projets', 'Vos projets et leur collecte'], ['besoins', 'Nous aider', 'Ce dont vous avez besoin'],
        ['galerie', 'Photos', 'Toutes les photos de vos actualités (à partir de 3)'], ['documents', 'Transparence', 'Vos documents officiels vérifiés'], ['equipe', 'Équipe', 'Les membres de votre bureau'], ['contact', 'Contact', 'WhatsApp, téléphone, email, adresse'],
        ['agenda', 'Agenda', 'Vos événements, avec inscription en ligne'], ['dons', 'Faire un don', 'Vos numéros Mobile Money et le mur des donateurs'], ['rejoindre', 'Devenir membre', 'Un bouton pour demander à vous rejoindre']];
      var rb = b.rubriques || {};
      h = '<p class="note" style="margin-bottom:8px">Masquez les rubriques dont vous ne voulez pas. Une rubrique vide ne s’affiche jamais, même activée.</p><ul class="rubriques">' +
        R.map(function (r) { return '<li><div><b>' + r[1] + '</b><span>' + r[2] + '</span></div><label class="inter"><input type="checkbox" data-rub="' + r[0] + '"' + (rb[r[0]] !== false ? ' checked' : '') + '><span class="piste-inter"></span><span class="sr">Afficher ' + r[1] + '</span></label></li>'; }).join('') + '</ul>';
    } else if (S.ongletSite === 'textes') {
      h = '<div class="pile">' + champ('s-mission', 'Votre mission, en une phrase', b.mission, { zone: true, max: 220, aide: 'Affichée en grand dans « À propos ». 220 caractères maximum.' }) +
        champ('s-apropos', 'Votre histoire', b.apropos, { zone: true, max: 1200, aide: 'Qui vous êtes, depuis quand, ce que vous faites concrètement.' }) +
        '<div class="grille-champs">' + champ('s-zone', 'Zone d’action', b.zone, { max: 120, placeholder: 'Daloa et 7 villages' }) + champ('s-langues', 'Langues parlées', b.langues, { max: 120, placeholder: 'Bété, dioula, français' }) + '</div>' +
        '<div class="grille-champs">' + champ('s-benef', 'Nombre de bénéficiaires', b.beneficiaires, { type: 'number', cle: 'beneficiaires' }) + champ('s-benef-l', 'Qui sont-ils ?', b.beneficiaires_label, { max: 40, cle: 'beneficiaires_label', placeholder: 'élèves, familles, habitants…' }) +
        champ('s-membres', 'Nombre de membres', b.membres, { type: 'number', cle: 'membres' }) + '</div></div>';
    } else if (S.ongletSite === 'contact') {
      var ct = b.contact || {};
      h = '<div class="pile">' + champ('c-wa', 'Numéro WhatsApp', ct.whatsapp, { type: 'tel', cle: 'contact.whatsapp', placeholder: '225 07 00 00 00 00', aide: 'Avec l’indicatif 225, sans le +. C’est le bouton le plus utilisé par vos visiteurs.' }) +
        champ('c-tel', 'Téléphone affiché', ct.telephone, { type: 'tel', cle: 'contact.telephone', placeholder: '+225 07 00 00 00 00' }) +
        champ('c-email', 'Email', ct.email, { type: 'email', cle: 'contact.email' }) +
        champ('c-fb', 'Page Facebook', ct.facebook, { cle: 'contact.facebook', placeholder: 'https://facebook.com/votrepage' }) +
        champ('c-adr', 'Adresse ou repère', ct.adresse, { cle: 'contact.adresse', max: 160, placeholder: 'Quartier, rue, à côté de…' }) +
        '<div class="encart-mm"><b>Recevoir des dons par Mobile Money</b><p class="note">Vos visiteurs envoient leur don directement sur ces numéros : MinVa ne touche jamais l’argent et ne prend aucune commission. Laissez vide ce que vous n’utilisez pas.</p>' +
        '<div class="grille-champs">' + champ('c-orange', 'Orange Money', ct.orange, { type: 'tel', cle: 'contact.orange', max: 20, placeholder: '07 00 00 00 00' }) + champ('c-mtn', 'MTN MoMo', ct.mtn, { type: 'tel', cle: 'contact.mtn', max: 20, placeholder: '05 00 00 00 00' }) + '</div>' +
        '<div class="grille-champs">' + champ('c-moov', 'Moov Money', ct.moov, { type: 'tel', cle: 'contact.moov', max: 20, placeholder: '01 00 00 00 00' }) + champ('c-wave', 'Wave', ct.wave, { type: 'tel', cle: 'contact.wave', max: 20, placeholder: '07 00 00 00 00' }) + '</div>' +
        champ('c-lwave', 'Lien de paiement Wave (facultatif)', ct.lien_wave, { cle: 'contact.lien_wave', max: 200, placeholder: 'https://pay.wave.com/m/…', aide: 'Dans l’application Wave Business : « Recevoir un paiement » → copier le lien.' }) + '</div></div>';
    }
    z.innerHTML = h;

    z.oninput = z.onchange = function (e) {
      var el = e.target, cle = el.dataset && el.dataset.champ;
      if (cle) {
        var v = el.type === 'number' ? (el.value === '' ? null : Math.max(0, parseInt(el.value, 10) || 0)) : el.value;
        if (cle.indexOf('contact.') === 0) { S.brouillon.contact = Object.assign({}, S.brouillon.contact || {}); S.brouillon.contact[cle.slice(8)] = v; }
        else S.brouillon[cle] = v;
        envoyerApercu();
      }
      if (el.dataset && el.dataset.rub && e.type === 'change') {
        S.brouillon.rubriques = Object.assign({}, S.brouillon.rubriques || {}); S.brouillon.rubriques[el.dataset.rub] = el.checked; envoyerApercu();
      }
      if (el.dataset && el.dataset.image && e.type === 'change' && el.files[0]) {
        var cleImg = el.dataset.image, lbl = el.closest('label');
        lbl.classList.add('occupe'); lbl.firstChild && (lbl.style.opacity = '.6');
        MV.media.envoyer(el.files[0], 'identite').then(function (url) { S.brouillon[cleImg] = url; rendreOnglet(); envoyerApercu(); O.toast('Image prête. Pensez à enregistrer.'); })
          .catch(erreur).then(function () { lbl.style.opacity = ''; });
      }
    };
    z.onclick = function (e) {
      var t = e.target.closest('[data-theme]');
      if (t) { S.brouillon.theme = t.dataset.theme; Array.prototype.forEach.call(z.querySelectorAll('[data-theme]'), function (x) { x.setAttribute('aria-pressed', String(x === t)); }); envoyerApercu(); }
      var r = e.target.closest('[data-retirer]');
      if (r) { S.brouillon[r.dataset.retirer] = null; rendreOnglet(); envoyerApercu(); }
    };
  }

  // =================================================================
  // ACTUALITÉS
  // =================================================================
  function pActus(c) {
    var cp = S.composer;
    c.innerHTML = tete('Actualités', 'Racontez votre vie d’organisation, comme sur les réseaux sociaux. Tout ce que vous publiez apparaît aussitôt sur votre site.') +
      '<div class="grille-2"><div><section class="bloc composer"><h2>Nouvelle publication</h2>' +
      '<div class="types" role="group" aria-label="Type de publication">' + Object.keys(O.TYPES_ACTU).map(function (k) { return '<button type="button" class="puce" data-type="' + k + '" aria-pressed="' + (cp.type === k) + '">' + ico(k) + O.TYPES_ACTU[k] + '</button>'; }).join('') + '</div>' +
      '<textarea id="a-texte" maxlength="2000" aria-label="Texte de la publication" placeholder="Qu’avez-vous fait cette semaine ? Un événement à annoncer ? Un besoin ?"></textarea>' +
      '<div class="vignettes" id="a-vignettes"></div>' +
      '<div class="composer-pied"><span class="compteur" id="a-compteur">0 / 2000</span><label class="btn btn-secondaire btn-sm btn-fichier">' + ico('photo') + 'Photos (4 max)<input type="file" id="a-photos" accept="image/*" multiple></label>' +
      '<button type="button" class="btn btn-principal" id="a-publier" disabled>' + ico('envoi') + 'Publier</button></div>' +
      '<p class="note" style="margin-top:12px">Les photos sont allégées automatiquement avant l’envoi : elles se chargent vite même avec une petite connexion.</p></section>' +
      '<section class="bloc"><h2>Idées de publications</h2><ul class="conseils"><li>« Ce matin, 40 élèves ont reçu leurs kits scolaires. » avec 2 photos.</li><li>« Réunion du bureau samedi à 9 h au foyer. Tous les membres sont invités. »</li><li>« Nous cherchons 20 sacs de ciment pour finir la toiture. » (type Besoin)</li><li>« Notre rapport 2025 est prêt : 42 tonnes vendues, 86 membres. » (type Rapport)</li></ul></section></div>' +
      '<section class="bloc"><h2>Déjà publiées <small>· ' + S.actus.length + '</small></h2><div id="a-liste">' + listeActus() + '</div></section></div>';

    var ta = document.getElementById('a-texte'), pub = document.getElementById('a-publier');
    function maj() {
      document.getElementById('a-compteur').textContent = ta.value.length + ' / 2000';
      pub.disabled = S.envoi || (!ta.value.trim() && !cp.fichiers.length);
      document.getElementById('a-vignettes').innerHTML = cp.apercus.map(function (u, i) { return '<figure><img src="' + u + '" alt="Photo ' + (i + 1) + '"><button type="button" data-retirer="' + i + '" aria-label="Retirer la photo ' + (i + 1) + '">' + ico('fermer') + '</button></figure>'; }).join('');
    }
    ta.addEventListener('input', maj);
    Array.prototype.forEach.call(c.querySelectorAll('[data-type]'), function (b) {
      b.onclick = function () { cp.type = b.dataset.type; Array.prototype.forEach.call(c.querySelectorAll('[data-type]'), function (x) { x.setAttribute('aria-pressed', String(x === b)); }); };
    });
    document.getElementById('a-photos').onchange = function (e) {
      var f = Array.prototype.slice.call(e.target.files).filter(function (x) { return /^image\//.test(x.type); });
      if (cp.fichiers.length + f.length > 4) O.toast('4 photos maximum par publication.', 'erreur');
      f.slice(0, 4 - cp.fichiers.length).forEach(function (x) { cp.fichiers.push(x); cp.apercus.push(URL.createObjectURL(x)); });
      e.target.value = ''; maj();
    };
    document.getElementById('a-vignettes').onclick = function (e) {
      var b = e.target.closest('[data-retirer]'); if (!b) return;
      var i = +b.dataset.retirer; URL.revokeObjectURL(cp.apercus[i]); cp.fichiers.splice(i, 1); cp.apercus.splice(i, 1); maj();
    };
    pub.onclick = function () {
      S.envoi = true; occupe(pub, true, cp.fichiers.length ? 'Envoi des photos…' : 'Publication…');
      Promise.all(cp.fichiers.map(function (f) { return MV.media.envoyer(f, 'actualites'); }))
        .then(function (urls) { return MV.actu.creer({ type: cp.type, texte: ta.value, photos: urls }); })
        .then(function () {
          cp.apercus.forEach(function (u) { URL.revokeObjectURL(u); });
          S.composer = { type: 'actu', fichiers: [], apercus: [] };
          return recharger('actus');
        })
        .then(function () { S.envoi = false; O.toast('Publié sur votre site.'); pActus(c); })
        .catch(function (e) { S.envoi = false; occupe(pub, false); maj(); erreur(e); });
    };
    var supprActu = supprimerAvecConfirmation(function (id) { return MV.actu.supprimer(id).then(function () { return recharger('actus'); }).then(function () { pActus(c); O.toast('Publication supprimée.'); }); });
    document.getElementById('a-liste').onclick = function (e) {
      var b = e.target.closest('[data-image-actu]');
      if (b) { var a = S.actus.find(function (x) { return x.id === b.dataset.imageActu; }), dt = new Date(a.created_at); imagePartage(b, { surtitre: (O.TYPES_ACTU[a.type] || 'Actualité') + ' · ' + O.dateLongue(dt), texte: a.texte || '', photo: (a.photos || [])[0] }, 'actualite'); return; }
      supprActu(e);
    };
    maj();
  }
  function listeActus() {
    if (!S.actus.length) return '<div class="vide"><h3>Aucune publication pour l’instant</h3><p>Votre première actualité fera vivre votre site. Quelques lignes et une photo suffisent.</p></div>';
    return S.actus.map(function (a) {
      return '<article class="post"><div class="post-tete"><span class="badge b-neutre">' + ico(a.type) + (O.TYPES_ACTU[a.type] || '') + '</span><time datetime="' + a.created_at + '">' + O.quand(a.created_at) + '</time>' +
        '<span class="actions"><button type="button" class="btn btn-secondaire btn-sm" data-image-actu="' + a.id + '">' + ico('photo') + 'Image à partager</button><button type="button" class="btn btn-lien" data-suppr="' + a.id + '">Supprimer</button></span></div>' +
        ((a.photos || []).length ? '<div class="post-photos">' + a.photos.map(function (p) { return '<img src="' + esc(p) + '" alt="">'; }).join('') + '</div>' : '') +
        (a.texte ? '<p>' + esc(a.texte) + '</p>' : '') + '</article>';
    }).join('');
  }
  // Suppression en deux temps (jamais de confirm() bloquant)
  function supprimerAvecConfirmation(action) {
    return function (e) {
      var b = e.target.closest('[data-suppr]'); if (!b) return;
      if (b.dataset.confirme !== '1') {
        b.dataset.confirme = '1'; b.textContent = 'Confirmer la suppression'; b.style.color = 'var(--rouge-alerte)';
        setTimeout(function () { if (b.isConnected) { b.dataset.confirme = ''; b.textContent = 'Supprimer'; b.style.color = ''; } }, 4000);
        return;
      }
      b.disabled = true; action(b.dataset.suppr).catch(erreur);
    };
  }

  // =================================================================
  // PROJETS
  // =================================================================
  function pProjets(c) {
    c.innerHTML = tete('Projets', 'Présentez ce que vous voulez réaliser et combien il vous manque. Chaque projet a un bouton « Soutenir » qui ouvre WhatsApp.',
      '<button type="button" class="btn btn-principal" id="p-nouveau">' + ico('plus') + 'Nouveau projet</button>') +
      '<section class="bloc" id="p-liste">' + (S.projets.length ? S.projets.map(function (p) {
        var pct = p.objectif ? Math.min(100, Math.round(p.collecte / p.objectif * 100)) : 0;
        return '<div class="projet"><h3>' + esc(p.titre) + (p.actif ? '' : ' <span class="badge b-neutre">masqué</span>') + '</h3>' +
          '<div class="meta"><span>' + O.fcfa(p.collecte) + ' collectés</span>' + (p.objectif ? '<span>objectif ' + O.fcfa(p.objectif) + '</span><span>' + pct + ' %</span>' : '') + '<span>' + p.donateurs + ' donateurs</span></div>' +
          (p.objectif ? '<div class="piste"><i style="width:' + pct + '%"></i></div>' : '') +
          '<div class="actions"><button type="button" class="btn btn-secondaire btn-sm" data-modif="' + p.id + '">' + ico('crayon') + 'Modifier</button><button type="button" class="btn btn-lien" data-suppr="' + p.id + '">Supprimer</button></div></div>';
      }).join('') : '<div class="vide"><h3>Aucun projet présenté</h3><p>Un projet clair (« Un magasin de stockage pour la récolte ») avec un objectif en FCFA donne envie d’aider.</p><button type="button" class="btn btn-noir" id="p-nouveau2">' + ico('plus') + 'Présenter un projet</button></div>') + '</section>';
    document.getElementById('p-nouveau').onclick = function () { formProjet(null, c); };
    var n2 = document.getElementById('p-nouveau2'); if (n2) n2.onclick = function () { formProjet(null, c); };
    var liste = document.getElementById('p-liste');
    var suppr = supprimerAvecConfirmation(function (id) { return MV.projet.supprimer(id).then(function () { return recharger('projets'); }).then(function () { pProjets(c); O.toast('Projet supprimé.'); }); });
    liste.onclick = function (e) {
      var m = e.target.closest('[data-modif]');
      if (m) { formProjet(S.projets.find(function (p) { return p.id === m.dataset.modif; }), c); return; }
      suppr(e);
    };
  }
  function formProjet(p, c) {
    p = p || { titre: '', description: '', collecte: 0, objectif: 0, donateurs: 0, actif: true };
    ouvrirFenetre(p.id ? 'Modifier le projet' : 'Nouveau projet',
      '<div class="champ"><label for="fp-titre">Titre du projet</label><input id="fp-titre" type="text" maxlength="120" value="' + esc(p.titre) + '" placeholder="Une bibliothèque mobile pour 6 écoles"></div>' +
      '<div class="champ"><label for="fp-desc">Description</label><textarea id="fp-desc" maxlength="600">' + esc(p.description) + '</textarea><span class="aide">Ce que le projet va changer, concrètement.</span></div>' +
      '<div class="grille-champs"><div class="champ"><label for="fp-obj">Objectif (FCFA)</label><input id="fp-obj" type="number" min="0" inputmode="numeric" value="' + (p.objectif || '') + '"></div>' +
      '<div class="champ"><label for="fp-col">Déjà collecté (FCFA)</label><input id="fp-col" type="number" min="0" inputmode="numeric" value="' + (p.collecte || '') + '"></div>' +
      '<div class="champ"><label for="fp-don">Nombre de donateurs</label><input id="fp-don" type="number" min="0" inputmode="numeric" value="' + (p.donateurs || '') + '"></div></div>' +
      '<label class="case"><input type="checkbox" id="fp-actif"' + (p.actif !== false ? ' checked' : '') + '> Afficher ce projet sur mon site</label>',
      '<button type="button" class="btn btn-secondaire" id="fp-annuler">Annuler</button><button type="button" class="btn btn-principal" id="fp-ok">Enregistrer</button>');
    document.getElementById('fp-annuler').onclick = function () { fen.close(); };
    document.getElementById('fp-ok').onclick = function () {
      var btn = this; occupe(btn, true);
      MV.projet.enregistrer({ id: p.id, titre: document.getElementById('fp-titre').value.trim(), description: document.getElementById('fp-desc').value.trim(),
        objectif: document.getElementById('fp-obj').value, collecte: document.getElementById('fp-col').value, donateurs: document.getElementById('fp-don').value, actif: document.getElementById('fp-actif').checked })
        .then(function () { return recharger('projets'); }).then(function () { fen.close(); pProjets(c); O.toast('Projet enregistré.'); })
        .catch(function (e) { occupe(btn, false); erreur(e); });
    };
  }

  // =================================================================
  // BESOINS & ÉQUIPE
  // =================================================================
  function pBesoins(c) {
    var besoins = JSON.parse(JSON.stringify(S.org.besoins || []));
    var equipe = JSON.parse(JSON.stringify(S.org.equipe || []));
    function rendre() {
      c.innerHTML = tete('Besoins & équipe', 'Dites clairement comment on peut vous aider, et qui fait vivre l’organisation.') +
        '<section class="bloc"><h2>Ce dont vous avez besoin <small>· ' + besoins.length + '/6</small></h2><div class="liste-edit" id="l-besoins">' +
        besoins.map(function (b, i) {
          return '<div class="ligne-edit"><select aria-label="Type de besoin" data-b="' + i + '" data-k="type">' + Object.keys(O.TYPES_BESOIN).map(function (k) { return '<option value="' + k + '"' + (b.type === k ? ' selected' : '') + '>' + O.TYPES_BESOIN[k] + '</option>'; }).join('') + '</select>' +
            '<input type="text" aria-label="Titre du besoin" maxlength="80" placeholder="Livres jeunesse" data-b="' + i + '" data-k="titre" value="' + esc(b.titre) + '">' +
            '<input type="text" aria-label="Détail du besoin" maxlength="200" placeholder="Niveau CP–CE, neufs ou en bon état" data-b="' + i + '" data-k="detail" value="' + esc(b.detail) + '">' +
            '<button type="button" class="btn-icone" data-retb="' + i + '" aria-label="Retirer ce besoin">' + ico('corbeille', 'ico-lg') + '</button></div>';
        }).join('') + '</div>' +
        (besoins.length < 6 ? '<p style="margin:16px 0 0"><button type="button" class="btn btn-secondaire btn-sm" id="aj-b">' + ico('plus') + 'Ajouter un besoin</button></p>' : '') + '</section>' +
        '<section class="bloc"><h2>Votre équipe <small>· ' + equipe.length + '/12</small></h2><div class="liste-edit" id="l-equipe">' +
        equipe.map(function (m, i) {
          return '<div class="ligne-edit equipe"><input type="text" aria-label="Rôle" maxlength="60" placeholder="Présidente" data-e="' + i + '" data-k="role" value="' + esc(m.role) + '">' +
            '<input type="text" aria-label="Nom" maxlength="80" placeholder="Awa Gnahoré" data-e="' + i + '" data-k="nom" value="' + esc(m.nom) + '">' +
            '<button type="button" class="btn-icone" data-rete="' + i + '" aria-label="Retirer ce membre">' + ico('corbeille', 'ico-lg') + '</button></div>';
        }).join('') + '</div>' +
        (equipe.length < 12 ? '<p style="margin:16px 0 0"><button type="button" class="btn btn-secondaire btn-sm" id="aj-e">' + ico('plus') + 'Ajouter un membre</button></p>' : '') + '</section>' +
        '<p style="margin-top:24px"><button type="button" class="btn btn-principal" id="be-enreg">Enregistrer les besoins et l’équipe</button></p>';
      c.oninput = c.onchange = function (e) {
        var el = e.target;
        if (el.dataset.b !== undefined) besoins[+el.dataset.b][el.dataset.k] = el.value;
        if (el.dataset.e !== undefined) equipe[+el.dataset.e][el.dataset.k] = el.value;
      };
      c.onclick = function (e) {
        var t = e.target.closest('button'); if (!t) return;
        if (t.id === 'aj-b') { besoins.push({ type: 'financement', titre: '', detail: '' }); rendre(); }
        else if (t.id === 'aj-e') { equipe.push({ role: '', nom: '' }); rendre(); }
        else if (t.dataset.retb !== undefined) { besoins.splice(+t.dataset.retb, 1); rendre(); }
        else if (t.dataset.rete !== undefined) { equipe.splice(+t.dataset.rete, 1); rendre(); }
        else if (t.id === 'be-enreg') {
          occupe(t, true, 'Enregistrement…');
          var b2 = besoins.filter(function (b) { return String(b.titre).trim(); }), e2 = equipe.filter(function (m) { return String(m.nom).trim(); });
          MV.org.maj({ besoins: b2, equipe: e2 }).then(function (o) { S.org = o; S.brouillon = JSON.parse(JSON.stringify(o)); besoins = b2; equipe = e2; rendre(); O.toast('Enregistré. Votre site est à jour.'); })
            .catch(function (er) { occupe(t, false); erreur(er); });
        }
      };
    }
    rendre();
  }

  // =================================================================
  // DOCUMENTS
  // =================================================================
  function pDocuments(c) {
    var verif = S.docs.filter(function (d) { return d.statut === 'verifie'; }).length;
    c.innerHTML = tete('Documents de confiance', 'L’équipe MinVa contrôle vos documents officiels. Une fois vérifiés, ils apparaissent comme « Vérifié » sur votre site : c’est ce que regardent les bailleurs.') +
      '<div class="grille-2"><section class="bloc"><h2>Vos documents <small>· ' + verif + '/6 vérifiés</small></h2><ul class="docs" id="d-liste">' +
      O.DOCS.map(function (dd) {
        var d = S.docs.find(function (x) { return x.type === dd[0]; });
        var etat = !d ? '<span class="etat etat-manquant"></span>' : d.statut === 'verifie' ? '<span class="etat etat-ok">' + ico('verifie') + '</span>' : d.statut === 'refuse' ? '<span class="etat etat-refuse">' + ico('alerte') + '</span>' : '<span class="etat etat-attente">' + ico('horloge') + '</span>';
        var sous = !d ? '<small>Pas encore envoyé</small>' : d.statut === 'verifie' ? '<small>Vérifié par MinVa' + (d.annee ? ' · ' + d.annee : '') + '</small>' : d.statut === 'refuse' ? '<small class="refuse">Refusé' + (d.commentaire ? ' : ' + esc(d.commentaire) : '') + '. Envoyez une nouvelle version.</small>' : '<small>Envoyé ' + O.quand(d.created_at) + ', contrôle en cours</small>';
        return '<li>' + etat + '<div><b>' + dd[1] + '</b>' + sous + '</div><div class="actions"><input type="number" min="1960" max="2100" placeholder="Année" aria-label="Année du document ' + dd[1] + '" id="an-' + dd[0] + '" value="' + (d && d.annee ? d.annee : '') + '">' +
          '<label class="btn btn-secondaire btn-sm btn-fichier">' + ico('telecharger') + (d ? 'Remplacer' : 'Envoyer') + '<input type="file" accept="application/pdf,image/*" data-doc="' + dd[0] + '"></label></div></li>';
      }).join('') + '</ul></section>' +
      '<section class="bloc"><h2>Comment ça marche</h2><ul class="garanties">' +
      '<li>' + ico('verifie') + '<span>Photographiez ou scannez le document (PDF ou photo, 10 Mo maximum).</span></li>' +
      '<li>' + ico('verifie') + '<span>MinVa le contrôle, en général sous 72 h. Le fichier lui-même n’est <b>jamais montré au public</b> : seul son statut « Vérifié » apparaît.</span></li>' +
      '<li>' + ico('verifie') + '<span>Avec 5 documents vérifiés ou plus, votre organisation peut recevoir le badge « Vérifié par MinVa ».</span></li></ul></section></div>';
    document.getElementById('d-liste').onchange = function (e) {
      var el = e.target; if (!el.dataset.doc || !el.files[0]) return;
      var lbl = el.closest('label'); lbl.style.opacity = '.6';
      MV.doc.envoyer(el.dataset.doc, el.files[0], document.getElementById('an-' + el.dataset.doc).value)
        .then(function () { return recharger('docs'); }).then(function () { pDocuments(c); majNav(); O.toast('Document envoyé. MinVa va le contrôler.'); })
        .catch(function (er) { lbl.style.opacity = ''; erreur(er); });
    };
  }

  // =================================================================
  // ADMINISTRATEURS
  // =================================================================
  function pAdmins(c) {
    var places = [0, 1, 2].map(function (i) {
      var a = S.admins[i];
      return a ? '<div class="place occupee"><b>' + esc(a.nom) + (a.id === S.profil.id ? ' (vous)' : '') + '</b><span>' + esc(a.email) + '</span></div>' : '<div class="place"><b>Place libre</b><span>Administrateur ' + (i + 1) + '</span></div>';
    }).join('');
    c.innerHTML = tete('Administrateurs', 'Votre organisation peut avoir jusqu’à 3 administrateurs. Chacun a son propre email et son mot de passe, et peut tout gérer.') +
      '<div class="places">' + places + '</div><div class="grille-2"><section class="bloc"><h2>Liste</h2><div id="ad-liste">' +
      S.admins.map(function (a) {
        return '<div class="admin-ligne"><span class="mono">' + esc(O.sigleDe(a.nom).slice(0, 2)) + '</span><div><b>' + esc(a.nom) + (a.id === S.profil.id ? ' (vous)' : '') + '</b><span>' + esc(a.email) + '</span></div>' +
          (a.id !== S.profil.id ? '<button type="button" class="btn btn-lien" data-suppr="' + a.id + '">Retirer</button>' : '') + '</div>';
      }).join('') + '</div></section>' +
      '<section class="bloc"><h2>Ajouter un administrateur</h2>' + (S.admins.length >= 3
        ? '<div class="vide"><h3>Les 3 places sont prises</h3><p>Retirez un administrateur pour en ajouter un autre.</p></div>'
        : '<form id="ad-form" class="pile" novalidate><div class="champ"><label for="ad-nom">Nom complet</label><input id="ad-nom" type="text" maxlength="80" required></div>' +
          '<div class="champ"><label for="ad-email">Email</label><input id="ad-email" type="email" required autocomplete="off"></div>' +
          '<div class="champ"><label for="ad-mdp">Mot de passe provisoire</label><div class="mdp-ligne"><input id="ad-mdp" type="text" minlength="8" required autocomplete="off"><button type="button" class="btn btn-secondaire btn-sm" id="ad-gen">Générer</button></div>' +
          '<span class="aide">Donnez-le à la personne par téléphone ou de vive voix. Elle pourra le changer dans Paramètres.</span></div>' +
          '<button type="submit" class="btn btn-principal">' + ico('plus') + 'Ajouter</button></form>') + '</section></div>';
    var gen = document.getElementById('ad-gen');
    if (gen) gen.onclick = function () {
      var car = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789', m = '';
      var a = new Uint32Array(10); crypto.getRandomValues(a); a.forEach(function (n) { m += car[n % car.length]; });
      document.getElementById('ad-mdp').value = m;
    };
    var f = document.getElementById('ad-form');
    if (f) f.onsubmit = function (e) {
      e.preventDefault(); var btn = f.querySelector('[type=submit]'); occupe(btn, true);
      MV.admins.inviter({ nom: document.getElementById('ad-nom').value.trim(), email: document.getElementById('ad-email').value.trim(), motDePasse: document.getElementById('ad-mdp').value })
        .then(function () { return recharger('admins'); }).then(function () { pAdmins(c); O.toast('Administrateur ajouté. Communiquez-lui son email et son mot de passe provisoire.'); })
        .catch(function (er) { occupe(btn, false); erreur(er); });
    };
    document.getElementById('ad-liste').onclick = supprimerAvecConfirmation(function (id) {
      return MV.admins.retirer(id).then(function () { return recharger('admins'); }).then(function () { pAdmins(c); O.toast('Administrateur retiré.'); });
    });
  }

  // =================================================================
  // ACCÈS DÉVELOPPEUR
  // =================================================================
  var minuterie = null;
  function pAcces(c) {
    var o = S.org, ouvert = acesOuvert(o);
    clearInterval(minuterie);
    c.innerHTML = tete('Accès développeur', 'En cas de problème sur votre site ou votre console, vous pouvez autoriser le développeur de MinVa à regarder votre compte pour le réparer à distance.') +
      '<div class="acces"><div class="pile"><section class="acces-carte' + (ouvert ? ' ouvert' : '') + '">' +
      '<div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start"><div><h2>' + (ouvert ? 'Accès ouvert' : 'Accès fermé') + '</h2><p class="note" style="margin-top:4px">' + (ouvert ? 'Le développeur peut consulter votre compte.' : 'Personne chez MinVa ne peut voir vos informations privées.') + '</p></div>' +
      '<label class="inter"><input type="checkbox" id="ac-inter"' + (ouvert ? ' checked' : '') + '><span class="piste-inter"></span><span class="sr">Donner accès au développeur</span></label></div>' +
      (ouvert ? '<div class="acces-etat">' + ico('horloge', 'ico-lg') + '<div><div class="compte-rebours" id="ac-rebours"></div><div>Se ferme automatiquement le ' + esc(O.heureLongue(o.acces_support_expire)) + '.</div></div></div>' : '') +
      '<label class="case"><input type="checkbox" id="ac-corr"' + (o.acces_support_corrections ? ' checked' : '') + '><span><b>Autoriser aussi les corrections</b><br><span class="note">Sans cette case, le développeur peut seulement regarder. Avec, il peut corriger vos textes, projets et actualités.</span></span></label>' +
      (ouvert ? '<button type="button" class="btn btn-principal" id="ac-fermer">' + ico('fermer') + 'Fermer l’accès maintenant</button>' : '<button type="button" class="btn btn-noir" id="ac-ouvrir">' + ico('cle') + 'Donner accès au développeur pour 72 h</button>') +
      '</section><section class="bloc"><h2>Vos garanties</h2><ul class="garanties">' +
      '<li>' + ico('bouclier') + '<span>L’accès se ferme <b>tout seul après 72 heures</b>. Vous pouvez le fermer avant à tout moment.</span></li>' +
      '<li>' + ico('bouclier') + '<span>Sans votre accord, le développeur ne voit ni vos administrateurs, ni vos réglages privés. Il ne voit que votre site public, comme tout le monde.</span></li>' +
      '<li>' + ico('bouclier') + '<span>Chaque consultation et chaque correction est <b>inscrite dans le journal ci-contre</b>, automatiquement.</span></li>' +
      '<li>' + ico('bouclier') + '<span>Le développeur ne peut jamais s’ouvrir l’accès lui-même : c’est vérifié par la base de données.</span></li></ul></section></div>' +
      '<section class="bloc"><h2>Journal des accès</h2>' + (S.journal.length ? '<ul class="journal">' + S.journal.map(function (j) {
        return '<li>' + ico(j.action === 'consultation' ? 'oeil' : j.action === 'ouverture' || j.action === 'fermeture' ? 'cle' : 'crayon') + '<div>' + esc(j.details) + '<time datetime="' + j.created_at + '">' + esc(O.heureLongue(j.created_at)) + '</time></div></li>';
      }).join('') + '</ul>' : '<div class="vide"><h3>Aucun accès pour l’instant</h3><p>Le développeur n’a jamais consulté votre compte.</p></div>') + '</section></div>';

    function basculer(patch, btn) {
      occupe(btn, true);
      MV.org.maj(patch).then(function (o2) { S.org = o2; return recharger('journal'); })
        .then(function () { majNav(); pAcces(c); O.toast(patch.acces_support_actif === false ? 'Accès fermé.' : patch.acces_support_actif ? 'Accès ouvert pour 72 h. Prévenez le développeur.' : 'Préférence enregistrée.'); })
        .catch(function (e) { occupe(btn, false); erreur(e); });
    }
    var corr = document.getElementById('ac-corr');
    document.getElementById('ac-inter').onchange = function (e) { basculer(e.target.checked ? { acces_support_actif: true, acces_support_corrections: corr.checked } : { acces_support_actif: false }, null); };
    var bo = document.getElementById('ac-ouvrir'); if (bo) bo.onclick = function () { basculer({ acces_support_actif: true, acces_support_corrections: corr.checked }, bo); };
    var bf = document.getElementById('ac-fermer'); if (bf) bf.onclick = function () { basculer({ acces_support_actif: false }, bf); };
    corr.onchange = function () { if (ouvert) basculer({ acces_support_corrections: corr.checked }, null); };
    if (ouvert) {
      var tic = function () {
        var el = document.getElementById('ac-rebours'); if (!el) { clearInterval(minuterie); return; }
        var ms = new Date(o.acces_support_expire) - new Date();
        if (ms <= 0) { clearInterval(minuterie); recharger('org').then(function () { majNav(); pAcces(c); }); return; }
        var h = Math.floor(ms / 3600000), m = Math.floor(ms % 3600000 / 60000), s = Math.floor(ms % 60000 / 1000);
        el.textContent = h + ' h ' + String(m).padStart(2, '0') + ' min ' + String(s).padStart(2, '0') + ' s';
      };
      tic(); minuterie = setInterval(tic, 1000);
    }
  }

  // =================================================================
  // PARAMÈTRES
  // =================================================================
  function pParametres(c) {
    var o = S.org;
    c.innerHTML = tete('Paramètres', '') +
      '<div class="grille-2"><section class="bloc"><h2>Lien de votre site internet</h2><form id="pa-slug" class="pile" novalidate><div class="champ"><label for="pa-s">Fin du lien</label><input id="pa-s" name="minva-lien-site" type="text" maxlength="50" value="' + esc(o.slug) + '" autocomplete="off" data-lpignore="true" spellcheck="false">' +
      '<span class="aide" id="pa-aide">' + esc(MV.lienSite(o.slug)) + '</span></div>' +
      '<p class="note">Attention : si vous changez le lien, l’ancien lien et l’ancien QR code ne fonctionneront plus.</p><button type="submit" class="btn btn-secondaire" id="pa-sok">Changer le lien</button></form></section>' +
      '<section class="bloc"><h2>Annuaire MinVa</h2><label class="inter" style="justify-content:space-between;width:100%"><span><b>Apparaître dans l’annuaire</b><br><span class="note">Les bailleurs et visiteurs du site MinVa peuvent trouver votre organisation.</span></span><input type="checkbox" id="pa-ann"' + (o.dans_annuaire ? ' checked' : '') + '><span class="piste-inter"></span></label></section>' +
      '<section class="bloc"><h2>Mon mot de passe</h2><form id="pa-mdp" class="pile" novalidate><div class="champ"><label for="pa-m1">Nouveau mot de passe</label><input id="pa-m1" type="password" minlength="8" autocomplete="new-password"></div>' +
      '<div class="champ"><label for="pa-m2">Confirmer</label><input id="pa-m2" type="password" minlength="8" autocomplete="new-password"></div><button type="submit" class="btn btn-secondaire">Changer mon mot de passe</button></form></section>' +
      '<section class="bloc"><h2>Abonnement</h2><p>Formule : <b>' + esc((window.MINVA_CONFIG.TARIFS.find(function (t) { return t.id === o.plan; }) || { nom: o.plan }).nom) + '</b></p>' +
      (o.abonnement_fin ? '<p>Valable jusqu’au <b>' + O.dateLongue(o.abonnement_fin) + '</b></p>' : '') + '<p class="note">Pour changer de formule ou renouveler, contactez MinVa. Paiement par Mobile Money.</p></section></div>';
    var s = document.getElementById('pa-s');
    s.oninput = function () { var v = O.slugifier(s.value); document.getElementById('pa-aide').textContent = MV.lienSite(v || '…'); };
    document.getElementById('pa-slug').onsubmit = function (e) {
      e.preventDefault(); var v = O.slugifier(s.value), btn = document.getElementById('pa-sok');
      if (v === o.slug) return;
      occupe(btn, true);
      MV.org.slugDisponible(v).then(function (libre) { if (!libre) throw new Error('Ce lien est déjà pris. Essayez une variante.'); return MV.org.maj({ slug: v }); })
        .then(function (o2) { S.org = o2; S.brouillon = JSON.parse(JSON.stringify(o2)); majNav(); pParametres(c); O.toast('Nouveau lien enregistré.'); })
        .catch(function (er) { occupe(btn, false); erreur(er); });
    };
    document.getElementById('pa-ann').onchange = function (e) {
      MV.org.maj({ dans_annuaire: e.target.checked }).then(function (o2) { S.org = o2; O.toast(e.target.checked ? 'Votre organisation apparaît dans l’annuaire.' : 'Votre organisation est retirée de l’annuaire.'); }).catch(erreur);
    };
    document.getElementById('pa-mdp').onsubmit = function (e) {
      e.preventDefault(); var a = document.getElementById('pa-m1').value, b = document.getElementById('pa-m2').value;
      if (a !== b) { O.toast('Les deux mots de passe ne sont pas identiques.', 'erreur'); return; }
      MV.auth.changerMotDePasse(a).then(function () { e.target.reset(); O.toast('Mot de passe changé.'); }).catch(erreur);
    };
  }

  // =================================================================
  // OUTILS COMMUNS DE LA VAGUE 1
  // =================================================================
  function nouveautes() {
    var d = S.dons.filter(function (x) { return x.statut === 'declare'; }).length;
    var m = S.adhesions.filter(function (x) { return x.statut === 'nouvelle'; }).length;
    var prochain = S.evts.filter(function (e) { return new Date(e.fin || e.debut) >= new Date(); }).sort(function (a, b) { return new Date(a.debut) - new Date(b.debut); })[0];
    if (!d && !m && !prochain) return '';
    return '<section class="bloc"><h2>À traiter</h2><ul class="a-traiter">' +
      (d ? '<li><a href="#dons">' + ico('coeur') + '<span><b>' + d + ' don' + (d > 1 ? 's' : '') + '</b> à confirmer</span>' + ico('suite') + '</a></li>' : '') +
      (m ? '<li><a href="#membres">' + ico('plus') + '<span><b>' + m + ' demande' + (m > 1 ? 's' : '') + '</b> pour devenir membre</span>' + ico('suite') + '</a></li>' : '') +
      (prochain ? '<li><a href="#agenda">' + ico('evenement') + '<span>Prochain événement : <b>' + esc(prochain.titre) + '</b>, ' + esc(O.dateLongue(prochain.debut)) + ' · ' + prochain.inscrits + ' inscrit' + (prochain.inscrits > 1 ? 's' : '') + '</span>' + ico('suite') + '</a></li>' : '') +
      '</ul></section>';
  }
  function imagePartage(btn, c, nomFichier) {
    if (!window.MinVaImage) { O.toast('Le générateur d’images n’a pas pu se charger.', 'erreur'); return; }
    occupe(btn, true, 'Création…');
    window.MinVaImage.carte(Object.assign({ org: S.org, lien: lien() + '?s=wa' }, c))
      .then(function (blob) { return window.MinVaImage.partager(blob, S.org.slug + '-' + nomFichier + '.png', S.org.nom + ' : ' + lien() + '?s=wa'); })
      .then(function (r) { if (r === 'telechargement') O.toast('Image enregistrée dans vos téléchargements : publiez-la dans votre statut WhatsApp.'); })
      .catch(function () { O.toast('L’image n’a pas pu être créée sur cet appareil.', 'erreur'); })
      .then(function () { occupe(btn, false); });
  }
  function telechargerCsv(nom, lignes) {
    var csv = '﻿' + lignes.map(function (l) { return l.map(function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }).join(';'); }).join('\r\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = nom;
    document.body.appendChild(a); a.click(); a.remove();
  }
  function filtres(id, actuel, options) {
    return '<div class="seg" role="group" id="' + id + '">' + options.map(function (o) { return '<button type="button" data-filtre="' + o[0] + '" aria-pressed="' + (actuel === o[0]) + '">' + o[1] + '</button>'; }).join('') + '</div>';
  }
  var NOMS_MOYENS = { orange: 'Orange Money', mtn: 'MTN MoMo', moov: 'Moov Money', wave: 'Wave', autre: 'Autre' };

  // =================================================================
  // DONS
  // =================================================================
  function pDons(c) {
    var o = S.org, ct = o.contact || {};
    var configure = ['orange', 'mtn', 'moov', 'wave', 'lien_wave'].some(function (k) { return String(ct[k] || '').trim(); });
    var confirmes = S.dons.filter(function (d) { return d.statut === 'confirme'; });
    var mois = confirmes.filter(function (d) { return O.joursDepuis(d.created_at) <= 30; });
    var total = function (l) { return l.reduce(function (t, d) { return t + d.montant; }, 0); };
    var liste = S.dons.filter(function (d) { return S.filtreDons === 'tous' || d.statut === S.filtreDons; });
    c.innerHTML = tete('Dons', 'Vos visiteurs envoient leur don par Mobile Money, puis le déclarent sur votre site. Vérifiez la réception dans votre téléphone, puis confirmez : le don apparaît sur le mur des donateurs et la barre du projet avance toute seule.') +
      (configure ? '' : '<div class="alerte-abo">' + ico('alerte', 'ico-lg') + '<div><b>Ajoutez vos numéros Mobile Money</b> pour afficher le bloc « Faire un don » sur votre site. <a href="#site" id="vers-contact">Mon site → Contact</a></div></div>') +
      '<div class="tuiles"><div class="tuile"><b>' + S.dons.filter(function (d) { return d.statut === 'declare'; }).length + '</b><span>à confirmer</span></div>' +
      '<div class="tuile"><b>' + O.nb(total(mois)) + '</b><span>FCFA confirmés sur 30 jours</span></div>' +
      '<div class="tuile"><b>' + O.nb(total(confirmes)) + '</b><span>FCFA confirmés au total</span></div>' +
      '<div class="tuile"><b>' + confirmes.length + '</b><span>dons confirmés</span></div></div>' +
      '<section class="bloc"><div class="bloc-tete"><h2>Dons déclarés</h2>' + filtres('f-dons', S.filtreDons, [['declare', 'À confirmer'], ['confirme', 'Confirmés'], ['refuse', 'Refusés'], ['tous', 'Tous']]) + '</div>' +
      (liste.length ? '<div class="lignes" id="l-dons">' + liste.map(function (d) {
        var p = d.projet_id && S.projets.find(function (x) { return x.id === d.projet_id; });
        var merci = d.telephone ? waLien(d.telephone, 'Bonjour ' + (d.nom || '') + ', ' + o.nom + ' a bien reçu votre don de ' + O.fcfa(d.montant) + '. Un immense merci pour votre soutien !') : '';
        return '<article class="ligne-don ' + d.statut + '"><div class="ligne-don-montant"><b>' + O.nb(d.montant) + '</b><small>FCFA · ' + esc(NOMS_MOYENS[d.moyen] || d.moyen) + '</small></div>' +
          '<div class="ligne-don-qui"><b>' + esc(d.nom || 'Sans nom') + (d.anonyme ? ' <span class="badge b-neutre">anonyme sur le site</span>' : '') + '</b>' +
          '<small>' + O.quand(d.created_at) + (p ? ' · ' + esc(p.titre) : '') + (d.telephone ? ' · ' + esc(d.telephone) : '') + '</small>' + (d.message ? '<q>' + esc(d.message) + '</q>' : '') + '</div>' +
          '<div class="actions">' + (d.statut !== 'confirme' ? '<button type="button" class="btn btn-principal btn-sm" data-statut="confirme" data-id="' + d.id + '">' + ico('verifie') + 'Confirmer</button>' : '<span class="badge b-verifie">' + ico('verifie') + 'Confirmé</span>') +
          (d.statut === 'declare' ? '<button type="button" class="btn btn-secondaire btn-sm" data-statut="refuse" data-id="' + d.id + '">Pas reçu</button>' : '') +
          (d.statut === 'confirme' ? '<button type="button" class="btn btn-lien" data-statut="declare" data-id="' + d.id + '">Annuler la confirmation</button>' : '') +
          (merci ? '<a class="btn btn-secondaire btn-sm" href="' + merci + '" target="_blank" rel="noopener">' + ico('whatsapp') + 'Remercier</a>' : '') +
          '<button type="button" class="btn btn-lien" data-suppr="' + d.id + '">Supprimer</button></div></article>';
      }).join('') + '</div>' : '<div class="vide"><h3>' + (S.filtreDons === 'declare' ? 'Aucun don à confirmer' : 'Aucun don ici') + '</h3><p>Partagez le lien de votre page de dons : <code>' + esc(lien()) + '#don</code></p></div>') +
      '</section>' + (S.dons.length ? '<p><button type="button" class="btn btn-secondaire btn-sm" id="dons-csv">' + ico('telecharger') + 'Télécharger la liste (tableur)</button></p>' : '');
    var vc = document.getElementById('vers-contact'); if (vc) vc.onclick = function () { S.ongletSite = 'contact'; };
    document.getElementById('f-dons').onclick = function (e) { var b = e.target.closest('[data-filtre]'); if (b) { S.filtreDons = b.dataset.filtre; pDons(c); } };
    var csv = document.getElementById('dons-csv');
    if (csv) csv.onclick = function () {
      telechargerCsv('dons-' + o.slug + '.csv', [['Date', 'Nom', 'Montant (FCFA)', 'Moyen', 'Projet', 'Téléphone', 'Message', 'Statut']].concat(S.dons.map(function (d) {
        var p = d.projet_id && S.projets.find(function (x) { return x.id === d.projet_id; });
        return [new Date(d.created_at).toLocaleString('fr-FR'), d.nom, d.montant, NOMS_MOYENS[d.moyen] || d.moyen, p ? p.titre : '', d.telephone, d.message, { declare: 'À confirmer', confirme: 'Confirmé', refuse: 'Refusé' }[d.statut]];
      })));
    };
    var l = document.getElementById('l-dons');
    if (l) {
      var suppr = supprimerAvecConfirmation(function (id) { return MV.dons.supprimer(id).then(function () { return Promise.all([recharger('dons'), recharger('projets')]); }).then(function () { majNav(); pDons(c); O.toast('Don supprimé.'); }); });
      l.onclick = function (e) {
        var b = e.target.closest('[data-statut]');
        if (b) {
          occupe(b, true);
          MV.dons.statut(b.dataset.id, b.dataset.statut).then(function () { return Promise.all([recharger('dons'), recharger('projets')]); })
            .then(function () { majNav(); pDons(c); O.toast(b.dataset.statut === 'confirme' ? 'Don confirmé : il apparaît sur votre site.' : b.dataset.statut === 'refuse' ? 'Don marqué comme non reçu.' : 'Confirmation annulée.'); })
            .catch(function (er) { occupe(b, false); erreur(er); });
          return;
        }
        suppr(e);
      };
    }
  }

  // =================================================================
  // AGENDA
  // =================================================================
  function pAgenda(c) {
    var maintenant = new Date();
    var avenir = S.evts.filter(function (e) { return new Date(e.fin || e.debut) >= maintenant; }).sort(function (a, b) { return new Date(a.debut) - new Date(b.debut); });
    var passes = S.evts.filter(function (e) { return new Date(e.fin || e.debut) < maintenant; });
    function carte(e, passe) {
      var dt = new Date(e.debut);
      return '<div class="evt-ligne' + (passe ? ' passe' : '') + '"><div class="evt-date"><b>' + dt.getDate() + '</b><span>' + dt.toLocaleDateString('fr-FR', { month: 'short' }) + '</span></div>' +
        '<div><h3>' + esc(e.titre) + (e.inscriptions ? '' : ' <span class="badge b-neutre">sans inscription</span>') + '</h3><p class="meta">' + esc(O.heureLongue(e.debut)) + (e.lieu ? ' · ' + esc(e.lieu) : '') + '</p>' +
        '<p class="meta"><b>' + e.inscrits + '</b> inscrit' + (e.inscrits > 1 ? 's' : '') + (e.places ? ' sur ' + e.places + ' places' : '') + '</p></div>' +
        '<div class="actions"><button type="button" class="btn btn-secondaire btn-sm" data-inscrits="' + e.id + '">' + ico('equipe') + 'Inscrits</button>' +
        (passe ? '' : '<button type="button" class="btn btn-secondaire btn-sm" data-modif="' + e.id + '">' + ico('crayon') + 'Modifier</button>' +
          '<a class="btn btn-secondaire btn-sm" href="' + lienAffiche(e.id) + '" target="_blank" rel="noopener">' + ico('rapport') + 'Affiche</a>' +
          '<button type="button" class="btn btn-secondaire btn-sm" data-image-evt="' + e.id + '">' + ico('photo') + 'Image</button>') +
        '<button type="button" class="btn btn-lien" data-suppr="' + e.id + '">Supprimer</button></div></div>';
    }
    c.innerHTML = tete('Agenda', 'Annoncez vos réunions, formations, fêtes et assemblées. Vos visiteurs s’inscrivent en ligne et ajoutent l’événement à leur calendrier.',
      '<button type="button" class="btn btn-principal" id="ev-nouveau">' + ico('plus') + 'Nouvel événement</button>') +
      '<section class="bloc"><h2>À venir <small>· ' + avenir.length + '</small></h2><div id="ev-liste">' + (avenir.length ? avenir.map(function (e) { return carte(e, false); }).join('')
        : '<div class="vide"><h3>Aucun événement à venir</h3><p>Une assemblée générale, une formation, une journée portes ouvertes ? Annoncez-la : vos membres pourront s’inscrire.</p></div>') + '</div></section>' +
      (passes.length ? '<section class="bloc"><h2>Passés <small>· ' + passes.length + '</small></h2><div id="ev-passes">' + passes.map(function (e) { return carte(e, true); }).join('') + '</div></section>' : '');
    document.getElementById('ev-nouveau').onclick = function () { formEvt(null, c); };
    var suppr = supprimerAvecConfirmation(function (id) { return MV.evts.supprimer(id).then(function () { return recharger('evts'); }).then(function () { pAgenda(c); O.toast('Événement supprimé.'); }); });
    c.onclick = function (e) {
      var b;
      if ((b = e.target.closest('[data-modif]'))) { formEvt(S.evts.find(function (x) { return x.id === b.dataset.modif; }), c); return; }
      if ((b = e.target.closest('[data-inscrits]'))) { fenetreInscrits(S.evts.find(function (x) { return x.id === b.dataset.inscrits; })); return; }
      if ((b = e.target.closest('[data-image-evt]'))) {
        var ev = S.evts.find(function (x) { return x.id === b.dataset.imageEvt; });
        imagePartage(b, { surtitre: 'Événement · ' + O.heureLongue(ev.debut), titre: ev.titre, texte: (ev.lieu ? '📍 ' + ev.lieu + '. ' : '') + (ev.description || '') + (ev.inscriptions ? ' Inscription sur notre site.' : '') }, 'evenement');
        return;
      }
      if (e.target.closest('[data-suppr]')) suppr(e);
    };
  }
  function versLocal(iso) { if (!iso) return ['', '']; var d = new Date(iso), p = function (n) { return String(n).padStart(2, '0'); }; return [d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()), p(d.getHours()) + ':' + p(d.getMinutes())]; }
  function formEvt(ev, c) {
    ev = ev || { titre: '', description: '', debut: null, fin: null, lieu: '', places: null, inscriptions: true };
    var deb = versLocal(ev.debut), fin = versLocal(ev.fin);
    ouvrirFenetre(ev.id ? 'Modifier l’événement' : 'Nouvel événement',
      '<div class="champ"><label for="ev-titre">Titre</label><input id="ev-titre" type="text" maxlength="120" value="' + esc(ev.titre) + '" placeholder="Assemblée générale annuelle"></div>' +
      '<div class="grille-champs"><div class="champ"><label for="ev-date">Date</label><input id="ev-date" type="date" value="' + deb[0] + '"></div>' +
      '<div class="champ"><label for="ev-h1">Heure de début</label><input id="ev-h1" type="time" value="' + (deb[1] || '09:00') + '"></div>' +
      '<div class="champ"><label for="ev-h2">Heure de fin <span class="facultatif">(facultatif)</span></label><input id="ev-h2" type="time" value="' + fin[1] + '"></div></div>' +
      '<div class="champ"><label for="ev-lieu">Lieu</label><input id="ev-lieu" type="text" maxlength="160" value="' + esc(ev.lieu) + '" placeholder="Foyer des jeunes, quartier…"></div>' +
      '<div class="champ"><label for="ev-desc">Description</label><textarea id="ev-desc" maxlength="1500">' + esc(ev.description) + '</textarea><span class="aide">Programme, ce qu’il faut apporter, pour qui…</span></div>' +
      '<div class="grille-champs"><div class="champ"><label for="ev-places">Nombre de places <span class="facultatif">(facultatif)</span></label><input id="ev-places" type="number" min="1" inputmode="numeric" value="' + (ev.places || '') + '"><span class="aide">Laissez vide s’il n’y a pas de limite.</span></div></div>' +
      '<label class="case"><input type="checkbox" id="ev-insc"' + (ev.inscriptions !== false ? ' checked' : '') + '> Permettre l’inscription en ligne</label>',
      '<button type="button" class="btn btn-secondaire" id="ev-annuler">Annuler</button><button type="button" class="btn btn-principal" id="ev-ok">Enregistrer</button>');
    document.getElementById('ev-annuler').onclick = function () { fen.close(); };
    document.getElementById('ev-ok').onclick = function () {
      var btn = this, date = document.getElementById('ev-date').value, h1 = document.getElementById('ev-h1').value || '09:00', h2 = document.getElementById('ev-h2').value;
      occupe(btn, true);
      MV.evts.enregistrer({ id: ev.id, titre: document.getElementById('ev-titre').value, description: document.getElementById('ev-desc').value, lieu: document.getElementById('ev-lieu').value,
        debut: date ? new Date(date + 'T' + h1) : null, fin: date && h2 ? new Date(date + 'T' + h2) : null, places: document.getElementById('ev-places').value, inscriptions: document.getElementById('ev-insc').checked })
        .then(function () { return recharger('evts'); }).then(function () { fen.close(); pAgenda(c); O.toast('Événement enregistré : il apparaît dans l’agenda de votre site.'); })
        .catch(function (e) { occupe(btn, false); erreur(e); });
    };
  }
  function fenetreInscrits(ev) {
    ouvrirFenetre('Inscrits · ' + ev.titre, '<p class="note">Chargement…</p>');
    MV.evts.inscrits(ev.id).then(function (l) {
      var total = l.reduce(function (t, i) { return t + i.nombre; }, 0);
      document.getElementById('fen-corps').innerHTML = l.length
        ? '<p><b>' + total + ' personne' + (total > 1 ? 's' : '') + '</b> pour ' + l.length + ' inscription' + (l.length > 1 ? 's' : '') + (ev.places ? ' · ' + ev.places + ' places' : '') + '</p><div class="lignes" id="l-insc">' +
          l.map(function (i) {
            var w = waLien(i.telephone, 'Bonjour ' + i.nom + ', petit rappel : « ' + ev.titre + ' » le ' + O.heureLongue(ev.debut) + (ev.lieu ? ' à ' + ev.lieu : '') + '. À bientôt ! ' + S.org.nom);
            return '<div class="admin-ligne"><span class="mono">' + i.nombre + '</span><div><b>' + esc(i.nom) + '</b><span>' + esc(i.telephone) + ' · ' + O.quand(i.created_at) + '</span></div>' +
              (w ? '<a class="btn btn-secondaire btn-sm" href="' + w + '" target="_blank" rel="noopener">' + ico('whatsapp') + 'Rappel</a>' : '') + '<button type="button" class="btn btn-lien" data-suppr="' + i.id + '">Retirer</button></div>';
          }).join('') + '</div>'
        : '<div class="vide"><h3>Personne pour l’instant</h3><p>Partagez l’événement depuis votre site (bouton « Inviter ») ou imprimez son affiche.</p></div>';
      document.getElementById('fen-pied').innerHTML = (l.length ? '<button type="button" class="btn btn-secondaire" id="insc-csv">' + ico('telecharger') + 'Télécharger la liste</button>' : '') + '<button type="button" class="btn btn-principal" id="insc-fermer">Fermer</button>';
      document.getElementById('fen-pied').hidden = false;
      document.getElementById('insc-fermer').onclick = function () { fen.close(); };
      var csv = document.getElementById('insc-csv');
      if (csv) csv.onclick = function () { telechargerCsv('inscrits-' + O.slugifier(ev.titre).slice(0, 30) + '.csv', [['Nom', 'Téléphone', 'Personnes', 'Inscrit le']].concat(l.map(function (i) { return [i.nom, i.telephone, i.nombre, new Date(i.created_at).toLocaleString('fr-FR')]; }))); };
      var li = document.getElementById('l-insc');
      if (li) li.onclick = supprimerAvecConfirmation(function (id) { return MV.evts.retirerInscrit(id).then(function () { return recharger('evts'); }).then(function () { fenetreInscrits(S.evts.find(function (x) { return x.id === ev.id; }) || ev); if (page() === 'agenda') pAgenda(document.getElementById('contenu')); }); });
    }).catch(erreur);
  }

  // =================================================================
  // MEMBRES (demandes d'adhésion)
  // =================================================================
  function pMembres(c) {
    var liste = S.adhesions.filter(function (a) { return S.filtreMembres === 'tous' || a.statut === S.filtreMembres; });
    var acceptes = S.adhesions.filter(function (a) { return a.statut === 'acceptee'; }).length;
    c.innerHTML = tete('Membres', 'Les personnes qui ont cliqué sur « Devenir membre » sur votre site. Recontactez-les, puis acceptez ou refusez leur demande.') +
      '<div class="tuiles"><div class="tuile"><b>' + S.adhesions.filter(function (a) { return a.statut === 'nouvelle'; }).length + '</b><span>nouvelles demandes</span></div>' +
      '<div class="tuile"><b>' + acceptes + '</b><span>membres acceptés en ligne</span></div></div>' +
      '<section class="bloc"><div class="bloc-tete"><h2>Demandes</h2>' + filtres('f-membres', S.filtreMembres, [['nouvelle', 'Nouvelles'], ['acceptee', 'Acceptées'], ['refusee', 'Refusées'], ['tous', 'Toutes']]) + '</div>' +
      (liste.length ? '<div class="lignes" id="l-membres">' + liste.map(function (a) {
        var w = waLien(a.telephone, 'Bonjour ' + a.nom + ', merci pour votre demande pour rejoindre ' + S.org.nom + ' !');
        return '<article class="ligne-membre"><span class="mono">' + esc(O.sigleDe(a.nom).slice(0, 2)) + '</span><div><b>' + esc(a.nom) + '</b>' +
          '<small>' + esc([a.telephone, a.email, a.ville].filter(Boolean).join(' · ')) + ' · ' + O.quand(a.created_at) + '</small>' + (a.message ? '<q>' + esc(a.message) + '</q>' : '') + '</div>' +
          '<div class="actions">' + (w ? '<a class="btn btn-secondaire btn-sm" href="' + w + '" target="_blank" rel="noopener">' + ico('whatsapp') + 'Répondre</a>' : '') +
          (a.statut !== 'acceptee' ? '<button type="button" class="btn btn-principal btn-sm" data-statut="acceptee" data-id="' + a.id + '">Accepter</button>' : '<span class="badge b-verifie">' + ico('verifie') + 'Acceptée</span>') +
          (a.statut === 'nouvelle' ? '<button type="button" class="btn btn-secondaire btn-sm" data-statut="refusee" data-id="' + a.id + '">Refuser</button>' : '') +
          '<button type="button" class="btn btn-lien" data-suppr="' + a.id + '">Supprimer</button></div></article>';
      }).join('') + '</div>' : '<div class="vide"><h3>Aucune demande ici</h3><p>Le bouton « Devenir membre » est affiché sur votre site (rubrique activable dans Mon site → Rubriques).</p></div>') + '</section>' +
      (S.adhesions.length ? '<p><button type="button" class="btn btn-secondaire btn-sm" id="membres-csv">' + ico('telecharger') + 'Télécharger la liste (tableur)</button></p>' : '');
    document.getElementById('f-membres').onclick = function (e) { var b = e.target.closest('[data-filtre]'); if (b) { S.filtreMembres = b.dataset.filtre; pMembres(c); } };
    var csv = document.getElementById('membres-csv');
    if (csv) csv.onclick = function () { telechargerCsv('membres-' + S.org.slug + '.csv', [['Nom', 'Téléphone', 'Email', 'Ville', 'Message', 'Statut', 'Demande le']].concat(S.adhesions.map(function (a) { return [a.nom, a.telephone, a.email, a.ville, a.message, { nouvelle: 'Nouvelle', acceptee: 'Acceptée', refusee: 'Refusée' }[a.statut], new Date(a.created_at).toLocaleString('fr-FR')]; }))); };
    var l = document.getElementById('l-membres');
    if (l) {
      var suppr = supprimerAvecConfirmation(function (id) { return MV.adhesions.supprimer(id).then(function () { return recharger('adhesions'); }).then(function () { majNav(); pMembres(c); O.toast('Demande supprimée.'); }); });
      l.onclick = function (e) {
        var b = e.target.closest('[data-statut]');
        if (b) { occupe(b, true); MV.adhesions.statut(b.dataset.id, b.dataset.statut).then(function () { return recharger('adhesions'); }).then(function () { majNav(); pMembres(c); O.toast(b.dataset.statut === 'acceptee' ? 'Demande acceptée. Pensez à accueillir ce nouveau membre !' : 'Demande refusée.'); }).catch(function (er) { occupe(b, false); erreur(er); }); return; }
        suppr(e);
      };
    }
  }

  // =================================================================
  // STATISTIQUES
  // =================================================================
  var NOMS_SOURCES = { whatsapp: 'WhatsApp', wa: 'WhatsApp', facebook: 'Facebook', qr: 'QR code / affiche', annuaire: 'Annuaire MinVa', recherche: 'Google et moteurs', app: 'Application installée', direct: 'Lien tapé ou copié', autre: 'Autres sites', agenda: 'Agenda partagé' };
  function pStats(c) {
    c.innerHTML = tete('Statistiques', 'Combien de personnes voient votre site, d’où elles viennent et ce qu’elles font. Aucune information personnelle n’est enregistrée.',
      filtres('f-periode', String(S.periode), [['7', '7 jours'], ['30', '30 jours'], ['90', '90 jours']])) + '<p class="note">Chargement…</p>';
    document.getElementById('f-periode').onclick = function (e) { var b = e.target.closest('[data-filtre]'); if (b) { S.periode = +b.dataset.filtre; pStats(c); } };
    MV.stats.lister(S.periode).then(function (l) {
      var som = function (type) { return l.filter(function (x) { return x.type === type; }).reduce(function (t, x) { return t + x.n; }, 0); };
      var vues = som('vue');
      var jours = []; for (var j = S.periode - 1; j >= 0; j--) jours.push(new Date(Date.now() - j * 86400000).toISOString().slice(0, 10));
      var parJour = jours.map(function (d) { return l.filter(function (x) { return x.type === 'vue' && x.jour === d; }).reduce(function (t, x) { return t + x.n; }, 0); });
      var max = Math.max.apply(null, parJour.concat([1]));
      var sources = {};
      l.filter(function (x) { return x.type === 'vue'; }).forEach(function (x) { var k = NOMS_SOURCES[x.source] || NOMS_SOURCES.autre; sources[k] = (sources[k] || 0) + x.n; });
      var triees = Object.keys(sources).sort(function (a, b) { return sources[b] - sources[a]; });
      var tuiles = [['vue', 'visites', 'oeil'], ['whatsapp', 'clics vers votre WhatsApp', 'whatsapp'], ['partage', 'partages', 'partage'], ['don', 'dons déclarés', 'coeur'], ['inscription', 'inscriptions aux événements', 'evenement'], ['adhesion', 'demandes d’adhésion', 'plus'], ['ecoute', 'écoutes audio', 'actu'], ['image', 'images créées', 'photo'], ['installation', 'installations sur téléphone', 'telecharger']];
      var zone = c.querySelector('.note'); if (zone) zone.remove();
      c.insertAdjacentHTML('beforeend',
        '<div class="tuiles tuiles-stats">' + tuiles.map(function (t) { return '<div class="tuile">' + ico(t[2]) + '<b>' + O.nb(som(t[0])) + '</b><span>' + t[1] + '</span></div>'; }).join('') + '</div>' +
        '<div class="grille-2"><section class="bloc"><h2>Visites par jour</h2>' + (vues ? '<div class="histo" role="img" aria-label="Visites par jour sur ' + S.periode + ' jours">' + parJour.map(function (n, i) {
          return '<span title="' + new Date(jours[i]).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ' : ' + n + ' visite' + (n > 1 ? 's' : '') + '" style="height:' + Math.max(2, Math.round(n / max * 100)) + '%"></span>';
        }).join('') + '</div><div class="histo-legende"><span>' + new Date(jours[0]).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + '</span><span>Aujourd’hui</span></div>'
          : '<div class="vide"><h3>Pas encore de visite</h3><p>Partagez votre lien dans vos groupes WhatsApp : les visites apparaîtront ici.</p></div>') + '</section>' +
        '<section class="bloc"><h2>D’où viennent vos visiteurs</h2>' + (triees.length ? '<ul class="sources">' + triees.map(function (k) {
          var pct = Math.round(sources[k] / vues * 100);
          return '<li><div><span>' + esc(k) + '</span><b>' + pct + ' %</b></div><div class="piste"><i style="width:' + pct + '%"></i></div></li>';
        }).join('') + '</ul>' : '<p class="note">Rien pour l’instant.</p>') +
        '<p class="note" style="margin-top:16px">Astuce : le lien partagé depuis votre console, vos affiches et vos QR codes est reconnu automatiquement. Vous voyez ainsi ce qui marche le mieux.</p></section></div>');
    }).catch(function (e) { var z = c.querySelector('.note'); if (z) z.textContent = 'Les statistiques ne sont pas encore disponibles.'; MV.erreur('admin', e.message); });
  }

  // ---------------- Lancement ----------------
  MV.auth.profil().then(function (p) { if (p) return demarrer(); ecranConnexion(); })
    .catch(function (e) { MV.erreur('admin', e.message); ecranConnexion(e.message); });
})();
