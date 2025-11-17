// Enhanced creative Boulder name generator
const COLOR_ADJECTIVES: Record<string, string> = {
  'Grün': 'Grüner',
  'Gelb': 'Gelber',
  'Blau': 'Blauer',
  'Orange': 'Oranger',
  'Rot': 'Roter',
  'Schwarz': 'Schwarzer',
  'Weiß': 'Weißer',
  'Lila': 'Lilaner',
};

// Extensive adjective collection for creative names
const NAME_ADJECTIVES: string[] = [
  // Nature & Elements
  'Wilder', 'Stiller', 'Flinker', 'Mutiger', 'Frecher', 'Geheimer', 'Schneller', 'Kleiner', 'Großer', 'Felsiger',
  'Sanfter', 'Kniffliger', 'Starker', 'Leichter', 'Zäher', 'Kühner', 'Wackerer', 'Frischer', 'Neuer', 'Alter',
  'Steinerner', 'Eisiger', 'Feuriger', 'Windiger', 'Erdiger', 'Wässriger', 'Stürmischer', 'Ruhiger',
  // Character & Personality
  'Listiger', 'Kühler', 'Heißer', 'Bitterer', 'Süßer', 'Saurer', 'Scharfer', 'Milder', 'Rauer', 'Glatter',
  'Scharfer', 'Dumpfer', 'Heller', 'Dunkler', 'Klarer', 'Trüber', 'Reiner', 'Schmutziger',
  // Movement & Action
  'Sprungfreudiger', 'Kletternder', 'Gleitender', 'Fallender', 'Steigender', 'Kriechender', 'Fliegender',
  'Schwebender', 'Tanzender', 'Schwingender', 'Wippender', 'Schaukelnder',
  // Abstract & Mystical
  'Mystischer', 'Magischer', 'Geheimnisvoller', 'Rätselhafter', 'Unerklärlicher', 'Unbekannter', 'Versteckter',
  'Vergessener', 'Verlorener', 'Gefundener', 'Entdeckter', 'Erfundener',
];

// Extensive noun collection - animals, nature, objects, abstract
const NAME_NOUNS: string[] = [
  // Animals
  'Gecko', 'Phantom', 'Panther', 'Meteor', 'Kolibri', 'Specht', 'Saturn', 'Drache', 'Komet', 'Puma',
  'Goblin', 'Adler', 'Wal', 'Berserker', 'Nebel', 'Fuchs', 'Wolf', 'Rätsel', 'Rücken', 'Block',
  'Löwe', 'Tiger', 'Bär', 'Eule', 'Falke', 'Hai', 'Schlange', 'Skorpion', 'Spinne', 'Biene',
  'Schmetterling', 'Libelle', 'Grashüpfer', 'Ameise', 'Käfer', 'Schnecke', 'Wurm', 'Fisch', 'Frosch',
  'Eichhörnchen', 'Hase', 'Igel', 'Dachs', 'Marder', 'Luchs', 'Wildkatze', 'Jaguar', 'Leopard', 'Gepard',
  // Nature & Elements
  'Fels', 'Stein', 'Klippe', 'Wand', 'Grat', 'Spitze', 'Gipfel', 'Abgrund', 'Schlucht', 'Canyon',
  'Welle', 'Strom', 'Fluss', 'Wasserfall', 'Quelle', 'See', 'Meer', 'Ozean', 'Gischt', 'Schaum',
  'Wind', 'Sturm', 'Böe', 'Luft', 'Atem', 'Hauch', 'Brise', 'Wirbel', 'Tornado', 'Hurrikan',
  'Feuer', 'Flamme', 'Funke', 'Glut', 'Asche', 'Rauch', 'Brand', 'Inferno', 'Lavastrom',
  'Eis', 'Frost', 'Schnee', 'Hagel', 'Eiszapfen', 'Gletscher', 'Eisberg', 'Polareis',
  // Objects & Tools
  'Anker', 'Kette', 'Seil', 'Knoten', 'Haken', 'Nagel', 'Schraube', 'Bolzen', 'Dübel', 'Klammer',
  'Hammer', 'Meißel', 'Axt', 'Säge', 'Messer', 'Klinge', 'Schwert', 'Dolch', 'Speer', 'Pfeil',
  'Schild', 'Rüstung', 'Helm', 'Panzer', 'Mauer', 'Turm', 'Burg', 'Festung', 'Bastion',
  // Abstract & Mystical
  'Geist', 'Seele', 'Kraft', 'Energie', 'Macht', 'Stärke', 'Schwäche', 'Mut', 'Angst', 'Hoffnung',
  'Traum', 'Vision', 'Illusion', 'Täuschung', 'Wahrheit', 'Lüge', 'Geheimnis', 'Rätsel', 'Mysterium',
  'Schatten', 'Licht', 'Dunkelheit', 'Helligkeit', 'Glanz', 'Schimmer', 'Funkeln', 'Leuchten',
  'Echo', 'Klang', 'Ton', 'Melodie', 'Rhythmus', 'Takt', 'Harmonie', 'Dissonanz',
  // Celestial & Space
  'Stern', 'Planet', 'Mond', 'Sonne', 'Galaxie', 'Nebel', 'Komet', 'Asteroid', 'Meteorit',
  'Orion', 'Sirius', 'Polaris', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptun',
  // Mythical & Fantasy
  'Phoenix', 'Gryphon', 'Pegasus', 'Einhorn', 'Basilisk', 'Hydra', 'Kraken', 'Leviathan',
  'Valkyrie', 'Vampir', 'Werwolf', 'Zombie', 'Skelett', 'Ghul', 'Dämon', 'Engel', 'Dämon',
  'Zauberer', 'Hexe', 'Magier', 'Alchemist', 'Nekromant', 'Druide', 'Schamane', 'Priester',
  // Action & Movement
  'Sprung', 'Satz', 'Hüpfer', 'Flug', 'Sturz', 'Fall', 'Aufstieg', 'Abstieg', 'Kletterei',
  'Balance', 'Gleichgewicht', 'Stabilität', 'Instabilität', 'Schwung', 'Impuls', 'Momentum',
];

// Difficulty-based name modifiers for more context-aware names
const DIFFICULTY_MODIFIERS: Record<number, string[]> = {
  1: ['Leichter', 'Sanfter', 'Einfacher', 'Milder', 'Zarter', 'Weicher'],
  2: ['Angenehmer', 'Komfortabler', 'Entspannte', 'Ruhige', 'Gelassene'],
  3: ['Mittlere', 'Ausgewogene', 'Stabile', 'Solide', 'Zuverlässige'],
  4: ['Herausfordernde', 'Anspruchsvolle', 'Interessante', 'Spannende'],
  5: ['Schwierige', 'Knifflige', 'Trickreiche', 'Komplexe', 'Verschlungene'],
  6: ['Harte', 'Robuste', 'Widerstandsfähige', 'Zähe', 'Hartnäckige'],
  7: ['Extreme', 'Brutale', 'Gnadenlose', 'Unerbittliche', 'Mörderische'],
  8: ['Legendäre', 'Mythische', 'Epische', 'Ultimative', 'Unmögliche', 'Unvorstellbare'],
};

function toColorAdjective(color: string): string {
  return COLOR_ADJECTIVES[color] || '';
}

function getRandom<T>(arr: T[]): T { 
  return arr[Math.floor(Math.random() * arr.length)]; 
}

export function generateBoulderName(color: string, difficulty: number | null): string {
  const parts: string[] = [];
  const patterns = [
    // Pattern 1: Color + Adjective + Noun (classic)
    () => {
      const colorAdj = toColorAdjective(color);
      if (colorAdj) parts.push(colorAdj);
      parts.push(getRandom(NAME_ADJECTIVES));
      parts.push(getRandom(NAME_NOUNS));
    },
    // Pattern 2: Difficulty modifier + Noun
    () => {
      const modifiers = DIFFICULTY_MODIFIERS[difficulty || 0] || [];
      if (modifiers.length > 0 && Math.random() > 0.5) {
        parts.push(getRandom(modifiers));
      }
      parts.push(getRandom(NAME_NOUNS));
    },
    // Pattern 3: Adjective + Noun (no color)
    () => {
      parts.push(getRandom(NAME_ADJECTIVES));
      parts.push(getRandom(NAME_NOUNS));
    },
    // Pattern 4: Color + Noun (simpler)
    () => {
      const colorAdj = toColorAdjective(color);
      if (colorAdj) parts.push(colorAdj);
      parts.push(getRandom(NAME_NOUNS));
    },
    // Pattern 5: Double adjective + Noun
    () => {
      parts.push(getRandom(NAME_ADJECTIVES));
      parts.push(getRandom(NAME_ADJECTIVES));
      parts.push(getRandom(NAME_NOUNS));
    },
  ];
  
  // Randomly select a pattern
  const selectedPattern = getRandom(patterns);
  selectedPattern();
  
  return parts.join(' ');
}

