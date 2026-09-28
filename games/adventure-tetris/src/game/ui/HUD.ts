import Phaser from 'phaser';
import { POWER_UPS, type PowerUpId, POWER_UP_COSTS } from '../systems/EnergySystem.js';
import type { Boss } from '../adventure/Boss.js';
import type { ObjectiveSystem } from '../systems/ObjectiveSystem.js';
import { formatNumber, redrawMiniPiece } from './Buttons.js';

export const CELL = 32;
export const BOARD_COLS = 10;
export const BOARD_ROWS = 20;
export const BOARD_W = BOARD_COLS * CELL;
export const BOARD_H = BOARD_ROWS * CELL;

export interface TouchZone {
  x: number;
  y: number;
  w: number;
  h: number;
}

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
  onPause: () => void = () => {};
  onPowerUp: (id: PowerUpId) => void = () => {};

  private scene: Phaser.Scene;
  private isMobile: boolean;
  private scoreText: Phaser.GameObjects.Text;
  private nextText: Phaser.GameObjects.Text;
  private holdText: Phaser.GameObjects.Text;
  private levelText: Phaser.GameObjects.Text;
  private comboText: Phaser.GameObjects.Text;
  private objText: Phaser.GameObjects.Text;
  private objBar: Phaser.GameObjects.Graphics;
  private energyBar: Phaser.GameObjects.Graphics;
  private energyShimmer: Phaser.GameObjects.Rectangle;
  private energyText: Phaser.GameObjects.Text;
  private nextSlots: Phaser.GameObjects.Container[] = [];
  private holdSlot: Phaser.GameObjects.Container;
  private shownNext: (string | undefined)[] = [undefined, undefined, undefined];
  private shownHold: string | null | undefined = undefined;
  private lastCombo = 0;
  private bossBar: Phaser.GameObjects.Graphics;
  private bossText: Phaser.GameObjects.Text;
  private bossEmoji: Phaser.GameObjects.Text;
  private bossBarWidth = 240;
  private timerText: Phaser.GameObjects.Text;
  private powerButtons: Phaser.GameObjects.Container[] = [];
  private powerCostTexts: Phaser.GameObjects.Text[] = [];
  private powerZones: TouchZone[] = [];
  private pauseZone: TouchZone = { x: 0, y: 0, w: 48, h: 44 };

  constructor(scene: Phaser.Scene, boardX: number, boardY: number, scale: number, isMobile: boolean, hudScale = Math.max(0.8, Math.min(scale, 1))) {
    this.scene = scene;
    this.isMobile = isMobile;
    const w = scene.scale.width;
    const h = scene.scale.height;
    this.container = scene.add.container(0, 0).setDepth(50);

    // side panels use a floored HUD scale so text stays readable when the board
    // itself shrinks (landscape phones); preview slots get fixed offsets so the
    // mini pieces never slide back over the board edge
    const hs = hudScale;
    const boardW = BOARD_W * scale;
    const sideL = isMobile ? 8 : boardX - 164;
    const sideR = boardX + boardW + 14;

    if (isMobile) {
      // ---- compact mobile top strip ----
      this.scoreText = scene.add.text(8, 6, 'SCORE\n0', { fontFamily: 'Nunito', fontSize: '13px', color: '#ffffff', fontStyle: 'bold', lineSpacing: 1 });
      this.levelText = scene.add.text(8, 50, '', { fontFamily: 'Nunito', fontSize: '10px', color: '#93c5fd' });
      this.comboText = scene.add.text(8, 64, '', { fontFamily: 'Nunito', fontSize: '15px', color: '#f59e0b', fontStyle: 'bold' });
      this.objText = scene.add.text(w / 2, 6, '', { fontFamily: 'Nunito', fontSize: '10px', color: '#e2e8f0', align: 'center', wordWrap: { width: 150 } }).setOrigin(0.5, 0);
      this.objBar = scene.add.graphics();
      this.energyText = scene.add.text(8, 86, 'ENERGY', { fontFamily: 'Nunito', fontSize: '9px', color: '#67e8f9', fontStyle: 'bold' });
      this.nextText = scene.add.text(w - 56, 6, 'NEXT', { fontFamily: 'Nunito', fontSize: '10px', color: '#94a3b8', fontStyle: 'bold' }).setOrigin(1, 0);
      for (let i = 0; i < 3; i++) {
        this.nextSlots.push(scene.add.container(w - 68 - i * 38, 40));
        this.container.add(this.nextSlots[i]);
      }
      this.holdText = scene.add.text(w - 56, 64, 'HOLD', { fontFamily: 'Nunito', fontSize: '9px', color: '#94a3b8', fontStyle: 'bold' }).setOrigin(1, 0);
      this.holdSlot = scene.add.container(w - 68, 88);
      this.timerText = scene.add.text(w / 2, 58, '', { fontFamily: 'Nunito', fontSize: '14px', color: '#f43f5e', fontStyle: 'bold' }).setOrigin(0.5);
      this.bossText = scene.add.text(w / 2, boardY - 68, '', { fontFamily: 'Nunito', fontSize: '12px', color: '#fca5a5', fontStyle: 'bold' }).setOrigin(0.5);
      this.bossEmoji = scene.add.text(w / 2 - 110, boardY - 72, '', { fontSize: '22px' });
      this.bossBarWidth = 200;
      this.energyShimmer = scene.add.rectangle(56, 102, 20, 8, 0xffffff, 0.25);
      this.tweenEnergyShimmer(76);
    } else {
      // ---- desktop / tablet layout ----
      this.scoreText = scene.add.text(sideL, boardY, 'SCORE\n0', { fontFamily: 'Nunito', fontSize: `${20 * hs}px`, color: '#ffffff', fontStyle: 'bold', align: 'left', lineSpacing: 2 });
      this.levelText = scene.add.text(sideL, boardY + 70 * hs, '', { fontFamily: 'Nunito', fontSize: `${16 * hs}px`, color: '#93c5fd' });
      this.comboText = scene.add.text(sideL, boardY + 100 * hs, '', { fontFamily: 'Nunito', fontSize: `${24 * hs}px`, color: '#f59e0b', fontStyle: 'bold' });
      this.objText = scene.add.text(sideL, boardY + 140 * hs, '', { fontFamily: 'Nunito', fontSize: `${13 * hs}px`, color: '#e2e8f0', wordWrap: { width: 140 * hs } });
      this.objBar = scene.add.graphics();
      this.energyText = scene.add.text(sideL, boardY + 245 * hs, 'ENERGY', { fontFamily: 'Nunito', fontSize: `${12 * hs}px`, color: '#67e8f9', fontStyle: 'bold' });
      this.nextText = scene.add.text(sideR, boardY - 4 * hs, 'NEXT', { fontFamily: 'Nunito', fontSize: `${14 * hs}px`, color: '#94a3b8', fontStyle: 'bold' });
      for (let i = 0; i < 3; i++) {
        this.nextSlots.push(scene.add.container(sideR + 50, boardY + (34 + i * 62) * hs));
        this.container.add(this.nextSlots[i]);
      }
      // HOLD lives under the NEXT column on short boards so the two labels
      // can never end up on the same line
      const holdY = Math.max(boardY + BOARD_H * scale - 220 * hs, boardY + 226 * hs);
      this.holdText = scene.add.text(sideR, holdY, 'HOLD [C]', { fontFamily: 'Nunito', fontSize: `${14 * hs}px`, color: '#94a3b8', fontStyle: 'bold' });
      this.holdSlot = scene.add.container(sideR + 50, holdY + 30);
      this.timerText = scene.add.text(w / 2, boardY - 34 * hs, '', { fontFamily: 'Nunito', fontSize: `${22 * hs}px`, color: '#f43f5e', fontStyle: 'bold' }).setOrigin(0.5);
      this.bossText = scene.add.text(w / 2, boardY - 92 * hs, '', { fontFamily: 'Nunito', fontSize: `${15 * hs}px`, color: '#fca5a5', fontStyle: 'bold' }).setOrigin(0.5);
      this.bossEmoji = scene.add.text(w / 2 - 120 * hs, boardY - 96 * hs, '', { fontSize: `${30 * hs}px` });
      this.bossBarWidth = 240;
      this.energyShimmer = scene.add.rectangle(sideL + 65 * hs, boardY + 279 * hs, 26, 14 * hs, 0xffffff, 0.25);
      this.tweenEnergyShimmer(110);
    }
    this.bossBar = scene.add.graphics();
    this.energyBar = scene.add.graphics();

    this.container.add([
      this.scoreText, this.levelText, this.comboText, this.objText, this.objBar,
      this.nextText, this.holdText, this.holdSlot, this.timerText,
      this.bossBar, this.bossText, this.bossEmoji, this.energyText, this.energyBar,
      this.energyShimmer,
    ]);

    // power-up buttons along the bottom
    const btnY = h - (isMobile ? 36 : 42);
    const spacing = isMobile ? 50 : 56;
    const iconSize = isMobile ? 16 : 20;
    const startX = isMobile ? w / 2 - 125 : boardX + (BOARD_W * scale) / 2 - (spacing * (POWER_UPS.length - 1)) / 2;
    POWER_UPS.forEach((pu, i) => {
      const bx = startX + i * spacing;
      const c = scene.add.container(bx, btnY);
      const bg = scene.add.graphics();
      bg.fillStyle(0x1e293b, 0.9);
      bg.fillRoundedRect(-24, -22, 48, 44, 10);
      bg.lineStyle(2, 0x334155, 1);
      bg.strokeRoundedRect(-24, -22, 48, 44, 10);
      const icon = scene.add.text(0, -7, pu.emoji, { fontSize: `${iconSize}px` }).setOrigin(0.5);
      const cost = scene.add.text(0, 11, `${POWER_UP_COSTS[pu.id]}`, { fontFamily: 'Nunito', fontSize: isMobile ? '9px' : '11px', color: '#67e8f9', fontStyle: 'bold' }).setOrigin(0.5);
      c.add([bg, icon, cost]);
      c.setSize(48, 44);
      c.setInteractive({ useHandCursor: true });
      c.on('pointerover', () => scene.tweens.add({ targets: c, scale: 1.1, duration: 90 }));
      c.on('pointerout', () => scene.tweens.add({ targets: c, scale: 1, duration: 90 }));
      c.on('pointerdown', () => this.onPowerUp(pu.id));
      this.powerButtons.push(c);
      this.powerCostTexts.push(cost);
      this.container.add(c);
      this.powerZones.push({ x: bx - 26, y: btnY - 24, w: 52, h: 48 });
    });

    // pause button - drawn body (46x46) so the tap target is generous and
    // never depends on a font glyph rendering
    const pauseCx = w - (isMobile ? 40 : 44);
    const pauseCy = isMobile ? 38 : 42;
    const pauseBtn = scene.add.container(pauseCx, pauseCy);
    const pauseBg = scene.add.graphics();
    pauseBg.fillStyle(0x1e293b, 0.85);
    pauseBg.fillRoundedRect(-23, -23, 46, 46, 12);
    pauseBg.lineStyle(2, 0x475569, 1);
    pauseBg.strokeRoundedRect(-23, -23, 46, 46, 12);
    pauseBg.fillStyle(0xe2e8f0, 1);
    pauseBg.fillRect(-9, -8, 6, 16);
    pauseBg.fillRect(3, -8, 6, 16);
    pauseBtn.add(pauseBg);
    pauseBtn.setSize(46, 46);
    pauseBtn.setInteractive(new Phaser.Geom.Rectangle(-23, -23, 46, 46), Phaser.Geom.Rectangle.Contains);
    pauseBtn.on('pointerover', () => pauseBtn.setScale(1.1));
    pauseBtn.on('pointerout', () => pauseBtn.setScale(1));
    pauseBtn.on('pointerdown', () => this.onPause());
    this.container.add(pauseBtn);
    this.pauseZone = { x: pauseCx - 26, y: pauseCy - 26, w: 52, h: 52 };
  }

  private tweenEnergyShimmer(travel: number): void {
    this.scene.tweens.add({
      targets: this.energyShimmer,
      x: `+=${travel}`,
      alpha: { from: 0.05, to: 0.3 },
      duration: 1400,
      repeat: -1,
      repeatDelay: 900,
    });
  }

  getTouchZones(): TouchZone[] {
    return [...this.powerZones, this.pauseZone];
  }

  destroy(): void {
    this.scene.tweens.killTweensOf(this.energyShimmer);
    this.container.destroy();
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
      this.objText.setText(
        this.isMobile
          ? `🎯 ${s.objective.objective.label}\n${s.objective.progressText()}`
          : `🎯 ${s.objective.objective.label}\n${s.objective.progressText()}`
      );
      this.objBar.clear();
      const bw = this.isMobile ? 120 : 130;
      const bx = this.isMobile ? this.scene.scale.width / 2 - bw / 2 : this.objText.x;
      const by = this.isMobile ? this.objText.y + 30 : this.objText.y + 52;
      this.objBar.fillStyle(0x1e293b, 0.9);
      this.objBar.fillRoundedRect(bx, by, bw, this.isMobile ? 7 : 8, 4);
      this.objBar.fillStyle(0x22c55e, 1);
      this.objBar.fillRoundedRect(bx, by, Math.max(4, bw * s.objective.progress()), this.isMobile ? 7 : 8, 4);
    } else {
      this.objText.setText('');
      this.objBar.clear();
    }

    // energy
    this.energyBar.clear();
    const bx = this.energyText.x;
    const by = this.energyText.y + (this.isMobile ? 12 : 18);
    const bw = this.isMobile ? 96 : 130;
    const bh = this.isMobile ? 8 : 12;
    this.energyBar.fillStyle(0x1e293b, 0.9);
    this.energyBar.fillRoundedRect(bx, by, bw, bh, 5);
    this.energyBar.fillStyle(0x00f0ff, 1);
    this.energyBar.fillRoundedRect(bx, by, Math.max(3, bw * (s.energy / s.maxEnergy)), bh, 5);
    if (!this.isMobile) {
      this.energyBar.lineStyle(1, 0x67e8f9, 0.5);
      this.energyBar.strokeRoundedRect(bx, by, bw, bh, 6);
    }
    this.energyText.setText(this.isMobile ? `${Math.floor(s.energy)}` : `ENERGY ${Math.floor(s.energy)}/${s.maxEnergy}`);
    this.energyShimmer.setAlpha(s.energy >= s.maxEnergy ? 0.5 : 0.22);
    this.energyShimmer.setVisible(s.energy > 0);

    // real tetromino previews (rebuilt only on change)
    for (let i = 0; i < 3; i++) {
      const t = s.nextPieces[i] as string | undefined;
      if (t !== this.shownNext[i]) {
        this.shownNext[i] = t;
        redrawMiniPiece(this.nextSlots[i], t ?? '', this.isMobile ? 12 : 22);
        this.nextSlots[i].setAlpha(s.darknessActive ? 0.12 : 1);
      }
    }
    if (s.heldPiece !== this.shownHold) {
      this.shownHold = s.heldPiece;
      redrawMiniPiece(this.holdSlot, s.heldPiece ?? '', this.isMobile ? 12 : 22);
      this.holdSlot.setAlpha(s.heldPiece ? 1 : 0.3);
    }

    // boss
    if (s.boss) {
      const bw = this.bossBarWidth;
      const bx = this.scene.scale.width / 2 - bw / 2;
      const by = this.bossText.y + (this.isMobile ? 16 : 22);
      this.bossText.setText(`${s.boss.def.name}  ${Math.ceil(s.boss.phaseRatio() * 100)}%`);
      this.bossEmoji.setText(s.boss.def.emoji);
      this.bossBar.clear();
      this.bossBar.fillStyle(0x1e293b, 0.9);
      this.bossBar.fillRoundedRect(bx, by, bw, 14, 7);
      this.bossBar.fillStyle(0xef4444, 1);
      const w = Math.max(6, bw * s.boss.phaseRatio());
      this.bossBar.fillRoundedRect(bx, by, w, 14, 7);
      this.bossBar.fillStyle(0xffffff, 0.25);
      this.bossBar.fillRoundedRect(bx, by, w, 5, 3);
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

  private displayScore = 0;
}
