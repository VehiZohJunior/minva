// =====================================================================
// MinVa — petits outils partagés (affichage, dates, icônes, images)
// =====================================================================
(function () {
  var O = {};

  O.esc = function (t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  O.nb = function (n) { return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); };
  O.fcfa = function (n) { return O.nb(n) + ' FCFA'; };

  O.quand = function (date) {
    var j = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
    var min = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (min < 2) return "à l'instant";
    if (min < 60) return 'il y a ' + min + ' min';
    if (j < 1) { var h = Math.floor(min / 60); return 'il y a ' + h + ' h'; }
    if (j === 1) return 'hier';
    if (j < 7) return 'il y a ' + j + ' jours';
    if (j < 30) { var s = Math.round(j / 7); return 'il y a ' + s + ' semaine' + (s > 1 ? 's' : ''); }
    var m = Math.round(j / 30);
    if (m < 12) return 'il y a ' + m + ' mois';
    var a = Math.round(j / 365); return 'il y a ' + a + ' an' + (a > 1 ? 's' : '');
  };
  O.joursDepuis = function (date) { return date ? (Date.now() - new Date(date).getTime()) / 86400000 : Infinity; };
  O.dateLongue = function (date) {
    return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  };
  O.heureLongue = function (date) {
    return new Date(date).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  };

  // Transforme un nom en adresse de site : "Lire à Man" -> "lire-a-man"
  O.slugifier = function (texte) {
    var t = String(texte || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (t.length > 50) { t = t.slice(0, 51); var i = t.lastIndexOf('-'); t = t.slice(0, i > 20 ? i : 50); } // coupe entre deux mots
    return t.replace(/-+$/, '');
  };
  // Lien attribué automatiquement à une organisation, à partir de son inscription :
  // 1) le nom  2) le nom + la ville si le nom est déjà pris  3) le nom + un numéro
  O.attribuerSlug = function (nom, ville, dejaPris) {
    var pris = dejaPris || [], ok = function (x) { return /^[a-z0-9]([a-z0-9-]{1,48}[a-z0-9])$/.test(x) && pris.indexOf(x) < 0; };
    var base = O.slugifier(nom); if (base.length < 3) base = O.slugifier('organisation-' + base);
    var v = O.slugifier(ville), essais = [base];
    var couper = function (x, max) { if (x.length <= max) return x; x = x.slice(0, max + 1); var i = x.lastIndexOf('-'); return x.slice(0, i > 10 ? i : max); };
    if (v && base.indexOf(v) < 0) essais.push(couper(base, 49 - v.length) + '-' + v);
    for (var i = 2; i < 100; i++) essais.push(couper(base, 46) + '-' + i);
    return essais.find(ok) || '';
  };
  O.sigleDe = function (nom) {
    var mots = String(nom || '').replace(/['’]/g, ' ').split(/\s+/).filter(function (m) {
      return m.length > 2 && !/^(des|les|pour|avec|dans|une|aux|du|de|la|le|et)$/i.test(m);
    });
    return mots.slice(0, 3).map(function (m) { return m[0].toUpperCase(); }).join('') || 'MV';
  };
  O.norm = function (t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };

  O.SECTEURS = {
    artisanat: { nom: 'Artisanat · Commerce', c: '#E4572E', sur: '#14100D' },
    agriculture: { nom: 'Agriculture · Rural', c: '#E8A93C', sur: '#14100D' },
    environnement: { nom: 'Environnement · Santé', c: '#1F6E4A', sur: '#FBF7F0' },
    education: { nom: 'Éducation · Culture', c: '#26415C', sur: '#FBF7F0' }
  };
  O.TYPES_ACTU = { actu: 'Actualité', evenement: 'Événement', besoin: 'Besoin', rapport: 'Rapport' };
  O.TYPES_BESOIN = { financement: 'Financement', benevoles: 'Bénévoles', materiel: 'Matériel', formation: 'Formation', partenariat: 'Partenariat' };
  O.DOCS = [
    ['statuts', 'Statuts signés'],
    ['recepisse', 'Récépissé de déclaration'],
    ['bureau', 'Liste des membres du bureau'],
    ['ag', 'PV de la dernière assemblée générale'],
    ['activite', "Rapport d'activité"],
    ['financier', 'Rapport financier']
  ];
  O.REGIONS = ['Abidjan', 'Agnéby-Tiassa', 'Bafing', 'Bagoué', 'Bélier', 'Béré', 'Bounkani', 'Cavally', 'Folon', 'Gbêkê', 'Gbôklé', 'Gôh', 'Gontougo', 'Grands-Ponts', 'Guémon', 'Hambol', 'Haut-Sassandra', 'Iffou', 'Indénié-Djuablin', 'Kabadougou', 'La Mé', 'Lôh-Djiboua', 'Marahoué', 'Moronou', 'Nawa', 'N’Zi', 'Poro', 'San-Pédro', 'Sud-Comoé', 'Tchologo', 'Tonkpi', 'Worodougou', 'Yamoussoukro'];

  // Icônes au trait fin (charte MinVa)
  var I = {
    verifie: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    'en-cours': '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    avant: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
    alerte: '<path d="M12 4L2.8 19.5h18.4z"/><path d="M12 10v4.5"/><path d="M12 17.2v.1"/>',
    artisanat: '<path d="M6 9.5h12l-1.2 8.3a2 2 0 0 1-2 1.7H9.2a2 2 0 0 1-2-1.7z"/><path d="M8.5 9.5c0-2.5 1.5-4.5 3.5-4.5s3.5 2 3.5 4.5"/><path d="M9 13.5h6"/>',
    agriculture: '<path d="M12 20v-8"/><path d="M12 12c0-3.5-2.5-6-6.5-6 0 3.5 2.5 6 6.5 6z"/><path d="M12 14c0-3 2.2-5.5 6.5-5.5 0 3-2.2 5.5-6.5 5.5z"/><path d="M6 20h12"/>',
    environnement: '<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z"/><path d="M5 19l7-7"/>',
    education: '<path d="M3.5 6c3-1 5.8-.6 8.5 1.2V19c-2.7-1.8-5.5-2.2-8.5-1.2z"/><path d="M20.5 6c-3-1-5.8-.6-8.5 1.2V19c2.7-1.8 5.5-2.2 8.5-1.2z"/>',
    actu: '<path d="M4 10v4h3l6 4V6L7 10z"/><path d="M16.5 9.5a3.5 3.5 0 0 1 0 5"/>',
    evenement: '<rect x="4" y="5.5" width="16" height="14" rx="2"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
    besoin: '<path d="M4 13.5l3.5-1c1.2-.3 2.4 0 3.3.8l1.2 1h3a1.5 1.5 0 0 1 0 3H11"/><path d="M4 19.5l2-1h6.5l6.3-3.6a1.6 1.6 0 0 0-1.6-2.7L14.5 13.5"/><path d="M13 4.5c1.2-1.3 3.5-.6 3.5 1.3 0 1.8-3.5 3.7-3.5 3.7s-3.5-1.9-3.5-3.7c0-1.9 2.3-2.6 3.5-1.3z"/>',
    rapport: '<path d="M7 3.5h7l4 4v13H7z"/><path d="M14 3.5v4h4M10 12h5M10 15.5h5"/>',
    photo: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><circle cx="9" cy="10.5" r="1.8"/><path d="M20.5 15.5l-4.5-4.5-7 7"/>',
    coeur: '<path d="M12 19.5s-7.5-4.4-7.5-9.3A4 4 0 0 1 12 8a4 4 0 0 1 7.5 2.2c0 4.9-7.5 9.3-7.5 9.3z"/>',
    partage: '<path d="M8.5 12.5l7-4M8.5 11.5l7 4"/><circle cx="6.5" cy="12" r="2.2"/><circle cx="17.5" cy="7.5" r="2.2"/><circle cx="17.5" cy="16.5" r="2.2"/>',
    retour: '<path d="M14.5 6l-6 6 6 6"/>',
    suite: '<path d="M9.5 6l6 6-6 6"/>',
    plus: '<path d="M12 6v12M6 12h12"/>',
    fermer: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    tel: '<path d="M6.5 4h3l1.5 4-2 1.5a10 10 0 0 0 5.5 5.5L16 13l4 1.5v3a2 2 0 0 1-2 2A15.5 15.5 0 0 1 4.5 6a2 2 0 0 1 2-2z"/>',
    whatsapp: '<path d="M4.5 19.5l1.2-3.6A7.8 7.8 0 1 1 8.4 18.6z"/><path d="M9.3 8.8c.2 2.7 3.1 5.6 5.9 5.9l1-1.2-1.8-.9-.8.8c-1-.4-2.2-1.6-2.6-2.6l.8-.8-.9-1.8z"/>',
    email: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 7l8 6 8-6"/>',
    facebook: '<path d="M14.5 20v-7h2.5l.5-3h-3V8.3c0-.9.3-1.5 1.6-1.5h1.5V4.2A20 20 0 0 0 15.4 4C13.2 4 11.5 5.3 11.5 7.8V10H9v3h2.5v7"/>',
    lieu: '<path d="M12 20.5s6.5-6 6.5-11a6.5 6.5 0 0 0-13 0c0 5 6.5 11 6.5 11z"/><circle cx="12" cy="9.5" r="2.3"/>',
    lien: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    copier: '<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5"/>',
    qr: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2v2h-2zM18 18h2v2h-2zM18 14h2M14 18v2"/>',
    maison: '<path d="M4 11l8-6.5 8 6.5"/><path d="M6 9.5V19.5h12V9.5"/><path d="M10 19.5v-5h4v5"/>',
    pinceau: '<path d="M14.5 4.5l5 5-8 8-5-5z"/><path d="M6.5 12.5l-2.5 7 7-2.5"/>',
    cible: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
    equipe: '<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19c.5-3.2 2.7-5 5.5-5s5 1.8 5.5 5"/><circle cx="17" cy="9.5" r="2.3"/><path d="M15.5 14.3c2.6-.3 4.5 1.3 5 4.2"/>',
    cle: '<circle cx="8" cy="15" r="4"/><path d="M11 12l8.5-8.5M16.5 7l2.5 2.5M14.5 9l2 2"/>',
    reglages: '<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.5M12 18v2.5M3.5 12H6M18 12h2.5M6 6l1.8 1.8M16.2 16.2L18 18M6 18l1.8-1.8M16.2 7.8L18 6"/>',
    sortie: '<path d="M14 4.5h4.5v15H14"/><path d="M10 8l-4 4 4 4M6 12h9.5"/>',
    oeil: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    corbeille: '<path d="M5 7h14M9.5 7V5h5v2M7 7l1 12.5h8L17 7"/>',
    crayon: '<path d="M4.5 19.5l1-4 10-10 3 3-10 10z"/><path d="M13.5 7.5l3 3"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    envoi: '<path d="M4 12l16-7.5-5.5 16-3-6.5z"/><path d="M11.5 14L20 4.5"/>',
    bouclier: '<path d="M12 3.5l7 2.5v5.5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
    code: '<path d="M8.5 7.5L4 12l4.5 4.5M15.5 7.5L20 12l-4.5 4.5M13.5 5l-3 14"/>',
    graph: '<path d="M4 19.5h16"/><path d="M6.5 16V11M11 16V7M15.5 16v-5M20 16V9"/>',
    boite: '<path d="M4 8l8-4 8 4v8l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v8"/>',
    horloge: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    telecharger: '<path d="M12 4.5v10M7.5 10.5l4.5 4.5 4.5-4.5M5 19.5h14"/>',
    etincelle: '<path d="M12 3.5l1.8 5.2 5.2 1.8-5.2 1.8L12 17.5l-1.8-5.2L5 10.5l5.2-1.8z"/><path d="M18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>'
  };
  O.ico = function (n, cls) {
    return '<svg class="' + (cls || 'ico') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (I[n] || '') + '</svg>';
  };

  // Réduit une photo avant envoi (connexions lentes) : 1600 px max, JPEG 80 %
  O.compresserImage = function (fichier, maxCote, qualite) {
    maxCote = maxCote || 1600; qualite = qualite || 0.8;
    return new Promise(function (ok, ko) {
      if (!/^image\//.test(fichier.type)) { ko(new Error('Ce fichier n’est pas une image')); return; }
      var img = new Image(), url = URL.createObjectURL(fichier);
      img.onload = function () {
        var r = Math.min(1, maxCote / Math.max(img.width, img.height));
        var c = document.createElement('canvas');
        c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { b ? ok(b) : ko(new Error('Image illisible')); }, 'image/jpeg', qualite);
      };
      img.onerror = function () { URL.revokeObjectURL(url); ko(new Error('Image illisible')); };
      img.src = url;
    });
  };
  O.blobEnDataUrl = function (blob) {
    return new Promise(function (ok) { var r = new FileReader(); r.onload = function () { ok(r.result); }; r.readAsDataURL(blob); });
  };

  O.copier = function (texte) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(texte);
    var t = document.createElement('textarea'); t.value = texte; document.body.appendChild(t); t.select();
    try { document.execCommand('copy'); } catch (e) {} document.body.removeChild(t);
    return Promise.resolve();
  };

  // Petite notification en bas d'écran
  O.toast = function (msg, type) {
    var z = document.getElementById('mv-toasts');
    if (!z) { z = document.createElement('div'); z.id = 'mv-toasts'; z.setAttribute('aria-live', 'polite'); document.body.appendChild(z); }
    var t = document.createElement('div'); t.className = 'mv-toast' + (type === 'erreur' ? ' mv-toast-erreur' : '');
    t.innerHTML = O.ico(type === 'erreur' ? 'alerte' : 'verifie') + '<span>' + O.esc(msg) + '</span>';
    z.appendChild(t);
    setTimeout(function () { t.classList.add('sortie'); setTimeout(function () { t.remove(); }, 300); }, type === 'erreur' ? 6000 : 3200);
  };

  window.MVO = O;
})();
