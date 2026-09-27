// Random event system - anti-boredom & surprise moments
import type { Board } from '../board/Board.js';

export type RandomEventType =
  | 'doubleScore' | 'treasureRush' | 'meteorShower' | 'magicStorm'
  | 'mysteriousChest' | 'blockFrenzy' | 'ancientPortal' | 'timeAttack';

export interface RandomEventDef {
  id: RandomEventType;
  name: string;
  emoji: string;
  durationMs: number;
  color: number;
  desc: string;
}

export const RANDOM_EVENTS: Record<RandomEventType, RandomEventDef> = {
  doubleScore: { id: 'doubleScore', name: 'DOUBLE SCORE!', emoji: '💰', durationMs: 12000, color: 0xf59e0b, desc: 'Semua score x2!' },
  treasureRush: { id: 'treasureRush', name: 'TREASURE RUSH!', emoji: '💎', durationMs: 12000, color: 0x22c55e, desc: 'Treasure block bertebaran!' },
  meteorShower: { id: 'meteorShower', name: 'METEOR SHOWER!', emoji: '☄️', durationMs: 0, color: 0xef4444, desc: 'Meteor menghancurkan block acak!' },
  magicStorm: { id: 'magicStorm', name: 'MAGIC STORM!', emoji: '⚡', durationMs: 0, color: 0x8b5cf6, desc: 'Petir membersihkan baris acak!' },
  mysteriousChest: { id: 'mysteriousChest', name: 'MYSTERIOUS CHEST!', emoji: '🎁', durationMs: 0, color: 0xf97316, desc: 'Kamu menemukan chest!' },
  blockFrenzy: { id: 'blockFrenzy', name: 'BLOCK FRENZY!', emoji: '🔥', durationMs: 10000, color: 0xf43f5e, desc: 'Gravitasi cepat, score x2!' },
  ancientPortal: { id: 'ancientPortal', name: 'ANCIENT PORTAL!', emoji: '🌀', durationMs: 0, color: 0x00f0ff, desc: 'Portal mengacak papan bawah!' },
  timeAttack: { id: 'timeAttack', name: 'TIME ATTACK!', emoji: '⏱️', durationMs: 0, color: 0x38bdf8, desc: '+30 detik bonus!' },
};

export interface ActiveEvent {
  def: RandomEventDef;
  remainingMs: number;
}

export class EventSystem {
  private cooldown: number;
  private activeEvents: ActiveEvent[] = [];
  private rng: () => number;

  constructor(rng: () => number = Math.random) {
    this.cooldown = 25000 + rng() * 20000; // first event after 25-45s
    this.rng = rng;
  }

  update(deltaMs: number, board: Board, linesCleared: number): RandomEventType | null {
    // expire
    this.activeEvents = this.activeEvents.filter((e) => {
      e.remainingMs -= deltaMs;
      return e.remainingMs > 0;
    });

    this.cooldown -= deltaMs;
    if (this.cooldown > 0) return null;
    this.cooldown = 45000 + this.rng() * 30000; // next event in 45-75s

    const pool: RandomEventType[] = ['doubleScore', 'treasureRush', 'mysteriousChest', 'timeAttack'];
    if (linesCleared > 0 && board.countFilled() > 20) pool.push('meteorShower', 'magicStorm', 'ancientPortal');
    if (board.countFilled() > 40) pool.push('blockFrenzy');

    const pick = pool[Math.floor(this.rng() * pool.length)];
    const def = RANDOM_EVENTS[pick];
    if (def.durationMs > 0) {
      this.activeEvents.push({ def, remainingMs: def.durationMs });
    }
    return pick;
  }

  isActive(id: RandomEventType): boolean {
    return this.activeEvents.some((e) => e.def.id === id);
  }

  getActive(): ActiveEvent[] {
    return [...this.activeEvents];
  }
}
