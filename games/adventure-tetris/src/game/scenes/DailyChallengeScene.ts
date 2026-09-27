import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem.js';
import { audio } from '../systems/AudioSystem.js';
import { createButton, formatNumber } from '../ui/Buttons.js';
import { buildRunConfig } from '../data/modes.js';
import { DAILY_QUESTS, WEEKLY_QUESTS } from '../data/meta.js';

export class DailyChallengeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'DailyChallengeScene' });
  }

  create(): void {
    const save = SaveSystem.get();
    const { width, height } = this.scale;
    const cx = width / 2;
    this.add.rectangle(cx, height / 2, width, height, 0x0f172a);

    this.add.text(16, 16, '◄', { fontSize: '30px', color: '#ffffff' })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { audio.sfx('ui'); this.scene.start('MainMenuScene'); });
    this.add.text(cx, 24, '📅 DAILY CHALLENGE', { fontFamily: 'Nunito', fontSize: '24px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);

    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    this.add.text(cx, 62, dateStr, { fontFamily: 'Nunito', fontSize: '14px', color: '#94a3b8' }).setOrigin(0.5);

    // challenge card
    const config = buildRunConfig('daily');
    const done = save.data.dailyChallenge.completed;
    const cardY = 150;
    this.add.rectangle(cx, cardY, Math.min(420, width - 40), 120, done ? 0x14532d : 0x1e1b4b, 0.95)
      .setStrokeStyle(2, done ? 0x22c55e : 0x8b5cf6, 1);
    this.add.text(cx, cardY - 38, config.objective.label, {
      fontFamily: 'Nunito', fontSize: '19px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(cx, cardY - 8, done ? `✅ Completed! Best: ${formatNumber(save.data.dailyChallenge.bestScore)}` : 'Reward: 💰 300 · ⭐ 150 XP · 🎁 Gold Chest', {
      fontFamily: 'Nunito', fontSize: '14px', color: done ? '#22c55e' : '#fbbf24',
    }).setOrigin(0.5);
    this.add.text(cx, cardY + 22, 'Semua pemain mendapat challenge & urutan piece yang sama hari ini', {
      fontFamily: 'Nunito', fontSize: '11px', color: '#64748b',
    }).setOrigin(0.5);

    createButton(this, cx, cardY + 105, done ? '🔁 PLAY AGAIN' : '▶ START CHALLENGE', () => {
      this.scene.start('GameplayScene', { config });
    }, { bgColor: done ? 0x475569 : 0x8b5cf6, width: 260 });

    // quests section
    const qY = cardY + 160;
    this.add.text(cx, qY - 16, 'DAILY QUESTS', { fontFamily: 'Nunito', fontSize: '15px', color: '#67e8f9', fontStyle: 'bold' }).setOrigin(0.5);
    this.renderQuests(cx, qY + 8, DAILY_QUESTS.map((q) => ({
      desc: q.desc, target: q.target, counter: q.counter, reward: `💰${q.rewardCoins}+⭐${q.rewardXp}`,
      progress: this.progressOf(q.counter, 'daily'), id: q.id,
    })));

    const wY = qY + 8 + DAILY_QUESTS.length * 44 + 30;
    this.add.text(cx, wY - 16, 'WEEKLY QUESTS', { fontFamily: 'Nunito', fontSize: '15px', color: '#a78bfa', fontStyle: 'bold' }).setOrigin(0.5);
    this.renderQuests(cx, wY + 8, WEEKLY_QUESTS.map((q) => ({
      desc: q.desc, target: q.target, counter: q.counter, reward: `💰${q.rewardCoins}+⭐${q.rewardXp}`,
      progress: this.progressOf(q.counter, 'weekly'), id: q.id,
    })));
  }

  private progressOf(counter: string, which: 'daily' | 'weekly'): number {
    const save = SaveSystem.get();
    const store = which === 'daily' ? save.data.dailyQuests : save.data.weeklyQuests;
    return store.progress[counter] ?? 0;
  }

  private renderQuests(cx: number, startY: number, quests: Array<{ desc: string; target: number; counter: string; reward: string; progress: number; id: string }>): void {
    quests.forEach((q, i) => {
      const y = startY + i * 44;
      const pct = Math.min(100, Math.round((q.progress / q.target) * 100));
      const done = pct >= 100;
      this.add.rectangle(cx, y, Math.min(420, this.scale.width - 40), 38, 0x1e293b, 0.95).setStrokeStyle(1, 0x334155, 1);
      this.add.text(cx - 195, y - 8, `${done ? '✅' : '•'} ${q.desc}`, {
        fontFamily: 'Nunito', fontSize: '13px', color: done ? '#22c55e' : '#e2e8f0',
      }).setOrigin(0, 0.5);
      this.add.text(cx - 195, y + 8, `${formatNumber(Math.min(q.progress, q.target))} / ${formatNumber(q.target)} · ${q.reward}`, {
        fontFamily: 'Nunito', fontSize: '10px', color: '#94a3b8',
      }).setOrigin(0, 0.5);
      // mini progress bar
      const bw = 80;
      this.add.rectangle(cx + 150, y, bw, 6, 0x334155).setOrigin(0.5);
      this.add.rectangle(cx + 150 - bw / 2, y, Math.max(2, (bw * pct) / 100), 6, done ? 0x22c55e : 0x67e8f9).setOrigin(0, 0.5);
    });
  }
}
