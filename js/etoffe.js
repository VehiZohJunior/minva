// =====================================================================
// MinVa — « L'Étoffe » : signature tissée unique de chaque association
// =====================================================================
// À partir du nom (ou de l'adresse) d'une association, on calcule TOUJOURS
// la même étoffe : une suite de bandes tissées (inspirées du kita, du
// bogolan et des pagnes tissés baoulé, sénoufo, dan), aux couleurs de son
// thème. Deux associations n'ont jamais la même. Dessin en SVG : léger,
// net à toutes les tailles, aucune image à télécharger.
// =====================================================================
(function () {
  // Nombre pseudo-aléatoire reproductible (même graine = même étoffe)
  function graine(texte) {
    var h = 2166136261;
    for (var i = 0; i < texte.length; i++) { h ^= texte.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function hasard(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hex(c) { var n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function versHex(r) { return '#' + r.map(function (v) { return Math.round(v).toString(16).padStart(2, '0'); }).join(''); }
  function melange(a, b, t) { var x = hex(a), y = hex(b); return versHex(x.map(function (v, i) { return v + (y[i] - v) * t; })); }
  function lum(c) { var r = hex(c).map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r[0] + 0.7152 * r[1] + 0.0722 * r[2]; }
  function contraste(fond, a, b) {
    var lf = lum(fond), la = lum(a), lb = lum(b);
    var ca = (Math.max(lf, la) + 0.05) / (Math.min(lf, la) + 0.05), cb = (Math.max(lf, lb) + 0.05) / (Math.min(lf, lb) + 0.05);
    return ca >= cb ? a : b;
  }

  // Motifs : chacun est un petit carreau qui se répète le long de la bande
  var MOTIFS = {
    zigzag: function (w, c) { var h = w * 0.8; return { h: h, svg: '<path d="M0 ' + h * 0.25 + ' L' + w / 2 + ' ' + h * 0.75 + ' L' + w + ' ' + h * 0.25 + '" fill="none" stroke="' + c + '" stroke-width="' + w * 0.16 + '" stroke-linejoin="miter"/>' }; },
    losange: function (w, c) { var h = w * 1.3, m = w * 0.18; return { h: h, svg: '<path d="M' + w / 2 + ' ' + m + ' L' + (w - m) + ' ' + h / 2 + ' L' + w / 2 + ' ' + (h - m) + ' L' + m + ' ' + h / 2 + 'Z" fill="none" stroke="' + c + '" stroke-width="' + w * 0.1 + '"/><circle cx="' + w / 2 + '" cy="' + h / 2 + '" r="' + w * 0.07 + '" fill="' + c + '"/>' }; },
    peigne: function (w, c) { var h = w * 0.7, s = ''; for (var i = 1; i <= 3; i++) s += '<rect x="' + (w * i / 4 - w * 0.045) + '" y="' + h * 0.18 + '" width="' + w * 0.09 + '" height="' + h * 0.64 + '" fill="' + c + '"/>'; return { h: h, svg: s }; },
    points: function (w, c) { var h = w * 0.6; return { h: h, svg: '<circle cx="' + w * 0.3 + '" cy="' + h / 2 + '" r="' + w * 0.08 + '" fill="' + c + '"/><circle cx="' + w * 0.7 + '" cy="' + h / 2 + '" r="' + w * 0.08 + '" fill="' + c + '"/>' }; },
    chevron: function (w, c) { var h = w * 0.7; return { h: h, svg: '<path d="M' + w * 0.15 + ' ' + h * 0.7 + ' L' + w / 2 + ' ' + h * 0.3 + ' L' + w * 0.85 + ' ' + h * 0.7 + '" fill="none" stroke="' + c + '" stroke-width="' + w * 0.12 + '"/>' }; },
    damier: function (w, c) { var h = w / 2; return { h: h, svg: '<rect x="0" y="0" width="' + w / 4 + '" height="' + h / 2 + '" fill="' + c + '"/><rect x="' + w / 2 + '" y="0" width="' + w / 4 + '" height="' + h / 2 + '" fill="' + c + '"/><rect x="' + w / 4 + '" y="' + h / 2 + '" width="' + w / 4 + '" height="' + h / 2 + '" fill="' + c + '"/><rect x="' + w * 0.75 + '" y="' + h / 2 + '" width="' + w / 4 + '" height="' + h / 2 + '" fill="' + c + '"/>' }; },
    rayure: function (w, c) { var h = w * 0.5; return { h: h, svg: '<rect x="0" y="' + h * 0.35 + '" width="' + w + '" height="' + h * 0.3 + '" fill="' + c + '"/>' }; },
    croix: function (w, c) { var h = w; return { h: h, svg: '<path d="M' + w * 0.3 + ' ' + h * 0.3 + ' L' + w * 0.7 + ' ' + h * 0.7 + ' M' + w * 0.7 + ' ' + h * 0.3 + ' L' + w * 0.3 + ' ' + h * 0.7 + '" stroke="' + c + '" stroke-width="' + w * 0.1 + '"/>' }; }
  };
  var NOMS_MOTIFS = Object.keys(MOTIFS);

  // Construit la « recette » de l'étoffe (bandes, couleurs, motifs) pour un nom + un thème
  function recette(nom, theme) {
    var r = hasard(graine(String(nom || 'MinVa').toLowerCase()));
    var t = theme;
    var couleurs = [t.primaire, t.accent, t.surPrimaire, melange(t.primaire, t.surPrimaire, 0.3), melange(t.primaire, '#000000', 0.35)];
    var familles = (t.motifs && t.motifs.length) ? t.motifs : NOMS_MOTIFS;
    var nb = 7 + Math.floor(r() * 5);
    var largeurs = [], total = 0;
    for (var i = 0; i < nb; i++) { var l = [3, 5, 8, 12, 18][Math.floor(r() * 5)]; largeurs.push(l); total += l; }
    var bandesPrec = null;
    var bandes = largeurs.map(function (l, i) {
      var fond = couleurs[Math.floor(r() * couleurs.length)];
      if (i > 0 && fond === bandesPrec) fond = couleurs[(couleurs.indexOf(fond) + 1) % couleurs.length];
      bandesPrec = fond;
      var trait = contraste(fond, t.surPrimaire, t.encre);
      if (l <= 3) return { part: l / total, fond: fond, motif: null };
      var motif = l >= 8 ? familles[Math.floor(r() * familles.length)] : (r() < 0.5 ? 'rayure' : 'points');
      return { part: l / total, fond: fond, trait: trait, motif: motif };
    });
    return bandes;
  }

  // Dessine l'étoffe : bandes verticales (sens: 'v') ou horizontales ('h')
  function svg(nom, theme, opts) {
    opts = opts || {};
    var L = opts.largeur || 600, H = opts.hauteur || 400, sens = opts.sens || 'v';
    var id = 'e' + graine(nom + (opts.cle || '')).toString(36) + Math.floor(Math.random() * 1e6).toString(36);
    var bandes = recette(nom, theme);
    var defs = '', corps = '', pos = 0;
    var longueur = sens === 'v' ? L : H, autre = sens === 'v' ? H : L;
    bandes.forEach(function (b, i) {
      var e = b.part * longueur;
      var x = sens === 'v' ? pos : 0, y = sens === 'v' ? 0 : pos;
      var w = sens === 'v' ? e : autre, h = sens === 'v' ? autre : e;
      corps += '<rect x="' + x.toFixed(2) + '" y="' + y.toFixed(2) + '" width="' + (w + 0.6).toFixed(2) + '" height="' + (h + 0.6).toFixed(2) + '" fill="' + b.fond + '"/>';
      if (b.motif) {
        // Taille de motif fixe (comme un vrai tissage) : sur une bande large, le motif se répète
        var cote = Math.min(e, (opts.motif || 34)), rep = Math.max(1, Math.round(e / cote)); cote = e / rep;
        var tuile = MOTIFS[b.motif](cote, b.trait);
        var pid = id + 'p' + i;
        var tr = sens === 'v' ? 'translate(' + x.toFixed(2) + ' 0)' : 'translate(0 ' + y.toFixed(2) + ') rotate(-90) translate(' + (-e) + ' 0)';
        defs += '<pattern id="' + pid + '" patternUnits="userSpaceOnUse" width="' + cote.toFixed(2) + '" height="' + tuile.h.toFixed(2) + '" patternTransform="' + tr + '">' + tuile.svg + '</pattern>';
        corps += '<rect x="' + x.toFixed(2) + '" y="' + y.toFixed(2) + '" width="' + w.toFixed(2) + '" height="' + h.toFixed(2) + '" fill="url(#' + pid + ')"/>';
      }
      pos += e;
    });
    // Grain de fil : fines lignes de trame pour l'effet tissé
    var trame = sens === 'v'
      ? '<pattern id="' + id + 't" patternUnits="userSpaceOnUse" width="4" height="4"><rect width="4" height="1" fill="#000" opacity=".07"/></pattern>'
      : '<pattern id="' + id + 't" patternUnits="userSpaceOnUse" width="4" height="4"><rect width="1" height="4" fill="#000" opacity=".07"/></pattern>';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + L + ' ' + H + '" preserveAspectRatio="' + (opts.ratio || 'xMidYMid slice') + '" aria-hidden="true" focusable="false" class="' + (opts.classe || '') + '"><defs>' + defs + trame + '</defs>' + corps + '<rect width="' + L + '" height="' + H + '" fill="url(#' + id + 't)"/></svg>';
  }

  // Le sceau : anneau tissé + disque central avec le sigle
  function sceau(nom, sigle, theme, opts) {
    opts = opts || {};
    var id = 's' + graine(nom).toString(36) + Math.floor(Math.random() * 1e6).toString(36);
    var etoffe = svg(nom, theme, { largeur: 200, hauteur: 200, sens: 'v' }).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
    var taille = (String(sigle || '').length > 3 ? 46 : String(sigle || '').length > 2 ? 54 : 64) * (opts.echelle || 1);
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" class="' + (opts.classe || '') + '" role="img" aria-label="Sceau de ' + String(nom).replace(/"/g, '') + '">' +
      '<defs><clipPath id="' + id + '"><circle cx="100" cy="100" r="98"/></clipPath></defs>' +
      '<g clip-path="url(#' + id + ')">' + etoffe + '</g>' +
      '<circle cx="100" cy="100" r="70" fill="' + theme.surPrimaire + '"/>' +
      '<circle cx="100" cy="100" r="62" fill="none" stroke="' + theme.primaire + '" stroke-width="1.5" stroke-dasharray="2 4"/>' +
      '<text x="100" y="100" text-anchor="middle" dominant-baseline="central" font-family="var(--t-police-titre, Georgia), serif" font-weight="700" font-size="' + taille + '" fill="' + theme.primaire + '">' + String(sigle || '').replace(/[<>&]/g, '') + '</text></svg>';
  }

  window.MinVaEtoffe = { svg: svg, sceau: sceau, recette: recette, melange: melange };
})();
