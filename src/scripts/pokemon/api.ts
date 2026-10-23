import { COVERAGE, TYPE_MOVES, type PokeType } from "./types";

const API = "https://pokeapi.co/api/v2";
const LEVEL = 50;

export interface Move {
  name: string;
  type: PokeType;
  power: number;
}

export interface Battler {
  id: number;
  name: string;
  types: PokeType[];
  front: string;
  back: string;
  maxHp: number;
  hp: number;
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
  moves: Move[];
}

interface ApiPokemon {
  id: number;
  name: string;
  types: { slot: number; type: { name: PokeType } }[];
  stats: { base_stat: number; stat: { name: string } }[];
  sprites: {
    front_default: string | null;
    back_default: string | null;
    other?: { "official-artwork"?: { front_default: string | null } };
  };
}

const cache = new Map<string, Promise<ApiPokemon>>();

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`PokéAPI ${res.status} for ${url}`);
  return res.json() as Promise<T>;
}

export function fetchPokemon(nameOrId: string | number): Promise<ApiPokemon> {
  const key = String(nameOrId).trim().toLowerCase().replace(/\s+/g, "-");
  let p = cache.get(key);
  if (!p) {
    p = getJson<ApiPokemon>(`${API}/pokemon/${key}`);
    p.catch(() => cache.delete(key));
    cache.set(key, p);
  }
  return p;
}

let namesPromise: Promise<string[]> | undefined;

// Default forms only; alternate forms (megas, regionals) have ids above 10000.
export function fetchAllNames(): Promise<string[]> {
  namesPromise ??= getJson<{ results: { name: string }[] }>(`${API}/pokemon?limit=1025`).then((d) =>
    d.results.map((r) => r.name),
  );
  return namesPromise;
}

export const MAX_DEX = 1025;

function statAt50(base: number): number {
  return Math.floor(((2 * base + 31) * LEVEL) / 100) + 5;
}

function hpAt50(base: number): number {
  return Math.floor(((2 * base + 31) * LEVEL) / 100) + LEVEL + 10;
}

function buildMoves(id: number, types: PokeType[]): Move[] {
  const moves: Move[] = types.map((type) => ({ name: TYPE_MOVES[type], type, power: 90 }));
  // A deterministic coverage move per species so the same Pokémon always has the same set.
  const options = COVERAGE[types[0]].filter((t) => !types.includes(t));
  const cover = options[id % options.length];
  if (cover) moves.push({ name: TYPE_MOVES[cover], type: cover, power: 80 });
  if (!types.includes("normal")) moves.push({ name: "Quick Strike", type: "normal", power: 60 });
  return moves.slice(0, 4);
}

export function toBattler(p: ApiPokemon): Battler {
  const base = Object.fromEntries(p.stats.map((s) => [s.stat.name, s.base_stat]));
  const types = [...p.types].sort((a, b) => a.slot - b.slot).map((t) => t.type.name);
  const front = p.sprites.front_default ?? p.sprites.other?.["official-artwork"]?.front_default ?? "";
  const maxHp = hpAt50(base.hp);
  return {
    id: p.id,
    name: p.name,
    types,
    front,
    back: p.sprites.back_default ?? "",
    maxHp,
    hp: maxHp,
    attack: statAt50(base.attack),
    defense: statAt50(base.defense),
    spAttack: statAt50(base["special-attack"]),
    spDefense: statAt50(base["special-defense"]),
    speed: statAt50(base.speed),
    moves: buildMoves(p.id, types),
  };
}

export function displayName(name: string): string {
  return name
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
