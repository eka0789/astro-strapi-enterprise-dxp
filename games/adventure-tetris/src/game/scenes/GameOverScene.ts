import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem.js';
import { audio } from '../systems/AudioSystem.js';
import { createButton, formatNumber } from '../ui/Buttons.js';
import { buildRunConfig } from '../data/modes.js';
import type { GameStats } from '../GameManager.js';

interface GameOverData {
  victory: boolean;
  mode: string;
  worldId: string;
  levelIndex: number;
  stats: GameStats;
  objectiveLabel: string;
  progress: number;
  stars: number;
  coins: number;
  xp: number;
  gems: number;
  firstClear: boolean;
  bossDefeated: boolean;
}

export class GameOverScene extends Phaser.Scene {
  private runData!: GameOverData;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data: GameOverData): void {
    this.runData = data;
  }

  create(): void {
    const save = SaveSystem.get();
    const { width, height } = this.scale;
    const cx = width / 2;
    audio.setVolumes(save.data.settings.musicVolume, save.data.settings.sfxVolume);

    // apply partial rewards
    this.save.addCoins(this.runData.coins);
    this.save.addXp(this.runData.xp);

    // dramatic entrance
    this.cameras.main.fadeIn(400, 0, 0, 0);

    this.add.rectangle(cx, height / 2, width, height, 0x0f172a, 0.92);

    const almost = this.runData.progress >= 0.7;
    const title = almost ? 'ALMOST THERE!' : 'GAME OVER';
    this.add.text(cx, height * 0.18, title, {
      fontFamily: 'Nunito', fontSize: `${Math.min(46, Math.floor(width / 10))}px`, color: almost ? '#fbbf24' : '#ef4444', fontStyle: 'bold',
    }).setOrigin(0.5);

    if (almost) {
      this.add.text(cx, height * 0.18 + 42, `Kamu hampir mencapai objective (${Math.round(this.runData.progress * 100)}%)!`, {
        fontFamily: 'Nunito', fontSize: '15px', color: '#cbd5e1',
      }).setOrigin(0.5);
    }

    const s = this.runData.stats;
    this.add.text(cx, height * 0.38, [
      `Score: ${formatNumber(s.score)}`,
      `Lines: ${s.lines}   Max Combo: x${s.maxCombo}`,
      `Objective: ${this.runData.objectiveLabel}`,
      `Progress: ${Math.round(this.runData.progress * 100)}%`,
    ].join('\n'), { fontFamily: 'Nunito', fontSize: '18px', color: '#e2e8f0', align: 'center', lineSpacing: 10 }).setOrigin(0.5);

    this.add.text(cx, height * 0.55, `💰 +${this.runData.coins}   ⭐ +${this.runData.xp} XP`, {
      fontFamily: 'Nunito', fontSize: '20px', color: '#fbbf24', fontStyle: 'bold',
    }).setOrigin(0.5);

    const retryLabel = this.runData.mode === 'adventure' ? '🔄 TRY AGAIN' : '🔄 PLAY AGAIN';
    createButton(this, cx, height * 0.68, retryLabel, () => {
      const mode = this.runData.mode as 'adventure' | 'endless' | 'timeAttack' | 'daily' | 'bossRush' | 'puzzle' | 'survival';
      const config = buildRunConfig(mode, { worldId: this.runData.worldId, levelIndex: this.runData.levelIndex });
      this.scene.start('GameplayScene', { config });
    }, { bgColor: 0x10b981, width: 220 });

    createButton(this, cx, height * 0.68 + 60, this.runData.mode === 'adventure' ? '🗺️ WORLD MAP' : '🏠 MENU', () => {
      this.scene.start(this.runData.mode === 'adventure' ? 'WorldMapScene' : 'MainMenuScene', { worldId: this.runData.worldId });
    }, { bgColor: 0x3b82f6, width: 220 });
  }

  private get save(): SaveSystem {
    return SaveSystem.get();
  }
}
