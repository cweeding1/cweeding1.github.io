export const TYPES = [
  "normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground",
  "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy",
] as const;

export type PokeType = (typeof TYPES)[number];

interface Matchups {
  super?: PokeType[];
  weak?: PokeType[];
  immune?: PokeType[];
}

// Attacking type -> how it fares against each defending type.
const CHART: Record<PokeType, Matchups> = {
  normal: { weak: ["rock", "steel"], immune: ["ghost"] },
  fire: { super: ["grass", "ice", "bug", "steel"], weak: ["fire", "water", "rock", "dragon"] },
  water: { super: ["fire", "ground", "rock"], weak: ["water", "grass", "dragon"] },
  electric: { super: ["water", "flying"], weak: ["electric", "grass", "dragon"], immune: ["ground"] },
  grass: { super: ["water", "ground", "rock"], weak: ["fire", "grass", "poison", "flying", "bug", "dragon", "steel"] },
  ice: { super: ["grass", "ground", "flying", "dragon"], weak: ["fire", "water", "ice", "steel"] },
  fighting: { super: ["normal", "ice", "rock", "dark", "steel"], weak: ["poison", "flying", "psychic", "bug", "fairy"], immune: ["ghost"] },
  poison: { super: ["grass", "fairy"], weak: ["poison", "ground", "rock", "ghost"], immune: ["steel"] },
  ground: { super: ["fire", "electric", "poison", "rock", "steel"], weak: ["grass", "bug"], immune: ["flying"] },
  flying: { super: ["grass", "fighting", "bug"], weak: ["electric", "rock", "steel"] },
  psychic: { super: ["fighting", "poison"], weak: ["psychic", "steel"], immune: ["dark"] },
  bug: { super: ["grass", "psychic", "dark"], weak: ["fire", "fighting", "poison", "flying", "ghost", "steel", "fairy"] },
  rock: { super: ["fire", "ice", "flying", "bug"], weak: ["fighting", "ground", "steel"] },
  ghost: { super: ["psychic", "ghost"], weak: ["dark"], immune: ["normal"] },
  dragon: { super: ["dragon"], weak: ["steel"], immune: ["fairy"] },
  dark: { super: ["psychic", "ghost"], weak: ["fighting", "dark", "fairy"] },
  steel: { super: ["ice", "rock", "fairy"], weak: ["fire", "water", "electric", "steel"] },
  fairy: { super: ["fighting", "dragon", "dark"], weak: ["fire", "poison", "steel"] },
};

export function effectiveness(attack: PokeType, defenders: PokeType[]): number {
  const m = CHART[attack];
  return defenders.reduce((mult, def) => {
    if (m.immune?.includes(def)) return 0;
    if (m.super?.includes(def)) return mult * 2;
    if (m.weak?.includes(def)) return mult * 0.5;
    return mult;
  }, 1);
}

// One signature move per type. Physical or special is decided by the user's
// stronger attack stat, so a single name per type is enough.
export const TYPE_MOVES: Record<PokeType, string> = {
  normal: "Body Slam",
  fire: "Flamethrower",
  water: "Surf",
  electric: "Thunderbolt",
  grass: "Energy Ball",
  ice: "Ice Beam",
  fighting: "Close Combat",
  poison: "Sludge Bomb",
  ground: "Earthquake",
  flying: "Air Slash",
  psychic: "Psychic",
  bug: "X-Scissor",
  rock: "Rock Slide",
  ghost: "Shadow Ball",
  dragon: "Dragon Pulse",
  dark: "Crunch",
  steel: "Iron Head",
  fairy: "Moonblast",
};

// What each type tends to pick up as a coverage move.
export const COVERAGE: Record<PokeType, PokeType[]> = {
  normal: ["ground", "fighting", "ghost"],
  fire: ["ground", "dragon", "fighting"],
  water: ["ice", "ground", "dark"],
  electric: ["ice", "grass", "steel"],
  grass: ["ground", "poison", "dark"],
  ice: ["water", "ground", "dark"],
  fighting: ["rock", "dark", "ground"],
  poison: ["ground", "dark", "fire"],
  ground: ["rock", "fire", "dark"],
  flying: ["steel", "ground", "fire"],
  psychic: ["fighting", "fairy", "ghost"],
  bug: ["rock", "fighting", "poison"],
  rock: ["ground", "steel", "fighting"],
  ghost: ["dark", "fighting", "poison"],
  dragon: ["fire", "ground", "steel"],
  dark: ["fighting", "poison", "fire"],
  steel: ["ground", "fighting", "fire"],
  fairy: ["fire", "psychic", "ice"],
};
