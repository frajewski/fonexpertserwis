// Kategorie magazynu części (pole part.category)
export const PART_CATEGORIES = [
  { id: 'displays',  label: 'Wyświetlacze',            icon: '📱', words: ['wyświetlacz', 'wyswietlacz', 'ekran', 'lcd', 'oled', 'amoled', 'dotyk', 'digitizer', 'display'] },
  { id: 'batteries', label: 'Baterie',                 icon: '🔋', words: ['bateria', 'akumulator', 'battery'] },
  { id: 'charging',  label: 'Gniazda ładowania',       icon: '🔌', words: ['gniazdo', 'złącze', 'zlacze', 'port', 'usb', 'lightning', 'ładowani', 'ladowani', 'płytka ładowania'] },
  { id: 'cameras',   label: 'Aparaty',                 icon: '📷', words: ['aparat', 'kamera', 'camera', 'obiektyw', 'szkiełko aparatu', 'szkielko aparatu'] },
  { id: 'housings',  label: 'Obudowy i szybki',        icon: '🧩', words: ['obudowa', 'klapka', 'tył', 'tyl', 'plecki', 'szybka', 'ramka', 'korpus', 'back'] },
  { id: 'audio',     label: 'Głośniki i mikrofony',    icon: '🔊', words: ['głośnik', 'glosnik', 'mikrofon', 'buzzer', 'słuchawka', 'sluchawka', 'speaker'] },
  { id: 'flex',      label: 'Taśmy i przyciski',       icon: '🎛️', words: ['taśma', 'tasma', 'flex', 'przycisk', 'power', 'głośności', 'glosnosci', 'czytnik', 'face id', 'touch id', 'wibra'] },
  { id: 'tools',     label: 'Akcesoria i materiały',   icon: '🧰', words: ['klej', 'taśma dwustronna', 'folia', 'szkło hartowane', 'szklo hartowane', 'etui', 'kabel', 'ładowarka', 'ladowarka', 'śruby', 'sruby', 'narzędzi', 'narzedzi'] },
  { id: 'other',     label: 'Inne',                    icon: '📦', words: [] },
];

export const partCategoryById = (id) => PART_CATEGORIES.find((c) => c.id === id) || null;

// Podpowiedź kategorii z nazwy części (do przypisania starych pozycji)
export function guessPartCategory(name = '') {
  const n = name.toLowerCase();
  // akcesoria sprawdzamy najpierw – „taśma dwustronna” to nie taśma flex
  const order = ['tools', 'displays', 'batteries', 'charging', 'cameras', 'audio', 'flex', 'housings'];
  for (const id of order) {
    if (partCategoryById(id).words.some((w) => n.includes(w))) return id;
  }
  return 'other';
}
