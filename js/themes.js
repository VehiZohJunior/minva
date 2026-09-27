// =====================================================================
// MinVa — thèmes des sites clients
// =====================================================================
// Chaque organisation choisit un thème. Couleurs vérifiées pour la
// lisibilité (contraste AA) : ne pas modifier une valeur sans revérifier.
//   primaire   : en-tête, bandeaux sombres      surPrimaire : texte dessus
//   accent     : boutons, liens forts           surAccent   : texte des boutons
//   fond / surface / encre / encre2 / filet : page claire
// =====================================================================
window.MINVA_THEMES = [
  { id: 'nuit', nom: 'Nuit & Or', inspiration: 'Élégance sobre, la signature MinVa',
    primaire: '#14100D', surPrimaire: '#FBF7F0', accent: '#D6A857', surAccent: '#14100D',
    fond: '#FAF8F3', surface: '#FFFFFF', encre: '#1C1814', encre2: '#625B53', filet: '#E7E1D6', lien: '#8A5A12' },
  { id: 'indigo', nom: 'Indigo Baoulé', inspiration: 'Le pagne tissé teint à l’indigo',
    primaire: '#1E2F4D', surPrimaire: '#F7F5F0', accent: '#E8A93C', surAccent: '#14100D',
    fond: '#F6F5F1', surface: '#FFFFFF', encre: '#1A1D24', encre2: '#575C66', filet: '#E2E1DC', lien: '#1E4E8C' },
  { id: 'terre', nom: 'Terre de Korhogo', inspiration: 'La terre cuite et les toiles peintes',
    primaire: '#3A1F14', surPrimaire: '#FBF4EC', accent: '#E4572E', surAccent: '#14100D',
    fond: '#FBF7F0', surface: '#FFFFFF', encre: '#241611', encre2: '#6A574D', filet: '#EADFD3', lien: '#A63A17' },
  { id: 'kita', nom: 'Kita doré', inspiration: 'Le kente des grandes cérémonies',
    primaire: '#24401C', surPrimaire: '#FFF8E6', accent: '#EFB93E', surAccent: '#14100D',
    fond: '#FFFBF1', surface: '#FFFFFF', encre: '#1D2118', encre2: '#5B5E4F', filet: '#ECE5CF', lien: '#2F6B22' },
  { id: 'emeraude', nom: 'Émeraude', inspiration: 'La forêt et les plantations',
    primaire: '#0F4A33', surPrimaire: '#F2F7F3', accent: '#F2C14E', surAccent: '#14100D',
    fond: '#F3F7F4', surface: '#FFFFFF', encre: '#15201A', encre2: '#52615A', filet: '#DDE6E0', lien: '#0F6B45' },
  { id: 'bogolan', nom: 'Bogolan', inspiration: 'La toile de boue, brun, crème et noir',
    primaire: '#3D2A1C', surPrimaire: '#F5EDE0', accent: '#E9DCC3', surAccent: '#2A1D13',
    fond: '#F8F3EA', surface: '#FFFDF9', encre: '#231A12', encre2: '#665647', filet: '#E6DCCB', lien: '#7A4A22' },
  { id: 'lagune', nom: 'Lagune Ébrié', inspiration: 'L’eau, les pirogues et le soleil couchant',
    primaire: '#0E4C5A', surPrimaire: '#F1F8F8', accent: '#F28C38', surAccent: '#14100D',
    fond: '#F3F8F8', surface: '#FFFFFF', encre: '#142024', encre2: '#4F6166', filet: '#DCE7E8', lien: '#0B6376' },
  { id: 'savane', nom: 'Savane', inspiration: 'L’ocre des pistes et le vert du karité',
    primaire: '#4A300F', surPrimaire: '#FDF6E8', accent: '#E8B04A', surAccent: '#14100D',
    fond: '#FBF6EA', surface: '#FFFFFF', encre: '#241B0F', encre2: '#665A48', filet: '#EBE1CC', lien: '#1F6E4A' }
];

window.minvaTheme = function (id) {
  return window.MINVA_THEMES.find(function (t) { return t.id === id; }) || window.MINVA_THEMES[0];
};

// Applique un thème à un élément (variables CSS --t-*)
window.appliquerTheme = function (el, id) {
  var t = window.minvaTheme(id);
  var map = { primaire: 'primaire', surPrimaire: 'sur-primaire', accent: 'accent', surAccent: 'sur-accent',
    fond: 'fond', surface: 'surface', encre: 'encre', encre2: 'encre2', filet: 'filet', lien: 'lien' };
  Object.keys(map).forEach(function (k) { el.style.setProperty('--t-' + map[k], t[k]); });
  return t;
};
