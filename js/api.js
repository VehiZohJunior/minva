// =====================================================================
// MinVa — accès aux données (site vitrine, sites publics, console admin)
// =====================================================================
// Même liste de fonctions pour les deux modes :
//  - DÉMO (config.js vide) : données d'exemple dans ce navigateur
//  - RÉEL (config.js rempli) : Supabase, protégé par les règles RLS
// Les écrans n'appellent QUE window.MV.* : ils ne savent pas quel mode tourne.
// =====================================================================
(function () {
  var C = window.MINVA_CONFIG || {};
  var O = window.MVO;
  // ?demo=1 : aperçu avec les organisations d'exemple (données fictives, dans ce navigateur seulement)
  var DEMO_FORCEE = /[?&]demo=1(&|$)/.test(location.search);
  var REEL = !DEMO_FORCEE && !!(C.SUPABASE_URL && C.SUPABASE_ANON_KEY && window.supabase);
  var MV = { mode: REEL ? 'reel' : 'demo' };

  MV.lienSite = function (slug) {
    var base = C.URL_PUBLIQUE || (location.origin + location.pathname.replace(/[^/]*$/, ''));
    return base.replace(/\/?$/, '/') + slug;
  };

  function publique(org) {
    // Retire ce qui n'est pas destiné au grand public (identique à la vue SQL organisations_publiques)
    var p = Object.assign({}, org);
    ['actif', 'plan', 'abonnement_fin', 'acces_support_actif', 'acces_support_corrections', 'acces_support_expire'].forEach(function (k) { delete p[k]; });
    return p;
  }
  function tri(liste) { return liste.slice().sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); }); }
  var MOYENS = ['orange', 'mtn', 'moov', 'wave', 'autre'];
  var TYPES_STAT = ['vue', 'whatsapp', 'partage', 'don', 'inscription', 'adhesion', 'installation', 'ecoute', 'image'];
  // Vérifications communes aux deux modes (la base refait les mêmes contrôles)
  function verifDon(d) {
    var m = Math.round(+d.montant || 0);
    if (!(m > 0)) throw new Error('Indiquez le montant de votre don.');
    if (m > 100000000) throw new Error('Montant trop élevé.');
    return { projet_id: d.projet_id || null, nom: String(d.nom || '').trim().slice(0, 80), anonyme: !!d.anonyme, telephone: String(d.telephone || '').trim().slice(0, 40),
      montant: m, moyen: MOYENS.indexOf(d.moyen) >= 0 ? d.moyen : 'autre', message: String(d.message || '').trim().slice(0, 300) };
  }
  function verifPersonne(x, quoi) {
    var nom = String(x.nom || '').trim(), tel = String(x.telephone || '').trim();
    if (!nom || !tel) throw new Error('Indiquez votre nom et votre numéro de téléphone' + (quoi ? ' pour ' + quoi : '') + '.');
    return { nom: nom.slice(0, 80), telephone: tel.slice(0, 40) };
  }
  function verifEvt(e) {
    if (!String(e.titre || '').trim()) throw new Error('Donnez un titre à l’événement.');
    if (!e.debut || isNaN(new Date(e.debut))) throw new Error('Indiquez la date et l’heure de début.');
    if (e.fin && new Date(e.fin) < new Date(e.debut)) throw new Error('La fin doit être après le début.');
    var pl = e.places === '' || e.places == null ? null : Math.max(1, parseInt(e.places, 10) || 0);
    return { titre: String(e.titre).trim().slice(0, 120), description: String(e.description || '').trim().slice(0, 1500), debut: new Date(e.debut).toISOString(),
      fin: e.fin ? new Date(e.fin).toISOString() : null, lieu: String(e.lieu || '').trim().slice(0, 160), places: pl, inscriptions: e.inscriptions !== false };
  }
  function depuisJours(j) { return new Date(Date.now() - j * 86400000).toISOString(); }
  function entier(v, min, max) { var n = v === '' || v == null ? null : Math.round(+v); if (n == null || isNaN(n)) return null; return Math.min(max, Math.max(min, n)); }
  var VERIF = {
    depenses: function (d) {
      if (!String(d.libelle || '').trim()) throw new Error('Indiquez à quoi a servi la dépense.');
      var m = entier(d.montant, 0, 10000000000); if (!m) throw new Error('Indiquez le montant de la dépense.');
      return { libelle: String(d.libelle).trim().slice(0, 140), montant: m, projet_id: d.projet_id || null, date_depense: d.date_depense || new Date().toISOString().slice(0, 10), justificatif_url: d.justificatif_url || null };
    },
    produits: function (d) {
      if (!String(d.nom || '').trim()) throw new Error('Donnez un nom au produit.');
      return { nom: String(d.nom).trim().slice(0, 100), description: String(d.description || '').trim().slice(0, 500), prix: entier(d.prix, 0, 10000000000), unite: String(d.unite || '').trim().slice(0, 30), photo_url: d.photo_url || null, disponible: d.disponible !== false };
    },
    matchs: function (d) {
      if (!String(d.adversaire || '').trim()) throw new Error('Indiquez l’adversaire.');
      if (!d.date_match || isNaN(new Date(d.date_match))) throw new Error('Indiquez la date et l’heure du match.');
      return { adversaire: String(d.adversaire).trim().slice(0, 80), competition: String(d.competition || '').trim().slice(0, 80), domicile: d.domicile !== false, date_match: new Date(d.date_match).toISOString(),
        lieu: String(d.lieu || '').trim().slice(0, 120), score_nous: entier(d.score_nous, 0, 999), score_eux: entier(d.score_eux, 0, 999) };
    },
    sondages: function (d) {
      if (!String(d.question || '').trim()) throw new Error('Écrivez la question.');
      var opts = (d.options || []).map(function (x) { return String(x || '').trim().slice(0, 80); }).filter(Boolean);
      if (opts.length < 2) throw new Error('Proposez au moins 2 réponses.');
      return { question: String(d.question).trim().slice(0, 200), options: opts.slice(0, 8), code: String(d.code || '').trim().slice(0, 30), ouvert: d.ouvert !== false, resultats_publics: d.resultats_publics !== false, fin: d.fin ? new Date(d.fin).toISOString() : null };
    }
  };
  var ORDRE = { depenses: 'date_depense', produits: 'created_at', matchs: 'date_match', sondages: 'created_at' };
  function compteVotes(sd, votes) {
    var l = votes.filter(function (v) { return v.sondage_id === sd.id; });
    return { total: l.length, compte: sd.options.map(function (_, i) { return l.filter(function (v) { return v.choix === i; }).length; }) };
  }
  function sondagePublic(sd, votes) {
    var c = compteVotes(sd, votes);
    return { id: sd.id, org_id: sd.org_id, question: sd.question, options: sd.options, reserve: !!sd.code, ouvert: sd.ouvert && (!sd.fin || new Date(sd.fin) > new Date()),
      resultats_publics: sd.resultats_publics, fin: sd.fin, created_at: sd.created_at, total: c.total, compte: sd.resultats_publics ? c.compte : null };
  }

  // =================================================================
  // MODE DÉMO
  // =================================================================
  if (!REEL) {
    var D = window.MINVA_DEMO;
    var CLE_SESSION = 'minva-demo-session-admin';
    var attendre = function (v) { return new Promise(function (ok) { setTimeout(function () { ok(v); }, 120); }); };
    var echec = function (m) { return Promise.reject(new Error(m)); };
    var session = function () { try { return localStorage.getItem(CLE_SESSION); } catch (e) { return null; } };
    var moi = function (db) { var id = session(); return db.profils.find(function (p) { return p.id === id; }) || null; };
    var monOrg = function (db) { var p = moi(db); return p && db.organisations.find(function (o) { return o.id === p.org_id; }); };

    MV.auth = {
      connexion: function (email, mdp) {
        var db = D.lire();
        var p = db.profils.find(function (x) { return x.email.toLowerCase() === String(email).trim().toLowerCase() && x.mdp === mdp && x.role === 'admin'; });
        if (!p) return echec('Email ou mot de passe incorrect.');
        var o = db.organisations.find(function (x) { return x.id === p.org_id; });
        if (!o.actif) return echec('Le compte de votre organisation est suspendu. Contactez MinVa.');
        localStorage.setItem(CLE_SESSION, p.id);
        return attendre({ id: p.id, nom: p.nom, email: p.email, role: p.role, org_id: p.org_id });
      },
      deconnexion: function () { localStorage.removeItem(CLE_SESSION); return attendre(true); },
      profil: function () {
        var db = D.lire(), p = moi(db);
        return attendre(p && p.role === 'admin' ? { id: p.id, nom: p.nom, email: p.email, role: p.role, org_id: p.org_id } : null);
      },
      changerMotDePasse: function (nouveau) {
        if (String(nouveau).length < 8) return echec('8 caractères minimum.');
        var db = D.lire(), p = moi(db); if (!p) return echec('Non connecté');
        p.mdp = nouveau; D.ecrire(db); return attendre(true);
      }
    };

    MV.site = {
      parSlug: function (slug) {
        var db = D.lire();
        var o = db.organisations.find(function (x) { return x.slug === slug && x.actif; });
        if (!o) return attendre(null);
        return attendre({
          org: publique(o),
          actualites: tri(db.actualites.filter(function (a) { return a.org_id === o.id; })),
          projets: tri(db.projets.filter(function (p) { return p.org_id === o.id && p.actif; })),
          documents: db.documents.filter(function (d) { return d.org_id === o.id; }).map(function (d) { return { id: d.id, type: d.type, annee: d.annee, statut: d.statut }; }),
          evenements: (db.evenements || []).filter(function (e) { return e.org_id === o.id && new Date(e.fin || e.debut) > new Date(depuisJours(60)); })
            .map(function (e) { return Object.assign({ inscrits: (db.inscriptions || []).filter(function (i) { return i.evenement_id === e.id; }).reduce(function (t, i) { return t + i.nombre; }, 0) }, e); })
            .sort(function (a, b) { return new Date(a.debut) - new Date(b.debut); }),
          dons: tri((db.dons || []).filter(function (x) { return x.org_id === o.id && x.statut === 'confirme'; })).slice(0, 12)
            .map(function (x) { return { id: x.id, projet_id: x.projet_id, nom: x.anonyme ? '' : x.nom, montant: x.montant, message: x.message, created_at: x.created_at }; }),
          depenses: (db.depenses || []).filter(function (x) { return x.org_id === o.id; }).sort(function (a, b) { return b.date_depense < a.date_depense ? -1 : 1; }).slice(0, 60),
          produits: tri((db.produits || []).filter(function (x) { return x.org_id === o.id; })),
          matchs: (db.matchs || []).filter(function (x) { return x.org_id === o.id && new Date(x.date_match) > new Date(depuisJours(120)); }).sort(function (a, b) { return new Date(a.date_match) - new Date(b.date_match); }),
          sondages: tri((db.sondages || []).filter(function (x) { return x.org_id === o.id; })).slice(0, 6).map(function (x) { return sondagePublic(x, db.votes || []); }),
          bilanDons: bilanDemo(db, o.id)
        });
      },
      annuaire: function () {
        var db = D.lire();
        return attendre(db.organisations.filter(function (o) { return o.actif && o.dans_annuaire; }).map(function (o) {
          var p = publique(o), a = tri(db.actualites.filter(function (x) { return x.org_id === o.id; }))[0];
          p.derniere_actualite = a ? a.created_at : null; return p;
        }));
      }
    };

    MV.org = {
      mienne: function () { var o = monOrg(D.lire()); return o ? attendre(Object.assign({}, o)) : echec('Non connecté'); },
      maj: function (patch) {
        var db = D.lire(), o = monOrg(db); if (!o) return echec('Non connecté');
        ['actif', 'plan', 'abonnement_fin', 'statut_verification', 'id'].forEach(function (k) { delete patch[k]; });
        if (patch.slug && patch.slug !== o.slug) {
          if (!/^[a-z0-9]([a-z0-9-]{1,48}[a-z0-9])$/.test(patch.slug)) return echec('Lien invalide : lettres minuscules, chiffres et tirets, 3 caractères minimum.');
          if (db.organisations.some(function (x) { return x.slug === patch.slug; })) return echec('Ce lien est déjà pris.');
        }
        if ('acces_support_actif' in patch) {
          if (patch.acces_support_actif && !o.acces_support_actif) {
            patch.acces_support_expire = new Date(Date.now() + 72 * 3600000).toISOString();
            db.journal_support.push({ id: D.uid(), org_id: o.id, action: 'ouverture', details: 'Vous avez ouvert l’accès développeur' + (patch.acces_support_corrections ? ' (lecture et corrections)' : ' (lecture seule)') + ' pour 72 h.', created_at: new Date().toISOString() });
          }
          if (!patch.acces_support_actif) {
            patch.acces_support_corrections = false; patch.acces_support_expire = null;
            if (o.acces_support_actif) db.journal_support.push({ id: D.uid(), org_id: o.id, action: 'fermeture', details: 'Vous avez fermé l’accès développeur.', created_at: new Date().toISOString() });
          }
        } else if ('acces_support_corrections' in patch && o.acces_support_actif && patch.acces_support_corrections !== o.acces_support_corrections) {
          db.journal_support.push({ id: D.uid(), org_id: o.id, action: 'modification', details: patch.acces_support_corrections ? 'Vous avez autorisé les corrections.' : 'Vous avez retiré l’autorisation de corriger (lecture seule).', created_at: new Date().toISOString() });
        }
        Object.assign(o, patch); D.ecrire(db); return attendre(Object.assign({}, o));
      },
      slugDisponible: function (slug) {
        var db = D.lire(), o = monOrg(db);
        return attendre(!db.organisations.some(function (x) { return x.slug === slug && (!o || x.id !== o.id); }));
      }
    };

    MV.actu = {
      lister: function () { var db = D.lire(), o = monOrg(db); return attendre(tri(db.actualites.filter(function (a) { return a.org_id === o.id; }))); },
      creer: function (a) {
        var db = D.lire(), o = monOrg(db), p = moi(db); if (!o) return echec('Non connecté');
        if (!String(a.texte || '').trim() && !(a.photos || []).length) return echec('Écrivez un texte ou ajoutez une photo.');
        var n = { id: D.uid(), org_id: o.id, type: a.type || 'actu', texte: String(a.texte || '').slice(0, 2000), photos: (a.photos || []).slice(0, 4), auteur_id: p.id, created_at: new Date().toISOString() };
        db.actualites.push(n); D.ecrire(db); return attendre(n);
      },
      supprimer: function (id) {
        var db = D.lire(), o = monOrg(db);
        db.actualites = db.actualites.filter(function (a) { return !(a.id === id && a.org_id === o.id); }); D.ecrire(db); return attendre(true);
      }
    };

    MV.projet = {
      lister: function () { var db = D.lire(), o = monOrg(db); return attendre(tri(db.projets.filter(function (p) { return p.org_id === o.id; }))); },
      enregistrer: function (p) {
        var db = D.lire(), o = monOrg(db); if (!o) return echec('Non connecté');
        if (!String(p.titre || '').trim()) return echec('Donnez un titre au projet.');
        var ex = p.id && db.projets.find(function (x) { return x.id === p.id && x.org_id === o.id; });
        var v = { titre: p.titre, description: p.description || '', collecte: Math.max(0, +p.collecte || 0), objectif: Math.max(0, +p.objectif || 0), donateurs: Math.max(0, +p.donateurs || 0), actif: p.actif !== false };
        if (ex) Object.assign(ex, v); else db.projets.push(Object.assign({ id: D.uid(), org_id: o.id, created_at: new Date().toISOString() }, v));
        D.ecrire(db); return attendre(true);
      },
      supprimer: function (id) { var db = D.lire(), o = monOrg(db); db.projets = db.projets.filter(function (p) { return !(p.id === id && p.org_id === o.id); }); D.ecrire(db); return attendre(true); }
    };

    MV.doc = {
      lister: function () { var db = D.lire(), o = monOrg(db); return attendre(db.documents.filter(function (d) { return d.org_id === o.id; })); },
      envoyer: function (type, fichier, annee) {
        var db = D.lire(), o = monOrg(db); if (!o) return echec('Non connecté');
        if (!fichier) return echec('Choisissez un fichier.');
        if (fichier.size > 10 * 1024 * 1024) return echec('Fichier trop lourd (10 Mo maximum).');
        db.documents = db.documents.filter(function (d) { return !(d.org_id === o.id && d.type === type); });
        db.documents.push({ id: D.uid(), org_id: o.id, type: type, annee: +annee || null, chemin: 'demo/' + fichier.name, statut: 'envoye', commentaire: '', created_at: new Date().toISOString() });
        D.ecrire(db); return attendre(true);
      }
    };

    MV.admins = {
      lister: function () { var db = D.lire(), o = monOrg(db); return attendre(db.profils.filter(function (p) { return p.org_id === o.id; }).map(function (p) { return { id: p.id, nom: p.nom, email: p.email, created_at: p.created_at }; })); },
      inviter: function (a) {
        var db = D.lire(), o = monOrg(db); if (!o) return echec('Non connecté');
        if (!a.nom || !a.email || !a.motDePasse) return echec('Nom, email et mot de passe provisoire requis.');
        if (String(a.motDePasse).length < 8) return echec('Mot de passe : 8 caractères minimum.');
        if (db.profils.filter(function (p) { return p.org_id === o.id; }).length >= 3) return echec('Votre organisation a déjà 3 administrateurs (maximum).');
        if (db.profils.some(function (p) { return p.email.toLowerCase() === a.email.toLowerCase(); })) return echec('Cet email a déjà un compte MinVa.');
        db.profils.push({ id: D.uid(), org_id: o.id, role: 'admin', nom: a.nom, email: a.email, mdp: a.motDePasse, created_at: new Date().toISOString() });
        D.ecrire(db); return attendre(true);
      },
      retirer: function (id) {
        var db = D.lire(), p = moi(db);
        if (id === p.id) return echec('Vous ne pouvez pas vous retirer vous-même.');
        db.profils = db.profils.filter(function (x) { return !(x.id === id && x.org_id === p.org_id); }); D.ecrire(db); return attendre(true);
      }
    };

    MV.support = {
      journal: function () { var db = D.lire(), o = monOrg(db); return attendre(tri(db.journal_support.filter(function (j) { return j.org_id === o.id; }))); }
    };

    MV.media = {
      envoyer: function (fichier) {
        return O.compresserImage(fichier, 1200, 0.72).then(O.blobEnDataUrl);
      }
    };

    MV.demande = {
      creer: function (d) {
        if (!d.nom_organisation || !d.responsable || !d.telephone) return echec('Nom de l’organisation, responsable et téléphone sont obligatoires.');
        var db = D.lire(); db.demandes_abonnement.push(Object.assign({ id: D.uid(), statut: 'nouvelle', created_at: new Date().toISOString() }, d)); D.ecrire(db); return attendre(true);
      }
    };

    function bilanDemo(db, orgId) {
      var par = {};
      (db.dons || []).filter(function (x) { return x.org_id === orgId && x.statut === 'confirme'; }).forEach(function (x) {
        var a = new Date(x.created_at).getFullYear(); par[a] = par[a] || { org_id: orgId, annee: a, total: 0, nombre: 0 }; par[a].total += x.montant; par[a].nombre++;
      });
      return Object.keys(par).map(function (k) { return par[k]; });
    }
    // Toutes les données d'une année (rapport annuel, kit bailleur)
    MV.site.annee = function (slug, annee) {
      return MV.site.parSlug(slug).then(function (d) {
        if (!d) return null;
        var db = D.lire(), id = d.org.id, dans = function (dt) { return new Date(dt).getFullYear() === annee; };
        d.actualites = tri(db.actualites.filter(function (a) { return a.org_id === id && dans(a.created_at); }));
        d.evenements = (db.evenements || []).filter(function (e) { return e.org_id === id && dans(e.debut); })
          .map(function (e) { return Object.assign({ inscrits: (db.inscriptions || []).filter(function (i) { return i.evenement_id === e.id; }).reduce(function (t, i) { return t + i.nombre; }, 0) }, e); });
        d.depenses = (db.depenses || []).filter(function (x) { return x.org_id === id && dans(x.date_depense); });
        d.matchs = (db.matchs || []).filter(function (x) { return x.org_id === id && dans(x.date_match); });
        return d;
      });
    };

    // Actions des visiteurs (sans compte)
    var orgActive = function (db, id) { return db.organisations.some(function (o) { return o.id === id && o.actif; }); };
    MV.public = {
      don: function (orgId, d) {
        try { var v = verifDon(d); } catch (e) { return echec(e.message); }
        var db = D.lire(); if (!orgActive(db, orgId)) return echec('Organisation introuvable.');
        db.dons = db.dons || []; db.dons.push(Object.assign({ id: D.uid(), org_id: orgId, statut: 'declare', created_at: new Date().toISOString() }, v)); D.ecrire(db); return attendre(true);
      },
      inscrire: function (orgId, evtId, x) {
        try { var v = verifPersonne(x, 'vous inscrire'); } catch (e) { return echec(e.message); }
        var db = D.lire(), ev = (db.evenements || []).find(function (e) { return e.id === evtId && e.org_id === orgId; });
        if (!ev || !ev.inscriptions || new Date(ev.fin || ev.debut) < new Date()) return echec('Les inscriptions sont fermées.');
        var n = Math.min(20, Math.max(1, parseInt(x.nombre, 10) || 1));
        var pris = (db.inscriptions || []).filter(function (i) { return i.evenement_id === evtId; }).reduce(function (t, i) { return t + i.nombre; }, 0);
        if (ev.places && pris + n > ev.places) return echec('Complet : il ne reste plus assez de places.');
        db.inscriptions = db.inscriptions || []; db.inscriptions.push(Object.assign({ id: D.uid(), evenement_id: evtId, org_id: orgId, nombre: n, created_at: new Date().toISOString() }, v)); D.ecrire(db); return attendre(true);
      },
      adherer: function (orgId, x) {
        try { var v = verifPersonne(x, 'devenir membre'); } catch (e) { return echec(e.message); }
        var db = D.lire(); if (!orgActive(db, orgId)) return echec('Organisation introuvable.');
        db.adhesions = db.adhesions || []; db.adhesions.push(Object.assign({ id: D.uid(), org_id: orgId, objet: x.objet === 'benevole' ? 'benevole' : 'membre', competence: String(x.competence || '').slice(0, 120), email: String(x.email || '').trim().slice(0, 120), ville: String(x.ville || '').trim().slice(0, 80), message: String(x.message || '').trim().slice(0, 500), statut: 'nouvelle', created_at: new Date().toISOString() }, v));
        D.ecrire(db); return attendre(true);
      },
      voter: function (sondageId, choix, votant, code) {
        var db = D.lire(), sd = (db.sondages || []).find(function (x) { return x.id === sondageId; });
        if (!sd || !sd.ouvert || (sd.fin && new Date(sd.fin) < new Date())) return echec('Ce vote est fermé.');
        if (!(choix >= 0 && choix < sd.options.length)) return echec('Choix invalide.');
        if (sd.code && String(code || '').trim().toLowerCase() !== sd.code.trim().toLowerCase()) return echec('Code de vote incorrect.');
        var v = String(votant || '').trim().toLowerCase().slice(0, 120); if (v.length < 2) return echec('Indiquez votre nom pour voter.');
        db.votes = db.votes || [];
        if (db.votes.some(function (x) { return x.sondage_id === sondageId && x.votant === v; })) return echec('Vous avez déjà voté.');
        db.votes.push({ id: D.uid(), sondage_id: sondageId, org_id: sd.org_id, choix: choix, votant: v, created_at: new Date().toISOString() }); D.ecrire(db);
        return attendre(sondagePublic(sd, db.votes));
      },
      compter: function (orgId, type, source) {
        if (TYPES_STAT.indexOf(type) < 0) return attendre(false);
        try {
          var db = D.lire(), jr = new Date().toISOString().slice(0, 10), src = String(source || 'direct').slice(0, 20);
          db.statistiques = db.statistiques || [];
          var l = db.statistiques.find(function (x) { return x.org_id === orgId && x.jour === jr && x.type === type && x.source === src; });
          if (l) l.n++; else db.statistiques.push({ org_id: orgId, jour: jr, type: type, source: src, n: 1 });
          D.ecrire(db);
        } catch (e) {}
        return attendre(true);
      }
    };

    // Console : dons, agenda, membres, statistiques
    MV.dons = {
      lister: function () { var db = D.lire(), o = monOrg(db); return attendre(tri((db.dons || []).filter(function (x) { return x.org_id === o.id; }))); },
      statut: function (id, statut) {
        var db = D.lire(), o = monOrg(db), d = (db.dons || []).find(function (x) { return x.id === id && x.org_id === o.id; });
        if (!d) return echec('Don introuvable.');
        var p = d.projet_id && db.projets.find(function (x) { return x.id === d.projet_id && x.org_id === o.id; });
        if (p && d.statut === 'confirme' && statut !== 'confirme') { p.collecte = Math.max(0, p.collecte - d.montant); p.donateurs = Math.max(0, p.donateurs - 1); }
        if (p && d.statut !== 'confirme' && statut === 'confirme') { p.collecte += d.montant; p.donateurs += 1; }
        d.statut = statut; D.ecrire(db); return attendre(true);
      },
      supprimer: function (id) {
        var db = D.lire(), o = monOrg(db), d = (db.dons || []).find(function (x) { return x.id === id && x.org_id === o.id; });
        if (d && d.statut === 'confirme') { var p = db.projets.find(function (x) { return x.id === d.projet_id; }); if (p) { p.collecte = Math.max(0, p.collecte - d.montant); p.donateurs = Math.max(0, p.donateurs - 1); } }
        db.dons = (db.dons || []).filter(function (x) { return !(x.id === id && x.org_id === o.id); }); D.ecrire(db); return attendre(true);
      }
    };
    MV.evts = {
      lister: function () {
        var db = D.lire(), o = monOrg(db);
        return attendre((db.evenements || []).filter(function (e) { return e.org_id === o.id; })
          .map(function (e) { return Object.assign({ inscrits: (db.inscriptions || []).filter(function (i) { return i.evenement_id === e.id; }).reduce(function (t, i) { return t + i.nombre; }, 0) }, e); })
          .sort(function (a, b) { return new Date(b.debut) - new Date(a.debut); }));
      },
      enregistrer: function (e) {
        try { var v = verifEvt(e); } catch (er) { return echec(er.message); }
        var db = D.lire(), o = monOrg(db); db.evenements = db.evenements || [];
        var ex = e.id && db.evenements.find(function (x) { return x.id === e.id && x.org_id === o.id; });
        if (ex) Object.assign(ex, v); else db.evenements.push(Object.assign({ id: D.uid(), org_id: o.id, created_at: new Date().toISOString() }, v));
        D.ecrire(db); return attendre(true);
      },
      supprimer: function (id) {
        var db = D.lire(), o = monOrg(db);
        db.evenements = (db.evenements || []).filter(function (e) { return !(e.id === id && e.org_id === o.id); });
        db.inscriptions = (db.inscriptions || []).filter(function (i) { return i.evenement_id !== id; }); D.ecrire(db); return attendre(true);
      },
      inscrits: function (evtId) { var db = D.lire(), o = monOrg(db); return attendre(tri((db.inscriptions || []).filter(function (i) { return i.evenement_id === evtId && i.org_id === o.id; }))); },
      retirerInscrit: function (id) { var db = D.lire(), o = monOrg(db); db.inscriptions = (db.inscriptions || []).filter(function (i) { return !(i.id === id && i.org_id === o.id); }); D.ecrire(db); return attendre(true); }
    };
    MV.adhesions = {
      lister: function () { var db = D.lire(), o = monOrg(db); return attendre(tri((db.adhesions || []).filter(function (x) { return x.org_id === o.id; }))); },
      statut: function (id, statut) { var db = D.lire(), o = monOrg(db), a = (db.adhesions || []).find(function (x) { return x.id === id && x.org_id === o.id; }); if (a) a.statut = statut; D.ecrire(db); return attendre(true); },
      supprimer: function (id) { var db = D.lire(), o = monOrg(db); db.adhesions = (db.adhesions || []).filter(function (x) { return !(x.id === id && x.org_id === o.id); }); D.ecrire(db); return attendre(true); }
    };
    // Listes simples de la vague 2 (dépenses, produits, matchs, sondages) : même fonctionnement pour toutes
    function crudDemo(table) {
      return {
        lister: function () {
          var db = D.lire(), o = monOrg(db), l = (db[table] || []).filter(function (x) { return x.org_id === o.id; }), k = ORDRE[table];
          l.sort(function (a, b) { return String(b[k]).localeCompare(String(a[k])); });
          if (table === 'sondages') l = l.map(function (x) { return Object.assign({}, x, compteVotes(x, db.votes || [])); });
          return attendre(l);
        },
        enregistrer: function (d) {
          try { var v = VERIF[table](d); } catch (e) { return echec(e.message); }
          var db = D.lire(), o = monOrg(db); db[table] = db[table] || [];
          var ex = d.id && db[table].find(function (x) { return x.id === d.id && x.org_id === o.id; });
          if (ex) Object.assign(ex, v); else db[table].push(Object.assign({ id: D.uid(), org_id: o.id, created_at: new Date().toISOString() }, v));
          D.ecrire(db); return attendre(true);
        },
        supprimer: function (id) {
          var db = D.lire(), o = monOrg(db);
          db[table] = (db[table] || []).filter(function (x) { return !(x.id === id && x.org_id === o.id); });
          if (table === 'sondages') db.votes = (db.votes || []).filter(function (v) { return v.sondage_id !== id; });
          D.ecrire(db); return attendre(true);
        }
      };
    }
    MV.depenses = crudDemo('depenses'); MV.produits = crudDemo('produits'); MV.matchs = crudDemo('matchs'); MV.sondages = crudDemo('sondages');
    MV.sondages.votes = function (id) { var db = D.lire(), o = monOrg(db); return attendre(tri((db.votes || []).filter(function (v) { return v.sondage_id === id && v.org_id === o.id; }))); };

    MV.stats = {
      lister: function (jours) {
        var db = D.lire(), o = monOrg(db), min = new Date(Date.now() - (jours || 30) * 86400000).toISOString().slice(0, 10);
        return attendre((db.statistiques || []).filter(function (x) { return x.org_id === o.id && x.jour >= min; }));
      }
    };

    MV.erreur = function (app, message) {
      try { var db = D.lire(); db.erreurs_client.push({ id: D.uid(), application: app, message: String(message).slice(0, 2000), page: location.pathname + location.hash, created_at: new Date().toISOString() }); db.erreurs_client = db.erreurs_client.slice(-100); D.ecrire(db); } catch (e) {}
    };
    MV.reinitialiserDemo = function () { D.reinitialiser(); localStorage.removeItem(CLE_SESSION); };

    window.MV = MV;
    return;
  }

  // =================================================================
  // MODE RÉEL (Supabase)
  // =================================================================
  var sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY, { auth: { storageKey: 'minva-admin-auth' } });
  var profilCache = null;
  function ok(r) { if (r.error) throw new Error(traduire(r.error.message)); return r.data; }
  function traduire(m) {
    if (/Invalid login/i.test(m)) return 'Email ou mot de passe incorrect.';
    if (/duplicate key.*slug/i.test(m)) return 'Ce lien est déjà pris.';
    if (/slug_check|check constraint.*slug/i.test(m)) return 'Lien invalide : lettres minuscules, chiffres et tirets, 3 caractères minimum.';
    if (/Failed to fetch|NetworkError/i.test(m)) return 'Pas de connexion internet. Réessayez dans un instant.';
    if (/Complet/i.test(m)) return 'Complet : il ne reste plus assez de places.';
    var connu = /(Ce vote est fermé\.|Choix invalide\.|Code de vote incorrect\.|Indiquez votre nom pour voter\.|Vous avez déjà voté\.)/.exec(m); if (connu) return connu[1];
    if (/row-level security/i.test(m)) return 'Cette action n’est pas possible pour le moment (inscriptions fermées ou organisation hors ligne).';
    return m;
  }
  async function fonction(nom, corps) {
    var r = await sb.functions.invoke(nom, { body: corps });
    if (r.error) {
      var msg = r.error.message;
      try { var b = await r.error.context.json(); if (b && b.erreur) msg = b.erreur; } catch (e) {}
      throw new Error(traduire(msg));
    }
    if (r.data && r.data.ok === false) throw new Error(r.data.erreur);
    return r.data;
  }
  async function profil() {
    if (profilCache) return profilCache;
    var s = (await sb.auth.getSession()).data.session;
    if (!s) return null;
    var p = ok(await sb.from('profils').select('id, nom, email, role, org_id').eq('id', s.user.id).maybeSingle());
    profilCache = p && p.role === 'admin' ? p : null;
    return profilCache;
  }
  async function orgId() { var p = await profil(); if (!p) throw new Error('Non connecté'); return p.org_id; }

  MV.auth = {
    connexion: async function (email, mdp) {
      profilCache = null;
      ok(await sb.auth.signInWithPassword({ email: String(email).trim(), password: mdp }));
      var p = await profil();
      if (!p) { await sb.auth.signOut(); throw new Error('Ce compte n’est pas un compte administrateur d’organisation.'); }
      var o = ok(await sb.from('organisations').select('actif').eq('id', p.org_id).single());
      if (!o.actif) { await sb.auth.signOut(); profilCache = null; throw new Error('Le compte de votre organisation est suspendu. Contactez MinVa.'); }
      return p;
    },
    deconnexion: async function () { profilCache = null; await sb.auth.signOut(); return true; },
    profil: profil,
    changerMotDePasse: async function (nouveau) {
      if (String(nouveau).length < 8) throw new Error('8 caractères minimum.');
      ok(await sb.auth.updateUser({ password: nouveau })); return true;
    }
  };

  MV.site = {
    parSlug: async function (slug) {
      var org = ok(await sb.from('organisations_publiques').select('*').eq('slug', slug).maybeSingle());
      if (!org) return null;
      var r = await Promise.all([
        sb.from('actualites').select('*').eq('org_id', org.id).order('created_at', { ascending: false }).limit(60),
        sb.from('projets').select('*').eq('org_id', org.id).eq('actif', true).order('created_at', { ascending: false }),
        sb.from('documents_publics').select('*').eq('org_id', org.id),
        sb.from('evenements_publics').select('*').eq('org_id', org.id).gte('debut', depuisJours(60)).order('debut').limit(30),
        sb.from('dons_publics').select('*').eq('org_id', org.id).order('created_at', { ascending: false }).limit(12),
        sb.from('depenses').select('*').eq('org_id', org.id).order('date_depense', { ascending: false }).limit(60),
        sb.from('produits').select('*').eq('org_id', org.id).order('created_at', { ascending: false }).limit(60),
        sb.from('matchs').select('*').eq('org_id', org.id).gte('date_match', depuisJours(120)).order('date_match').limit(40),
        sb.from('sondages_publics').select('*').eq('org_id', org.id).order('created_at', { ascending: false }).limit(6),
        sb.from('dons_bilan').select('*').eq('org_id', org.id)
      ]);
      // Modules facultatifs : si une table manque, le reste du site s'affiche quand même
      var souple = function (x) { return x.error ? [] : x.data; };
      return { org: org, actualites: ok(r[0]), projets: ok(r[1]), documents: ok(r[2]), evenements: souple(r[3]), dons: souple(r[4]),
        depenses: souple(r[5]), produits: souple(r[6]), matchs: souple(r[7]), sondages: souple(r[8]), bilanDons: souple(r[9]) };
    },
    annee: async function (slug, annee) {
      var d = await MV.site.parSlug(slug); if (!d) return null;
      var deb = annee + '-01-01', fin = (annee + 1) + '-01-01', id = d.org.id, souple = function (x) { return x.error ? [] : x.data; };
      var r = await Promise.all([
        sb.from('actualites').select('*').eq('org_id', id).gte('created_at', deb).lt('created_at', fin).order('created_at', { ascending: false }).limit(500),
        sb.from('evenements_publics').select('*').eq('org_id', id).gte('debut', deb).lt('debut', fin).order('debut').limit(300),
        sb.from('depenses').select('*').eq('org_id', id).gte('date_depense', deb).lt('date_depense', fin).limit(1000),
        sb.from('matchs').select('*').eq('org_id', id).gte('date_match', deb).lt('date_match', fin).limit(300)
      ]);
      d.actualites = ok(r[0]); d.evenements = souple(r[1]); d.depenses = souple(r[2]); d.matchs = souple(r[3]);
      return d;
    },
    annuaire: async function () {
      return ok(await sb.from('organisations_publiques').select('id, slug, nom, sigle, type_structure, secteur, ville, region, slogan, mission, theme, logo_url, beneficiaires, beneficiaires_label, besoins, statut_verification, derniere_actualite').eq('dans_annuaire', true));
    }
  };

  MV.org = {
    mienne: async function () { return ok(await sb.from('organisations').select('*').eq('id', await orgId()).single()); },
    maj: async function (patch) {
      ['actif', 'plan', 'abonnement_fin', 'statut_verification', 'id', 'created_at'].forEach(function (k) { delete patch[k]; });
      return ok(await sb.from('organisations').update(patch).eq('id', await orgId()).select().single());
    },
    slugDisponible: async function (slug) {
      var r = ok(await sb.from('organisations_publiques').select('id').eq('slug', slug).maybeSingle());
      return !r || r.id === (await orgId());
    }
  };

  MV.actu = {
    lister: async function () { return ok(await sb.from('actualites').select('*').eq('org_id', await orgId()).order('created_at', { ascending: false })); },
    creer: async function (a) {
      if (!String(a.texte || '').trim() && !(a.photos || []).length) throw new Error('Écrivez un texte ou ajoutez une photo.');
      var p = await profil();
      return ok(await sb.from('actualites').insert({ org_id: p.org_id, type: a.type || 'actu', texte: String(a.texte || '').slice(0, 2000), photos: (a.photos || []).slice(0, 4), auteur_id: p.id }).select().single());
    },
    supprimer: async function (id) { ok(await sb.from('actualites').delete().eq('id', id)); return true; }
  };

  MV.projet = {
    lister: async function () { return ok(await sb.from('projets').select('*').eq('org_id', await orgId()).order('created_at', { ascending: false })); },
    enregistrer: async function (p) {
      if (!String(p.titre || '').trim()) throw new Error('Donnez un titre au projet.');
      var v = { titre: p.titre, description: p.description || '', collecte: Math.max(0, +p.collecte || 0), objectif: Math.max(0, +p.objectif || 0), donateurs: Math.max(0, +p.donateurs || 0), actif: p.actif !== false };
      if (p.id) ok(await sb.from('projets').update(v).eq('id', p.id));
      else ok(await sb.from('projets').insert(Object.assign({ org_id: await orgId() }, v)));
      return true;
    },
    supprimer: async function (id) { ok(await sb.from('projets').delete().eq('id', id)); return true; }
  };

  MV.doc = {
    lister: async function () { return ok(await sb.from('documents').select('*').eq('org_id', await orgId())); },
    envoyer: async function (type, fichier, annee) {
      if (!fichier) throw new Error('Choisissez un fichier.');
      if (fichier.size > 10 * 1024 * 1024) throw new Error('Fichier trop lourd (10 Mo maximum).');
      var id = await orgId();
      var ext = (fichier.name.split('.').pop() || 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '');
      var chemin = id + '/' + type + '-' + Date.now() + '.' + ext;
      ok(await sb.storage.from('documents').upload(chemin, fichier, { upsert: true, contentType: fichier.type || undefined }));
      ok(await sb.from('documents').upsert({ org_id: id, type: type, annee: +annee || null, chemin: chemin, statut: 'envoye', commentaire: '' }, { onConflict: 'org_id,type' }));
      return true;
    }
  };

  MV.admins = {
    lister: async function () { return ok(await sb.from('profils').select('id, nom, email, created_at').eq('org_id', await orgId()).order('created_at')); },
    inviter: function (a) { return fonction('inviter-admin', a); },
    retirer: function (id) { return fonction('retirer-admin', { profilId: id }); }
  };

  MV.support = {
    journal: async function () { return ok(await sb.from('journal_support').select('*').eq('org_id', await orgId()).order('created_at', { ascending: false }).limit(50)); }
  };

  MV.media = {
    envoyer: async function (fichier, dossier) {
      var blob = await O.compresserImage(fichier);
      var chemin = (await orgId()) + '/' + (dossier || 'photos') + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.jpg';
      ok(await sb.storage.from('medias').upload(chemin, blob, { contentType: 'image/jpeg' }));
      return sb.storage.from('medias').getPublicUrl(chemin).data.publicUrl;
    }
  };

  MV.demande = {
    creer: async function (d) {
      if (!d.nom_organisation || !d.responsable || !d.telephone) throw new Error('Nom de l’organisation, responsable et téléphone sont obligatoires.');
      ok(await sb.from('demandes_abonnement').insert(d)); return true;
    }
  };

  MV.public = {
    don: async function (orgId, d) { var v = verifDon(d); ok(await sb.from('dons').insert(Object.assign({ org_id: orgId }, v))); return true; },
    inscrire: async function (orgId, evtId, x) {
      var v = verifPersonne(x, 'vous inscrire');
      ok(await sb.from('inscriptions').insert(Object.assign({ org_id: orgId, evenement_id: evtId, nombre: Math.min(20, Math.max(1, parseInt(x.nombre, 10) || 1)) }, v))); return true;
    },
    adherer: async function (orgId, x) {
      var v = verifPersonne(x, 'devenir membre');
      ok(await sb.from('adhesions').insert(Object.assign({ org_id: orgId, objet: x.objet === 'benevole' ? 'benevole' : 'membre', competence: String(x.competence || '').slice(0, 120), email: String(x.email || '').trim().slice(0, 120), ville: String(x.ville || '').trim().slice(0, 80), message: String(x.message || '').trim().slice(0, 500) }, v))); return true;
    },
    voter: async function (sondageId, choix, votant, code) {
      ok(await sb.rpc('minva_voter', { p_sondage: sondageId, p_choix: choix, p_votant: votant, p_code: code || '' }));
      return ok(await sb.from('sondages_publics').select('*').eq('id', sondageId).single());
    },
    compter: function (orgId, type, source) {
      if (TYPES_STAT.indexOf(type) < 0) return Promise.resolve(false);
      return sb.rpc('minva_compter', { p_org: orgId, p_type: type, p_source: String(source || 'direct').slice(0, 20) }).then(function () { return true; }, function () { return false; });
    }
  };

  MV.dons = {
    lister: async function () { return ok(await sb.from('dons').select('*').eq('org_id', await orgId()).order('created_at', { ascending: false }).limit(300)); },
    statut: async function (id, statut) { ok(await sb.from('dons').update({ statut: statut }).eq('id', id)); return true; },
    supprimer: async function (id) { ok(await sb.from('dons').delete().eq('id', id)); return true; }
  };
  MV.evts = {
    lister: async function () {
      var id = await orgId();
      var r = await Promise.all([sb.from('evenements_publics').select('*').eq('org_id', id).order('debut', { ascending: false }).limit(200)]);
      return ok(r[0]);
    },
    enregistrer: async function (e) {
      var v = verifEvt(e);
      if (e.id) ok(await sb.from('evenements').update(v).eq('id', e.id));
      else ok(await sb.from('evenements').insert(Object.assign({ org_id: await orgId() }, v)));
      return true;
    },
    supprimer: async function (id) { ok(await sb.from('evenements').delete().eq('id', id)); return true; },
    inscrits: async function (evtId) { return ok(await sb.from('inscriptions').select('*').eq('evenement_id', evtId).order('created_at', { ascending: false })); },
    retirerInscrit: async function (id) { ok(await sb.from('inscriptions').delete().eq('id', id)); return true; }
  };
  MV.adhesions = {
    lister: async function () { return ok(await sb.from('adhesions').select('*').eq('org_id', await orgId()).order('created_at', { ascending: false }).limit(500)); },
    statut: async function (id, statut) { ok(await sb.from('adhesions').update({ statut: statut }).eq('id', id)); return true; },
    supprimer: async function (id) { ok(await sb.from('adhesions').delete().eq('id', id)); return true; }
  };
  function crudReel(table) {
    return {
      lister: async function () {
        var l = ok(await sb.from(table).select('*').eq('org_id', await orgId()).order(ORDRE[table], { ascending: false }).limit(500));
        if (table === 'sondages' && l.length) {
          var votes = ok(await sb.from('votes').select('sondage_id, choix').in('sondage_id', l.map(function (x) { return x.id; })));
          l = l.map(function (x) { return Object.assign({}, x, compteVotes(x, votes)); });
        }
        return l;
      },
      enregistrer: async function (d) {
        var v = VERIF[table](d);
        if (d.id) ok(await sb.from(table).update(v).eq('id', d.id));
        else ok(await sb.from(table).insert(Object.assign({ org_id: await orgId() }, v)));
        return true;
      },
      supprimer: async function (id) { ok(await sb.from(table).delete().eq('id', id)); return true; }
    };
  }
  MV.depenses = crudReel('depenses'); MV.produits = crudReel('produits'); MV.matchs = crudReel('matchs'); MV.sondages = crudReel('sondages');
  MV.sondages.votes = async function (id) { return ok(await sb.from('votes').select('*').eq('sondage_id', id).order('created_at', { ascending: false })); };

  MV.stats = {
    lister: async function (jours) {
      var min = new Date(Date.now() - (jours || 30) * 86400000).toISOString().slice(0, 10);
      return ok(await sb.from('statistiques').select('jour, type, source, n').eq('org_id', await orgId()).gte('jour', min));
    }
  };

  var nbErreurs = 0;
  MV.erreur = function (app, message) {
    if (++nbErreurs > 20) return;
    profil().then(function (p) {
      return sb.from('erreurs_client').insert({ application: app, message: String(message).slice(0, 2000), page: location.pathname + location.hash, org_id: p ? p.org_id : null });
    }).catch(function () {});
  };

  window.MV = MV;
})();
