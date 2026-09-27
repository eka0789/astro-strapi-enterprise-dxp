// Boss battle logic - data-driven, decoupled from rendering
import type { BossDef, BossAttackType } from '../data/worlds.js';

export interface BossAttack {
  type: BossAttackType;
  cells: number; // number of obstacle cells to inject (garbage/meteor)
  durationMs: number; // for freeze/darkness
}

export interface BossDamageResult {
  destroyed: boolean;
  phaseChanged: boolean;
  newPhase: number;
}

export class Boss {
  def: BossDef;
  hp: number;
  phase = 1;
  private attackTimer: number;
  private attackInterval: number;
  private enraged = false;

  constructor(def: BossDef) {
    this.def = def;
    this.hp = def.hp;
    this.attackTimer = def.attackIntervalMs * 0.6; // first attack slightly delayed
    this.attackInterval = def.attackIntervalMs;
  }

  update(deltaMs: number): BossAttack | null {
    this.attackTimer -= deltaMs;
    if (this.attackTimer <= 0) {
      this.attackTimer = this.attackInterval * (this.enraged ? 0.7 : 1);
      const multiplier = this.enraged ? 1.5 : 1;
      switch (this.def.attackType) {
        case 'garbage':
        case 'meteor':
          return { type: this.def.attackType, cells: Math.round(this.def.attackDamageCells * multiplier), durationMs: 0 };
        case 'freeze':
          return { type: 'freeze', cells: 0, durationMs: 5000 };
        case 'darkness':
          return { type: 'darkness', cells: 0, durationMs: 6000 };
      }
    }
    return null;
  }

  takeDamage(dmg: number): BossDamageResult {
    this.hp = Math.max(0, this.hp - Math.round(dmg));
    const ratio = this.hp / this.def.hp;
    const targetPhase = Math.min(this.def.phases, Math.floor((1 - ratio) * this.def.phases) + 1);
    let phaseChanged = false;
    if (targetPhase > this.phase) {
      this.phase = targetPhase;
      phaseChanged = true;
      if (this.phase >= this.def.phases) this.enraged = true;
    }
    return { destroyed: this.hp <= 0, phaseChanged, newPhase: this.phase };
  }

  phaseRatio(): number {
    return this.hp / this.def.hp;
  }
}

// Damage table per line-clear count, with combo & back-to-back multipliers
export function calculateBossDamage(lines: number, combo: number, backToBack: boolean, characterBonus = 0): number {
  const base = [0, 10, 25, 50, 100][Math.min(4, lines)] ?? 10;
  const comboMult = 1 + combo * 0.1;
  const b2bMult = backToBack ? 1.5 : 1;
  return Math.round(base * comboMult * b2bMult * (1 + characterBonus));
}
