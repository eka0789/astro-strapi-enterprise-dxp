// Run config builders for all game modes
import type { GameMode } from '@/types';
import { WORLDS, getLevel, getWorld, type LevelDef, type Objective } from './worlds.js';
import type { RunConfig } from '../GameManager.js';
import { dateKey } from '../systems/SaveSystem.js';

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFromString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface ModeStartOptions {
  worldId?: string;
  levelIndex?: number;
  bossRushStage?: number;
}

export function buildRunConfig(mode: GameMode, opts: ModeStartOptions = {}): RunConfig {
  const world = getWorld(opts.worldId ?? 'w1');

  const base = (over: Partial<RunConfig>): RunConfig => ({
    mode,
    worldId: world.id,
    levelIndex: opts.levelIndex ?? 1,
    gravityLevel: 0,
    specialChance: world.specialChance,
    boss: null,
    timeLimitSec: null,
    objective: { type: 'score', target: 999999999, label: 'Score tinggi!' },
    rng: Math.random,
    modifiers: {},
    parScore: 0,
    prefillGarbageRows: 0,
    obstacle: { kind: world.obstacle, color: world.theme.obstacleColor },
    ...over,
  });

  switch (mode) {
    case 'adventure': {
      const level: LevelDef = getLevel(world.id, opts.levelIndex ?? 1);
      return base({
        levelIndex: level.index,
        gravityLevel: level.gravityLevel,
        specialChance: level.specialChance,
        boss: level.boss,
        objective: level.objective,
        parScore: level.parScore,
        prefillGarbageRows: level.prefillGarbageRows,
        modifiers: level.modifiers,
      });
    }
    case 'endless':
      return base({ objective: { type: 'score', target: 999999999, label: 'Bertahan selama mungkin!' }, parScore: 50000 });
    case 'timeAttack':
      return base({
        timeLimitSec: 120,
        objective: { type: 'score', target: 999999999, label: 'Score maksimal dalam 120s!' },
        parScore: 20000,
        gravityLevel: 3,
      });
    case 'survival':
      return base({
        objective: { type: 'survive', target: 180, label: 'Bertahan 180 detik!' },
        parScore: 15000,
        gravityLevel: 2,
      });
    case 'bossRush': {
      const stage = opts.bossRushStage ?? 0;
      const w = WORLDS[Math.min(stage, WORLDS.length - 1)];
      const bossLevel = getLevel(w.id, 10);
      return base({
        worldId: w.id,
        gravityLevel: w.gravityBonus + 2,
        boss: bossLevel.boss,
        specialChance: w.specialChance,
        objective: { type: 'boss', target: 1, label: `Defeat ${bossLevel.boss?.name ?? 'Boss'}` },
        obstacle: { kind: w.obstacle, color: w.theme.obstacleColor },
        parScore: 30000,
      });
    }
    case 'puzzle': {
      const rows = 5;
      const obstacleTarget = rows * 8; // approx garbage cells
      return base({
        gravityLevel: 1,
        prefillGarbageRows: rows,
        objective: { type: 'obstacles', target: obstacleTarget, label: `Bersihkan ${obstacleTarget} obstacle!` },
        parScore: 12000,
      });
    }
    case 'daily': {
      const rng = mulberry32(seedFromString(`daily_${dateKey(new Date())}`));
      const pool: Array<() => Objective> = [
        () => ({ type: 'lines', target: 20, label: 'Daily: Clear 20 lines' }),
        () => ({ type: 'combo', target: 5, label: 'Daily: Reach combo x5' }),
        () => ({ type: 'score', target: 25000, label: 'Daily: Score 25,000' }),
        () => ({ type: 'tetris', target: 2, label: 'Daily: Perform 2 Tetris' }),
      ];
      const objective = pool[Math.floor(rng() * pool.length)]();
      return base({
        rng,
        specialChance: 0.15,
        gravityLevel: 2,
        objective,
        parScore: 25000,
      });
    }
  }
}
