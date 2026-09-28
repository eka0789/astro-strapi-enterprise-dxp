// Adventure Tetris - Meta content: characters, companions, chests, quests, achievements

export interface CharacterDef {
  id: string;
  name: string;
  emoji: string;
  price: number; // coins; 0 = default unlocked
  gemPrice?: number;
  passive: { score?: number; energy?: number; coins?: number; bossDamage?: number; startEnergy?: number };
  desc: string;
}

export interface CompanionDef {
  id: string;
  name: string;
  emoji: string;
  price: number;
  passive: { score?: number; energy?: number; coins?: number; powerDuration?: number };
  desc: string;
}

export interface ChestDef {
  id: string;
  name: string;
  emoji: string;
  priceCoins: number;
  priceGems: number;
  coinRange: [number, number];
  gemChance: number;
  gemRange: [number, number];
  characterChance: number;
  companionChance: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export const CHARACTERS: CharacterDef[] = [
  { id: 'explorer', name: 'Explorer', emoji: '🧑', price: 0, passive: {}, desc: 'Petualang muda yang ceria dan berani.' },
  { id: 'knight', name: 'Knight', emoji: '🛡️', price: 1500, passive: { bossDamage: 0.05 }, desc: '+5% damage ke boss.' },
  { id: 'mage', name: 'Mage', emoji: '🧙', price: 2500, passive: { energy: 0.10 }, desc: '+10% energy gain.' },
  { id: 'ninja', name: 'Ninja', emoji: '🗡️', price: 3500, passive: { score: 0.05 }, desc: '+5% score.' },
  { id: 'pirate', name: 'Pirate', emoji: '⚓', price: 4500, passive: { coins: 0.10 }, desc: '+10% coin.' },
  { id: 'samurai', name: 'Samurai', emoji: '⛩️', price: 6000, passive: { startEnergy: 30 }, desc: 'Mulai level dengan +30 energy.' },
  { id: 'cyber', name: 'Cyber Hero', emoji: '🤖', price: 8000, gemPrice: 30, passive: { score: 0.07, energy: 0.05 }, desc: '+7% score, +5% energy.' },
  { id: 'dragonrider', name: 'Dragon Rider', emoji: '🐉', price: 12000, gemPrice: 60, passive: { score: 0.05, energy: 0.05, coins: 0.05 }, desc: '+5% score, energy & coin.' },
];

export const COMPANIONS: CompanionDef[] = [
  { id: 'fox', name: 'Fox', emoji: '🦊', price: 800, passive: { coins: 0.05 }, desc: '+5% coin.' },
  { id: 'dragon', name: 'Dragon', emoji: '🐲', price: 1600, passive: { energy: 0.05 }, desc: '+5% energy.' },
  { id: 'fairy', name: 'Fairy', emoji: '🧚', price: 2400, passive: { score: 0.05 }, desc: '+5% score.' },
  { id: 'robot', name: 'Robot', emoji: '🔩', price: 3200, passive: { powerDuration: 0.05 }, desc: '+5% durasi power-up.' },
  { id: 'cat', name: 'Cat', emoji: '🐱', price: 1200, passive: { score: 0.03 }, desc: '+3% score.' },
];

export const CHESTS: ChestDef[] = [
  { id: 'wood', name: 'Wood Chest', emoji: '🧰', priceCoins: 150, priceGems: 0, coinRange: [40, 120], gemChance: 0.05, gemRange: [1, 2], characterChance: 0.03, companionChance: 0.05, rarity: 'common' },
  { id: 'silver', name: 'Silver Chest', emoji: '🥈', priceCoins: 400, priceGems: 0, coinRange: [120, 300], gemChance: 0.15, gemRange: [2, 5], characterChance: 0.08, companionChance: 0.12, rarity: 'rare' },
  { id: 'gold', name: 'Gold Chest', emoji: '🥇', priceCoins: 900, priceGems: 5, coinRange: [300, 700], gemChance: 0.35, gemRange: [4, 10], characterChance: 0.15, companionChance: 0.2, rarity: 'epic' },
  { id: 'magic', name: 'Magic Chest', emoji: '🔮', priceCoins: 2000, priceGems: 12, coinRange: [700, 1500], gemChance: 0.6, gemRange: [8, 18], characterChance: 0.25, companionChance: 0.3, rarity: 'epic' },
  { id: 'legendary', name: 'Legendary Chest', emoji: '💎', priceCoins: 5000, priceGems: 30, coinRange: [1500, 3500], gemChance: 1.0, gemRange: [15, 40], characterChance: 0.45, companionChance: 0.5, rarity: 'legendary' },
];

export interface QuestDef {
  id: string;
  desc: string;
  target: number;
  counter: QuestCounter;
  rewardCoins: number;
  rewardXp: number;
}

export type QuestCounter =
  | 'lines'
  | 'combos'
  | 'powerups'
  | 'games'
  | 'totalScore'
  | 'bossKills'
  | 'tetris'
  | 'treasures';

export const DAILY_QUESTS: QuestDef[] = [
  { id: 'd_lines', desc: 'Clear 20 lines', target: 20, counter: 'lines', rewardCoins: 100, rewardXp: 60 },
  { id: 'd_combos', desc: 'Make 3 combos of x3+', target: 3, counter: 'combos', rewardCoins: 120, rewardXp: 80 },
  { id: 'd_powerups', desc: 'Use 2 power-ups', target: 2, counter: 'powerups', rewardCoins: 80, rewardXp: 50 },
];

export const WEEKLY_QUESTS: QuestDef[] = [
  { id: 'w_games', desc: 'Play 20 games', target: 20, counter: 'games', rewardCoins: 500, rewardXp: 300 },
  { id: 'w_score', desc: 'Reach 100,000 total score', target: 100000, counter: 'totalScore', rewardCoins: 800, rewardXp: 500 },
  { id: 'w_boss', desc: 'Defeat 3 bosses', target: 3, counter: 'bossKills', rewardCoins: 600, rewardXp: 400 },
];

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  emoji: string;
  check: (s: AchievementStats) => boolean;
  rewardCoins: number;
}

export interface AchievementStats {
  tetrisCount: number;
  maxCombo: number;
  perfectClears: number;
  bossKills: number;
  treasures: number;
  timeAttackBest: number;
  endlessBest: number;
  gamesPlayed: number;
  worldsCleared: number;
  playTimeSec: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_tetris', name: 'First Tetris', desc: 'Clear 4 lines at once', emoji: '🏆', check: (s) => s.tetrisCount >= 1, rewardCoins: 100 },
  { id: 'combo_master', name: 'Combo Master', desc: 'Reach combo x8', emoji: '🔥', check: (s) => s.maxCombo >= 8, rewardCoins: 250 },
  { id: 'perfect_clear', name: 'Perfect Clear', desc: 'Empty the whole board', emoji: '✨', check: (s) => s.perfectClears >= 1, rewardCoins: 300 },
  { id: 'boss_slayer', name: 'Boss Slayer', desc: 'Defeat 3 bosses', emoji: '⚔️', check: (s) => s.bossKills >= 3, rewardCoins: 400 },
  { id: 'treasure_hunter', name: 'Treasure Hunter', desc: 'Collect 10 treasures', emoji: '💎', check: (s) => s.treasures >= 10, rewardCoins: 200 },
  { id: 'speed_demon', name: 'Speed Demon', desc: 'Score 20,000 in Time Attack', emoji: '⚡', check: (s) => s.timeAttackBest >= 20000, rewardCoins: 350 },
  { id: 'untouchable', name: 'Untouchable', desc: 'Score 50,000 in Endless', emoji: '🌟', check: (s) => s.endlessBest >= 50000, rewardCoins: 500 },
  { id: 'world_explorer', name: 'World Explorer', desc: 'Clear World 1', emoji: '🗺️', check: (s) => s.worldsCleared >= 1, rewardCoins: 600 },
  { id: 'veteran', name: 'Veteran', desc: 'Play 25 games', emoji: '🎮', check: (s) => s.gamesPlayed >= 25, rewardCoins: 300 },
  { id: 'marathon', name: 'Marathon', desc: 'Play for 60 minutes total', emoji: '⏱️', check: (s) => s.playTimeSec >= 3600, rewardCoins: 400 },
];

export function xpForLevel(level: number): number {
  return 100 + (level - 1) * 50;
}
