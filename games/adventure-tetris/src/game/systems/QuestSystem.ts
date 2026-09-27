// Quest & achievement system
import { ACHIEVEMENTS, DAILY_QUESTS, WEEKLY_QUESTS, type AchievementStats, type QuestDef } from '../data/meta.js';
import { SaveSystem, dateKey, weekKey } from './SaveSystem.js';

export interface QuestClaimResult {
  questId: string;
  coins: number;
  xp: number;
}

export class QuestSystem {
  save: SaveSystem;

  constructor(save: SaveSystem) {
    this.save = save;
  }

  record(counter: string, value: number): void {
    const d = this.save.data;
    if (d.dailyQuests.dateKey === dateKey(new Date())) {
      d.dailyQuests.progress[counter] = (d.dailyQuests.progress[counter] ?? 0) + value;
    }
    if (d.weeklyQuests.weekKey === weekKey(new Date())) {
      d.weeklyQuests.progress[counter] = (d.weeklyQuests.progress[counter] ?? 0) + value;
    }
    this.save.save();
  }

  setMax(counter: string, value: number): void {
    const d = this.save.data;
    const upd = (q: { progress: Record<string, number> }) => {
      q.progress[counter] = Math.max(q.progress[counter] ?? 0, value);
    };
    if (d.dailyQuests.dateKey === dateKey(new Date())) upd(d.dailyQuests);
    if (d.weeklyQuests.weekKey === weekKey(new Date())) upd(d.weeklyQuests);
    this.save.save();
  }

  claimable(quest: QuestDef, progress: Record<string, number>, claimed: string[]): boolean {
    return (progress[quest.counter] ?? 0) >= quest.target && !claimed.includes(quest.id);
  }

  claim(quest: QuestDef): QuestClaimResult | null {
    const d = this.save.data;
    const isDaily = DAILY_QUESTS.some((q) => q.id === quest.id);
    const store = isDaily ? d.dailyQuests : d.weeklyQuests;
    if (!this.claimable(quest, store.progress, store.claimed)) return null;
    store.claimed.push(quest.id);
    this.save.addCoins(quest.rewardCoins);
    this.save.addXp(quest.rewardXp);
    this.save.save();
    return { questId: quest.id, coins: quest.rewardCoins, xp: quest.rewardXp };
  }

  activeDaily(): QuestDef[] {
    return DAILY_QUESTS;
  }

  activeWeekly(): QuestDef[] {
    return WEEKLY_QUESTS;
  }

  dailyProgress(): Record<string, number> {
    const d = this.save.data;
    return d.dailyQuests.dateKey === dateKey(new Date()) ? d.dailyQuests.progress : {};
  }

  weeklyProgress(): Record<string, number> {
    const d = this.save.data;
    return d.weeklyQuests.weekKey === weekKey(new Date()) ? d.weeklyQuests.progress : {};
  }

  checkAchievements(stats: AchievementStats): string[] {
    const d = this.save.data;
    const newly: string[] = [];
    for (const a of ACHIEVEMENTS) {
      if (!d.achievements.includes(a.id) && a.check(stats)) {
        d.achievements.push(a.id);
        newly.push(a.id);
        this.save.addCoins(a.rewardCoins);
      }
    }
    if (newly.length) this.save.save();
    return newly;
  }
}
