// =====================================================================
// MinVa — configuration (le SEUL fichier à modifier pour brancher Supabase)
// =====================================================================
// Tant que SUPABASE_URL est vide, MinVa fonctionne en MODE DÉMONSTRATION :
// tout marche dans le navigateur avec des organisations d'exemple
// (rien n'est envoyé sur internet, les données restent sur l'appareil).
// Pour passer en réel : collez l'URL et la clé "anon public" de votre
// projet Supabase (Project Settings → API). La clé anon est publique
// par nature : elle peut être dans ce fichier sans danger.
// =====================================================================
window.MINVA_CONFIG = {
  SUPABASE_URL: 'https://rcxhwhfjlqkksdsyvbrh.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjeGh3aGZqbHFra3Nkc3l2YnJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1MTYxNDAsImV4cCI6MjEwNjA5MjE0MH0.-e5ihyab-i1jJPpZ6qHFNgwjk32ItgjSoOCG7cMufYc',

  // Adresse publique du dossier minva (sert à fabriquer le lien des sites clients)
  // Exemple une fois en ligne : 'https://vehizohjunior.github.io/minva/'
  URL_PUBLIQUE: 'https://vehizohjunior.github.io/minva/',

  // Numéro WhatsApp commercial de MinVa (site vitrine), format international sans +
  WHATSAPP_COMMERCIAL: '2250700000000',

  // Tarifs affichés sur le site vitrine (validés le 27/09/2026)
  TARIFS: [
    { id: 'essentiel', nom: 'Essentiel', prix: 6000, periode: 'mois',
      pour: 'Petite association qui veut exister en ligne',
      inclus: ['Site personnalisé avec votre lien', 'Actualités illimitées avec photos', '1 administrateur', 'Apparition dans l’annuaire MinVa'] },
    { id: 'organisation', nom: 'Organisation', prix: 12000, periode: 'mois', recommande: true,
      pour: 'Association, coopérative ou ONG qui cherche des soutiens',
      inclus: ['Tout Essentiel', '3 administrateurs', 'Projets avec barre de collecte', 'Documents de confiance vérifiés par MinVa', 'Badge « Vérifié »'] },
    { id: 'reseau', nom: 'Réseau', prix: 25000, periode: 'mois',
      pour: 'Fédération ou réseau de plusieurs structures',
      inclus: ['Tout Organisation', 'Accompagnement à la mise en ligne', 'Mise en avant dans l’annuaire', 'Assistance prioritaire'] }
  ]
};
