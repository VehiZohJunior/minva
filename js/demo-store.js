// =====================================================================
// MinVa — données de DÉMONSTRATION (utilisées seulement tant que
// config.js n'est pas branché sur Supabase). Tout reste dans ce
// navigateur (localStorage). Organisations et personnes FICTIVES.
// =====================================================================
(function () {
  var CLE = 'minva-demo-v1';
  var jour = 86400000;
  function il_y_a(j, h) { return new Date(Date.now() - j * jour - (h || 0) * 3600000).toISOString(); }
  function dansJours(j) { return new Date(Date.now() + j * jour).toISOString().slice(0, 10); }
  function uid() { return (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36)); }
  var RUB = { apropos: true, actualites: true, projets: true, besoins: true, galerie: true, documents: true, equipe: true, contact: true };

  function graine() {
    var o1 = uid(), o2 = uid(), o3 = uid();
    return {
      version: 1,
      organisations: [
        { id: o1, slug: 'cfv-daloa', nom: 'Coopérative des femmes vivrières de Daloa', sigle: 'CFV', secteur: 'agriculture', ville: 'Daloa', region: 'Haut-Sassandra', annee_creation: 2014,
          slogan: 'Nourrir nos familles, faire vivre nos villages.',
          mission: 'Acheter la récolte de nos membres au juste prix, la stocker et la vendre ensemble.',
          apropos: "Créée en 2014 par des productrices de Daloa, la coopérative achète la récolte de ses membres au juste prix, la stocke et la revend en gros aux commerçants d'Abidjan. Elle finance aussi une tontine qui paie les frais de scolarité des enfants.",
          zone: 'Daloa et 7 villages alentour', langues: 'Bété, dioula, français', beneficiaires: 340, beneficiaires_label: 'personnes à charge', membres: 86,
          theme: 'kita', logo_url: null, couverture_url: null, rubriques: Object.assign({}, RUB),
          besoins: [{ type: 'financement', titre: 'Magasin de stockage', detail: 'Il manque 750 000 FCFA pour terminer la toiture.' }, { type: 'formation', titre: 'Gestion de stock', detail: 'Une formation à la tenue d’un registre de stock.' }],
          equipe: [{ role: 'Présidente', nom: 'Awa Gnahoré' }, { role: 'Trésorière', nom: 'Rosine Zadi' }, { role: 'Secrétaire', nom: 'Mariam Koné' }],
          contact: { telephone: '+225 07 00 00 00 11', whatsapp: '2250700000011', email: 'cfv.daloa@exemple.ci', facebook: '', adresse: 'Quartier Tazibouo, Daloa' },
          dans_annuaire: true, actif: true, statut_verification: 'verifie', plan: 'organisation', abonnement_fin: dansJours(210),
          acces_support_actif: false, acces_support_corrections: false, acces_support_expire: null, created_at: il_y_a(120) },
        { id: o2, slug: 'lire-a-man', nom: 'Association Lire à Man', sigle: 'LM', secteur: 'education', ville: 'Man', region: 'Tonkpi', annee_creation: 2019,
          slogan: 'Un livre dans chaque main, une bibliothèque dans chaque école.',
          mission: 'Donner à chaque école primaire du Tonkpi un coin lecture et des ateliers vivants.',
          apropos: "Des enseignants retraités de Man ont fondé l'association pour que chaque école primaire du Tonkpi ait un coin lecture. Les ateliers du mercredi mêlent contes en dan et lecture en français.",
          zone: 'Man, Logoualé, Biankouma', langues: 'Dan (yacouba), français', beneficiaires: 1200, beneficiaires_label: 'élèves', membres: 31,
          theme: 'indigo', logo_url: null, couverture_url: null, rubriques: Object.assign({}, RUB),
          besoins: [{ type: 'materiel', titre: 'Livres jeunesse', detail: 'Livres en français niveau CP–CE, neufs ou en bon état.' }, { type: 'benevoles', titre: 'Lecteurs du mercredi', detail: 'Deux bénévoles pour les ateliers de 14 h à 16 h.' }],
          equipe: [{ role: 'Président', nom: 'Jean-Baptiste Gueu' }, { role: 'Trésorière', nom: 'Pauline Dion' }, { role: 'Secrétaire', nom: 'Serge Tia' }],
          contact: { telephone: '+225 05 00 00 00 22', whatsapp: '2250500000022', email: 'lireaman@exemple.ci', facebook: '', adresse: 'EPP Libreville 2, Man' },
          dans_annuaire: true, actif: true, statut_verification: 'verifie', plan: 'organisation', abonnement_fin: dansJours(45),
          acces_support_actif: false, acces_support_corrections: false, acces_support_expire: null, created_at: il_y_a(90) },
        { id: o3, slug: 'eau-propre-korhogo', nom: 'Association Eau Propre de Korhogo', sigle: 'EPK', secteur: 'environnement', ville: 'Korhogo', region: 'Poro', annee_creation: 2016,
          slogan: 'L’eau potable, près de chaque famille.',
          mission: 'Réparer les pompes villageoises et former les villages à les entretenir.',
          apropos: "L'association répare et entretient les pompes à motricité humaine des villages autour de Korhogo, et forme dans chaque village un comité qui collecte une petite cotisation pour les pièces.",
          zone: '18 villages du département de Korhogo', langues: 'Sénoufo, dioula, français', beneficiaires: 9600, beneficiaires_label: 'habitants desservis', membres: 42,
          theme: 'emeraude', logo_url: null, couverture_url: null, rubriques: Object.assign({}, RUB),
          besoins: [{ type: 'materiel', titre: 'Pièces détachées', detail: 'Kits de joints et tringles pour pompes India Mark II.' }, { type: 'partenariat', titre: 'Analyses d’eau', detail: 'Un laboratoire partenaire pour 2 analyses par an.' }],
          equipe: [{ role: 'Président', nom: 'Souleymane Coulibaly' }, { role: 'Trésorier', nom: 'Adama Silué' }, { role: 'Secrétaire', nom: 'Fatou Soro' }],
          contact: { telephone: '+225 07 00 00 00 33', whatsapp: '2250700000033', email: '', facebook: '', adresse: 'Quartier Soba, Korhogo' },
          dans_annuaire: true, actif: true, statut_verification: 'en-cours', plan: 'essentiel', abonnement_fin: dansJours(-3),
          acces_support_actif: true, acces_support_corrections: false, acces_support_expire: new Date(Date.now() + 48 * 3600000).toISOString(), created_at: il_y_a(30) }
      ],
      profils: [
        { id: uid(), org_id: o1, role: 'admin', nom: 'Awa Gnahoré', email: 'admin@cfv-daloa.demo', mdp: 'demo1234', created_at: il_y_a(120) },
        { id: uid(), org_id: o1, role: 'admin', nom: 'Rosine Zadi', email: 'tresoriere@cfv-daloa.demo', mdp: 'demo1234', created_at: il_y_a(100) },
        { id: uid(), org_id: o2, role: 'admin', nom: 'Jean-Baptiste Gueu', email: 'admin@lire-a-man.demo', mdp: 'demo1234', created_at: il_y_a(90) },
        { id: uid(), org_id: o3, role: 'admin', nom: 'Souleymane Coulibaly', email: 'admin@eau-korhogo.demo', mdp: 'demo1234', created_at: il_y_a(30) },
        { id: uid(), org_id: null, role: 'developpeur', nom: 'Vehi Zoh Junior', email: 'dev@minva.demo', mdp: 'demo1234', created_at: il_y_a(200) }
      ],
      actualites: [
        { id: uid(), org_id: o1, type: 'actu', texte: "Les murs du magasin sont montés ! Merci aux 12 familles qui ont apporté du sable et de l'eau pendant deux semaines. Prochaine étape : la toiture.", photos: [], created_at: il_y_a(3) },
        { id: uid(), org_id: o1, type: 'evenement', texte: 'Assemblée générale le samedi 18 octobre à 9 h, au foyer des jeunes de Daloa. Ordre du jour : bilan de la campagne et élection de la trésorière adjointe.', photos: [], created_at: il_y_a(21) },
        { id: uid(), org_id: o1, type: 'rapport', texte: "Notre rapport d'activité 2025 est disponible. 42 tonnes de manioc vendues, 86 membres, aucun impayé à la tontine.", photos: [], created_at: il_y_a(60) },
        { id: uid(), org_id: o2, type: 'besoin', texte: 'Nous cherchons des livres jeunesse en français pour la rentrée. Dépôt possible à l’EPP Libreville 2, tous les mercredis après-midi.', photos: [], created_at: il_y_a(8) },
        { id: uid(), org_id: o2, type: 'actu', texte: '150 élèves ont participé au concours de lecture à voix haute. Bravo à Esther, 9 ans, grande gagnante !', photos: [], created_at: il_y_a(40) },
        { id: uid(), org_id: o3, type: 'actu', texte: 'La pompe de Nafoun coule de nouveau après 3 mois de panne. 600 habitants n’ont plus à marcher 4 km pour l’eau.', photos: [], created_at: il_y_a(1) },
        { id: uid(), org_id: o3, type: 'evenement', texte: 'Formation des comités de gestion à Karakoro, jeudi 9 octobre. 6 villages attendus.', photos: [], created_at: il_y_a(12) }
      ],
      projets: [
        { id: uid(), org_id: o1, titre: 'Un magasin de stockage pour la récolte de manioc', description: 'Stocker la récolte pour la vendre au meilleur moment, au lieu de brader à la récolte.', collecte: 1250000, objectif: 2000000, donateurs: 34, actif: true, created_at: il_y_a(50) },
        { id: uid(), org_id: o2, titre: 'Une bibliothèque mobile pour 6 écoles du Tonkpi', description: 'Une moto-bibliothèque qui passe chaque semaine dans 6 écoles sans bibliothèque.', collecte: 430000, objectif: 1500000, donateurs: 51, actif: true, created_at: il_y_a(30) },
        { id: uid(), org_id: o3, titre: 'Réhabiliter 5 pompes en panne avant la saison sèche', description: 'Pièces, main-d’œuvre et formation des comités pour 5 villages.', collecte: 980000, objectif: 1400000, donateurs: 22, actif: true, created_at: il_y_a(20) }
      ],
      documents: [
        { id: uid(), org_id: o1, type: 'statuts', annee: 2014, chemin: null, statut: 'verifie', commentaire: '', created_at: il_y_a(110) },
        { id: uid(), org_id: o1, type: 'recepisse', annee: 2014, chemin: null, statut: 'verifie', commentaire: '', created_at: il_y_a(110) },
        { id: uid(), org_id: o1, type: 'bureau', annee: 2025, chemin: null, statut: 'verifie', commentaire: '', created_at: il_y_a(110) },
        { id: uid(), org_id: o1, type: 'ag', annee: 2025, chemin: null, statut: 'verifie', commentaire: '', created_at: il_y_a(110) },
        { id: uid(), org_id: o1, type: 'activite', annee: 2025, chemin: null, statut: 'verifie', commentaire: '', created_at: il_y_a(60) },
        { id: uid(), org_id: o1, type: 'financier', annee: 2025, chemin: null, statut: 'envoye', commentaire: '', created_at: il_y_a(5) },
        { id: uid(), org_id: o2, type: 'statuts', annee: 2019, chemin: null, statut: 'verifie', commentaire: '', created_at: il_y_a(80) },
        { id: uid(), org_id: o2, type: 'recepisse', annee: 2019, chemin: null, statut: 'verifie', commentaire: '', created_at: il_y_a(80) },
        { id: uid(), org_id: o2, type: 'activite', annee: 2025, chemin: null, statut: 'verifie', commentaire: '', created_at: il_y_a(40) },
        { id: uid(), org_id: o3, type: 'statuts', annee: 2016, chemin: null, statut: 'envoye', commentaire: '', created_at: il_y_a(2) }
      ],
      journal_support: [
        { id: uid(), org_id: o3, action: 'ouverture', details: 'Vous avez ouvert l’accès développeur (lecture seule) pour 72 h.', created_at: il_y_a(1) }
      ],
      demandes_abonnement: [
        { id: uid(), nom_organisation: 'ONG Femmes Leaders de Bouaké', secteur: 'education', ville: 'Bouaké', responsable: 'Mme Adjoua Konan', telephone: '+225 07 00 00 02 00', email: 'fl.bouake@exemple.ci', plan: 'organisation', message: 'Nous voulons un site pour présenter nos formations en couture.', statut: 'nouvelle', created_at: il_y_a(0, 5) }
      ],
      erreurs_client: [
        { id: uid(), application: 'admin', message: 'TypeError: Failed to fetch (connexion coupée pendant l’envoi d’une photo)', page: 'admin.html#actualites', org_id: o2, created_at: il_y_a(0, 9) }
      ]
    };
  }

  var D = {
    lire: function () {
      try { var s = JSON.parse(localStorage.getItem(CLE)); if (s && s.version === 1) return s; } catch (e) {}
      var g = graine(); D.ecrire(g); return g;
    },
    ecrire: function (db) {
      try { localStorage.setItem(CLE, JSON.stringify(db)); }
      catch (e) { throw new Error('Mémoire de démonstration pleine : supprimez quelques photos ou réinitialisez la démo.'); }
    },
    reinitialiser: function () { localStorage.removeItem(CLE); try { sessionStorage.removeItem('minva-demo-session'); } catch (e) {} },
    uid: uid,
    // Règle d'accès développeur (même logique que dev_a_acces() côté base)
    devAAcces: function (org, ecriture) {
      return !!(org && org.acces_support_actif && org.acces_support_expire && new Date(org.acces_support_expire) > new Date() && (!ecriture || org.acces_support_corrections));
    }
  };
  window.MINVA_DEMO = D;
})();
