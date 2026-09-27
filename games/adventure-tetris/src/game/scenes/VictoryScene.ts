import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem.js';
import { audio } from '../systems/AudioSystem.js';
import { createButton, floatingText, formatNumber, makeConfetti, coinFly } from '../ui/Buttons.js';
import { getWorld } from '../data/worlds.js';
import { CHESTS } from '../data/meta.js';
import { buildRunConfig } from '../data/modes.js';
import type { GameStats } from '../GameManager.js';

interface VictoryData {
  victory: boolean;
  overrideLabel?: string;
  mode: string;
  worldId: string;
  levelIndex: number;
  stats: GameStats;
  objectiveLabel: string;
  stars: number;
  coins: number;
  xp: number;
  gems: number;
  firstClear: boolean;
  bossDefeated: boolean;
  bossRushStage: number;
}

export class VictoryScene extends Phaser.Scene {
  private runData!: VictoryData;

  constructor() {
    super({ key: 'VictoryScene' });
  }

  init(data: VictoryData): void {
    this.runData = data;
  }

  create(): void {
    const save = SaveSystem.get();
    const { width, height } = this.scale;
    const cx = width / 2;
    audio.setVolumes(save.data.settings.musicVolume, save.data.settings.sfxVolume);

    const world = getWorld(this.runData.worldId);
    this.cameras.main.setBackgroundColor('#0f172a');

    // celebration: confetti rain + coins flying to the corner badge
    makeConfetti(this);
    const cornerBadge = this.add.text(width - 46, 34, '💰', { fontSize: '26px' }).setOrigin(0.5).setDepth(310);
    cornerBadge.setScale(0);
    this.tweens.add({ targets: cornerBadge, scale: 1.15, duration: 300, delay: 600, ease: 'Back.easeOut' });
    coinFly(this, cx, 210, width - 46, 34, '💰', 9);

    // apply rewards
    this.save.addCoins(this.runData.coins);
    this.save.addGems(this.runData.gems);
    const xpRes = this.save.addXp(this.runData.xp);
    void xpRes;

    this.add.text(cx, 60, this.runData.overrideLabel ?? 'LEVEL COMPLETE!', {
      fontFamily: 'Nunito', fontSize: '40px', color: '#fbbf24', fontStyle: 'bold',
      stroke: '#78350f', strokeThickness: 5,
    }).setOrigin(0.5);

    // stars
    const starY = 130;
    for (let i = 0; i < 3; i++) {
      const star = this.add.text(cx + (i - 1) * 70, starY, '⭐', { fontSize: '52px' }).setOrigin(0.5).setAlpha(0);
      this.tweens.add({
        targets: star,
        alpha: i < this.runData.stars ? 1 : 0.15,
        scale: { from: 2, to: 1 },
        delay: 400 + i * 350,
        duration: 350,
        ease: 'Back.easeOut',
        onStart: () => { if (i < this.runData.stars) audio.sfx('reward'); },
      });
    }

    // stats
    const s = this.runData.stats;
    const statsY = 200;
    this.add.text(cx, statsY, [
      `🎯 ${this.runData.objectiveLabel}`,
      `Score: ${formatNumber(s.score)}   Lines: ${s.lines}`,
      `Max Combo: x${s.maxCombo}   Tetris: ${s.tetrisCount}`,
    ].join('\n'), { fontFamily: 'Nunito', fontSize: '17px', color: '#e2e8f0', align: 'center', lineSpacing: 8 }).setOrigin(0.5);

    // rewards with count-up
    const rewardsY = statsY + 100;
    const coinText = this.add.text(cx, rewardsY, '💰 0   ⭐ 0 XP   💎 0', {
      fontFamily: 'Nunito', fontSize: '22px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.tweens.addCounter({
      from: 0, to: 1, duration: 900, delay: 900,
      onUpdate: (t) => {
        const p = t.progress;
        coinText.setText(`💰 ${formatNumber(Math.round(this.runData.coins * p))}   ⭐ ${Math.round(this.runData.xp * p)} XP   💎 ${Math.round(this.runData.gems * p)}`);
      },
    });

    if (this.runData.firstClear) {
      floatingText(this, cx, rewardsY + 44, '🎉 FIRST CLEAR BONUS!', '#22c55e', 18);
    }
    if (xpRes.leveledUp) {
      floatingText(this, cx, rewardsY + 70, `⬆️ PLAYER LEVEL ${xpRes.newLevel}!`, '#38bdf8', 20);
    }

    // chest reward chance on first clear
    if (this.runData.firstClear) {
      const chest = CHESTS[this.runData.stars >= 3 ? 2 : this.runData.stars >= 2 ? 1 : 0];
      const chestText = this.add.text(cx, rewardsY + 104, `${chest.emoji} ${chest.name} earned!`, {
        fontFamily: 'Nunito', fontSize: '17px', color: '#f97316',
      }).setOrigin(0.5).setAlpha(0);
      this.tweens.add({ targets: chestText, alpha: 1, delay: 1800, duration: 400 });
      this.save.addCoins(chest.coinRange[0]);
    }

    // buttons
    const btnY = height - 110;
    const isAdventure = this.runData.mode === 'adventure';
    const hasNext = isAdventure && this.runData.levelIndex < 10;
    if (hasNext) {
      createButton(this, cx - 110, btnY, '▶ NEXT LEVEL', () => {
        const config = buildRunConfig('adventure', { worldId: this.runData.worldId, levelIndex: this.runData.levelIndex + 1 });
        this.scene.start('LevelIntroScene', { config });
      }, { bgColor: 0x22c55e, width: 190 });
    } else if (isAdventure) {
      // world complete!
      this.add.text(cx, btnY - 60, `${world.emoji} WORLD CLEARED!`, {
        fontFamily: 'Nunito', fontSize: '24px', color: '#22c55e', fontStyle: 'bold',
      }).setOrigin(0.5);
    }
    createButton(this, cx + (hasNext ? 110 : 0), btnY, '🗺️ MAP', () => {
      this.scene.start(isAdventure ? 'WorldMapScene' : 'MainMenuScene', { worldId: this.runData.worldId });
    }, { bgColor: 0x3b82f6, width: 180 });
    createButton(this, cx, btnY + 58, '🏠 MENU', () => this.scene.start('MainMenuScene'), { bgColor: 0x475569, width: 180 });
  }

  private get save(): SaveSystem {
    return SaveSystem.get();
  }
}
