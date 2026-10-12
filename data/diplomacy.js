// Dış temas hedefleri — oyun tasarımı. dis: hedefin yönü (−1 Batı … +1 Avrasya/Doğu), foreign: hükümetteyken etkilenen eksen.
export const DESTINATIONS = [
  { id: 'bruksel', label: 'Brüksel (AB kurumları)', icon: '🇪🇺', dis: -1, foreign: 'ab', city: 'Brüksel' },
  { id: 'washington', label: 'Washington', icon: '🇺🇸', dis: -0.8, foreign: 'abd', city: 'Washington' },
  { id: 'berlin', label: 'Berlin (Türk diasporası)', icon: '🇩🇪', dis: -0.5, foreign: 'ab', city: 'Berlin', diaspora: true },
  { id: 'moskova', label: 'Moskova', icon: '🇷🇺', dis: 0.9, foreign: 'rusya', city: 'Moskova' },
  { id: 'doha', label: 'Doha ve Körfez', icon: '🇶🇦', dis: 0.6, foreign: 'ortadogu', city: 'Doha', din: 0.5 },
  { id: 'baku', label: 'Bakü', icon: '🇦🇿', dis: 0.3, foreign: 'komsu', city: 'Bakü', milli: 0.8 },
];
