import { pickAbility } from "./abilities";
import { buildMoves, type Move, type StatKey } from "./moves";
import type { PokeType } from "./types";

const API = "https://pokeapi.co/api/v2";
export const LEVEL = 50;

// Every stat is trained to its ceiling: perfect IVs and maximum EVs in each
// one (deliberately ignoring the games' 510 total EV cap).
const IV = 31;
const EV = 252;

export interface Battler {
  id: number;
  name: string;
  types: PokeType[];
  front: string;
  back: string;
  maxHp: number;
  hp: number;
  stats: Record<StatKey, number>;
  ability: string;
  abilityDesc: string;
  moves: Move[];
}

interface ApiPokemon {
  id: number;
  name: string;
  types: { slot: number; type: { name: PokeType } }[];
  stats: { base_stat: number; stat: { name: string } }[];
  abilities: { ability: { name: string }; is_hidden: boolean }[];
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

export const MAX_DEX = 1025;

const trained = (base: number) => Math.floor(((2 * base + IV + Math.floor(EV / 4)) * LEVEL) / 100);
const statAt50 = (base: number) => trained(base) + 5;
// Shedinja always has exactly 1 HP.
const hpAt50 = (base: number) => (base === 1 ? 1 : trained(base) + LEVEL + 10);

export function toBattler(p: ApiPokemon): Battler {
  const base = Object.fromEntries(p.stats.map((s) => [s.stat.name, s.base_stat]));
  const types = [...p.types].sort((a, b) => a.slot - b.slot).map((t) => t.type.name);
  const front = p.sprites.front_default ?? p.sprites.other?.["official-artwork"]?.front_default ?? "";
  const ability = pickAbility(p.abilities.map((a) => ({ name: a.ability.name, hidden: a.is_hidden })));
  const stats = {
    atk: statAt50(base.attack),
    def: statAt50(base.defense),
    spa: statAt50(base["special-attack"]),
    spd: statAt50(base["special-defense"]),
    spe: statAt50(base.speed),
  };
  // Attack with whichever side is stronger, counting abilities that double Attack.
  const atkPower = stats.atk * (["huge-power", "pure-power"].includes(ability.name) ? 2 : 1);
  const category = atkPower >= stats.spa ? "physical" : "special";
  const maxHp = hpAt50(base.hp);
  return {
    id: p.id,
    name: p.name,
    types,
    front,
    back: p.sprites.back_default ?? "",
    maxHp,
    hp: maxHp,
    stats,
    ability: ability.name,
    abilityDesc: ability.desc,
    moves: buildMoves(p.id, types, category, ability.name),
  };
}

export function displayName(name: string): string {
  return name
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
