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
  var REEL = !!(C.SUPABASE_URL && C.SUPABASE_ANON_KEY && window.supabase);
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
          documents: db.documents.filter(function (d) { return d.org_id === o.id; }).map(function (d) { return { id: d.id, type: d.type, annee: d.annee, statut: d.statut }; })
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
        sb.from('documents_publics').select('*').eq('org_id', org.id)
      ]);
      return { org: org, actualites: ok(r[0]), projets: ok(r[1]), documents: ok(r[2]) };
    },
    annuaire: async function () {
      return ok(await sb.from('organisations_publiques').select('id, slug, nom, sigle, secteur, ville, region, slogan, mission, theme, logo_url, beneficiaires, beneficiaires_label, besoins, statut_verification, derniere_actualite').eq('dans_annuaire', true));
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

  var nbErreurs = 0;
  MV.erreur = function (app, message) {
    if (++nbErreurs > 20) return;
    profil().then(function (p) {
      return sb.from('erreurs_client').insert({ application: app, message: String(message).slice(0, 2000), page: location.pathname + location.hash, org_id: p ? p.org_id : null });
    }).catch(function () {});
  };

  window.MV = MV;
})();
