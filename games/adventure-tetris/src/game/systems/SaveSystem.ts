// Save system - localStorage first, cloud-ready abstraction
import { CHARACTERS, xpForLevel } from '../data/meta.js';

const SAVE_KEY = 'adventure_tetris_save_v1';
const VERSION = 1;

export interface Settings {
  musicVolume: number; // 0..1
  sfxVolume: number; // 0..1
  screenShake: boolean;
  colorblind: boolean;
  reducedMotion: boolean;
  haptics: boolean;
  leftHanded: boolean;
}

export interface QuestProgress {
  dateKey: string;
  progress: Record<string, number>;
  claimed: string[];
}

export interface SaveData {
  version: number;
  xp: number;
  playerLevel: number;
  coins: number;
  gems: number;
  unlockedCharacters: string[];
  selectedCharacter: string;
  unlockedCompanions: string[];
  selectedCompanion: string;
  worldProgress: Record<string, number>; // worldId -> highest cleared level (0 = not started)
  stars: Record<string, number>; // `${worldId}_${levelIdx}` -> 0..3
  achievements: string[];
  dailyChallenge: { dateKey: string; completed: boolean; bestScore: number };
  dailyQuests: QuestProgress;
  weeklyQuests: QuestProgress & { weekKey: string };
  settings: Settings;
  stats: {
    totalLines: number;
    totalScore: number;
    gamesPlayed: number;
    tetrisCount: number;
    bossKills: number;
    treasures: number;
    perfectClears: number;
    maxCombo: number;
    playTimeSec: number;
    powerupsUsed: number;
  };
  bestScores: Record<string, number>; // mode -> best score
}

function defaultSettings(): Settings {
  return {
    musicVolume: 0.5,
    sfxVolume: 0.7,
    screenShake: true,
    colorblind: false,
    reducedMotion: false,
    haptics: true,
    leftHanded: false,
  };
}

function defaultSave(): SaveData {
  const today = new Date();
  return {
    version: VERSION,
    xp: 0,
    playerLevel: 1,
    coins: 300,
    gems: 10,
    unlockedCharacters: [CHARACTERS[0].id],
    selectedCharacter: CHARACTERS[0].id,
    unlockedCompanions: [],
    selectedCompanion: '',
    worldProgress: {},
    stars: {},
    achievements: [],
    dailyChallenge: { dateKey: dateKey(today), completed: false, bestScore: 0 },
    dailyQuests: { dateKey: dateKey(today), progress: {}, claimed: [] },
    weeklyQuests: { weekKey: weekKey(today), dateKey: dateKey(today), progress: {}, claimed: [] },
    settings: defaultSettings(),
    stats: {
      totalLines: 0, totalScore: 0, gamesPlayed: 0, tetrisCount: 0, bossKills: 0,
      treasures: 0, perfectClears: 0, maxCombo: 0, playTimeSec: 0, powerupsUsed: 0,
    },
    bestScores: {},
  };
}

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function weekKey(d: Date): string {
  const first = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - first.getTime()) / 86400000 + first.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${week}`;
}

export class SaveSystem {
  private static instance: SaveSystem | null = null;
  data: SaveData;

  private constructor() {
    this.data = this.load();
  }

  static get(): SaveSystem {
    if (!SaveSystem.instance) SaveSystem.instance = new SaveSystem();
    return SaveSystem.instance;
  }

  static resetInstance(): void {
    SaveSystem.instance = null;
  }

  private load(): SaveData {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return defaultSave();
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      const base = defaultSave();
      const merged: SaveData = {
        ...base,
        ...parsed,
        settings: { ...base.settings, ...(parsed.settings ?? {}) },
        stats: { ...base.stats, ...(parsed.stats ?? {}) },
        dailyChallenge: { ...base.dailyChallenge, ...(parsed.dailyChallenge ?? {}) },
        dailyQuests: { ...base.dailyQuests, ...(parsed.dailyQuests ?? {}) },
        weeklyQuests: { ...base.weeklyQuests, ...(parsed.weeklyQuests ?? {}) },
      };
      // Rollover daily/weekly
      const now = new Date();
      if (merged.dailyQuests.dateKey !== dateKey(now)) {
        merged.dailyQuests = { dateKey: dateKey(now), progress: {}, claimed: [] };
      }
      if (merged.weeklyQuests.weekKey !== weekKey(now)) {
        merged.weeklyQuests = { weekKey: weekKey(now), dateKey: dateKey(now), progress: {}, claimed: [] };
      }
      if (merged.dailyChallenge.dateKey !== dateKey(now)) {
        merged.dailyChallenge = { dateKey: dateKey(now), completed: false, bestScore: 0 };
      }
      return merged;
    } catch {
      return defaultSave();
    }
  }

  save(): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch {
      // storage full/unavailable - fail silently, game continues
    }
  }

  reset(): void {
    this.data = defaultSave();
    this.save();
  }

  // ---- economy helpers ----
  addCoins(n: number): void {
    this.data.coins += Math.max(0, Math.round(n));
    this.save();
  }

  addGems(n: number): void {
    this.data.gems += Math.max(0, Math.round(n));
    this.save();
  }

  spendCoins(n: number): boolean {
    if (this.data.coins < n) return false;
    this.data.coins -= n;
    this.save();
    return true;
  }

  spendGems(n: number): boolean {
    if (this.data.gems < n) return false;
    this.data.gems -= n;
    this.save();
    return true;
  }

  addXp(n: number): { leveledUp: boolean; newLevel: number } {
    this.data.xp += Math.max(0, Math.round(n));
    let leveledUp = false;
    while (this.data.xp >= xpForLevel(this.data.playerLevel)) {
      this.data.xp -= xpForLevel(this.data.playerLevel);
      this.data.playerLevel += 1;
      leveledUp = true;
      this.data.coins += 50 * this.data.playerLevel;
      this.data.gems += 2;
    }
    this.save();
    return { leveledUp, newLevel: this.data.playerLevel };
  }

  // ---- progression helpers ----
  isLevelUnlocked(worldId: string, levelIndex: number): boolean {
    const cleared = this.data.worldProgress[worldId] ?? 0;
    if (levelIndex === 1) return true;
    return cleared >= levelIndex - 1;
  }

  completeLevel(worldId: string, levelIndex: number, stars: number): boolean {
    const key = `${worldId}_${levelIndex}`;
    const prevStars = this.data.stars[key] ?? 0;
    this.data.stars[key] = Math.max(prevStars, stars);
    const prevProgress = this.data.worldProgress[worldId] ?? 0;
    const firstClear = levelIndex > prevProgress;
    if (firstClear) this.data.worldProgress[worldId] = levelIndex;
    this.save();
    return firstClear;
  }

  getTotalStars(): number {
    return Object.values(this.data.stars).reduce((a, b) => a + b, 0);
  }

  getWorldsCleared(): number {
    return Object.entries(this.data.worldProgress).filter(([, v]) => v >= 10).length;
  }

  recordBestScore(mode: string, score: number): boolean {
    const prev = this.data.bestScores[mode] ?? 0;
    if (score > prev) {
      this.data.bestScores[mode] = score;
      this.save();
      return true;
    }
    return false;
  }
}
