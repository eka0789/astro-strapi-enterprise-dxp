import Phaser from 'phaser';
import { POWER_UPS, type PowerUpId, POWER_UP_COSTS } from '../systems/EnergySystem.js';
import type { Boss } from '../adventure/Boss.js';
import type { ObjectiveSystem } from '../systems/ObjectiveSystem.js';
import { formatNumber, redrawMiniPiece, drawMiniPiece } from './Buttons.js';

export const CELL = 32;
export const BOARD_COLS = 10;
export const BOARD_ROWS = 20;
export const BOARD_W = BOARD_COLS * CELL;
export const BOARD_H = BOARD_ROWS * CELL;

export interface HudState {
  score: number;
  level: number;
  lines: number;
  combo: number;
  energy: number;
  maxEnergy: number;
  nextPieces: string[];
  heldPiece: string | null;
  objective: ObjectiveSystem | null;
  boss: Boss | null;
  timeLeftSec: number | null;
  darknessActive: boolean;
}

export class HUD {
  container: Phaser.GameObjects.Container;
  private scoreText: Phaser.GameObjects.Text;
  private levelText: Phaser.GameObjects.Text;
  private comboText: Phaser.GameObjects.Text;
  private objText: Phaser.GameObjects.Text;
  private objBar: Phaser.GameObjects.Graphics;
  private energyBar: Phaser.GameObjects.Graphics;
  private energyShimmer: Phaser.GameObjects.Rectangle;
  private energyText: Phaser.GameObjects.Text;
  private nextText: Phaser.GameObjects.Text;
  private holdText: Phaser.GameObjects.Text;
  private nextSlots: Phaser.GameObjects.Container[] = [];
  private holdSlot: Phaser.GameObjects.Container;
  private shownNext: (string | undefined)[] = [undefined, undefined, undefined];
  private shownHold: string | null | undefined = undefined;
  private lastCombo = 0;
  private displayScore = 0;
  private bossBar: Phaser.GameObjects.Graphics;
  private bossText: Phaser.GameObjects.Text;
  private bossEmoji: Phaser.GameObjects.Text;
  private timerText: Phaser.GameObjects.Text;
  private powerButtons: Phaser.GameObjects.Container[] = [];
  private powerCostTexts: Phaser.GameObjects.Text[] = [];
  onPause: () => void = () => {};
  onPowerUp: (id: PowerUpId) => void = () => {};

  constructor(private scene: Phaser.Scene, boardX: number, boardY: number, scale: number) {
    this.container = scene.add.container(0, 0).setDepth(50);
    const sideL = boardX - 130 * scale;
    const sideR = boardX + BOARD_W * scale + 10 * scale;

    this.scoreText = scene.add.text(sideL, boardY, 'SCORE\n0', { fontFamily: 'Nunito', fontSize: `${20 * scale}px`, color: '#ffffff', fontStyle: 'bold', align: 'left', lineSpacing: 2 }).setOrigin(0, 0);
    this.levelText = scene.add.text(sideL, boardY + 70 * scale, '', { fontFamily: 'Nunito', fontSize: `${16 * scale}px`, color: '#93c5fd' });
    this.comboText = scene.add.text(sideL, boardY + 100 * scale, '', { fontFamily: 'Nunito', fontSize: `${24 * scale}px`, color: '#f59e0b', fontStyle: 'bold' });
    this.objText = scene.add.text(sideL, boardY + 140 * scale, '', { fontFamily: 'Nunito', fontSize: `${13 * scale}px`, color: '#e2e8f0', wordWrap: { width: 130 * scale } });
    this.objBar = scene.add.graphics();

    this.nextText = scene.add.text(sideR, boardY - 4 * scale, 'NEXT', { fontFamily: 'Nunito', fontSize: `${14 * scale}px`, color: '#94a3b8', fontStyle: 'bold' });
    for (let i = 0; i < 3; i++) {
      const slot = scene.add.container(sideR + 34 * scale, boardY + (34 + i * 62) * scale);
      this.nextSlots.push(slot);
      this.container.add(slot);
    }
    this.holdText = scene.add.text(sideR, boardY + BOARD_H * scale - 220 * scale, 'HOLD [C]', { fontFamily: 'Nunito', fontSize: `${14 * scale}px`, color: '#94a3b8', fontStyle: 'bold' });
    this.holdSlot = scene.add.container(sideR + 34 * scale, boardY + BOARD_H * scale - 190 * scale);

    this.timerText = scene.add.text(scene.scale.width / 2, boardY - 34 * scale, '', { fontFamily: 'Nunito', fontSize: `${22 * scale}px`, color: '#f43f5e', fontStyle: 'bold' }).setOrigin(0.5);

    this.bossText = scene.add.text(scene.scale.width / 2, boardY - 92 * scale, '', { fontFamily: 'Nunito', fontSize: `${15 * scale}px`, color: '#fca5a5', fontStyle: 'bold' }).setOrigin(0.5);
    this.bossEmoji = scene.add.text(scene.scale.width / 2 - 120 * scale, boardY - 96 * scale, '', { fontSize: `${30 * scale}px` });
    this.bossBar = scene.add.graphics();

    // energy bar with shimmer highlight
    this.energyBar = scene.add.graphics();
    this.energyText = scene.add.text(sideL, boardY + 245 * scale, 'ENERGY', { fontFamily: 'Nunito', fontSize: `${12 * scale}px`, color: '#67e8f9', fontStyle: 'bold' });
    this.energyShimmer = scene.add.rectangle(sideL + 65 * scale, boardY + 279 * scale, 26, 14 * scale, 0xffffff, 0.25);
    this.tweens_energyShimmer();

    this.container.add([
      this.scoreText, this.levelText, this.comboText, this.objText, this.objBar,
      this.nextText, this.holdText, this.holdSlot, this.timerText,
      this.bossBar, this.bossText, this.bossEmoji, this.energyText, this.energyBar,
      this.energyShimmer,
    ]);

    // power-up buttons bottom
    const btnY = scene.scale.height - 42;
    const btnStartX = boardX + 8;
    POWER_UPS.forEach((pu, i) => {
      const bx = btnStartX + i * 62 * scale;
      const c = scene.add.container(bx, btnY);
      const bg = scene.add.graphics();
      bg.fillStyle(0x1e293b, 0.9);
      bg.fillRoundedRect(-26, -24, 52, 48, 10);
      bg.lineStyle(2, 0x334155, 1);
      bg.strokeRoundedRect(-26, -24, 52, 48, 10);
      const icon = scene.add.text(0, -8, pu.emoji, { fontSize: '20px' }).setOrigin(0.5);
      const cost = scene.add.text(0, 12, `${POWER_UP_COSTS[pu.id]}`, { fontFamily: 'Nunito', fontSize: '11px', color: '#67e8f9', fontStyle: 'bold' }).setOrigin(0.5);
      c.add([bg, icon, cost]);
      c.setSize(52, 48);
      c.setInteractive({ useHandCursor: true });
      c.on('pointerover', () => scene.tweens.add({ targets: c, scale: 1.1, duration: 90 }));
      c.on('pointerout', () => scene.tweens.add({ targets: c, scale: 1, duration: 90 }));
      c.on('pointerdown', () => this.onPowerUp(pu.id));
      this.powerButtons.push(c);
      this.powerCostTexts.push(cost);
      this.container.add(c);
    });

    // pause button top-right
    const pauseBtn = scene.add
      .text(scene.scale.width - 20, 20, '⏸', { fontSize: '28px' })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    pauseBtn.on('pointerover', () => pauseBtn.setScale(1.15));
    pauseBtn.on('pointerout', () => pauseBtn.setScale(1));
    pauseBtn.on('pointerdown', () => this.onPause());
    this.container.add(pauseBtn);
  }

  private tweens_energyShimmer(): void {
    this.scene.tweens.add({
      targets: this.energyShimmer,
      x: '+=110',
      alpha: { from: 0.05, to: 0.3 },
      duration: 1400,
      repeat: -1,
      repeatDelay: 900,
    });
  }

  update(s: HudState): void {
    // score ticks toward its target instead of jumping (satisfying count-up)
    if (this.displayScore !== s.score) {
      const diff = s.score - this.displayScore;
      const step = Math.max(1, Math.ceil(Math.abs(diff) * 0.16));
      this.displayScore += Math.min(Math.abs(diff), step) * Math.sign(diff);
      if (Math.abs(s.score - this.displayScore) < 2) this.displayScore = s.score;
    }
    this.scoreText.setText(`SCORE\n${formatNumber(Math.floor(this.displayScore))}`);
    this.levelText.setText(`LV ${s.level} · ${s.lines} lines`);

    // combo with pop animation on change
    const comboLabel = s.combo > 1 ? `x${s.combo} COMBO!` : '';
    if (comboLabel !== this.comboText.text) {
      this.comboText.setText(comboLabel);
      if (s.combo > this.lastCombo && s.combo > 1) {
        this.comboText.setScale(1.6);
        this.scene.tweens.add({ targets: this.comboText, scale: 1, duration: 220, ease: 'Back.easeOut' });
      }
    }
    this.lastCombo = s.combo;

    if (s.objective) {
      this.objText.setText(`🎯 ${s.objective.objective.label}\n${s.objective.progressText()}`);
      this.objBar.clear();
      const bw = 130;
      this.objBar.fillStyle(0x1e293b, 0.9);
      this.objBar.fillRoundedRect(this.objText.x, this.objText.y + 52, bw, 8, 4);
      this.objBar.fillStyle(0x22c55e, 1);
      this.objBar.fillRoundedRect(this.objText.x, this.objText.y + 52, Math.max(4, bw * s.objective.progress()), 8, 4);
    } else {
      this.objText.setText('');
      this.objBar.clear();
    }

    // energy
    this.energyBar.clear();
    const bx = this.energyText.x;
    const by = this.energyText.y + 18;
    this.energyBar.fillStyle(0x1e293b, 0.9);
    this.energyBar.fillRoundedRect(bx, by, 130, 12, 6);
    this.energyBar.fillStyle(0x00f0ff, 1);
    this.energyBar.fillRoundedRect(bx, by, Math.max(4, 130 * (s.energy / s.maxEnergy)), 12, 6);
    this.energyBar.lineStyle(1, 0x67e8f9, 0.5);
    this.energyBar.strokeRoundedRect(bx, by, 130, 12, 6);
    this.energyText.setText(`ENERGY ${Math.floor(s.energy)}/${s.maxEnergy}`);
    this.energyShimmer.setAlpha(s.energy >= s.maxEnergy ? 0.5 : 0.22);
    this.energyShimmer.setVisible(s.energy > 0);

    // real tetromino previews (rebuilt only on change)
    for (let i = 0; i < 3; i++) {
      const t = s.nextPieces[i] as string | undefined;
      if (t !== this.shownNext[i]) {
        this.shownNext[i] = t;
        redrawMiniPiece(this.nextSlots[i], t ?? '', 22);
        this.nextSlots[i].setAlpha(s.darknessActive ? 0.12 : 1);
      }
    }
    if (s.heldPiece !== this.shownHold) {
      this.shownHold = s.heldPiece;
      redrawMiniPiece(this.holdSlot, s.heldPiece ?? '', 22);
      this.holdSlot.setAlpha(s.heldPiece ? 1 : 0.3);
    }

    // boss
    if (s.boss) {
      const bw = 240;
      const bx = this.scene.scale.width / 2 - bw / 2;
      const by = this.bossText.y + 22;
      this.bossText.setText(`${s.boss.def.name}  ${Math.ceil(s.boss.phaseRatio() * 100)}%`);
      this.bossEmoji.setText(s.boss.def.emoji);
      this.bossBar.clear();
      this.bossBar.fillStyle(0x1e293b, 0.9);
      this.bossBar.fillRoundedRect(bx, by, bw, 14, 7);
      this.bossBar.fillStyle(0xef4444, 1);
      const w = Math.max(6, bw * s.boss.phaseRatio());
      this.bossBar.fillRoundedRect(bx, by, w, 14, 7);
      this.bossBar.fillStyle(0xffffff, 0.25);
      this.bossBar.fillRoundedRect(bx, by, w, 5, 3); // glossy top
      this.bossBar.lineStyle(2, 0xfca5a5, 0.6);
      this.bossBar.strokeRoundedRect(bx, by, bw, 14, 7);
    } else {
      this.bossText.setText('');
      this.bossEmoji.setText('');
      this.bossBar.clear();
    }

    // timer
    if (s.timeLeftSec !== null) {
      const m = Math.floor(s.timeLeftSec / 60);
      const sec = Math.floor(s.timeLeftSec % 60);
      this.timerText.setText(`⏱ ${m}:${String(sec).padStart(2, '0')}`);
      this.timerText.setColor(s.timeLeftSec < 15 ? '#ef4444' : '#f43f5e');
    } else {
      this.timerText.setText('');
    }

    // power-up affordability
    this.powerButtons.forEach((btn, i) => {
      const pu = POWER_UPS[i];
      const afford = s.energy >= POWER_UP_COSTS[pu.id];
      btn.setAlpha(afford ? 1 : 0.4);
      this.powerCostTexts[i].setColor(afford ? '#67e8f9' : '#64748b');
    });
  }

  // used by scene on first HUD build to render empty hold slot
  static drawInitialHold(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Container {
    return drawMiniPiece(scene, x, y, 'O', 22, 0.3);
  }
}
