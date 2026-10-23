import { displayName, LEVEL, type Battler } from "./api";
import { ABILITIES } from "./abilities";
import type { Move, StatKey, Status } from "./moves";
import { effectiveness, type PokeType } from "./types";

export type Side = "player" | "foe";
export type Weather = "rain" | "sun" | "sand" | "snow";
export type Terrain = "electric" | "grassy" | "psychic" | "misty";

export type Action = { kind: "move"; index: number } | { kind: "switch"; to: number };

export type BattleEvent =
  | { type: "text"; text: string }
  | { type: "attack"; side: Side }
  | { type: "hp"; side: Side; index: number; hp: number; delta: number }
  | { type: "status"; side: Side; index: number; status: Status | null }
  | { type: "faint"; side: Side; index: number }
  | { type: "switch"; side: Side; index: number; hp: number; status: Status | null }
  | { type: "field"; weather: Weather | null; terrain: Terrain | null };

// Per-battle state layered on top of a Battler.
export interface Mon extends Battler {
  baseTypes: PokeType[];
  baseAbility: string;
  status: Status | null;
  sleepTurns: number;
  stages: Record<StatKey, number>;
  flashFire: boolean;
  proteanUsed: boolean;
  blade: boolean;
  disguised: boolean;
  iceFace: boolean;
  loafing: boolean;
  turnsOut: number;
  enteredThisTurn: boolean;
  flinched: boolean;
}

const STAT_NAMES: Record<StatKey, string> = {
  atk: "Attack",
  def: "Defense",
  spa: "Sp. Atk",
  spd: "Sp. Def",
  spe: "Speed",
};

const STATUS_TEXT: Record<Status, string> = {
  brn: "was burned",
  psn: "was poisoned",
  par: "is paralyzed! It may be unable to move",
  slp: "fell asleep",
  frz: "was frozen solid",
};

// Defensive abilities that Mold Breaker and friends ignore.
const BREAKABLE = new Set([
  "levitate", "flash-fire", "water-absorb", "volt-absorb", "earth-eater", "storm-drain", "lightning-rod",
  "sap-sipper", "motor-drive", "well-baked-body", "thick-fat", "heatproof", "purifying-salt", "fluffy",
  "ice-scales", "multiscale", "filter", "solid-rock", "fur-coat", "marvel-scale", "sturdy", "wonder-guard",
  "bulletproof", "soundproof", "unaware", "shell-armor", "battle-armor", "shield-dust", "inner-focus",
  "clear-body", "white-smoke", "hyper-cutter", "big-pecks", "dry-skin", "water-bubble", "punk-rock",
  "disguise", "ice-face", "sand-veil", "snow-cloak", "limber", "immunity", "insomnia", "vital-spirit",
  "sweet-veil", "water-veil", "thermal-exchange", "magma-armor", "leaf-guard", "flower-gift", "contrary", "simple",
]);

const MOLD_BREAKERS = new Set(["mold-breaker", "teravolt", "turboblaze"]);

const UNTRACEABLE = new Set([
  "trace", "multitype", "stance-change", "schooling", "disguise", "comatose", "illusion", "zero-to-hero",
  "shields-down", "rks-system", "ice-face", "gulp-missile", "hunger-switch", "tera-shift", "as-one-glastrier",
  "as-one-spectrier", "power-of-alchemy", "receiver", "flower-gift", "forecast", "imposter",
]);

const STAT_BLOCKERS = new Set(["clear-body", "white-smoke", "full-metal-body"]);
const INTIMIDATE_BLOCKERS = new Set(["inner-focus", "oblivious", "own-tempo", "scrappy"]);

const TYPE_BOOSTERS: Record<string, [PokeType, number]> = {
  transistor: ["electric", 1.3],
  "dragons-maw": ["dragon", 1.5],
  steelworker: ["steel", 1.5],
  "rocky-payload": ["rock", 1.5],
  "water-bubble": ["water", 2],
};

const PINCH: Record<string, PokeType> = { blaze: "fire", torrent: "water", overgrow: "grass", swarm: "bug" };

const ATE: Record<string, PokeType> = {
  pixilate: "fairy",
  refrigerate: "ice",
  aerilate: "flying",
  galvanize: "electric",
};

const WEATHER_SPEED: Record<string, Weather> = {
  "swift-swim": "rain",
  chlorophyll: "sun",
  "sand-rush": "sand",
  "slush-rush": "snow",
};

const WEATHER_SETTERS: Record<string, Weather> = {
  drizzle: "rain",
  drought: "sun",
  "sand-stream": "sand",
  "snow-warning": "snow",
  "orichalcum-pulse": "sun",
};

const TERRAIN_SETTERS: Record<string, Terrain> = {
  "electric-surge": "electric",
  "hadron-engine": "electric",
  "grassy-surge": "grassy",
  "psychic-surge": "psychic",
  "misty-surge": "misty",
};

const WEATHER_START: Record<Weather, string> = {
  rain: "It started to rain!",
  sun: "The sunlight turned harsh!",
  sand: "A sandstorm kicked up!",
  snow: "It started to snow!",
};

const WEATHER_END: Record<Weather, string> = {
  rain: "The rain stopped.",
  sun: "The harsh sunlight faded.",
  sand: "The sandstorm subsided.",
  snow: "The snow stopped.",
};

const TERRAIN_START: Record<Terrain, string> = {
  electric: "An electric current ran across the battlefield!",
  grassy: "Grass grew to cover the battlefield!",
  psychic: "The battlefield got weird!",
  misty: "Mist swirled around the battlefield!",
};

const TERRAIN_TYPE: Record<Terrain, PokeType> = {
  electric: "electric",
  grassy: "grass",
  psychic: "psychic",
  misty: "fairy",
};

const stageMult = (s: number) => (s >= 0 ? (2 + s) / 2 : 2 / (2 - s));
const chance = (pct: number) => Math.random() * 100 < pct;
const abilityName = (id: string) => displayName(id);

export function toMon(b: Battler): Mon {
  return {
    ...b,
    hp: b.maxHp,
    types: [...b.types],
    baseTypes: [...b.types],
    baseAbility: b.ability,
    status: null,
    sleepTurns: 0,
    stages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    flashFire: false,
    proteanUsed: false,
    blade: false,
    disguised: b.ability === "disguise",
    iceFace: b.ability === "ice-face",
    loafing: false,
    turnsOut: 0,
    enteredThisTurn: true,
    flinched: false,
  };
}

interface Calc {
  damage: number;
  eff: number;
  crit: boolean;
  blockedBy?: string; // ability that absorbed or blocked the move
}

export class Battle {
  player: Mon[];
  foe: Mon[];
  playerActive = 0;
  foeActive = 0;
  weatherState: { kind: Weather; turns: number } | null = null;
  terrainState: { kind: Terrain; turns: number } | null = null;
  playerMustSwitch = false;
  private ev: BattleEvent[] = [];
  private movedThisTurn = new Set<Side>();
  private downed = new WeakSet<Mon>();

  constructor(player: Battler[], foe: Battler[], private foeTrainer: string) {
    this.player = player.map(toMon);
    this.foe = foe.map(toMon);
  }

  /* ---------- Accessors ---------- */

  team(side: Side) { return side === "player" ? this.player : this.foe; }
  activeIndex(side: Side) { return side === "player" ? this.playerActive : this.foeActive; }
  mon(side: Side) { return this.team(side)[this.activeIndex(side)]; }
  get playerMon() { return this.mon("player"); }
  get foeMon() { return this.mon("foe"); }
  other(side: Side): Side { return side === "player" ? "foe" : "player"; }

  alive(side: Side) { return this.team(side).filter((m) => m.hp > 0).length; }

  get winner(): Side | null {
    if (this.alive("foe") === 0) return "player";
    if (this.alive("player") === 0) return "foe";
    return null;
  }

  label(side: Side, mon = this.mon(side)) {
    return side === "player" ? displayName(mon.name) : `Foe ${displayName(mon.name)}`;
  }

  get weather(): Weather | null {
    if (!this.weatherState) return null;
    const locked = [this.playerMon, this.foeMon].some(
      (m) => m.hp > 0 && (m.ability === "cloud-nine" || m.ability === "air-lock"),
    );
    return locked ? null : this.weatherState.kind;
  }

  get terrain(): Terrain | null {
    return this.terrainState?.kind ?? null;
  }

  // The ability a target uses defensively against this attacker.
  private defAbility(target: Mon, attacker: Mon | null) {
    if (attacker && MOLD_BREAKERS.has(attacker.ability) && BREAKABLE.has(target.ability)) return "";
    return target.ability;
  }

  types(mon: Mon): PokeType[] {
    if (mon.ability === "forecast") {
      const w = this.weather;
      if (w === "rain") return ["water"];
      if (w === "sun") return ["fire"];
      if (w === "snow") return ["ice"];
    }
    return mon.types;
  }

  private grounded(mon: Mon) {
    return !this.types(mon).includes("flying") && mon.ability !== "levitate";
  }

  // Protosynthesis and Quark Drive boost whichever stat is highest.
  private boostedStat(mon: Mon): StatKey | null {
    const active =
      (mon.ability === "protosynthesis" && this.weather === "sun") ||
      (mon.ability === "quark-drive" && this.terrain === "electric");
    if (!active) return null;
    const keys: StatKey[] = ["atk", "def", "spa", "spd", "spe"];
    return keys.reduce((best, k) => (this.rawStat(mon, k) > this.rawStat(mon, best) ? k : best), "atk" as StatKey);
  }

  private rawStat(mon: Mon, key: StatKey) {
    // Blade Forme swaps Aegislash's attacking and defending stats.
    if (mon.blade) {
      const swap: Partial<Record<StatKey, StatKey>> = { atk: "def", def: "atk", spa: "spd", spd: "spa" };
      return mon.stats[swap[key] ?? key];
    }
    return mon.stats[key];
  }

  speed(mon: Mon) {
    let s = this.rawStat(mon, "spe") * stageMult(mon.stages.spe);
    if (mon.status === "par" && mon.ability !== "quick-feet") s *= 0.5;
    if (mon.status && mon.ability === "quick-feet") s *= 1.5;
    const w = WEATHER_SPEED[mon.ability];
    if (w && this.weather === w) s *= 2;
    if (mon.ability === "surge-surfer" && this.terrain === "electric") s *= 2;
    if (this.boostedStat(mon) === "spe") s *= 1.5;
    if (mon.ability === "slow-start" && mon.turnsOut < 5) s *= 0.5;
    return s;
  }

  // Shadow Tag, Arena Trap and Magnet Pull stop the player switching by choice.
  canPlayerSwitch() {
    const foe = this.foeMon;
    const me = this.playerMon;
    if (foe.hp === 0 || this.types(me).includes("ghost")) return true;
    if (foe.ability === "shadow-tag" && me.ability !== "shadow-tag") return false;
    if (foe.ability === "arena-trap" && this.grounded(me)) return false;
    if (foe.ability === "magnet-pull" && this.types(me).includes("steel")) return false;
    return true;
  }

  /* ---------- Events ---------- */

  private say(text: string) { this.ev.push({ type: "text", text }); }

  private announce(side: Side, mon: Mon, text: string) {
    this.say(`[${this.label(side, mon)}'s ${abilityName(mon.ability)}] ${text}`);
  }

  private setHp(side: Side, mon: Mon, hp: number) {
    const next = Math.max(0, Math.min(mon.maxHp, Math.round(hp)));
    const delta = next - mon.hp;
    mon.hp = next;
    this.ev.push({ type: "hp", side, index: this.team(side).indexOf(mon), hp: next, delta });
  }

  private heal(side: Side, mon: Mon, amount: number, text?: string) {
    if (mon.hp === 0 || mon.hp === mon.maxHp) return;
    this.setHp(side, mon, mon.hp + Math.max(1, Math.floor(amount)));
    if (text) this.say(text);
  }

  // Indirect damage (recoil, weather, status). Magic Guard ignores all of it.
  private chip(side: Side, mon: Mon, amount: number, text: string) {
    if (mon.hp === 0 || mon.ability === "magic-guard") return;
    this.setHp(side, mon, mon.hp - Math.max(1, Math.floor(amount)));
    this.say(text);
    this.checkFaint(side, mon);
  }

  private checkFaint(side: Side, mon: Mon, by?: Side) {
    if (mon.hp > 0) return false;
    if (this.downed.has(mon)) return true;
    this.downed.add(mon);
    this.ev.push({ type: "faint", side, index: this.team(side).indexOf(mon) });
    this.say(`${this.label(side, mon)} fainted!`);
    mon.status = null;
    if (by) {
      const killer = this.mon(by);
      if (killer.hp > 0) {
        const ab = killer.ability;
        if (ab === "moxie" || ab === "chilling-neigh" || ab === "as-one-glastrier") this.boost(by, "atk", 1, by, true);
        if (ab === "grim-neigh" || ab === "as-one-spectrier") this.boost(by, "spa", 1, by, true);
        if (ab === "beast-boost") {
          const keys: StatKey[] = ["atk", "def", "spa", "spd", "spe"];
          const best = keys.reduce((a, k) => (this.rawStat(killer, k) > this.rawStat(killer, a) ? k : a), "atk" as StatKey);
          this.boost(by, best, 1, by, true);
        }
      }
    }
    for (const s of ["player", "foe"] as Side[]) {
      const m = this.mon(s);
      if (m !== mon && m.hp > 0 && m.ability === "soul-heart") this.boost(s, "spa", 1, s, true);
    }
    return true;
  }

  /* ---------- Stats and status ---------- */

  // Changes a stat stage. `source` is whoever caused it, so self-inflicted
  // drops (Close Combat) aren't blocked by Clear Body or punished by Defiant.
  boost(side: Side, stat: StatKey, amount: number, source: Side, fromAbility = false, attacker?: Mon) {
    const mon = this.mon(side);
    if (mon.hp === 0) return;
    const ab = attacker ? this.defAbility(mon, attacker) : mon.ability;
    let n = amount;
    if (ab === "contrary") n = -n;
    if (ab === "simple") n *= 2;
    const byFoe = source !== side;

    if (n < 0 && byFoe) {
      if (STAT_BLOCKERS.has(ab)) return this.announce(side, mon, `${this.label(side, mon)}'s stats can't be lowered!`);
      if (ab === "hyper-cutter" && stat === "atk") return this.announce(side, mon, "Its Attack can't be lowered!");
      if (ab === "big-pecks" && stat === "def") return this.announce(side, mon, "Its Defense can't be lowered!");
    }

    const before = mon.stages[stat];
    mon.stages[stat] = Math.max(-6, Math.min(6, before + n));
    const moved = mon.stages[stat] - before;
    const who = this.label(side, mon);
    const prefix = fromAbility ? `[${who}'s ${abilityName(mon.ability)}] ` : "";
    if (moved === 0) {
      this.say(`${who}'s ${STAT_NAMES[stat]} won't go any ${n > 0 ? "higher" : "lower"}!`);
    } else {
      const size = Math.abs(moved) >= 3 ? " drastically" : Math.abs(moved) === 2 ? " sharply" : "";
      this.say(`${prefix}${who}'s ${STAT_NAMES[stat]}${size} ${moved > 0 ? "rose" : "fell"}!`);
    }

    if (moved < 0 && byFoe) {
      if (mon.ability === "defiant") this.boost(side, "atk", 2, side, true);
      if (mon.ability === "competitive") this.boost(side, "spa", 2, side, true);
    }
  }

  private statusImmune(mon: Mon, status: Status, sourceMon: Mon | null): boolean {
    if (mon.hp === 0 || mon.status) return true;
    const types = this.types(mon);
    const ab = sourceMon ? this.defAbility(mon, sourceMon) : mon.ability;
    if (status === "brn" && types.includes("fire")) return true;
    if (status === "psn" && (types.includes("poison") || types.includes("steel")) && sourceMon?.ability !== "corrosion") return true;
    if (status === "par" && types.includes("electric")) return true;
    if (status === "frz" && (types.includes("ice") || this.weather === "sun")) return true;
    if (["purifying-salt", "comatose"].includes(ab)) return true;
    if (ab === "leaf-guard" && this.weather === "sun") return true;
    if (status === "psn" && ab === "immunity") return true;
    if (status === "par" && ab === "limber") return true;
    if (status === "slp" && ["insomnia", "vital-spirit", "sweet-veil"].includes(ab)) return true;
    if (status === "brn" && ["water-veil", "water-bubble", "thermal-exchange"].includes(ab)) return true;
    if (status === "frz" && ab === "magma-armor") return true;
    if (this.grounded(mon) && this.terrain === "misty") return true;
    if (status === "slp" && this.grounded(mon) && this.terrain === "electric") return true;
    return false;
  }

  private inflict(side: Side, status: Status, source: Side | null, fromAbility?: Mon) {
    const mon = this.mon(side);
    const sourceMon = source ? this.mon(source) : null;
    if (this.statusImmune(mon, status, sourceMon)) return false;
    mon.status = status;
    if (status === "slp") mon.sleepTurns = 1 + Math.floor(Math.random() * 3);
    this.ev.push({ type: "status", side, index: this.team(side).indexOf(mon), status });
    const text = `${this.label(side, mon)} ${STATUS_TEXT[status]}!`;
    if (fromAbility && source) this.announce(source, fromAbility, text);
    else this.say(text);

    // Synchronize passes burn, poison and paralysis back.
    if (mon.ability === "synchronize" && source && source !== side && ["brn", "psn", "par"].includes(status)) {
      this.inflict(source, status, side, mon);
    }
    return true;
  }

  private cure(side: Side, mon: Mon, text: string) {
    if (!mon.status) return;
    mon.status = null;
    this.ev.push({ type: "status", side, index: this.team(side).indexOf(mon), status: null });
    this.say(text);
  }

  /* ---------- Field ---------- */

  private setWeather(kind: Weather) {
    if (this.weatherState?.kind === kind) return;
    this.weatherState = { kind, turns: 5 };
    this.say(WEATHER_START[kind]);
    this.ev.push({ type: "field", weather: this.weather, terrain: this.terrain });
  }

  private setTerrain(kind: Terrain) {
    if (this.terrainState?.kind === kind) return;
    this.terrainState = { kind, turns: 5 };
    this.say(TERRAIN_START[kind]);
    this.ev.push({ type: "field", weather: this.weather, terrain: this.terrain });
  }

  /* ---------- Switching ---------- */

  private switchOut(side: Side) {
    const mon = this.mon(side);
    if (mon.hp > 0) {
      if (mon.ability === "regenerator") this.heal(side, mon, mon.maxHp / 3);
      if (mon.ability === "natural-cure" && mon.status) {
        mon.status = null;
        this.ev.push({ type: "status", side, index: this.team(side).indexOf(mon), status: null });
      }
    }
    mon.stages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
    mon.flashFire = false;
    mon.proteanUsed = false;
    mon.blade = false;
    mon.loafing = false;
    mon.turnsOut = 0;
    mon.types = [...mon.baseTypes];
    mon.ability = mon.baseAbility;
  }

  private switchIn(side: Side, index: number, announce: boolean) {
    if (side === "player") this.playerActive = index;
    else this.foeActive = index;
    const mon = this.mon(side);
    mon.enteredThisTurn = true;
    this.ev.push({ type: "switch", side, index, hp: mon.hp, status: mon.status });
    if (announce) {
      this.say(side === "player" ? `Go! ${displayName(mon.name)}!` : `${this.foeTrainer} sent out ${displayName(mon.name)}!`);
    }
    this.entryAbility(side);
  }

  private entryAbility(side: Side): void {
    const mon = this.mon(side);
    const foeSide = this.other(side);
    const foe = this.mon(foeSide);
    const ab = mon.ability;

    if (ab === "trace" && foe.hp > 0 && !UNTRACEABLE.has(foe.ability)) {
      mon.ability = foe.ability;
      this.say(`[${this.label(side, mon)}'s Trace] It traced ${this.label(foeSide, foe)}'s ${abilityName(foe.ability)}!`);
      return this.entryAbility(side);
    }

    if (WEATHER_SETTERS[ab]) {
      this.say(`[${this.label(side, mon)}'s ${abilityName(ab)}]`);
      this.setWeather(WEATHER_SETTERS[ab]);
    }
    if (TERRAIN_SETTERS[ab]) {
      this.say(`[${this.label(side, mon)}'s ${abilityName(ab)}]`);
      this.setTerrain(TERRAIN_SETTERS[ab]);
    }

    if (ab === "intimidate" && foe.hp > 0) {
      this.announce(side, mon, `${this.label(side, mon)} is glaring at ${this.label(foeSide, foe)}!`);
      if (INTIMIDATE_BLOCKERS.has(foe.ability) || STAT_BLOCKERS.has(foe.ability) || foe.ability === "hyper-cutter") {
        this.announce(foeSide, foe, `${this.label(foeSide, foe)} isn't intimidated!`);
      } else if (foe.ability === "guard-dog") {
        this.boost(foeSide, "atk", 1, foeSide, true);
      } else {
        this.boost(foeSide, "atk", -1, side);
      }
      if (foe.ability === "rattled") this.boost(foeSide, "spe", 1, foeSide, true);
    }

    if (ab === "download" && foe.hp > 0) {
      const def = this.rawStat(foe, "def") * stageMult(foe.stages.def);
      const spd = this.rawStat(foe, "spd") * stageMult(foe.stages.spd);
      this.boost(side, def < spd ? "atk" : "spa", 1, side, true);
    }
    if (ab === "intrepid-sword") this.boost(side, "atk", 1, side, true);
    if (ab === "dauntless-shield") this.boost(side, "def", 1, side, true);
    if (ab === "slow-start") this.announce(side, mon, `${this.label(side, mon)} can't get it going!`);
    if (ab === "dark-aura") this.announce(side, mon, `${this.label(side, mon)} is radiating a dark aura!`);
    if (ab === "fairy-aura") this.announce(side, mon, `${this.label(side, mon)} is radiating a fairy aura!`);
    if (ab === "aura-break") this.announce(side, mon, `${this.label(side, mon)} reversed all other Pokémon's auras!`);
    if (ab === "comatose") this.announce(side, mon, `${this.label(side, mon)} is drowsing!`);
    if (ab === "pressure") this.announce(side, mon, `${this.label(side, mon)} is exerting its pressure!`);
    if (["mold-breaker", "teravolt", "turboblaze"].includes(ab)) {
      this.announce(side, mon, `${this.label(side, mon)} breaks the mold!`);
    }
    if (ab.endsWith("-of-ruin")) {
      const ruined: Record<string, string> = {
        "sword-of-ruin": "Defense",
        "beads-of-ruin": "Sp. Def",
        "tablets-of-ruin": "Attack",
        "vessel-of-ruin": "Sp. Atk",
      };
      const stat = ruined[ab];
      this.announce(side, mon, `It weakened the ${stat} of all surrounding Pokémon!`);
    }
  }

  /* ---------- Damage ---------- */

  private moveType(user: Mon, move: Move): PokeType {
    const ate = ATE[user.ability];
    return ate && move.type === "normal" ? ate : move.type;
  }

  // Damage `move` would do from `side` to the opposing active Pokémon.
  // With `simulate`, there's no randomness and nothing is changed: the AI and
  // the move buttons use it to estimate.
  calc(side: Side, move: Move, simulate: boolean): Calc {
    const user = this.mon(side);
    const target = this.mon(this.other(side));
    const tAb = this.defAbility(target, user);
    const uAb = user.ability;
    const type = this.moveType(user, move);
    const userTypes = uAb === "protean" || uAb === "libero" ? (user.proteanUsed ? this.types(user) : [type]) : this.types(user);
    const targetTypes = this.types(target);
    const physical = move.category === "physical";
    const none = (blockedBy?: string): Calc => ({ damage: 0, eff: 0, crit: false, blockedBy });

    // Ability-based immunities.
    if (type === "ground" && tAb === "levitate") return none("levitate");
    if (type === "fire" && (tAb === "flash-fire" || tAb === "well-baked-body")) return none(tAb);
    if (type === "water" && ["water-absorb", "storm-drain", "dry-skin"].includes(tAb)) return none(tAb);
    if (type === "electric" && ["volt-absorb", "lightning-rod", "motor-drive"].includes(tAb)) return none(tAb);
    if (type === "grass" && tAb === "sap-sipper") return none(tAb);
    if (type === "ground" && tAb === "earth-eater") return none(tAb);
    if (move.bullet && tAb === "bulletproof") return none(tAb);
    if (move.sound && tAb === "soundproof") return none(tAb);
    if ((move.priority ?? 0) > 0 && this.terrain === "psychic" && this.grounded(target)) return none("psychic-terrain");

    let eff = effectiveness(type, targetTypes);
    if (eff === 0 && uAb === "scrappy" && (type === "normal" || type === "fighting")) {
      eff = effectiveness(type, targetTypes.filter((t) => t !== "ghost"));
    }
    if (eff === 0) return none();
    if (tAb === "wonder-guard" && eff <= 1) return none(tAb);

    // Base power modifiers.
    let power = move.power;
    if (uAb === "technician" && power <= 60) power *= 1.5;
    if (ATE[uAb] && move.type === "normal") power *= 1.2;
    if (uAb === "iron-fist" && move.punch) power *= 1.2;
    if (uAb === "strong-jaw" && move.bite) power *= 1.5;
    if (uAb === "mega-launcher" && move.pulse) power *= 1.5;
    if (uAb === "sharpness" && move.slicing) power *= 1.5;
    if (uAb === "tough-claws" && move.contact) power *= 1.3;
    if (uAb === "reckless" && move.recoil) power *= 1.2;
    if (uAb === "sheer-force" && move.secondary) power *= 1.3;
    if (uAb === "punk-rock" && move.sound) power *= 1.3;
    if (uAb === "sand-force" && this.weather === "sand" && ["rock", "ground", "steel"].includes(type)) power *= 1.3;
    if (uAb === "analytic" && this.movedThisTurn.has(this.other(side))) power *= 1.3;
    const booster = TYPE_BOOSTERS[uAb];
    if (booster && booster[0] === type) power *= booster[1];
    if (user.flashFire && type === "fire") power *= 1.5;
    if (PINCH[uAb] === type && user.hp <= user.maxHp / 3) power *= 1.5;
    if (uAb === "supreme-overlord") power *= 1 + 0.1 * Math.min(5, this.team(side).filter((m) => m.hp === 0).length);
    const terrain = this.terrain;
    if (terrain && terrain !== "misty" && TERRAIN_TYPE[terrain] === type && this.grounded(user)) power *= 1.3;
    if (terrain === "misty" && type === "dragon" && this.grounded(target)) power *= 0.5;
    if (terrain === "grassy" && move.name === "Earthquake" && this.grounded(target)) power *= 0.5;
    const field = [user, target].filter((m) => m.hp > 0).map((m) => m.ability);
    if ((type === "dark" && field.includes("dark-aura")) || (type === "fairy" && field.includes("fairy-aura"))) {
      power *= field.includes("aura-break") ? 0.75 : 4 / 3;
    }
    if (tAb === "heatproof" && type === "fire") power *= 0.5;
    if (tAb === "dry-skin" && type === "fire") power *= 1.25;
    if (tAb === "thick-fat" && (type === "fire" || type === "ice")) power *= 0.5;
    if (tAb === "water-bubble" && type === "fire") power *= 0.5;
    if (tAb === "purifying-salt" && type === "ghost") power *= 0.5;
    if (tAb === "fluffy" && move.contact) power *= 0.5;
    if (tAb === "fluffy" && type === "fire") power *= 2;
    if (tAb === "punk-rock" && move.sound) power *= 0.5;

    // Critical hit.
    const critStage = (move.highCrit ? 1 : 0) + (uAb === "super-luck" ? 1 : 0);
    const critRate = [1 / 24, 1 / 8, 1 / 2][Math.min(2, critStage)];
    const crit = !simulate && !["shell-armor", "battle-armor"].includes(tAb) && Math.random() < critRate;

    // Attack stat.
    const aKey: StatKey = physical ? "atk" : "spa";
    let aStage = tAb === "unaware" ? 0 : user.stages[aKey];
    if (crit && aStage < 0) aStage = 0;
    let atk = this.rawStat(user, aKey) * stageMult(aStage);
    if (physical && (uAb === "huge-power" || uAb === "pure-power")) atk *= 2;
    if (physical && uAb === "hustle") atk *= 1.5;
    if (physical && uAb === "guts" && user.status) atk *= 1.5;
    if (!physical && uAb === "solar-power" && this.weather === "sun") atk *= 1.5;
    if (physical && uAb === "flower-gift" && this.weather === "sun") atk *= 1.5;
    if (physical && uAb === "orichalcum-pulse" && this.weather === "sun") atk *= 4 / 3;
    if (!physical && uAb === "hadron-engine" && this.terrain === "electric") atk *= 4 / 3;
    if (this.boostedStat(user) === aKey) atk *= 1.3;
    if (physical && uAb === "slow-start" && user.turnsOut < 5) atk *= 0.5;
    if (uAb === "defeatist" && user.hp <= user.maxHp / 2) atk *= 0.5;
    if (physical && target.ability === "tablets-of-ruin" && uAb !== "tablets-of-ruin") atk *= 0.75;
    if (!physical && target.ability === "vessel-of-ruin" && uAb !== "vessel-of-ruin") atk *= 0.75;

    // Defense stat.
    const dKey: StatKey = physical ? "def" : "spd";
    let dStage = uAb === "unaware" ? 0 : target.stages[dKey];
    if (crit && dStage > 0) dStage = 0;
    let def = this.rawStat(target, dKey) * stageMult(dStage);
    if (!physical && this.weather === "sand" && targetTypes.includes("rock")) def *= 1.5;
    if (physical && this.weather === "snow" && targetTypes.includes("ice")) def *= 1.5;
    if (physical && tAb === "marvel-scale" && target.status) def *= 1.5;
    if (physical && tAb === "fur-coat") def *= 2;
    if (!physical && tAb === "flower-gift" && this.weather === "sun") def *= 1.5;
    if (this.boostedStat(target) === dKey) def *= 1.3;
    if (physical && uAb === "sword-of-ruin" && target.ability !== "sword-of-ruin") def *= 0.75;
    if (!physical && uAb === "beads-of-ruin" && target.ability !== "beads-of-ruin") def *= 0.75;

    let dmg = Math.floor(Math.floor((Math.floor((2 * LEVEL) / 5 + 2) * power * atk) / def) / 50) + 2;

    const w = this.weather;
    if (w === "rain") dmg *= type === "water" ? 1.5 : type === "fire" ? 0.5 : 1;
    if (w === "sun") dmg *= type === "fire" ? 1.5 : type === "water" ? 0.5 : 1;
    if (crit) dmg *= uAb === "sniper" ? 2.25 : 1.5;
    dmg *= simulate ? 0.925 : 0.85 + Math.random() * 0.15;
    if (userTypes.includes(type)) dmg *= uAb === "adaptability" ? 2 : 1.5;
    dmg *= eff;
    if (physical && user.status === "brn" && uAb !== "guts") dmg *= 0.5;
    if ((tAb === "multiscale" || target.ability === "shadow-shield") && target.hp === target.maxHp) dmg *= 0.5;
    if ((tAb === "filter" || tAb === "solid-rock" || target.ability === "prism-armor") && eff > 1) dmg *= 0.75;
    if (uAb === "tinted-lens" && eff < 1) dmg *= 2;
    if (!physical && tAb === "ice-scales") dmg *= 0.5;
    if (uAb === "stakeout" && target.enteredThisTurn) dmg *= 2;

    return { damage: Math.max(1, Math.floor(dmg)), eff, crit };
  }

  private accuracy(side: Side, move: Move) {
    const user = this.mon(side);
    const target = this.mon(this.other(side));
    if (move.accuracy === 0 || user.ability === "no-guard" || target.ability === "no-guard") return 100;
    let acc = move.accuracy;
    if (user.ability === "compound-eyes") acc *= 1.3;
    if (user.ability === "victory-star") acc *= 1.1;
    if (user.ability === "hustle" && move.category === "physical") acc *= 0.8;
    const tAb = this.defAbility(target, user);
    if (user.ability !== "keen-eye") {
      if (tAb === "sand-veil" && this.weather === "sand") acc *= 0.8;
      if (tAb === "snow-cloak" && this.weather === "snow") acc *= 0.8;
    }
    return Math.min(100, acc);
  }

  // Expected damage, for the AI and the effectiveness labels.
  estimate(side: Side, move: Move) {
    const c = this.calc(side, move, true);
    return { damage: (c.damage * this.accuracy(side, move)) / 100, eff: c.blockedBy ? 0 : c.eff };
  }

  /* ---------- Taking a turn ---------- */

  // Returns false if the Pokémon can't act this turn.
  private canAct(side: Side): boolean {
    const mon = this.mon(side);
    const who = this.label(side, mon);
    if (mon.status === "slp") {
      mon.sleepTurns -= mon.ability === "early-bird" ? 2 : 1;
      if (mon.sleepTurns > 0) {
        this.say(`${who} is fast asleep.`);
        return false;
      }
      this.cure(side, mon, `${who} woke up!`);
    }
    if (mon.status === "frz") {
      if (!chance(20)) {
        this.say(`${who} is frozen solid!`);
        return false;
      }
      this.cure(side, mon, `${who} thawed out!`);
    }
    if (mon.flinched) {
      this.say(`${who} flinched and couldn't move!`);
      if (mon.ability === "steadfast") this.boost(side, "spe", 1, side, true);
      return false;
    }
    if (mon.ability === "truant") {
      mon.loafing = !mon.loafing;
      if (!mon.loafing) {
        this.announce(side, mon, `${who} is loafing around!`);
        return false;
      }
    }
    if (mon.status === "par" && chance(25)) {
      this.say(`${who} is paralyzed! It can't move!`);
      return false;
    }
    return true;
  }

  private useMove(side: Side, move: Move) {
    const foeSide = this.other(side);
    const user = this.mon(side);
    const target = this.mon(foeSide);
    if (user.hp === 0 || target.hp === 0) return;
    if (!this.canAct(side)) return;

    if (user.ability === "stance-change" && !user.blade) {
      user.blade = true;
      this.announce(side, user, `${this.label(side, user)} changed to Blade Forme!`);
    }
    const type = this.moveType(user, move);
    if ((user.ability === "protean" || user.ability === "libero") && !user.proteanUsed) {
      user.proteanUsed = true;
      if (user.types.length !== 1 || user.types[0] !== type) {
        user.types = [type];
        this.announce(side, user, `${this.label(side, user)} transformed into the ${type.toUpperCase()} type!`);
      }
    }

    this.say(`${this.label(side, user)} used ${move.name}!`);
    this.ev.push({ type: "attack", side });
    this.movedThisTurn.add(side);

    if (!chance(this.accuracy(side, move))) {
      this.say(`${this.label(side, user)}'s attack missed!`);
      return;
    }

    const result = this.calc(side, move, false);
    if (result.blockedBy) return this.absorb(side, result.blockedBy);
    if (result.eff === 0) {
      this.say(`It doesn't affect ${this.label(foeSide, target)}...`);
      return;
    }

    // Disguise and Ice Face take the first hit for free.
    const tAb = this.defAbility(target, user);
    if (tAb === "disguise" && target.disguised) {
      target.disguised = false;
      this.announce(foeSide, target, "Its disguise served it as a decoy!");
      this.chip(foeSide, target, target.maxHp / 8, `${this.label(foeSide, target)}'s disguise was busted!`);
      return;
    }
    if (tAb === "ice-face" && target.iceFace && move.category === "physical") {
      target.iceFace = false;
      this.announce(foeSide, target, `${this.label(foeSide, target)}'s ice face shattered!`);
      return;
    }

    const hpBefore = target.hp;
    let damage = Math.min(result.damage, target.hp);
    if (tAb === "sturdy" && hpBefore === target.maxHp && damage >= hpBefore) {
      damage = hpBefore - 1;
      this.setHp(foeSide, target, hpBefore - damage);
      this.announce(foeSide, target, `${this.label(foeSide, target)} endured the hit!`);
    } else {
      this.setHp(foeSide, target, hpBefore - damage);
    }
    if (result.crit) this.say("A critical hit!");
    if (result.eff > 1) this.say("It's super effective!");
    if (result.eff < 1) this.say("It's not very effective...");

    if (result.crit && target.hp > 0 && target.ability === "anger-point") {
      target.stages.atk = 6;
      this.announce(foeSide, target, `${this.label(foeSide, target)} maxed its Attack!`);
    }

    // Recoil and drain.
    if (move.recoil && user.ability !== "rock-head") {
      this.chip(side, user, damage * move.recoil, `${this.label(side, user)} was damaged by the recoil!`);
    }
    if (move.drain) this.heal(side, user, damage * move.drain, `${this.label(foeSide, target)} had its energy drained!`);

    // Added effects on the target.
    const sheer = user.ability === "sheer-force";
    if (move.secondary && !sheer && target.hp > 0 && tAb !== "shield-dust") {
      const sec = move.secondary;
      const pct = sec.chance * (user.ability === "serene-grace" ? 2 : 1);
      if (chance(pct)) {
        if (sec.status) this.inflict(foeSide, sec.status, side);
        if (sec.flinch && !this.movedThisTurn.has(foeSide) && tAb !== "inner-focus") target.flinched = true;
        if (sec.stat) this.boost(foeSide, sec.stat[0], sec.stat[1], side, false, user);
      }
    }
    if (user.ability === "stench" && !move.secondary?.flinch && target.hp > 0 && !this.movedThisTurn.has(foeSide) && chance(10)) {
      target.flinched = true;
    }
    if (user.ability === "poison-touch" && move.contact && target.hp > 0 && chance(30)) {
      this.inflict(foeSide, "psn", side, user);
    }
    if (move.self) for (const [stat, n] of move.self) this.boost(side, stat, n, side);

    // The target's reactions to being hit.
    if (target.hp > 0) this.onHit(foeSide, side, move, type);
    if (move.contact) this.onContact(foeSide, side, hpBefore);

    if (this.checkFaint(foeSide, target, side)) {
      // Aftermath triggers on a contact knockout.
      if (target.ability === "aftermath" && move.contact) {
        this.chip(side, user, user.maxHp / 4, `[${this.label(foeSide, target)}'s Aftermath] ${this.label(side, user)} was hurt!`);
      }
    }
    this.checkFaint(side, user, foeSide);

    // Emergency Exit and Wimp Out bail when pushed below half HP.
    if (
      target.hp > 0 &&
      ["emergency-exit", "wimp-out"].includes(target.ability) &&
      hpBefore >= target.maxHp / 2 &&
      target.hp < target.maxHp / 2 &&
      this.alive(foeSide) > 1
    ) {
      this.announce(foeSide, target, `${this.label(foeSide, target)} wants to retreat!`);
      if (foeSide === "player") this.playerMustSwitch = true;
      else {
        this.switchOut("foe");
        this.switchIn("foe", this.bestFoeReplacement(), true);
      }
    }
  }

  private absorb(side: Side, ability: string) {
    const foeSide = this.other(side);
    const target = this.mon(foeSide);
    const who = this.label(foeSide, target);
    switch (ability) {
      case "flash-fire":
        target.flashFire = true;
        return this.announce(foeSide, target, `The power of ${who}'s Fire moves rose!`);
      case "water-absorb":
      case "volt-absorb":
      case "earth-eater":
      case "dry-skin":
        if (target.hp === target.maxHp) return this.announce(foeSide, target, `It doesn't affect ${who}...`);
        this.announce(foeSide, target, `${who} restored HP!`);
        return this.heal(foeSide, target, target.maxHp / 4);
      case "storm-drain":
      case "lightning-rod":
        this.announce(foeSide, target, `${who} absorbed the attack!`);
        return this.boost(foeSide, "spa", 1, foeSide);
      case "motor-drive":
        this.announce(foeSide, target, `${who} absorbed the attack!`);
        return this.boost(foeSide, "spe", 1, foeSide);
      case "sap-sipper":
        this.announce(foeSide, target, `${who} absorbed the attack!`);
        return this.boost(foeSide, "atk", 1, foeSide);
      case "well-baked-body":
        this.announce(foeSide, target, `${who} absorbed the heat!`);
        return this.boost(foeSide, "def", 2, foeSide);
      case "psychic-terrain":
        return this.say(`${who} is protected by the Psychic Terrain!`);
      default:
        this.announce(foeSide, target, `It doesn't affect ${who}...`);
    }
  }

  private onHit(side: Side, attackerSide: Side, move: Move, type: PokeType) {
    const mon = this.mon(side);
    switch (mon.ability) {
      case "weak-armor":
        if (move.category === "physical") {
          this.boost(side, "def", -1, side, true);
          this.boost(side, "spe", 2, side, true);
        }
        break;
      case "stamina":
        this.boost(side, "def", 1, side, true);
        break;
      case "justified":
        if (type === "dark") this.boost(side, "atk", 1, side, true);
        break;
      case "rattled":
        if (["bug", "ghost", "dark"].includes(type)) this.boost(side, "spe", 1, side, true);
        break;
      case "steam-engine":
        if (type === "fire" || type === "water") this.boost(side, "spe", 6, side, true);
        break;
      case "thermal-exchange":
        if (type === "fire") this.boost(side, "atk", 1, side, true);
        break;
      case "cotton-down":
        this.announce(side, mon, "Cotton fluff scattered!");
        this.boost(attackerSide, "spe", -1, side);
        break;
      case "sand-spit":
        this.announce(side, mon, "Sand whipped up!");
        this.setWeather("sand");
        break;
    }
  }

  private onContact(side: Side, attackerSide: Side, hpBefore: number) {
    const mon = this.mon(side);
    const attacker = this.mon(attackerSide);
    if (attacker.hp === 0 || hpBefore === 0) return;
    const ab = mon.ability;
    const label = this.label(attackerSide, attacker);
    if (ab === "rough-skin" || ab === "iron-barbs") {
      this.chip(attackerSide, attacker, attacker.maxHp / 8, `[${this.label(side, mon)}'s ${abilityName(ab)}] ${label} was hurt!`);
    }
    if (ab === "static" && chance(30)) this.inflict(attackerSide, "par", side, mon);
    if (ab === "flame-body" && chance(30)) this.inflict(attackerSide, "brn", side, mon);
    if (ab === "poison-point" && chance(30)) this.inflict(attackerSide, "psn", side, mon);
    if (ab === "effect-spore" && !this.types(attacker).includes("grass") && chance(30)) {
      const pick: Status[] = ["psn", "par", "slp"];
      this.inflict(attackerSide, pick[Math.floor(Math.random() * 3)], side, mon);
    }
    if (ab === "gooey" || ab === "tangling-hair") {
      this.announce(side, mon, `${label} got tangled up!`);
      this.boost(attackerSide, "spe", -1, side);
    }
  }

  // The AI goes for the most expected damage, preferring a priority move
  // that finishes the job, with a little unpredictability.
  private foeMoveIndex(): number {
    const moves = this.foeMon.moves;
    const est = moves.map((m) => this.estimate("foe", m).damage);
    const finisher = moves.findIndex((m, i) => (m.priority ?? 0) > 0 && est[i] >= this.playerMon.hp);
    if (finisher >= 0 && this.speed(this.foeMon) < this.speed(this.playerMon)) return finisher;
    if (Math.random() < 0.15) return Math.floor(Math.random() * moves.length);
    return est.reduce((best, d, i) => (d > est[best] ? i : best), 0);
  }

  private bestFoeReplacement(): number {
    let best = -1;
    let bestScore = -1;
    const current = this.foeActive;
    this.foe.forEach((mon, i) => {
      if (mon.hp <= 0 || i === current) return;
      this.foeActive = i;
      const score = Math.max(...mon.moves.map((m) => this.estimate("foe", m).damage));
      if (score > bestScore) {
        best = i;
        bestScore = score;
      }
    });
    this.foeActive = current;
    return best;
  }

  private order(playerMove: Move | null, foeMove: Move): Side[] {
    if (!playerMove) return ["foe"];
    const pp = playerMove.priority ?? 0;
    const fp = foeMove.priority ?? 0;
    if (pp !== fp) return pp > fp ? ["player", "foe"] : ["foe", "player"];
    const ps = this.speed(this.playerMon);
    const fs = this.speed(this.foeMon);
    const playerFirst = ps > fs || (ps === fs && Math.random() < 0.5);
    return playerFirst ? ["player", "foe"] : ["foe", "player"];
  }

  /* ---------- Public turn API ---------- */

  start(): BattleEvent[] {
    this.ev = [];
    this.say(`${this.foeTrainer} wants to battle!`);
    this.ev.push({ type: "switch", side: "foe", index: 0, hp: this.foeMon.hp, status: null });
    this.say(`${this.foeTrainer} sent out ${displayName(this.foeMon.name)}!`);
    this.ev.push({ type: "switch", side: "player", index: 0, hp: this.playerMon.hp, status: null });
    this.say(`Go! ${displayName(this.playerMon.name)}!`);
    const first: Side[] = this.speed(this.playerMon) >= this.speed(this.foeMon) ? ["player", "foe"] : ["foe", "player"];
    for (const s of first) this.entryAbility(s);
    this.playerMon.enteredThisTurn = false;
    this.foeMon.enteredThisTurn = false;
    this.endTurnFlags();
    return this.flush();
  }

  turn(action: Action): BattleEvent[] {
    this.ev = [];
    this.movedThisTurn.clear();
    // Anything already on the field has been out since before this turn.
    this.playerMon.enteredThisTurn = false;
    this.foeMon.enteredThisTurn = false;
    const foeMove = this.foeMon.moves[this.foeMoveIndex()];

    if (action.kind === "switch") {
      this.say(`Come back, ${displayName(this.playerMon.name)}!`);
      this.switchOut("player");
      this.switchIn("player", action.to, true);
      this.useMove("foe", foeMove);
    } else {
      const playerMove = this.playerMon.moves[action.index];
      const startMons = { player: this.playerMon, foe: this.foeMon };
      for (const side of this.order(playerMove, foeMove)) {
        if (this.winner) break;
        // A Pokémon that left mid-turn (Emergency Exit) or fainted doesn't act.
        if (this.mon(side) !== startMons[side] || this.mon(side).hp === 0) continue;
        if (side === "player" && this.playerMustSwitch) continue;
        this.useMove(side, side === "player" ? playerMove : foeMove);
      }
    }

    if (!this.winner) this.endOfTurn();
    if (!this.winner && this.foeMon.hp === 0) this.switchIn("foe", this.bestFoeReplacement(), true);
    if (this.playerMon.hp === 0 && !this.winner) this.playerMustSwitch = true;
    this.endTurnFlags();
    return this.flush();
  }

  // A free switch after a faint or Emergency Exit.
  replace(index: number): BattleEvent[] {
    this.ev = [];
    this.playerMustSwitch = false;
    if (this.playerMon.hp > 0) this.switchOut("player");
    this.switchIn("player", index, true);
    this.endTurnFlags();
    return this.flush();
  }

  private flush() {
    const out = this.ev;
    this.ev = [];
    return out;
  }

  private endTurnFlags() {
    for (const m of [...this.player, ...this.foe]) {
      m.flinched = false;
    }
  }

  private endOfTurn() {
    const sides: Side[] = this.speed(this.playerMon) >= this.speed(this.foeMon) ? ["player", "foe"] : ["foe", "player"];
    const w = this.weather;

    for (const side of sides) {
      const mon = this.mon(side);
      if (mon.hp === 0) continue;
      const who = this.label(side, mon);
      const ab = mon.ability;
      const types = this.types(mon);

      if (w === "sand" && !types.some((t) => ["rock", "ground", "steel"].includes(t)) &&
          !["sand-veil", "sand-rush", "sand-force", "overcoat"].includes(ab)) {
        this.chip(side, mon, mon.maxHp / 16, `${who} is buffeted by the sandstorm!`);
      }
      if (w === "rain" && ab === "rain-dish") this.heal(side, mon, mon.maxHp / 16, `[${who}'s Rain Dish] ${who} restored HP.`);
      if (w === "rain" && ab === "dry-skin") this.heal(side, mon, mon.maxHp / 8, `[${who}'s Dry Skin] ${who} restored HP.`);
      if (w === "snow" && ab === "ice-body") this.heal(side, mon, mon.maxHp / 16, `[${who}'s Ice Body] ${who} restored HP.`);
      if (w === "sun" && (ab === "dry-skin" || ab === "solar-power")) {
        this.chip(side, mon, mon.maxHp / 8, `[${who}'s ${abilityName(ab)}] ${who} was hurt by the sunlight!`);
      }
      if (mon.hp === 0) continue;
      if (this.terrain === "grassy" && this.grounded(mon)) this.heal(side, mon, mon.maxHp / 16, `${who} was healed by the grassy terrain.`);

      if (mon.status && w === "rain" && ab === "hydration") this.cure(side, mon, `[${who}'s Hydration] ${who} was cured!`);
      if (mon.status && ab === "shed-skin" && chance(30)) this.cure(side, mon, `[${who}'s Shed Skin] ${who} was cured!`);

      if (mon.status === "brn") this.chip(side, mon, mon.maxHp / 16, `${who} was hurt by its burn!`);
      if (mon.status === "psn") {
        if (ab === "poison-heal") this.heal(side, mon, mon.maxHp / 8, `[${who}'s Poison Heal] ${who} restored HP.`);
        else this.chip(side, mon, mon.maxHp / 8, `${who} was hurt by poison!`);
      }
      const foe = this.mon(this.other(side));
      if (mon.status === "slp" && foe.hp > 0 && foe.ability === "bad-dreams") {
        this.chip(side, mon, mon.maxHp / 8, `[${this.label(this.other(side), foe)}'s Bad Dreams] ${who} is tormented!`);
      }
      if (mon.hp === 0) continue;

      if (ab === "speed-boost" && !mon.enteredThisTurn) this.boost(side, "spe", 1, side, true);
      if (ab === "moody") {
        const keys: StatKey[] = ["atk", "def", "spa", "spd", "spe"];
        const up = keys.filter((k) => mon.stages[k] < 6);
        const upKey = up[Math.floor(Math.random() * up.length)];
        if (upKey) this.boost(side, upKey, 2, side, true);
        const down = keys.filter((k) => k !== upKey && mon.stages[k] > -6);
        const downKey = down[Math.floor(Math.random() * down.length)];
        if (downKey) this.boost(side, downKey, -1, side, true);
      }
      mon.turnsOut++;
      if (ab === "slow-start" && mon.turnsOut === 5) this.announce(side, mon, `${who} finally got its act together!`);
    }

    if (this.weatherState && --this.weatherState.turns === 0) {
      this.say(WEATHER_END[this.weatherState.kind]);
      this.weatherState = null;
      this.ev.push({ type: "field", weather: null, terrain: this.terrain });
    }
    if (this.terrainState && --this.terrainState.turns === 0) {
      this.say("The terrain returned to normal.");
      this.terrainState = null;
      this.ev.push({ type: "field", weather: this.weather, terrain: null });
    }
  }
}

export function abilityInfo(id: string) {
  return { name: displayName(id), desc: ABILITIES[id]?.desc ?? "" };
}
