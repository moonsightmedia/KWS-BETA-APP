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
// All nouns are masculine (der) for consistent grammar
const NAME_NOUNS: string[] = [
  // Animals (all masculine)
  'Gecko', 'Phantom', 'Panther', 'Meteor', 'Kolibri', 'Specht', 'Saturn', 'Drache', 'Komet', 'Puma',
  'Goblin', 'Adler', 'Wal', 'Berserker', 'Nebel', 'Fuchs', 'Wolf', 'Rätsel', 'Rücken', 'Block',
  'Löwe', 'Tiger', 'Bär', 'Falke', 'Hai', 'Skorpion', 'Käfer', 'Fisch', 'Frosch',
  'Schmetterling', 'Grashüpfer', 'Wurm',
  'Eichhörnchen', 'Hase', 'Igel', 'Dachs', 'Marder', 'Luchs', 'Jaguar', 'Leopard', 'Gepard',
  // Nature & Elements (all masculine)
  'Fels', 'Stein', 'Grat', 'Gipfel', 'Abgrund', 'Canyon',
  'Strom', 'Fluss', 'Wasserfall', 'See', 'Ozean', 'Schaum',
  'Wind', 'Sturm', 'Böe', 'Atem', 'Hauch', 'Brise', 'Wirbel', 'Tornado', 'Hurrikan',
  'Funke', 'Rauch', 'Brand', 'Lavastrom',
  'Frost', 'Hagel', 'Gletscher', 'Eisberg', 'Polareis',
  // Objects & Tools (all masculine)
  'Anker', 'Knoten', 'Haken', 'Nagel', 'Bolzen', 'Dübel',
  'Hammer', 'Meißel', 'Klinge', 'Schwert', 'Dolch', 'Speer', 'Pfeil',
  'Helm', 'Panzer', 'Turm', 'Bastion',
  // Abstract & Mystical (all masculine)
  'Geist', 'Kraft', 'Mut', 'Traum', 'Schatten', 'Echo', 'Klang', 'Ton', 'Rhythmus', 'Takt',
  // Celestial & Space (all masculine)
  'Stern', 'Planet', 'Nebel', 'Komet', 'Asteroid', 'Meteorit',
  'Orion', 'Sirius', 'Polaris', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptun',
  // Mythical & Fantasy (all masculine)
  'Phoenix', 'Gryphon', 'Pegasus', 'Basilisk', 'Kraken', 'Leviathan',
  'Vampir', 'Werwolf', 'Zombie', 'Ghul', 'Dämon', 'Engel',
  'Zauberer', 'Magier', 'Alchemist', 'Nekromant', 'Druide', 'Schamane', 'Priester',
  // Action & Movement (all masculine)
  'Sprung', 'Satz', 'Hüpfer', 'Flug', 'Sturz', 'Fall', 'Aufstieg', 'Abstieg', 'Schwung', 'Impuls', 'Momentum',
];

// Difficulty-based name modifiers for more context-aware names
// All in masculine form (ending with 'er' or 'e') for grammatically correct names
const DIFFICULTY_MODIFIERS: Record<number, string[]> = {
  1: ['Leichter', 'Sanfter', 'Einfacher', 'Milder', 'Zarter', 'Weicher'],
  2: ['Angenehmer', 'Komfortabler', 'Entspannter', 'Ruhiger', 'Gelassener'],
  3: ['Mittlerer', 'Ausgewogener', 'Stabiler', 'Solider', 'Zuverlässiger'],
  4: ['Herausfordernder', 'Anspruchsvoller', 'Interessanter', 'Spannender'],
  5: ['Schwieriger', 'Kniffliger', 'Trickreicher', 'Komplexer', 'Verschlungener'],
  6: ['Harter', 'Robuster', 'Widerstandsfähiger', 'Zäher', 'Hartnäckiger'],
  7: ['Extremer', 'Brutaler', 'Gnadenloser', 'Unerbittlicher', 'Mörderischer'],
  8: ['Legendärer', 'Mythischer', 'Epischer', 'Ultimativer', 'Unmöglicher', 'Unvorstellbarer'],
};

function toColorAdjective(color: string): string {
  return COLOR_ADJECTIVES[color] || '';
}

function getRandom<T>(arr: T[]): T { 
  return arr[Math.floor(Math.random() * arr.length)]; 
}

// Helper to ensure grammatically correct adjective forms for masculine nouns
// All nouns in NAME_NOUNS are masculine, so adjectives should end with 'er' or 'e' (masculine nominative)
function ensureMasculineForm(adjective: string): string {
  // Most adjectives already end with 'er' which is correct for masculine nouns
  // Some end with 'e' which is also correct
  // If it ends with something else, we might need to adjust, but for now keep as is
  return adjective;
}

export function generateBoulderName(color: string, difficulty: number | null): string {
  const parts: string[] = [];
  const colorAdj = toColorAdjective(color);
  
  if (!colorAdj) {
    // Fallback if color not found
    return getRandom(NAME_ADJECTIVES) + ' ' + getRandom(NAME_NOUNS);
  }
  
  const patterns = [
    // Pattern 1: Color + Adjective + Noun (classic, most common)
    () => {
      parts.push(colorAdj);
      parts.push(ensureMasculineForm(getRandom(NAME_ADJECTIVES)));
      parts.push(getRandom(NAME_NOUNS));
    },
    // Pattern 2: Color + Difficulty modifier + Noun
    () => {
      parts.push(colorAdj);
      const modifiers = DIFFICULTY_MODIFIERS[difficulty || 0] || [];
      if (modifiers.length > 0) {
        parts.push(ensureMasculineForm(getRandom(modifiers)));
      } else {
        parts.push(ensureMasculineForm(getRandom(NAME_ADJECTIVES)));
      }
      parts.push(getRandom(NAME_NOUNS));
    },
    // Pattern 3: Color + Noun (simpler, but still creative)
    () => {
      parts.push(colorAdj);
      parts.push(getRandom(NAME_NOUNS));
    },
    // Pattern 4: Color + Adjective + Adjective + Noun (double adjective for creativity)
    () => {
      parts.push(colorAdj);
      parts.push(ensureMasculineForm(getRandom(NAME_ADJECTIVES)));
      parts.push(ensureMasculineForm(getRandom(NAME_ADJECTIVES)));
      parts.push(getRandom(NAME_NOUNS));
    },
    // Pattern 5: Color + Adjective + Noun (with difficulty context)
    () => {
      parts.push(colorAdj);
      // Mix difficulty modifier with regular adjective
      const modifiers = DIFFICULTY_MODIFIERS[difficulty || 0] || [];
      if (modifiers.length > 0 && Math.random() > 0.3) {
        parts.push(ensureMasculineForm(getRandom(modifiers)));
      } else {
        parts.push(ensureMasculineForm(getRandom(NAME_ADJECTIVES)));
      }
      parts.push(getRandom(NAME_NOUNS));
    },
    // Pattern 6: Color + Creative compound (adjective + noun combination)
    () => {
      parts.push(colorAdj);
      // Create more creative combinations
      const creativeAdjectives = ['Mystischer', 'Geheimer', 'Verlorener', 'Wilder', 'Kühner', 'Listiger'];
      parts.push(ensureMasculineForm(getRandom(creativeAdjectives)));
      parts.push(getRandom(NAME_NOUNS));
    },
  ];
  
  // Randomly select a pattern (weighted towards more creative patterns)
  const weights = [0.25, 0.20, 0.15, 0.15, 0.15, 0.10]; // Pattern 1 most common, Pattern 6 least common
  let random = Math.random();
  let selectedIndex = 0;
  let cumulativeWeight = 0;
  
  for (let i = 0; i < patterns.length; i++) {
    cumulativeWeight += weights[i];
    if (random <= cumulativeWeight) {
      selectedIndex = i;
      break;
    }
  }
  
  const selectedPattern = patterns[selectedIndex];
  selectedPattern();
  
  return parts.join(' ');
}

