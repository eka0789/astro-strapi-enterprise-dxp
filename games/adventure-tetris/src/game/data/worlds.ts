// Adventure Tetris - World & Level data
// Data-driven: setiap dunia, level, boss, dan modifier didefinisikan di sini.

export type ObjectiveType =
  | 'lines'
  | 'combo'
  | 'score'
  | 'obstacles'
  | 'treasure'
  | 'tetris'
  | 'survive'
  | 'boss'
  | 'garbage';

export interface Objective {
  type: ObjectiveType;
  target: number;
  label: string;
}

export type ObstacleKind = 'vine' | 'ice' | 'lava' | 'shadow' | 'crystal' | 'slime' | 'storm' | 'void';

export type BossAttackType = 'garbage' | 'freeze' | 'darkness' | 'meteor';

export interface BossDef {
  id: string;
  name: string;
  emoji: string;
  hp: number;
  attackIntervalMs: number;
  attackType: BossAttackType;
  attackDamageCells: number;
  phases: number; // phase transitions at 75% / 50% / 25%
  rewardCoins: number;
  rewardGems: number;
}

export interface WorldTheme {
  bgTop: number;
  bgBottom: number;
  accent: number;
  particle: number;
  obstacleColor: number;
}

export interface WorldDef {
  id: string;
  index: number; // 1-based
  name: string;
  nameId: string;
  emoji: string;
  theme: WorldTheme;
  obstacle: ObstacleKind;
  specialChance: number; // chance per piece to carry a special cell
  musicRoot: number; // Hz base for procedural music
  gravityBonus: number; // extra gravity levels applied
  scoreScale: number; // target scaling for objectives
}

export type LevelKind = 'normal' | 'treasure' | 'miniBoss' | 'boss' | 'challenge' | 'mystery';

export interface LevelDef {
  worldId: string;
  index: number; // 1..10
  kind: LevelKind;
  name: string;
  objective: Objective;
  gravityLevel: number;
  specialChance: number;
  boss: BossDef | null;
  parScore: number;
  timeLimitSec: number | null;
  prefillGarbageRows: number;
  modifiers: { doubleScore?: boolean; fastGravity?: boolean; darknessPreview?: boolean };
}

const OBJECTIVE_POOL: Array<(s: number) => Objective> = [
  (s) => ({ type: 'lines', target: 5 + Math.floor(s * 2), label: `Clear ${5 + Math.floor(s * 2)} lines` }),
  (s) => ({ type: 'combo', target: 3 + Math.floor(s * 0.5), label: `Reach combo x${3 + Math.floor(s * 0.5)}` }),
  (s) => ({ type: 'score', target: 5000 * s, label: `Score ${(5000 * s).toLocaleString()}` }),
  (s) => ({ type: 'obstacles', target: 4 + Math.floor(s * 1.5), label: `Destroy ${4 + Math.floor(s * 1.5)} obstacles` }),
  (s) => ({ type: 'tetris', target: 1 + Math.floor(s / 8), label: `Perform ${1 + Math.floor(s / 8)} Tetris` }),
  (s) => ({ type: 'treasure', target: 3 + Math.floor(s * 0.4), label: `Collect ${3 + Math.floor(s * 0.4)} treasures` }),
  (s) => ({ type: 'survive', target: 90 + Math.floor(s * 10), label: `Survive ${90 + Math.floor(s * 10)}s` }),
  (s) => ({ type: 'lines', target: 10 + Math.floor(s * 2), label: `Clear ${10 + Math.floor(s * 2)} lines` }),
];

function buildLevels(world: WorldDef): LevelDef[] {
  const levels: LevelDef[] = [];
  const s = world.scoreScale;
  for (let i = 1; i <= 10; i++) {
    let kind: LevelKind = 'normal';
    let objective: Objective;
    let boss: BossDef | null = null;
    let name = `Level ${i}`;

    if (i === 4) {
      kind = 'treasure';
      objective = { type: 'treasure', target: 3 + Math.floor(s * 0.4), label: `Collect ${3 + Math.floor(s * 0.4)} treasures` };
      name = 'Treasure Hunt';
    } else if (i === 6) {
      kind = 'challenge';
      objective = OBJECTIVE_POOL[(world.index + 2) % OBJECTIVE_POOL.length](s);
      name = 'Challenge';
    } else if (i === 7) {
      kind = 'mystery';
      objective = OBJECTIVE_POOL[(world.index + 5) % OBJECTIVE_POOL.length](s);
      name = 'Mystery';
    } else if (i === 9) {
      kind = 'miniBoss';
      boss = makeBoss(world, true);
      objective = { type: 'boss', target: 1, label: `Defeat ${boss.name}` };
      name = `Mini Boss: ${boss.name}`;
    } else if (i === 10) {
      kind = 'boss';
      boss = makeBoss(world, false);
      objective = { type: 'boss', target: 1, label: `Defeat ${boss.name}` };
      name = `BOSS: ${boss.name}`;
    } else {
      // Level 1 always introduces with simple line clears (design doc: LEVEL 1 = Clear 5 lines)
      objective = i === 1
        ? { type: 'lines', target: 5, label: 'Clear 5 lines' }
        : OBJECTIVE_POOL[(world.index + i - 1) % OBJECTIVE_POOL.length](s);
    }

    levels.push({
      worldId: world.id,
      index: i,
      kind,
      name,
      objective,
      gravityLevel: (i - 1) + world.gravityBonus,
      specialChance: world.specialChance,
      boss,
      parScore: 8000 * s + i * 1200,
      timeLimitSec: null,
      prefillGarbageRows: world.index > 1 && i >= 5 ? Math.min(2, world.index - 1) : 0,
      modifiers: world.index >= 3 && i === 8 ? { doubleScore: true } : {},
    });
  }
  return levels;
}

function makeBoss(world: WorldDef, mini: boolean): BossDef {
  const s = world.scoreScale;
  const attacks: BossAttackType[] = ['garbage', 'freeze', 'darkness', 'meteor'];
  return {
    id: `${world.id}_${mini ? 'mini' : 'boss'}`,
    name: mini ? `${world.nameId} Guardian` : `${world.nameId} Overlord`,
    emoji: world.emoji,
    hp: Math.round((mini ? 200 : 450) * s),
    attackIntervalMs: Math.max(9000, 16000 - world.index * 800) * (mini ? 1.2 : 1),
    attackType: attacks[world.index % attacks.length],
    attackDamageCells: 2 + world.index,
    phases: mini ? 2 : 4,
    rewardCoins: (mini ? 120 : 350) * world.index,
    rewardGems: mini ? 3 : 10,
  };
}

const W: Array<Omit<WorldDef, 'index' | 'levels'>> = [
  {
    id: 'w1', name: 'Green Forest', nameId: 'Hutan Hijau', emoji: '🌲',
    theme: { bgTop: 0x0b3d2e, bgBottom: 0x05261c, accent: 0x22c55e, particle: 0x86efac, obstacleColor: 0x166534 },
    obstacle: 'vine', specialChance: 0.08, musicRoot: 220, gravityBonus: 0, scoreScale: 1,
  },
  {
    id: 'w2', name: 'Desert Ruins', nameId: 'Gurun Pasir', emoji: '🏜️',
    theme: { bgTop: 0x7c4a03, bgBottom: 0x432601, accent: 0xf59e0b, particle: 0xfcd34d, obstacleColor: 0x92400e },
    obstacle: 'ice', specialChance: 0.10, musicRoot: 246, gravityBonus: 1, scoreScale: 1.4,
  },
  {
    id: 'w3', name: 'Ice Mountain', nameId: 'Pegunungan Es', emoji: '🏔️',
    theme: { bgTop: 0x1e3a5f, bgBottom: 0x0c1f33, accent: 0x38bdf8, particle: 0xbae6fd, obstacleColor: 0x0e7490 },
    obstacle: 'ice', specialChance: 0.12, musicRoot: 261, gravityBonus: 2, scoreScale: 1.8,
  },
  {
    id: 'w4', name: 'Volcanic Land', nameId: 'Darah Vulkanik', emoji: '🌋',
    theme: { bgTop: 0x5c0a0a, bgBottom: 0x2d0505, accent: 0xef4444, particle: 0xfca5a5, obstacleColor: 0x991b1b },
    obstacle: 'lava', specialChance: 0.14, musicRoot: 196, gravityBonus: 3, scoreScale: 2.2,
  },
  {
    id: 'w5', name: 'Sky Kingdom', nameId: 'Kerajaan Langit', emoji: '🏰',
    theme: { bgTop: 0x312e81, bgBottom: 0x1e1b4b, accent: 0x818cf8, particle: 0xc7d2fe, obstacleColor: 0x4338ca },
    obstacle: 'storm', specialChance: 0.15, musicRoot: 293, gravityBonus: 4, scoreScale: 2.6,
  },
  {
    id: 'w6', name: 'Underwater City', nameId: 'Kota Bawah Laut', emoji: '🌊',
    theme: { bgTop: 0x0c4a6e, bgBottom: 0x082f49, accent: 0x22d3ee, particle: 0xa5f3fc, obstacleColor: 0x0369a1 },
    obstacle: 'slime', specialChance: 0.16, musicRoot: 174, gravityBonus: 4, scoreScale: 3.0,
  },
  {
    id: 'w7', name: 'Dark Castle', nameId: 'Kastil Gelap', emoji: '🦇',
    theme: { bgTop: 0x2e1065, bgBottom: 0x1e1b4b, accent: 0xa78bfa, particle: 0xd8b4fe, obstacleColor: 0x6d28d9 },
    obstacle: 'shadow', specialChance: 0.18, musicRoot: 164, gravityBonus: 5, scoreScale: 3.4,
  },
  {
    id: 'w8', name: 'Space Dimension', nameId: 'Dimensi Angkasa', emoji: '🚀',
    theme: { bgTop: 0x111827, bgBottom: 0x030712, accent: 0x00f0ff, particle: 0x67e8f9, obstacleColor: 0x374151 },
    obstacle: 'void', specialChance: 0.20, musicRoot: 329, gravityBonus: 6, scoreScale: 4.0,
  },
];

export const WORLDS: WorldDef[] = W.map((w, i) => ({ ...w, index: i + 1 }));

export function getWorld(worldId: string): WorldDef {
  return WORLDS.find((w) => w.id === worldId) ?? WORLDS[0];
}

export function getLevel(worldId: string, levelIndex: number): LevelDef {
  const world = getWorld(worldId);
  const levels = buildLevels(world);
  return levels[Math.max(0, Math.min(levels.length - 1, levelIndex - 1))];
}

export function getWorldLevels(worldId: string): LevelDef[] {
  return buildLevels(getWorld(worldId));
}

export function nodeIcon(kind: LevelKind): string {
  switch (kind) {
    case 'treasure': return '💎';
    case 'miniBoss': return '⚔️';
    case 'boss': return '👑';
    case 'challenge': return '🔥';
    case 'mystery': return '❓';
    default: return '⭐';
  }
}
