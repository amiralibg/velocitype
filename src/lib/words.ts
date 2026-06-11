import type { Difficulty } from './types';

/* ------------------------------------------------------------------ */
/* Sentence pools — used by Classic and Disappearing Text modes        */
/* ------------------------------------------------------------------ */

export const SENTENCES: Record<Difficulty, string[]> = {
  easy: [
    'The cat sat on the warm windowsill all day.',
    'A red bird flew over the quiet lake.',
    'She put the keys on the small table.',
    'The sun rose over the green hills.',
    'He ran fast to catch the last bus.',
    'The dog dug a hole in the sand.',
    'We ate fresh bread with sweet jam.',
    'The moon was bright in the dark sky.',
    'A soft wind moved the tall grass.',
    'They sang old songs by the fire.',
    'The boat drifted slowly down the river.',
    'I found a shiny coin on the path.',
    'Rain fell softly on the tin roof.',
    'The kids played games in the park.',
    'She drew a map of the old town.',
    'A fox hid behind the mossy rock.',
    'The clock on the wall ticked loudly.',
    'He poured cold milk into the glass.',
  ],
  medium: [
    'The library smelled of old paper and quiet afternoons.',
    'Lightning flickered across the horizon as the storm gathered strength.',
    'She balanced the tray of glasses while weaving through the crowd.',
    'The mechanic listened carefully to the engine before naming the problem.',
    'Autumn leaves spiraled down onto the cobblestone streets of the village.',
    'A curious raccoon inspected the campsite while everyone was asleep.',
    'The violinist practiced the same difficult passage until midnight.',
    'Fresh snow muffled every sound in the sleeping mountain town.',
    'The detective noticed a single muddy footprint near the doorway.',
    'Waves crashed against the lighthouse as gulls circled overhead.',
    'He sketched the skyline from the rooftop of the old hotel.',
    'The bakery filled the entire street with the smell of cinnamon.',
    'Her telescope revealed craters scattered across the lunar surface.',
    'The train rattled through tunnels carved deep into the mountains.',
    'Gardeners planted rows of tulips along the museum entrance.',
    'The chess players studied the board in complete silence.',
    'A gentle current carried the canoe past willow trees and reeds.',
    'The orchestra tuned their instruments as the lights dimmed slowly.',
  ],
  hard: [
    'The archaeologist catalogued each fragment meticulously, knowing that a single mislabeled shard could unravel years of research.',
    'Quantum mechanics suggests that particles exist in superposition until an observation collapses their possibilities into one.',
    'Despite the bureaucracy, the engineers persevered, redesigning the suspension bridge to withstand extraordinary seismic activity.',
    'The philharmonic conductor demanded precision, yet encouraged spontaneity whenever the symphony reached its crescendo.',
    "Juxtaposed against the city's glittering skyline, the abandoned factory seemed like a monument to a forgotten ambition.",
    'Cryptographers scrutinized the intercepted transmission, searching for patterns hidden within seemingly random sequences.',
    'The entrepreneur acknowledged that resilience, not brilliance, had ultimately distinguished her company from its competitors.',
    'Photosynthesis transforms carbon dioxide and water into glucose, releasing the oxygen that sustains complex life.',
    'The manuscript contained marginalia in three languages, suggesting an itinerant scholar with eclectic obsessions.',
    'Meteorologists hypothesized that the anomalous pressure system would dissipate before reaching the archipelago.',
    'His handwriting deteriorated noticeably whenever the deadline approached, a phenomenon his editor found simultaneously amusing and alarming.',
    'The negotiation collapsed at midnight, jeopardizing decades of diplomacy between the neighboring republics.',
    'Bioluminescent organisms illuminated the abyssal trench, indifferent to the submersible drifting silently above them.',
    'The jury deliberated for eleven hours, wrestling with contradictory testimony and circumstantial evidence.',
    'Renaissance cartographers embellished unexplored territories with sea monsters, disguising ignorance as ornamentation.',
    'The algorithm prioritized efficiency over readability, a trade-off that haunted every subsequent maintainer.',
    'Volcanologists monitored the caldera continuously, interpreting tremors that preceded each eruption.',
    'Her dissertation examined how vernacular architecture adapts ingeniously to inhospitable climates.',
  ],
};

/* ------------------------------------------------------------------ */
/* Short sentences for Race mode — all under 10 words                  */
/* ------------------------------------------------------------------ */

export const RACE_SENTENCES: string[] = [
  'The engine roared down the back straight.',
  'Shift gears and hold the racing line.',
  'Tires screamed through the hairpin turn.',
  'The pit crew worked with perfect speed.',
  'Sparks flew as the cars touched.',
  'He braked late into the chicane.',
  'The crowd cheered from the grandstand.',
  'Fuel light blinked on the dashboard.',
  'Rain made the track slick and fast.',
  'She took the inside line to pass.',
  'The flag dropped and they launched.',
  'Heat shimmered above the asphalt.',
  'Victory was only one lap away.',
  'The rival car filled his mirrors.',
  'Smooth inputs win the long race.',
  'Downforce pinned the car to the road.',
  'A bold move sealed the overtake.',
  'The final corner decided everything.',
  'Momentum is everything on the oval.',
  'Keep calm and trust the brakes.',
];

/* ------------------------------------------------------------------ */
/* Word pools by length — used by Boss Fight mode                      */
/* ------------------------------------------------------------------ */

export const WORDS = {
  short: [
    'cat', 'dog', 'sun', 'run', 'map', 'key', 'pen', 'cup', 'box', 'car',
    'bus', 'hat', 'red', 'top', 'win', 'zip', 'art', 'ice', 'owl', 'egg',
    'sky', 'sea', 'fog', 'rain', 'wind', 'fire', 'blue', 'gold', 'fast', 'slow',
    'jump', 'walk', 'talk', 'sing', 'bird', 'fish', 'tree', 'leaf', 'rock', 'sand',
    'wave', 'moon', 'star', 'door', 'wall', 'roof', 'game', 'code', 'type', 'word',
    'page', 'book', 'desk', 'lamp', 'ring', 'king', 'ship', 'boat', 'road', 'path',
    'hill', 'lake', 'pond', 'mist', 'snow', 'heat', 'cold', 'warm', 'cool', 'soft',
    'hard', 'dark', 'dawn', 'dusk', 'echo', 'gift', 'hope', 'idea', 'joke', 'kite',
    'lion', 'mint', 'nest', 'oven', 'pearl', 'quiz', 'vine', 'yarn', 'zest', 'storm',
  ],
  medium: [
    'window', 'garden', 'silver', 'branch', 'market', 'basket', 'candle', 'dragon',
    'gentle', 'hammer', 'island', 'jacket', 'kitten', 'ladder', 'magnet', 'narrow',
    'orange', 'pencil', 'quartz', 'rabbit', 'sailor', 'talent', 'united', 'valley',
    'walnut', 'yellow', 'zigzag', 'anchor', 'bridge', 'castle', 'danger', 'engine',
    'forest', 'guitar', 'harbor', 'insect', 'jungle', 'knight', 'meadow', 'needle',
    'outlaw', 'planet', 'quiver', 'rocket', 'shadow', 'temple', 'umpire', 'velvet',
    'wander', 'breeze', 'canyon', 'donkey', 'embers', 'feather', 'glacier', 'horizon',
    'inkwell', 'journey', 'keyhole', 'lantern', 'monsoon', 'notable', 'pageant', 'quibble',
    'rhythm', 'saddle', 'thunder', 'upwards', 'vortex', 'whisper', 'bicycle', 'blanket',
    'cabinet', 'diamond', 'factory', 'gallery', 'hallway', 'journal', 'kingdom', 'library',
    'machine', 'network', 'obscure', 'pattern', 'quality', 'reverse', 'station', 'triumph',
    'upgrade', 'village', 'warrior', 'crystal', 'mystery', 'phantom', 'volcano', 'whistle',
  ],
  long: [
    'accomplish', 'adventure', 'algorithm', 'ambitious', 'astronaut', 'atmosphere',
    'authentic', 'beautiful', 'boulevard', 'brilliance', 'calculator', 'catastrophe',
    'celebration', 'challenge', 'chandelier', 'combination', 'communicate', 'complexity',
    'conclusion', 'confidence', 'consequence', 'coordinate', 'courageous', 'curiosity',
    'dangerous', 'dedication', 'determined', 'dictionary', 'difference', 'discovery',
    'education', 'electricity', 'environment', 'exceptional', 'excitement', 'experience',
    'explanation', 'fascinating', 'foundation', 'generation', 'happiness', 'hypothesis',
    'imagination', 'impossible', 'incredible', 'ingredient', 'innovation', 'inspiration',
    'instrument', 'intelligent', 'journalist', 'kaleidoscope', 'knowledge', 'laboratory',
    'landscape', 'legendary', 'lighthouse', 'machinery', 'magnificent', 'mathematics',
    'microscope', 'mysterious', 'navigation', 'observation', 'opportunity', 'orchestra',
    'perspective', 'phenomenon', 'philosophy', 'photograph', 'playground', 'prediction',
    'professional', 'programming', 'reflection', 'remarkable', 'restaurant', 'revolution',
    'satellite', 'scientific', 'spectacular', 'strawberry', 'technology', 'telescope',
    'temperature', 'tournament', 'typewriter', 'understand', 'university', 'vocabulary',
    'volunteer', 'wilderness', 'wonderful', 'xylophone', 'yesterday', 'constellation',
  ],
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomSentence(difficulty: Difficulty): string {
  return pick(SENTENCES[difficulty]);
}

/** A 2–3 sentence paragraph for Classic mode. */
export function classicParagraph(difficulty: Difficulty): string {
  const pool = [...SENTENCES[difficulty]];
  const count = difficulty === 'easy' ? 3 : 2;
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    parts.push(pool.splice(idx, 1)[0]);
  }
  return parts.join(' ');
}

export function randomRaceSentence(): string {
  return pick(RACE_SENTENCES);
}

/**
 * Boss mode word, scaled by remaining boss HP (1 = full, 0 = dead)
 * and by difficulty. Words get longer as the boss weakens.
 */
export function bossWord(hpFraction: number, difficulty: Difficulty): string {
  // 0 = short pool, 1 = medium, 2 = long
  let tier = hpFraction > 0.66 ? 0 : hpFraction > 0.33 ? 1 : 2;
  if (difficulty === 'easy') tier = Math.max(0, tier - 1);
  if (difficulty === 'hard') tier = Math.min(2, tier + 1);
  const pool = tier === 0 ? WORDS.short : tier === 1 ? WORDS.medium : WORDS.long;
  return pick(pool);
}
