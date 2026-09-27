import Phaser from 'phaser';
import type { RunConfig } from '../GameManager.js';
import { audio } from '../systems/AudioSystem.js';
import { makeWorldBackground } from '../ui/Buttons.js';
import { getWorld } from '../data/worlds.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { CHARACTERS, COMPANIONS } from '../data/meta.js';

export class LevelIntroScene extends Phaser.Scene {
  private config!: RunConfig;
  private skipIntro = false;

  constructor() {
    super({ key: 'LevelIntroScene' });
  }

  init(data: { config: RunConfig; skipIntro?: boolean }): void {
    this.config = data.config;
    this.skipIntro = data.skipIntro ?? false;
  }

  create(): void {
    const world = getWorld(this.config.worldId);
    const save = SaveSystem.get();
    const { width, height } = this.scale;
    const cx = width / 2;
    makeWorldBackground(this, world.theme.bgTop, world.theme.bgBottom, world.theme.particle);

    const charDef = CHARACTERS.find((c) => c.id === save.data.selectedCharacter);
    const compDef = COMPANIONS.find((c) => c.id === save.data.selectedCompanion);

    this.add.text(cx, height * 0.28, `${world.emoji} ${world.nameId.toUpperCase()}`, {
      fontFamily: 'Nunito', fontSize: '30px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(cx, height * 0.38, `LEVEL ${this.config.levelIndex}`, {
      fontFamily: 'Nunito', fontSize: '22px', color: '#93c5fd',
    }).setOrigin(0.5);

    this.add.text(cx, height * 0.47, `🎯 ${this.config.objective.label}`, {
      fontFamily: 'Nunito', fontSize: '19px', color: '#fbbf24', fontStyle: 'bold',
      backgroundColor: '#1e293b', padding: { x: 18, y: 10 },
    }).setOrigin(0.5);

    if (this.config.boss) {
      this.add.text(cx, height * 0.56, `${this.config.boss.emoji} ${this.config.boss.name}  HP ${this.config.boss.hp}`, {
        fontFamily: 'Nunito', fontSize: '17px', color: '#fca5a5',
      }).setOrigin(0.5);
    }

    this.add.text(cx, height * 0.66, `${charDef?.emoji ?? ''}${compDef ? ' + ' + compDef.emoji : ''}`, {
      fontSize: '42px',
    }).setOrigin(0.5);

    // countdown
    let count = this.skipIntro ? 1 : 3;
    const cdText = this.add.text(cx, height * 0.78, `${count}`, {
      fontFamily: 'Nunito', fontSize: '64px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    audio.sfx('ui');

    const timer = this.time.addEvent({
      delay: 800,
      loop: true,
      callback: () => {
        count--;
        if (count <= 0) {
          timer.remove();
          cdText.setText('GO!');
          this.tweens.add({ targets: cdText, alpha: 0, scale: 2, duration: 300 });
          this.time.delayedCall(300, () => this.startGameplay());
        } else {
          audio.sfx('ui');
          cdText.setText(`${count}`);
          this.tweens.add({ targets: cdText, scale: 1.3, duration: 150, yoyo: true });
        }
      },
    });

    // tap to skip
    this.input.once('pointerdown', () => {
      timer.remove();
      this.startGameplay();
    });
  }

  private startGameplay(): void {
    this.scene.start('GameplayScene', { config: this.config });
  }
}
