import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem.js';
import { audio } from '../systems/AudioSystem.js';
import { createButton, staggerIn } from '../ui/Buttons.js';
import { CHARACTERS, COMPANIONS, ACHIEVEMENTS, type AchievementStats } from '../data/meta.js';

export class CollectionScene extends Phaser.Scene {
  private tab: 'characters' | 'companions' | 'achievements' = 'characters';
  private listContainer: Phaser.GameObjects.Container | null = null;

  constructor() {
    super({ key: 'CollectionScene' });
  }

  create(): void {
    this.build();
  }

  private build(): void {
    const save = SaveSystem.get();
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x0f172a);

    const narrow = width < 560;
    this.add.text(16, 16, '◄', { fontSize: '30px', color: '#ffffff' })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { audio.sfx('ui'); this.scene.start('MainMenuScene'); });
    this.add.text(width / 2, 24, '📦 COLLECTION', { fontFamily: 'Nunito', fontSize: narrow ? '18px' : '24px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(width - 16, narrow ? 26 : 18, narrow
      ? `⭐ ${save.getTotalStars()} · LV ${save.data.playerLevel}`
      : `⭐ ${save.getTotalStars()} stars · LV ${save.data.playerLevel}`, {
      fontFamily: 'Nunito', fontSize: narrow ? '12px' : '15px', color: '#93c5fd',
    }).setOrigin(1, 0);

    const tabs: Array<[typeof this.tab, string, number]> = [
      ['characters', '🦸 CHARACTERS', 0x3b82f6],
      ['companions', '🐾 BUDDIES', 0x22c55e],
      ['achievements', '🏆 ACHIEVEMENTS', 0xf59e0b],
    ];
    const tabW = Math.min(160, Math.floor((width - 40) / 3));
    const tabSpacing = tabW + 10;
    const tabY = narrow ? 80 : 64;
    tabs.forEach(([id, label, color], i) => {
      createButton(this, width / 2 + (i - 1) * tabSpacing, tabY, label, () => {
        this.tab = id;
        audio.sfx('ui');
        this.listContainer?.destroy();
        this.build();
      }, { bgColor: this.tab === id ? color : 0x334155, fontSize: narrow ? 12 : 14, width: tabW });
    });

    this.listContainer = this.add.container(0, 0);
    const startY = narrow ? 130 : 108;
    const rows: Phaser.GameObjects.Container[] = [];
    if (this.tab === 'characters') {
      CHARACTERS.forEach((c, i) => {
        const owned = save.data.unlockedCharacters.includes(c.id);
        const equipped = save.data.selectedCharacter === c.id;
        rows.push(this.entryRow(width / 2, startY + i * 60, c.emoji, c.name, c.desc, owned, equipped, () => {
          save.data.selectedCharacter = c.id;
          save.save();
          audio.sfx('reward');
          this.listContainer?.destroy();
          this.build();
        }));
      });
    } else if (this.tab === 'companions') {
      COMPANIONS.forEach((c, i) => {
        const owned = save.data.unlockedCompanions.includes(c.id);
        const equipped = save.data.selectedCompanion === c.id;
        rows.push(this.entryRow(width / 2, startY + i * 60, c.emoji, c.name, c.desc, owned, equipped, () => {
          save.data.selectedCompanion = c.id;
          save.save();
          audio.sfx('reward');
          this.listContainer?.destroy();
          this.build();
        }));
      });
    } else {
      const stats: AchievementStats = {
        tetrisCount: save.data.stats.tetrisCount,
        maxCombo: save.data.stats.maxCombo,
        perfectClears: save.data.stats.perfectClears,
        bossKills: save.data.stats.bossKills,
        treasures: save.data.stats.treasures,
        timeAttackBest: save.data.bestScores['timeAttack'] ?? 0,
        endlessBest: save.data.bestScores['endless'] ?? 0,
        gamesPlayed: save.data.stats.gamesPlayed,
        worldsCleared: save.getWorldsCleared(),
        playTimeSec: save.data.stats.playTimeSec,
      };
      const rowW = Math.min(500, width - 40);
      const rowLeft = width / 2 - rowW / 2;
      ACHIEVEMENTS.forEach((a, i) => {
        const done = save.data.achievements.includes(a.id) || a.check(stats);
        const row = this.add.container(0, 0);
        row.add(this.add.rectangle(width / 2, startY + i * 60, rowW, 54, done ? 0x14532d : 0x1e293b, 0.95).setStrokeStyle(1, 0x334155, 1));
        row.add(this.add.text(rowLeft + 10, startY + i * 60, done ? a.emoji : '🔒', { fontSize: '24px' }).setOrigin(0, 0.5));
        row.add(this.add.text(rowLeft + 52, startY + i * 60 - 9, `${a.name} ${done ? '✓' : ''}`, {
          fontFamily: 'Nunito', fontSize: '15px', color: done ? '#22c55e' : '#ffffff', fontStyle: 'bold',
        }).setOrigin(0, 0.5));
        row.add(this.add.text(rowLeft + 52, startY + i * 60 + 10, `${a.desc} · 💰${a.rewardCoins}`, {
          fontFamily: 'Nunito', fontSize: '11px', color: '#94a3b8', wordWrap: { width: rowW - 64 },
        }).setOrigin(0, 0.5));
        rows.push(row);
      });
    }
    this.listContainer.add(rows);
    staggerIn(rows, 40, 26, 40);
    void height;
  }

  private entryRow(
    x: number, y: number, emoji: string, name: string, desc: string,
    owned: boolean, equipped: boolean, onEquip: () => void
  ): Phaser.GameObjects.Container {
    const rowW = Math.min(500, this.scale.width - 40);
    const rowLeft = x - rowW / 2;
    const actionCx = x + rowW / 2 - 62;
    const row = this.add.container(0, 0);
    row.add(this.add.rectangle(x, y, rowW, 54, equipped ? 0x14532d : 0x1e293b, 0.95).setStrokeStyle(1, 0x334155, 1));
    row.add(this.add.text(rowLeft + 10, y, owned ? emoji : '🔒', { fontSize: '24px' }).setOrigin(0, 0.5));
    row.add(this.add.text(rowLeft + 52, y - 9, name, { fontFamily: 'Nunito', fontSize: '15px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0, 0.5));
    row.add(this.add.text(rowLeft + 52, y + 10, desc, { fontFamily: 'Nunito', fontSize: '11px', color: '#94a3b8' }).setOrigin(0, 0.5));
    if (equipped) {
      row.add(this.add.text(actionCx, y, '✓', { fontSize: '22px', color: '#22c55e' }).setOrigin(0.5));
    } else if (owned) {
      row.add(createButton(this, actionCx, y, 'EQUIP', onEquip, { bgColor: 0x22c55e, fontSize: 12, width: 100 }));
    }
    return row;
  }
}
