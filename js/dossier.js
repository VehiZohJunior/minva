// =====================================================================
// MinVa — documents à imprimer ou à enregistrer en PDF
// dossier.html?o=<adresse>&doc=rapport&a=2026   → rapport annuel
// dossier.html?o=<adresse>&doc=kit              → kit bailleur (dossier de présentation)
// Tout est construit à partir des informations publiques du site.
// =====================================================================
(function () {
  var O = window.MVO, esc = O.esc, E = window.MinVaEtoffe;
  var p = new URLSearchParams(location.search);
  var slug = (p.get('o') || '').toLowerCase(), type = p.get('doc') === 'kit' ? 'kit' : 'rapport';
  var annee = parseInt(p.get('a'), 10) || new Date().getFullYear();
  var doc = document.getElementById('dossier');
  var NOMS_DOCS = {}; O.DOCS.forEach(function (x) { NOMS_DOCS[x[0]] = x[1]; });

  function somme(l, k) { return l.reduce(function (t, x) { return t + (+x[k] || 0); }, 0); }
  function chiffre(v, l) { return '<div class="do-chiffre"><b>' + v + '</b><span>' + l + '</span></div>'; }
  function dateCourte(d) { return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }); }
  function couverture(o, t, surtitre, titre, sous, texte) {
    var cle = o.slug || o.nom;
    var sceau = o.logo_url ? '<img src="' + esc(o.logo_url) + '" alt="">' : E.sceau(cle, o.sigle || O.sigleDe(o.nom), t);
    var verif = o.statut_verification === 'verifie';
    return '<section class="do-page do-couverture"><div class="do-couv-etoffe" aria-hidden="true">' + E.svg(cle, t, { largeur: 800, hauteur: 450, sens: 'h' }) + '</div>' +
      '<div class="do-couv-sceau">' + sceau + '</div><div class="do-couv-texte"><p class="do-surtitre">' + esc(surtitre) + '</p><h1>' + esc(titre) + '</h1>' +
      (sous ? '<p class="do-grand">' + esc(sous) + '</p>' : '') + (texte ? '<p>' + esc(texte) + '</p>' : '') +
      (verif ? '<span class="do-badge">✓ ' + O.accord(o, 'Vérifié', 'Vérifiée') + ' par MinVa</span>' : '') + '</div>' +
      '<div class="do-couv-pied"><span>' + esc(O.typeDe(o)[1]) + ' · ' + esc((O.SECTEURS[o.secteur] || {}).nom || '') + (o.ville ? ' · ' + esc(o.ville) : '') + (o.annee_creation ? ' · depuis ' + o.annee_creation : '') + '</span><span>Document créé avec MinVa</span></div></section>';
  }
  function contact(o, t) {
    var c = o.contact || {}, cle = o.slug || o.nom;
    var mm = [['orange', 'Orange Money'], ['mtn', 'MTN MoMo'], ['moov', 'Moov Money'], ['wave', 'Wave']].filter(function (m) { return String(c[m[0]] || '').trim(); });
    return '<div class="do-contact"><div class="do-qr" id="qr"></div><div><h3>Nous contacter, nous soutenir</h3>' +
      '<p>Site : ' + esc(window.MV.lienSite(o.slug).replace(/^https?:\/\//, '')) + '</p>' +
      (c.whatsapp ? '<p>WhatsApp : +' + esc(String(c.whatsapp).replace(/[^0-9]/g, '')) + '</p>' : '') + (c.telephone ? '<p>Téléphone : ' + esc(c.telephone) + '</p>' : '') +
      (c.email ? '<p>Email : ' + esc(c.email) + '</p>' : '') + (c.adresse ? '<p>Adresse : ' + esc(c.adresse) + '</p>' : '') +
      (mm.length ? '<p>Dons Mobile Money : ' + mm.map(function (m) { return m[1] + ' ' + esc(c[m[0]]); }).join(' · ') + '</p>' : '') + '</div></div>' +
      '<div class="do-pied"><span>' + esc(o.nom) + '</span><span>Établi le ' + O.dateLongue(new Date()) + ' avec MinVa</span></div>' +
      '<div class="do-bande" aria-hidden="true">' + E.svg(cle, t, { largeur: 800, hauteur: 16, sens: 'h', motif: 12, cle: 'p', ratio: 'none' }) + '</div>';
  }
  function tableDepenses(dep, projets) {
    if (!dep.length) return '<p>Aucune dépense publiée pour cette période.</p>';
    return '<table class="do-table"><thead><tr><th>Date</th><th>Dépense</th><th>Projet</th><th class="num">Montant</th></tr></thead><tbody>' +
      dep.slice().sort(function (a, b) { return a.date_depense < b.date_depense ? -1 : 1; }).map(function (x) {
        var pr = x.projet_id && projets.find(function (y) { return y.id === x.projet_id; });
        return '<tr><td>' + dateCourte(x.date_depense) + '</td><td>' + esc(x.libelle) + (x.justificatif_url ? ' <small>(justificatif)</small>' : '') + '</td><td>' + esc(pr ? pr.titre : '—') + '</td><td class="num">' + O.fcfa(x.montant) + '</td></tr>';
      }).join('') + '</tbody><tfoot><tr><td colspan="3">Total</td><td class="num">' + O.fcfa(somme(dep, 'montant')) + '</td></tr></tfoot></table>';
  }
  function projetsHtml(projets, dep, kit) {
    if (!projets.length) return '<p>Aucun projet présenté.</p>';
    return '<div class="do-projets">' + projets.map(function (pr) {
      var pct = pr.objectif ? Math.min(100, Math.round(pr.collecte / pr.objectif * 100)) : 0;
      var depense = somme(dep.filter(function (x) { return x.projet_id === pr.id; }), 'montant');
      var reste = Math.max(0, pr.objectif - pr.collecte);
      return '<div class="do-projet"><h3>' + esc(pr.titre) + '</h3>' + (pr.description ? '<p>' + esc(pr.description) + '</p>' : '') +
        (pr.objectif ? '<div class="do-jauge"><i style="width:' + pct + '%"></i></div>' : '') +
        '<div class="do-petit"><span>' + O.fcfa(pr.collecte) + ' réunis' + (pr.objectif ? ' sur ' + O.fcfa(pr.objectif) + ' (' + pct + ' %)' : '') + '</span><span>' + pr.donateurs + ' donateur' + (pr.donateurs > 1 ? 's' : '') + '</span>' +
        (depense ? '<span>' + O.fcfa(depense) + ' dépensés</span>' : '') + (kit && reste ? '<span><b>Il manque ' + O.fcfa(reste) + '</b></span>' : '') + '</div></div>';
    }).join('') + '</div>';
  }

  function rapport(d) {
    var o = d.org, t = window.appliquerTheme(doc, o.theme);
    var bilan = (d.bilanDons || []).find(function (b) { return b.annee === annee; }) || { total: 0, nombre: 0 };
    var dep = d.depenses || [], evts = d.evenements || [], actus = d.actualites || [], matchs = (d.matchs || []).filter(function (m) { return m.score_nous != null && m.score_eux != null; });
    var docsV = d.documents.filter(function (x) { return x.statut === 'verifie'; });
    var faits = actus.slice().sort(function (a, b) { return (b.photos || []).length - (a.photos || []).length; }).slice(0, 8)
      .sort(function (a, b) { return new Date(a.created_at) - new Date(b.created_at); });
    document.title = 'Rapport annuel ' + annee + ' · ' + o.nom;
    var h = couverture(o, t, 'Rapport annuel ' + annee, o.nom, o.slogan, o.mission);
    h += '<section class="do-page"><h2>L’année ' + annee + ' en chiffres</h2><div class="do-chiffres">' +
      chiffre(actus.length, 'actualités publiées') + chiffre(evts.length, 'événements organisés') + chiffre(O.nb(somme(evts, 'inscrits')), 'personnes inscrites aux événements') +
      chiffre(O.nb(bilan.total), 'FCFA de dons reçus (' + bilan.nombre + ')') + chiffre(O.nb(somme(dep, 'montant')), 'FCFA de dépenses publiées') +
      chiffre(O.nb(somme(d.projets, 'collecte')), 'FCFA réunis pour nos projets') + chiffre(docsV.length + '/6', 'documents officiels vérifiés') +
      (o.beneficiaires ? chiffre(O.nb(o.beneficiaires), esc(o.beneficiaires_label || 'bénéficiaires')) : chiffre(O.nb(o.membres || 0), 'membres')) + '</div>' +
      (o.apropos ? '<h2>Qui nous sommes</h2><p>' + esc(o.apropos) + '</p>' : '') +
      '<h2>Nos projets</h2>' + projetsHtml(d.projets, dep, false) + '</section>';
    h += '<section class="do-page"><h2>Faits marquants</h2>' + (faits.length ? '<div class="do-faits">' + faits.map(function (a) {
      var txt = String(a.texte || ''); if (txt.length > 260) txt = txt.slice(0, 257) + '…';
      return '<div class="do-fait"><small>' + O.dateLongue(a.created_at) + ' · ' + esc(O.TYPES_ACTU[a.type] || 'Actualité') + '</small><p>' + esc(txt) + '</p>' + ((a.photos || [])[0] ? '<img src="' + esc(a.photos[0]) + '" alt="">' : '') + '</div>';
    }).join('') + '</div>' : '<p>Aucune actualité publiée cette année.</p>') +
      (evts.length ? '<h2>Nos événements</h2><table class="do-table"><thead><tr><th>Date</th><th>Événement</th><th>Lieu</th><th class="num">Inscrits</th></tr></thead><tbody>' + evts.map(function (e) {
        return '<tr><td>' + dateCourte(e.debut) + '</td><td>' + esc(e.titre) + '</td><td>' + esc(e.lieu || '—') + '</td><td class="num">' + (e.inscrits || 0) + '</td></tr>';
      }).join('') + '</tbody></table>' : '') +
      (matchs.length ? '<h2>Bilan sportif</h2><p>' + matchs.length + ' matchs joués : ' + matchs.filter(function (m) { return m.score_nous > m.score_eux; }).length + ' victoires, ' + matchs.filter(function (m) { return m.score_nous === m.score_eux; }).length + ' nuls, ' + matchs.filter(function (m) { return m.score_nous < m.score_eux; }).length + ' défaites.</p>' : '') + '</section>';
    h += '<section class="do-page"><h2>Transparence : où est allé l’argent</h2>' + tableDepenses(dep, d.projets) +
      '<div class="do-deux"><div><h2>Gouvernance</h2>' + ((o.equipe || []).length ? '<ul class="do-liste">' + o.equipe.map(function (m) { return '<li><span>' + esc(m.role) + '</span><b>' + esc(m.nom) + '</b></li>'; }).join('') + '</ul>' : '<p>—</p>') + '</div>' +
      '<div><h2>Documents vérifiés</h2>' + (docsV.length ? '<ul class="do-liste">' + docsV.map(function (x) { return '<li><span>✓ ' + esc(NOMS_DOCS[x.type] || x.type) + '</span><span>' + (x.annee || '') + '</span></li>'; }).join('') + '</ul>' : '<p>Aucun pour l’instant.</p>') + '</div></div>' +
      contact(o, t) + '</section>';
    return h;
  }

  function kit(d) {
    var o = d.org, t = window.appliquerTheme(doc, o.theme);
    var dep = d.depenses || [], docsV = d.documents.filter(function (x) { return x.statut === 'verifie'; });
    var bilan = (d.bilanDons || []).reduce(function (tt, b) { return { total: tt.total + b.total, nombre: tt.nombre + b.nombre }; }, { total: 0, nombre: 0 });
    document.title = 'Dossier de présentation · ' + o.nom;
    var h = couverture(o, t, 'Dossier de présentation', o.nom, o.slogan, o.mission);
    h += '<section class="do-page"><h2>Qui nous sommes</h2>' + (o.apropos ? '<p>' + esc(o.apropos) + '</p>' : '') +
      '<ul class="do-liste">' + (o.zone ? '<li><span>Zone d’action</span><b>' + esc(o.zone) + '</b></li>' : '') + (o.langues ? '<li><span>Langues parlées</span><b>' + esc(o.langues) + '</b></li>' : '') +
      (o.annee_creation ? '<li><span>Création</span><b>' + o.annee_creation + '</b></li>' : '') + '<li><span>Forme</span><b>' + esc(O.typeDe(o)[1]) + '</b></li></ul>' +
      '<h2>Notre impact</h2><div class="do-chiffres">' + (o.beneficiaires ? chiffre(O.nb(o.beneficiaires), esc(o.beneficiaires_label || 'bénéficiaires')) : '') + (o.membres ? chiffre(O.nb(o.membres), 'membres') : '') +
      chiffre(O.nb(somme(d.projets, 'collecte')), 'FCFA réunis pour nos projets') + chiffre(docsV.length + '/6', 'documents officiels vérifiés par MinVa') + '</div>' +
      '<h2>Ce que votre soutien permettrait</h2>' + projetsHtml(d.projets, dep, true) +
      ((o.besoins || []).length ? '<h2>Nos besoins</h2><ul class="do-liste">' + o.besoins.map(function (b) { return '<li><span>' + esc(b.titre) + (b.detail ? ' — ' + esc(b.detail) : '') + '</span><b>' + esc(O.TYPES_BESOIN[b.type] || '') + '</b></li>'; }).join('') + '</ul>' : '') + '</section>';
    h += '<section class="do-page"><h2>Une gestion transparente</h2><div class="do-chiffres">' + chiffre(O.nb(bilan.total), 'FCFA de dons reçus et confirmés') + chiffre(O.nb(somme(dep, 'montant')), 'FCFA de dépenses publiées') +
      chiffre(dep.filter(function (x) { return x.justificatif_url; }).length + '/' + dep.length, 'dépenses avec justificatif') + chiffre(o.statut_verification === 'verifie' ? 'Oui' : 'En cours', 'badge « Vérifié par MinVa »') + '</div>' +
      '<p style="margin-top:4mm">Nos dépenses et nos dons sont publiés sur notre site, justificatifs à l’appui. Nos documents officiels ont été contrôlés par l’équipe MinVa.</p>' +
      '<div class="do-deux"><div><h2>Notre bureau</h2>' + ((o.equipe || []).length ? '<ul class="do-liste">' + o.equipe.map(function (m) { return '<li><span>' + esc(m.role) + '</span><b>' + esc(m.nom) + '</b></li>'; }).join('') + '</ul>' : '<p>—</p>') + '</div>' +
      '<div><h2>Documents vérifiés</h2>' + (docsV.length ? '<ul class="do-liste">' + docsV.map(function (x) { return '<li><span>✓ ' + esc(NOMS_DOCS[x.type] || x.type) + '</span><span>' + (x.annee || '') + '</span></li>'; }).join('') + '</ul>' : '<p>Vérification en cours.</p>') + '</div></div>' +
      contact(o, t) + '</section>';
    return h;
  }

  function ajuster() {
    if (window.matchMedia('print').matches) return;
    var w = doc.offsetWidth, k = (window.innerWidth - 32) / w;
    doc.style.transform = k < 1 ? 'scale(' + k.toFixed(3) + ')' : '';
    doc.style.marginBottom = k < 1 ? (-(1 - k) * doc.offsetHeight + 24) + 'px' : '';
  }
  function afficher(d) {
    doc.innerHTML = type === 'kit' ? kit(d) : rapport(d);
    doc.removeAttribute('aria-busy');
    var zone = document.getElementById('qr');
    if (zone && window.QRCode) new window.QRCode(zone, { text: window.MV.lienSite(d.org.slug) + '?s=qr', width: 400, height: 400, colorDark: '#14100D', colorLight: '#FFFFFF', correctLevel: window.QRCode.CorrectLevel.M });
    ajuster();
  }
  function charger() {
    doc.setAttribute('aria-busy', 'true');
    var pr = type === 'kit' ? window.MV.site.parSlug(slug) : window.MV.site.annee(slug, annee);
    pr.then(function (d) {
      if (!d) { doc.innerHTML = '<p class="do-charge">Ce site n’existe pas ou n’est plus en ligne.</p>'; return; }
      afficher(d);
    }).catch(function (e) { doc.innerHTML = '<p class="do-charge">Le document n’a pas pu se préparer : ' + esc(e.message) + '</p>'; });
  }

  document.getElementById('do-titre-outil').textContent = type === 'kit' ? 'Votre dossier de présentation est prêt' : 'Votre rapport annuel est prêt';
  if (type === 'rapport') {
    var sel = document.getElementById('do-annee'), an = new Date().getFullYear();
    sel.innerHTML = [an, an - 1, an - 2].map(function (y) { return '<option' + (y === annee ? ' selected' : '') + '>' + y + '</option>'; }).join('');
    document.getElementById('do-annee-zone').hidden = false;
    sel.onchange = function () { annee = +sel.value; var u = new URL(location.href); u.searchParams.set('a', annee); history.replaceState(null, '', u); charger(); };
  }
  document.getElementById('imprimer').onclick = function () { doc.style.transform = ''; window.print(); setTimeout(ajuster, 500); };
  window.addEventListener('resize', ajuster);
  if (!slug) { doc.innerHTML = '<p class="do-charge">Adresse du site manquante.</p>'; return; }
  charger();
})();
