import { COVERAGE, TYPES, type PokeType } from "./types";

export type StatKey = "atk" | "def" | "spa" | "spd" | "spe";
export type Status = "brn" | "psn" | "par" | "slp" | "frz";
export type Category = "physical" | "special";

export interface Move {
  name: string;
  type: PokeType;
  power: number;
  category: Category;
  accuracy: number; // 0 means it never misses
  priority?: number;
  contact?: boolean;
  punch?: boolean;
  bite?: boolean;
  sound?: boolean;
  bullet?: boolean;
  pulse?: boolean;
  slicing?: boolean;
  highCrit?: boolean;
  recoil?: number; // fraction of damage dealt
  drain?: number; // fraction of damage dealt
  // Chance-based effect on the target (removed by Sheer Force, blocked by Shield Dust).
  secondary?: { chance: number; status?: Status; flinch?: boolean; stat?: [StatKey, number] };
  // Guaranteed effect on the user (Close Combat's drops).
  self?: [StatKey, number][];
}

type MoveDef = Omit<Move, "type" | "category">;

const PHYSICAL: Record<PokeType, MoveDef> = {
  normal: { name: "Body Slam", power: 85, accuracy: 100, contact: true, secondary: { chance: 30, status: "par" } },
  fire: { name: "Flare Blitz", power: 120, accuracy: 100, contact: true, recoil: 1 / 3, secondary: { chance: 10, status: "brn" } },
  water: { name: "Waterfall", power: 80, accuracy: 100, contact: true, secondary: { chance: 20, flinch: true } },
  electric: { name: "Thunder Punch", power: 75, accuracy: 100, contact: true, punch: true, secondary: { chance: 10, status: "par" } },
  grass: { name: "Seed Bomb", power: 80, accuracy: 100, bullet: true },
  ice: { name: "Ice Punch", power: 75, accuracy: 100, contact: true, punch: true, secondary: { chance: 10, status: "frz" } },
  fighting: { name: "Close Combat", power: 120, accuracy: 100, contact: true, self: [["def", -1], ["spd", -1]] },
  poison: { name: "Poison Jab", power: 80, accuracy: 100, contact: true, secondary: { chance: 30, status: "psn" } },
  ground: { name: "Earthquake", power: 100, accuracy: 100 },
  flying: { name: "Brave Bird", power: 120, accuracy: 100, contact: true, recoil: 1 / 3 },
  psychic: { name: "Zen Headbutt", power: 80, accuracy: 90, contact: true, secondary: { chance: 20, flinch: true } },
  bug: { name: "X-Scissor", power: 80, accuracy: 100, contact: true, slicing: true },
  rock: { name: "Rock Slide", power: 75, accuracy: 90, secondary: { chance: 30, flinch: true } },
  ghost: { name: "Shadow Claw", power: 70, accuracy: 100, contact: true, highCrit: true },
  dragon: { name: "Dragon Claw", power: 80, accuracy: 100, contact: true },
  dark: { name: "Crunch", power: 80, accuracy: 100, contact: true, bite: true, secondary: { chance: 20, stat: ["def", -1] } },
  steel: { name: "Iron Head", power: 80, accuracy: 100, contact: true, secondary: { chance: 30, flinch: true } },
  fairy: { name: "Play Rough", power: 90, accuracy: 90, contact: true, secondary: { chance: 10, stat: ["atk", -1] } },
};

const SPECIAL: Record<PokeType, MoveDef> = {
  normal: { name: "Hyper Voice", power: 90, accuracy: 100, sound: true },
  fire: { name: "Flamethrower", power: 90, accuracy: 100, secondary: { chance: 10, status: "brn" } },
  water: { name: "Surf", power: 90, accuracy: 100 },
  electric: { name: "Thunderbolt", power: 90, accuracy: 100, secondary: { chance: 10, status: "par" } },
  grass: { name: "Energy Ball", power: 90, accuracy: 100, bullet: true, secondary: { chance: 10, stat: ["spd", -1] } },
  ice: { name: "Ice Beam", power: 90, accuracy: 100, secondary: { chance: 10, status: "frz" } },
  fighting: { name: "Aura Sphere", power: 80, accuracy: 0, bullet: true, pulse: true },
  poison: { name: "Sludge Bomb", power: 90, accuracy: 100, bullet: true, secondary: { chance: 30, status: "psn" } },
  ground: { name: "Earth Power", power: 90, accuracy: 100, secondary: { chance: 10, stat: ["spd", -1] } },
  flying: { name: "Air Slash", power: 75, accuracy: 95, slicing: true, secondary: { chance: 30, flinch: true } },
  psychic: { name: "Psychic", power: 90, accuracy: 100, secondary: { chance: 10, stat: ["spd", -1] } },
  bug: { name: "Bug Buzz", power: 90, accuracy: 100, sound: true, secondary: { chance: 10, stat: ["spd", -1] } },
  rock: { name: "Power Gem", power: 80, accuracy: 100 },
  ghost: { name: "Shadow Ball", power: 80, accuracy: 100, bullet: true, secondary: { chance: 20, stat: ["spd", -1] } },
  dragon: { name: "Dragon Pulse", power: 85, accuracy: 100, pulse: true },
  dark: { name: "Dark Pulse", power: 80, accuracy: 100, pulse: true, secondary: { chance: 20, flinch: true } },
  steel: { name: "Flash Cannon", power: 80, accuracy: 100, secondary: { chance: 10, stat: ["spd", -1] } },
  fairy: { name: "Moonblast", power: 95, accuracy: 100, secondary: { chance: 30, stat: ["spa", -1] } },
};

// Moves that suit a particular ability better than the default for that type.
const ABILITY_VARIANTS: Record<string, Partial<Record<`${Category}:${PokeType}`, MoveDef>>> = {
  "iron-fist": {
    "physical:fire": { name: "Fire Punch", power: 75, accuracy: 100, contact: true, punch: true, secondary: { chance: 10, status: "brn" } },
    "physical:fighting": { name: "Drain Punch", power: 75, accuracy: 100, contact: true, punch: true, drain: 0.5 },
  },
  "strong-jaw": {
    "physical:fire": { name: "Fire Fang", power: 65, accuracy: 95, contact: true, bite: true, secondary: { chance: 10, status: "brn" } },
    "physical:ice": { name: "Ice Fang", power: 65, accuracy: 95, contact: true, bite: true, secondary: { chance: 10, status: "frz" } },
    "physical:electric": { name: "Thunder Fang", power: 65, accuracy: 95, contact: true, bite: true, secondary: { chance: 10, status: "par" } },
    "physical:psychic": { name: "Psychic Fangs", power: 85, accuracy: 100, contact: true, bite: true },
  },
  "mega-launcher": {
    "special:water": { name: "Water Pulse", power: 60, accuracy: 100, pulse: true },
  },
  sharpness: {
    "physical:grass": { name: "Leaf Blade", power: 90, accuracy: 100, contact: true, slicing: true, highCrit: true },
    "physical:water": { name: "Aqua Cutter", power: 70, accuracy: 100, slicing: true, highCrit: true },
    "physical:fighting": { name: "Sacred Sword", power: 90, accuracy: 100, contact: true, slicing: true },
  },
  reckless: {
    "physical:normal": { name: "Double-Edge", power: 120, accuracy: 100, contact: true, recoil: 1 / 3 },
  },
  "punk-rock": {
    "special:electric": { name: "Overdrive", power: 80, accuracy: 100, sound: true },
  },
};

function makeMove(type: PokeType, category: Category, ability: string): Move {
  const def =
    ABILITY_VARIANTS[ability]?.[`${category}:${type}`] ?? (category === "physical" ? PHYSICAL : SPECIAL)[type];
  return { ...def, type, category };
}

// A weak Normal move for the last slot: priority for physical attackers,
// a sure hit for special ones (or a sound move for Punk Rock).
function fillerMove(category: Category, ability: string): Move {
  if (category === "physical") {
    return { name: "Quick Attack", type: "normal", category, power: 40, accuracy: 100, priority: 1, contact: true };
  }
  if (ability === "punk-rock") return makeMove("normal", "special", ability);
  return { name: "Swift", type: "normal", category, power: 60, accuracy: 0 };
}

// Every Pokémon gets exactly four moves: one per own type, coverage moves to
// fill the gaps, and a Normal move as the last slot when there's room.
export function buildMoves(id: number, types: PokeType[], category: Category, ability: string): Move[] {
  const moves = types.map((t) => makeMove(t, category, ability));
  const used = new Set<PokeType>(types);
  const wantsFiller = !used.has("normal");
  const coverageSlots = 4 - moves.length - (wantsFiller ? 1 : 0);
  used.add("normal");

  // Rotate by species id so the same Pokémon always has the same set,
  // while two Pokémon of the same type can still differ.
  const pool = [...new Set([...types.flatMap((t) => COVERAGE[t]), ...TYPES])].filter((t) => !used.has(t));
  const start = id % Math.min(pool.length, 3);
  const ordered = [...pool.slice(start), ...pool.slice(0, start)];
  for (const cover of ordered.slice(0, coverageSlots)) moves.push(makeMove(cover, category, ability));

  if (wantsFiller) moves.push(fillerMove(category, ability));
  return moves;
}
