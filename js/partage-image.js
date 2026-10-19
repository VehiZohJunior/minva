// =====================================================================
// MinVa — images de partage : une actualité ou un événement devient une
// carte aux couleurs de l'organisation (étoffe + sceau), prête pour les
// statuts WhatsApp et Facebook. Tout est dessiné dans le téléphone :
// rien n'est envoyé sur internet, aucun service payant.
// =====================================================================
(function () {
  var E = window.MinVaEtoffe;
  var L = 1080, H = 1350;

  function charger(src, croise) {
    return new Promise(function (ok, ko) {
      var i = new Image();
      if (croise) i.crossOrigin = 'anonymous';
      i.onload = function () { ok(i); };
      i.onerror = function () { ko(new Error('image')); };
      i.src = src;
    });
  }
  function svgEnImage(svg) { return charger('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)); }
  function policePrete(t) {
    if (!document.fonts || !t.police) return Promise.resolve();
    window.chargerPoliceTheme && window.chargerPoliceTheme(t);
    var attente = new Promise(function (ok) { setTimeout(ok, 2500); });
    return Promise.race([Promise.all([document.fonts.load(t.poids + ' 60px "' + t.police + '"'), document.fonts.load('400 40px "Work Sans"')]), attente]).catch(function () {});
  }
  // Découpe un texte en lignes qui tiennent dans la largeur (… si trop long)
  function lignes(ctx, texte, largeur, max) {
    var mots = String(texte || '').replace(/\s+/g, ' ').trim().split(' '), res = [], cour = '';
    for (var i = 0; i < mots.length; i++) {
      var essai = cour ? cour + ' ' + mots[i] : mots[i];
      if (ctx.measureText(essai).width > largeur && cour) { res.push(cour); cour = mots[i]; } else cour = essai;
      if (res.length === max) break;
    }
    if (res.length < max && cour) res.push(cour);
    if (res.length === max && (res.join(' ').length < String(texte).replace(/\s+/g, ' ').trim().length)) {
      var der = res[max - 1];
      while (der && ctx.measureText(der + '…').width > largeur) der = der.slice(0, -1);
      res[max - 1] = der.replace(/[\s,.;:]+$/, '') + '…';
    }
    return res;
  }
  function arrondi(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  // c = { org, surtitre, titre, texte, photo, lien }
  function carte(c) {
    var o = c.org, t = window.minvaTheme(o.theme), cle = o.slug || o.nom;
    var cv = document.createElement('canvas'); cv.width = L; cv.height = H;
    var x = cv.getContext('2d');
    var titreF = '"' + t.police + '", Georgia, serif';
    return policePrete(t).then(function () {
      return Promise.all([
        svgEnImage(E.svg(cle, t, { largeur: L, hauteur: 250, sens: 'h' })),
        o.logo_url ? charger(o.logo_url, true).catch(function () { return svgEnImage(E.sceau(cle, o.sigle || window.MVO.sigleDe(o.nom), t)); })
                   : svgEnImage(E.sceau(cle, o.sigle || window.MVO.sigleDe(o.nom), t)),
        c.photo ? charger(c.photo, true).catch(function () { return null; }) : Promise.resolve(null),
        svgEnImage(E.svg(cle, t, { largeur: L, hauteur: 26, sens: 'h', motif: 14, cle: 'p', ratio: 'none' }))
      ]);
    }).then(function (im) {
      x.fillStyle = t.fond; x.fillRect(0, 0, L, H);
      x.drawImage(im[0], 0, 0, L, 250);
      // Sceau ou logo, posé à cheval sur l'étoffe
      x.save(); x.beginPath(); x.arc(170, 250, 96, 0, Math.PI * 2); x.fillStyle = t.surface; x.fill(); x.clip();
      x.drawImage(im[1], 78, 158, 184, 184); x.restore();
      x.lineWidth = 6; x.strokeStyle = t.fond; x.beginPath(); x.arc(170, 250, 96, 0, Math.PI * 2); x.stroke();
      // Nom de l'organisation
      x.fillStyle = t.encre; x.textBaseline = 'alphabetic';
      x.font = t.poids + ' 44px ' + titreF;
      var nom = lignes(x, o.nom, L - 300 - 70, 2);
      nom.forEach(function (l, i) { x.fillText(l, 300, 312 + i * 52); });
      var y = 312 + nom.length * 52 + 46;
      // Surtitre (type et date)
      if (c.surtitre) { x.fillStyle = t.lien || t.encre2; x.font = '600 30px "Work Sans", sans-serif'; x.fillText(String(c.surtitre).toUpperCase(), 80, y); y += 30; }
      // Photo
      if (im[2]) {
        var ph = im[2], zh = 500, zw = L - 160, r = Math.max(zw / ph.width, zh / ph.height);
        var sw = zw / r, sh = zh / r;
        x.save(); arrondi(x, 80, y + 20, zw, zh, 22); x.clip();
        x.drawImage(ph, (ph.width - sw) / 2, (ph.height - sh) / 2, sw, sh, 80, y + 20, zw, zh); x.restore();
        y += zh + 60;
      } else y += 50;
      // Titre puis texte
      if (c.titre) {
        x.fillStyle = t.encre; x.font = t.poids + ' 62px ' + titreF;
        lignes(x, c.titre, L - 160, im[2] ? 2 : 3).forEach(function (l) { y += 70; x.fillText(l, 80, y); });
        y += 20;
      }
      var placeTexte = Math.max(1, Math.floor((H - 200 - y) / 56));
      x.fillStyle = t.encre; x.font = '400 40px "Work Sans", sans-serif';
      lignes(x, c.texte, L - 160, Math.min(placeTexte, 9)).forEach(function (l) { y += 56; x.fillText(l, 80, y); });
      // Pied : bande colorée avec le lien
      x.fillStyle = t.primaire; x.fillRect(0, H - 150, L, 150);
      x.drawImage(im[3], 0, H - 176, L, 26);
      x.fillStyle = t.surPrimaire; x.font = '600 34px "Work Sans", sans-serif';
      var lien = String(c.lien || '').replace(/^https?:\/\//, '').replace(/[?#].*$/, ''); // adresse propre, sans code de suivi
      while (x.measureText(lien).width > L - 160 && lien.length > 10) lien = lien.slice(0, -2);
      x.fillText(lien, 80, H - 82);
      x.globalAlpha = 0.75; x.font = '400 24px "Work Sans", sans-serif'; x.fillText('Site créé avec MinVa', 80, H - 40); x.globalAlpha = 1;
      return new Promise(function (ok, ko) { cv.toBlob(function (b) { b ? ok(b) : ko(new Error('Image impossible à créer')); }, 'image/png'); });
    });
  }

  // Partage l'image (WhatsApp, Facebook…) ou, à défaut, la télécharge
  function partager(blob, nomFichier, texte) {
    var f = null;
    try { f = new File([blob], nomFichier, { type: 'image/png' }); } catch (e) {}
    if (f && navigator.canShare && navigator.canShare({ files: [f] })) {
      return navigator.share({ files: [f], text: texte || '' }).then(function () { return 'partage'; }, function (e) {
        if (e && e.name === 'AbortError') return 'annule';
        return telecharger(blob, nomFichier);
      });
    }
    return Promise.resolve(telecharger(blob, nomFichier));
  }
  function telecharger(blob, nomFichier) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nomFichier;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    return 'telechargement';
  }

  window.MinVaImage = { carte: carte, partager: partager };
})();
