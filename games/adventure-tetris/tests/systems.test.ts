import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SaveSystem, dateKey, weekKey } from '../src/game/systems/SaveSystem.js';
import { QuestSystem } from '../src/game/systems/QuestSystem.js';
import { mulberry32, seedFromString, buildRunConfig } from '../src/game/data/modes.js';
import { WORLDS, getLevel } from '../src/game/data/worlds.js';
import { EnergySystem, POWER_UP_COSTS, POWER_UPS } from '../src/game/systems/EnergySystem.js';

// localStorage mock for node environment
const store = new Map<string, string>();
const localStorageMock = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => void store.clear(),
};
vi.stubGlobal('localStorage', localStorageMock);

beforeEach(() => {
  store.clear();
  SaveSystem.resetInstance();
});

describe('SaveSystem', () => {
  it('creates default save when empty', () => {
    const s = SaveSystem.get();
    expect(s.data.coins).toBe(300);
    expect(s.data.playerLevel).toBe(1);
    expect(s.data.unlockedCharacters).toContain('explorer');
  });

  it('persists and reloads data', () => {
    const s = SaveSystem.get();
    s.addCoins(500);
    SaveSystem.resetInstance();
    const s2 = SaveSystem.get();
    expect(s2.data.coins).toBe(800);
  });

  it('spendCoins respects balance', () => {
    const s = SaveSystem.get();
    expect(s.spendCoins(100)).toBe(true);
    expect(s.spendCoins(99999)).toBe(false);
    expect(s.data.coins).toBe(200);
  });

  it('addXp triggers level up with rewards', () => {
    const s = SaveSystem.get();
    const res = s.addXp(150);
    expect(res.leveledUp).toBe(true);
    expect(s.data.playerLevel).toBe(2);
    expect(s.data.coins).toBeGreaterThan(300);
  });

  it('level completion unlocks next level only', () => {
    const s = SaveSystem.get();
    expect(s.isLevelUnlocked('w1', 1)).toBe(true);
    expect(s.isLevelUnlocked('w1', 2)).toBe(false);
    s.completeLevel('w1', 1, 2);
    expect(s.isLevelUnlocked('w1', 2)).toBe(true);
    expect(s.isLevelUnlocked('w1', 3)).toBe(false);
    expect(s.data.stars['w1_1']).toBe(2);
  });

  it('keeps best stars on repeat completion', () => {
    const s = SaveSystem.get();
    s.completeLevel('w1', 1, 1);
    s.completeLevel('w1', 1, 3);
    expect(s.data.stars['w1_1']).toBe(3);
  });

  it('records best score only when beaten', () => {
    const s = SaveSystem.get();
    expect(s.recordBestScore('endless', 1000)).toBe(true);
    expect(s.recordBestScore('endless', 500)).toBe(false);
    expect(s.data.bestScores['endless']).toBe(1000);
  });

  it('daily/weekly quest rollover resets progress', () => {
    const s = SaveSystem.get();
    s.data.dailyQuests.dateKey = '2000-01-01';
    s.data.dailyQuests.progress['lines'] = 10;
    SaveSystem.resetInstance();
    const s2 = SaveSystem.get();
    expect(s2.data.dailyQuests.progress['lines']).toBeUndefined();
    expect(s2.data.dailyQuests.dateKey).toBe(dateKey(new Date()));
  });

  it('reset restores defaults', () => {
    const s = SaveSystem.get();
    s.addCoins(10000);
    s.reset();
    expect(SaveSystem.get().data.coins).toBe(300);
  });
});

describe('QuestSystem', () => {
  it('records progress toward quests', () => {
    const save = SaveSystem.get();
    const q = new QuestSystem(save);
    q.record('lines', 5);
    q.record('lines', 7);
    expect(q.dailyProgress()['lines']).toBe(12);
  });

  it('setMax keeps highest value', () => {
    const save = SaveSystem.get();
    const q = new QuestSystem(save);
    q.setMax('combos', 3);
    q.setMax('combos', 7);
    q.setMax('combos', 5);
    expect(q.dailyProgress()['combos']).toBe(7);
  });

  it('claims completed quest with rewards', () => {
    const save = SaveSystem.get();
    const q = new QuestSystem(save);
    q.record('lines', 25);
    const quest = { id: 'd_lines', desc: '', target: 20, counter: 'lines', rewardCoins: 100, rewardXp: 60 };
    const res = q.claim(quest);
    expect(res).not.toBeNull();
    expect(res!.coins).toBe(100);
    expect(save.data.dailyQuests.claimed).toContain('d_lines');
    // cannot claim twice
    expect(q.claim(quest)).toBeNull();
  });

  it('detects achievements', () => {
    const save = SaveSystem.get();
    const q = new QuestSystem(save);
    const newly = q.checkAchievements({
      tetrisCount: 1, maxCombo: 0, perfectClears: 0, bossKills: 0, treasures: 0,
      timeAttackBest: 0, endlessBest: 0, gamesPlayed: 0, worldsCleared: 0, playTimeSec: 0,
    });
    expect(newly).toContain('first_tetris');
  });
});

describe('Mode configs & seeded rng', () => {
  it('mulberry32 is deterministic', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 10; i++) expect(a()).toBe(b());
  });

  it('seedFromString is stable', () => {
    expect(seedFromString('daily_2026-09-26')).toBe(seedFromString('daily_2026-09-26'));
    expect(seedFromString('a')).not.toBe(seedFromString('b'));
  });

  it('daily config is identical for same date', () => {
    const c1 = buildRunConfig('daily');
    const c2 = buildRunConfig('daily');
    expect(c1.objective).toEqual(c2.objective);
    // simulate piece sequences
    const seq1: number[] = [];
    const seq2: number[] = [];
    for (let i = 0; i < 20; i++) { seq1.push(c1.rng()); seq2.push(c2.rng()); }
    expect(seq1).toEqual(seq2);
  });

  it('adventure config reflects level data', () => {
    const c = buildRunConfig('adventure', { worldId: 'w1', levelIndex: 1 });
    expect(c.mode).toBe('adventure');
    expect(c.objective.type).toBe('lines');
    const lvl = getLevel('w1', 1);
    expect(c.gravityLevel).toBe(lvl.gravityLevel);
  });

  it('adventure level 10 has boss', () => {
    const c = buildRunConfig('adventure', { worldId: 'w1', levelIndex: 10 });
    expect(c.boss).not.toBeNull();
    expect(c.boss!.name).toContain('Overlord');
  });

  it('all 8 worlds have 10 levels with valid bosses at 9 & 10', () => {
    for (const w of WORLDS) {
      for (const i of [9, 10]) {
        const lvl = getLevel(w.id, i);
        expect(lvl.boss).not.toBeNull();
        expect(lvl.boss!.hp).toBeGreaterThan(0);
      }
    }
  });

  it('timeAttack has 120s limit', () => {
    const c = buildRunConfig('timeAttack');
    expect(c.timeLimitSec).toBe(120);
  });

  it('puzzle prefills garbage', () => {
    const c = buildRunConfig('puzzle');
    expect(c.prefillGarbageRows).toBeGreaterThan(0);
    expect(c.objective.type).toBe('obstacles');
  });
});

describe('EnergySystem', () => {
  it('starts with configured energy and caps at max', () => {
    const e = new EnergySystem(50);
    expect(e.energy).toBe(50);
    e.add(200);
    expect(e.energy).toBe(100);
  });

  it('spends only when affordable', () => {
    const e = new EnergySystem(30);
    expect(e.canAfford('hammer')).toBe(true);
    expect(e.spend('hammer')).toBe(true);
    expect(e.energy).toBe(30 - POWER_UP_COSTS.hammer);
    expect(e.spend('fireBlast')).toBe(false);
  });

  it('all power-ups have positive costs', () => {
    for (const pu of POWER_UPS) {
      expect(POWER_UP_COSTS[pu.id]).toBeGreaterThan(0);
    }
  });
});

describe('Week key', () => {
  it('produces stable keys within same week', () => {
    const d1 = new Date(2026, 8, 21); // Mon Sep 21 2026
    const d2 = new Date(2026, 8, 26);
    expect(weekKey(d1)).toBe(weekKey(d2));
  });
});
