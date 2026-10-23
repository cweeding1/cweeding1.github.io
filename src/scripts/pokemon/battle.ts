import { displayName, type Battler, type Move } from "./api";
import { effectiveness } from "./types";

export type Side = "player" | "foe";

export type Action = { kind: "move"; index: number } | { kind: "switch"; to: number };

export type BattleEvent =
  | { type: "text"; text: string }
  | { type: "attack"; side: Side }
  | { type: "damage"; side: Side; hp: number; damage: number }
  | { type: "faint"; side: Side }
  | { type: "switch"; side: Side; index: number };

const LEVEL = 50;

export function damageFor(attacker: Battler, defender: Battler, move: Move, random = true) {
  const physical = attacker.attack >= attacker.spAttack;
  const a = physical ? attacker.attack : attacker.spAttack;
  const d = physical ? defender.defense : defender.spDefense;
  const eff = effectiveness(move.type, defender.types);
  const stab = attacker.types.includes(move.type) ? 1.5 : 1;
  const crit = random && Math.random() < 1 / 16;
  const roll = random ? 0.85 + Math.random() * 0.15 : 0.925;
  const base = Math.floor((((2 * LEVEL) / 5 + 2) * move.power * (a / d)) / 50) + 2;
  const damage = eff === 0 ? 0 : Math.max(1, Math.floor(base * stab * eff * roll * (crit ? 1.5 : 1)));
  return { damage, eff, crit };
}

export class Battle {
  playerActive = 0;
  foeActive = 0;

  constructor(
    public player: Battler[],
    public foe: Battler[],
  ) {}

  get playerMon() { return this.player[this.playerActive]; }
  get foeMon() { return this.foe[this.foeActive]; }

  alive(side: Side) {
    return (side === "player" ? this.player : this.foe).filter((b) => b.hp > 0).length;
  }

  get winner(): Side | null {
    if (this.alive("foe") === 0) return "player";
    if (this.alive("player") === 0) return "foe";
    return null;
  }

  // The AI usually picks its hardest-hitting move, with a little unpredictability.
  private foeMove(): number {
    const scored = this.foeMon.moves.map((m, i) => ({ i, dmg: damageFor(this.foeMon, this.playerMon, m, false).damage }));
    if (Math.random() < 0.2) return scored[Math.floor(Math.random() * scored.length)].i;
    return scored.reduce((best, s) => (s.dmg > best.dmg ? s : best)).i;
  }

  // When the foe's Pokémon faints, send in whichever survivor hits the player hardest.
  private bestFoeReplacement(): number {
    let best = -1;
    let bestScore = -1;
    this.foe.forEach((mon, i) => {
      if (mon.hp <= 0) return;
      const score = Math.max(...mon.moves.map((m) => damageFor(mon, this.playerMon, m, false).damage));
      if (score > bestScore) {
        best = i;
        bestScore = score;
      }
    });
    return best;
  }

  private attack(side: Side, move: Move, events: BattleEvent[]) {
    const [user, target, other]: [Battler, Battler, Side] =
      side === "player" ? [this.playerMon, this.foeMon, "foe"] : [this.foeMon, this.playerMon, "player"];
    const who = side === "player" ? displayName(user.name) : `Foe ${displayName(user.name)}`;
    events.push({ type: "text", text: `${who} used ${move.name}!` });
    events.push({ type: "attack", side });

    const { damage, eff, crit } = damageFor(user, target, move);
    if (eff === 0) {
      events.push({ type: "text", text: `It doesn't affect ${displayName(target.name)}...` });
      return;
    }
    target.hp = Math.max(0, target.hp - damage);
    events.push({ type: "damage", side: other, hp: target.hp, damage });
    if (crit) events.push({ type: "text", text: "A critical hit!" });
    if (eff > 1) events.push({ type: "text", text: "It's super effective!" });
    if (eff < 1) events.push({ type: "text", text: "It's not very effective..." });
    if (target.hp === 0) {
      const name = other === "player" ? displayName(target.name) : `Foe ${displayName(target.name)}`;
      events.push({ type: "faint", side: other });
      events.push({ type: "text", text: `${name} fainted!` });
    }
  }

  // Resolves one full turn. Switching always goes before attacks; otherwise
  // the faster Pokémon moves first.
  turn(action: Action): BattleEvent[] {
    const events: BattleEvent[] = [];

    if (action.kind === "switch") {
      events.push({ type: "text", text: `Come back, ${displayName(this.playerMon.name)}!` });
      this.playerActive = action.to;
      events.push({ type: "switch", side: "player", index: action.to });
      events.push({ type: "text", text: `Go! ${displayName(this.playerMon.name)}!` });
      this.attack("foe", this.foeMon.moves[this.foeMove()], events);
      return events;
    }

    const playerMove = this.playerMon.moves[action.index];
    const foeMove = this.foeMon.moves[this.foeMove()];
    const ps = this.playerMon.speed;
    const fs = this.foeMon.speed;
    const playerFirst = ps > fs || (ps === fs && Math.random() < 0.5);
    const order: [Side, Move][] = playerFirst
      ? [["player", playerMove], ["foe", foeMove]]
      : [["foe", foeMove], ["player", playerMove]];

    for (const [side, move] of order) {
      if (this.playerMon.hp === 0 || this.foeMon.hp === 0) break;
      this.attack(side, move, events);
    }

    if (this.foeMon.hp === 0 && this.alive("foe") > 0) {
      this.foeActive = this.bestFoeReplacement();
      events.push({ type: "switch", side: "foe", index: this.foeActive });
      events.push({ type: "text", text: `Colton sent out ${displayName(this.foeMon.name)}!` });
    }
    return events;
  }

  // A free switch after the player's Pokémon faints.
  replace(index: number): BattleEvent[] {
    this.playerActive = index;
    return [
      { type: "switch", side: "player", index },
      { type: "text", text: `Go! ${displayName(this.playerMon.name)}!` },
    ];
  }
}
