import Phaser from 'phaser';
import type { Cell, SpecialType, ObstacleKind } from '@/types';
import { GameManager, type RunConfig } from '../GameManager.js';
import { InputManager } from '../InputManager.js';
import { HUD, BOARD_COLS, BOARD_ROWS, BOARD_W, BOARD_H, CELL } from '../ui/HUD.js';
import { makeWorldBackground, floatingText, createButton } from '../ui/Buttons.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { audio } from '../systems/AudioSystem.js';
import { ObjectiveSystem } from '../systems/ObjectiveSystem.js';
import { EnergySystem, POWER_UPS, type PowerUpId } from '../systems/EnergySystem.js';
import { QuestSystem } from '../systems/QuestSystem.js';
import { Boss, calculateBossDamage } from '../adventure/Boss.js';
import { EventSystem, RANDOM_EVENTS, type RandomEventType } from '../adventure/EventSystem.js';
import { CHARACTERS, COMPANIONS } from '../data/meta.js';
import { getWorld } from '../data/worlds.js';
import { buildRunConfig } from '../data/modes.js';

const SPECIAL_COLORS: Record<SpecialType, number> = {
  bomb: 0xef4444, lightning: 0xfacc15, treasure: 0x22c55e,
  freeze: 0x38bdf8, fire: 0xf97316, magic: 0xa78bfa,
};

const CLEAR_LABELS = ['', 'GOOD!', 'GREAT!', 'AWESOME!', 'TETRIS!'];

export class GameplayScene extends Phaser.Scene {
  private manager!: GameManager;
  private inputMgr!: InputManager;
  private hud!: HUD;
  private save!: SaveSystem;
  private quests!: QuestSystem;
  private objective!: ObjectiveSystem;
  private energy!: EnergySystem;
  private boss: Boss | null = null;
  private eventSystem!: EventSystem;

  private config!: RunConfig;
  private bossRushStage = 0;
  private timeLeftMs = 0;
  private elapsedMs = 0;
  private darknessUntil = 0;
  private freezeUntil = 0;
  private baseSpecialChance = 0;
  private survivalGarbageTimer = 0;
  private ending = false;
  private powerupsUsedThisRun = 0;

  // rendering pools
  private cellPool: Phaser.GameObjects.Image[] = [];
  private specialPool: Phaser.GameObjects.Image[] = [];
  private pieceImgs: Phaser.GameObjects.Image[] = [];
  private ghostImgs: Phaser.GameObjects.Image[] = [];
  private boardG!: Phaser.GameObjects.Graphics;
  private borderGlow!: Phaser.GameObjects.Graphics;
  private boardX = 0;
  private boardY = 0;
  private scaleS = 1;
  private hudScale = 1;
  private pauseOverlay: Phaser.GameObjects.Container | null = null;
  private isMobile = false;
  // ?touch=1 lets the visual test harness force on-screen controls on desktop
  private isTouch =
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    new URLSearchParams(window.location.search).get('touch') === '1';
  private touchControls: Phaser.GameObjects.Container[] = [];
  private touchZones: Array<{ x: number; y: number; w: number; h: number }> = [];
  private holdRepeatEvents: Phaser.Time.TimerEvent[] = [];

  constructor() {
    super({ key: 'GameplayScene' });
  }

  init(data: { config: RunConfig; bossRushStage?: number }): void {
    this.config = data.config;
    this.bossRushStage = data.bossRushStage ?? 0;
    this.ending = false;
    this.powerupsUsedThisRun = 0;
  }

  create(): void {
    this.save = SaveSystem.get();
    this.quests = new QuestSystem(this.save);
    const settings = this.save.data.settings;
    const world = getWorld(this.config.worldId);

    makeWorldBackground(this, world.theme.bgTop, world.theme.bgBottom, world.theme.particle);

    // layout (mobile-aware, recomputed on resize)
    this.computeLayout();

    // game systems
    const charDef = CHARACTERS.find((c) => c.id === this.save.data.selectedCharacter);
    this.manager = new GameManager(this.config);
    this.baseSpecialChance = this.config.specialChance;
    this.objective = new ObjectiveSystem(this.config.objective);
    this.energy = new EnergySystem(Math.min(100, charDef?.passive.startEnergy ?? 0));
    this.boss = this.config.boss ? new Boss(this.config.boss) : null;
    this.eventSystem = new EventSystem();
    this.timeLeftMs = (this.config.timeLimitSec ?? 0) * 1000;
    this.elapsedMs = 0;

    // input
    this.inputMgr = new InputManager(this.manager, {
      onPause: () => this.togglePause(),
      onPowerUp: (id) => this.usePowerUp(id),
    });

    // audio
    audio.setVolumes(settings.musicVolume, settings.sfxVolume);
    audio.startMusic(world.musicRoot);

    // rendering pools
    this.createPools();

    // HUD + on-screen touch controls (mobile)
    this.buildHudAndControls();

    // re-layout on viewport changes (rotation, resize)
    this.scale.on('resize', this.onViewportResize, this);

    // intro banner
    this.showIntroBanner(world.emoji, world.nameId);

    this.events.once('shutdown', () => {
      this.scale.off('resize', this.onViewportResize, this);
      this.inputMgr.destroy();
      audio.stopMusic();
    });
  }

  private createPools(): void {
    this.boardG = this.add.graphics().setDepth(1);
    this.borderGlow = this.add.graphics().setDepth(1);
    for (let i = 0; i < BOARD_ROWS * BOARD_COLS; i++) {
      const img = this.add.image(0, 0, 'block').setVisible(false).setDepth(2);
      this.cellPool.push(img);
      const sp = this.add.image(0, 0, 'particle').setVisible(false).setDepth(3).setSize(10, 10);
      this.specialPool.push(sp);
    }
    for (let i = 0; i < 4; i++) {
      this.pieceImgs.push(this.add.image(0, 0, 'block').setDepth(5));
      this.ghostImgs.push(this.add.image(0, 0, 'block').setDepth(4).setAlpha(0.25));
    }
  }

  private computeLayout(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    // short viewports (landscape phones) use the compact top-strip layout too:
    // the desktop side panels need ~300px of vertical room that isn't there
    this.isMobile = w < 720 || h < 560;
    // touch devices need bottom space for the control + power-up bars (landscape phones too)
    const bottomReserve = this.isTouch ? 216 : 150;
    if (this.isMobile) {
      this.scaleS = Math.min((h - 235) / BOARD_H, (w - 16) / BOARD_W, 1.2);
      this.boardX = (w - BOARD_W * this.scaleS) / 2;
      this.boardY = 118;
    } else {
      this.scaleS = Math.min((h - bottomReserve) / BOARD_H, (w - 300) / BOARD_W, 1.35);
      this.boardX = (w + 40 - BOARD_W * this.scaleS) / 2;
      this.boardY = 110;
    }
    // HUD text/panels never shrink below 0.8 even when the board gets tiny
    this.hudScale = Math.max(0.8, Math.min(this.scaleS, 1));
  }

  private buildHudAndControls(): void {
    this.hud?.destroy();
    this.hud = new HUD(this, this.boardX, this.boardY, this.scaleS, this.isMobile, this.hudScale);
    this.hud.onPause = () => this.togglePause();
    this.hud.onPowerUp = (id) => this.usePowerUp(id);
    this.buildTouchControls();
    this.inputMgr?.setTouchFilter(this.buildTouchFilter());
  }

  private onViewportResize(): void {
    if (this.ending) return;
    this.computeLayout();
    this.buildHudAndControls();
  }

  private buildTouchFilter(): (x: number, y: number) => boolean {
    return (x: number, y: number) =>
      this.touchZones.some((z) => x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h);
  }

  private clearTouchControls(): void {
    this.holdRepeatEvents.forEach((ev) => ev.remove());
    this.holdRepeatEvents = [];
    this.touchControls.forEach((c) => c.destroy());
    this.touchControls = [];
    this.touchZones = this.hud ? this.hud.getTouchZones() : [];
  }

  private buildTouchControls(): void {
    this.clearTouchControls();
    if (!this.isTouch) return;
    const w = this.scale.width;
    const h = this.scale.height;
    const y = h - (this.isMobile ? 90 : 94);
    // directional buttons are the most-used controls, so they get a bigger body
    const btn = (cx: number, cy: number, label: string, onPress: () => void, big = false, holdRepeat = false) => {
      const bw = big ? 64 : 48;
      const bh = big ? 52 : 40;
      const c = this.add.container(cx, cy);
      const bg = this.add.graphics();
      bg.fillStyle(0x1e293b, 0.92);
      bg.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 10);
      bg.lineStyle(2, 0x475569, 1);
      bg.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 10);
      const icon = this.add.text(0, 0, label, { fontSize: big ? '22px' : '18px', color: '#ffffff' }).setOrigin(0.5);
      c.add([bg, icon]);
      c.setSize(bw, bh);
      c.setInteractive({ useHandCursor: true });
      c.on('pointerdown', () => {
        audio.sfx('ui');
        this.tweens.add({ targets: c, scale: 0.9, duration: 60, yoyo: true });
        onPress();
        if (holdRepeat) {
          const ev = this.time.addEvent({ delay: 170, startAt: 170, loop: true, callback: onPress });
          this.holdRepeatEvents.push(ev);
        }
      });
      const cancelRepeat = () => {
        this.holdRepeatEvents.forEach((ev) => ev.remove());
        this.holdRepeatEvents = [];
      };
      c.on('pointerup', cancelRepeat);
      c.on('pointerout', cancelRepeat);
      this.touchControls.push(c);
      this.touchZones.push({ x: cx - bw / 2 - 2, y: cy - bh / 2 - 4, w: bw + 4, h: bh + 12 });
    };

    // left cluster: move + rotate | right cluster: drop + hold
    btn(w / 2 - 165, y, '◀', () => this.manager.moveLeft(), true, true);
    btn(w / 2 - 95, y, '▶', () => this.manager.moveRight(), true, true);
    btn(w / 2 - 24, y, '⟳', () => this.manager.rotate(true));
    btn(w / 2 + 42, y, '⤓', () => this.manager.hardDrop(), true);
    btn(w / 2 + 110, y, '🅗', () => this.manager.hold());
  }

  private showIntroBanner(emoji: string, worldName: string): void {
    const cx = this.scale.width / 2;
    const t1 = this.add.text(cx, this.scale.height * 0.35, `${emoji} ${worldName}`, {
      fontFamily: 'Nunito', fontSize: '34px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(200);
    const t2 = this.add.text(cx, this.scale.height * 0.35 + 46, `LEVEL ${this.config.levelIndex} · ${this.config.objective.label}`, {
      fontFamily: 'Nunito', fontSize: '18px', color: '#cbd5e1',
    }).setOrigin(0.5).setDepth(200);
    [t1, t2].forEach((t) => {
      this.tweens.add({ targets: t, alpha: 0, y: t.y - 30, delay: 1400, duration: 500, onComplete: () => t.destroy() });
    });
  }

  update(_time: number, delta: number): void {
    if (this.ending || this.manager.paused) return;
    delta = Math.min(delta, 50);

    this.manager.update(delta);
    this.inputMgr.update(delta);
    this.elapsedMs += delta;

    // timers
    if (this.timeLeftMs > 0) {
      this.timeLeftMs -= delta;
      if (this.timeLeftMs <= 0) {
        this.timeLeftMs = 0;
        this.finishRun(true, 'TIME UP!');
        return;
      }
    }
    this.objective.tick(delta / 1000);

    // freeze expiry
    if (this.manager.timeFrozen && this.elapsedMs > this.freezeUntil) this.manager.timeFrozen = false;
    if (this.elapsedMs > this.darknessUntil) this.darknessUntil = 0;

    // boss
    if (this.boss && !this.objective.complete) {
      const atk = this.boss.update(delta);
      if (atk) this.applyBossAttack(atk.type, atk.cells, atk.durationMs);
    }

    // random events
    const ev = this.eventSystem.update(delta, this.manager.board, this.manager.stats.lines);
    if (ev) this.applyRandomEvent(ev);

    // survival mode garbage spawner
    if (this.config.mode === 'survival' && this.config.obstacle) {
      this.survivalGarbageTimer += delta;
      const interval = Math.max(8000, 25000 - this.manager.stats.level * 1500);
      if (this.survivalGarbageTimer >= interval) {
        this.survivalGarbageTimer = 0;
        this.manager.board.addObstacleRow(
          this.config.obstacle.kind as ObstacleKind,
          this.config.obstacle.color, 3
        );
      }
    }

    // drain manager events
    this.handleManagerEvents(this.manager.drainEvents());

    // periodic score objective sync
    if (this.config.objective.type === 'score') {
      this.objective.apply({ type: 'score', value: this.manager.stats.score });
    }

    this.render();
    this.updateHud();

    if (this.manager.gameOver && !this.ending) {
      this.finishRun(false);
      return;
    }
    if (this.objective.complete && !this.ending) {
      this.finishRun(true);
    }
  }

  // ---------- events ----------
  private handleManagerEvents(events: ReturnType<GameManager['drainEvents']>): void {
    const settings = this.save.data.settings;
    for (const ev of events) {
      switch (ev.type) {
        case 'move': audio.sfx('move'); break;
        case 'rotate': audio.sfx('rotate'); break;
        case 'hold': audio.sfx('hold'); break;
        case 'drop': {
          audio.sfx('drop');
          const s2 = this.scaleS;
          const landY = this.boardY + (ev.trail.toY + 1) * CELL * s2;
          const midX = this.boardX + (ev.trail.xs.reduce((a, b) => a + b, 0) / ev.trail.xs.length + 0.5) * CELL * s2;
          // light streaks along the drop path
          const trail = this.add.graphics().setDepth(4);
          trail.fillStyle(0xffffff, 0.3);
          const hCells = Math.max(1, ev.trail.toY - ev.trail.fromY);
          for (const col of ev.trail.xs) {
            trail.fillRect(this.boardX + col * CELL * s2 + 7, this.boardY + ev.trail.fromY * CELL * s2, CELL * s2 - 14, hCells * CELL * s2);
          }
          this.tweens.add({ targets: trail, alpha: 0, duration: 240, onComplete: () => trail.destroy() });
          // landing burst + sideways dust puffs
          this.burstAt(midX, landY, this.manager.currentPiece.color, 6);
          this.burstAt(midX - CELL * s2, landY, 0xffffff, 3);
          this.burstAt(midX + CELL * s2, landY, 0xffffff, 3);
          if (settings.screenShake && !settings.reducedMotion) this.cameras.main.shake(80, 0.002 * Math.min(3, ev.cells / 4));
          break;
        }
        case 'lock': audio.sfx('lock'); break;
        case 'levelUp':
          floatingText(this, this.scale.width / 2, this.boardY + 40, `LEVEL UP! ${ev.level}`, '#38bdf8', 26);
          break;
        case 'treasure':
          audio.sfx('coin');
          floatingText(this, this.scale.width / 2, this.boardY + 80, `💎 +${ev.count * 15} coins`, '#22c55e', 22);
          this.save.addCoins(ev.count * 15);
          this.energy.add(ev.count * 10, this.energyMult());
          this.quests.record('treasures', ev.count);
          this.objective.apply({ type: 'treasure', value: ev.count });
          break;
        case 'obstacles':
          this.objective.apply({ type: 'obstacles', value: ev.count });
          break;
        case 'tetris':
          this.quests.record('tetris', 1);
          if (settings.screenShake && !settings.reducedMotion) this.cameras.main.shake(250, 0.008);
          this.cameras.main.flash(150, 255, 255, 200);
          break;
        case 'perfect':
          audio.sfx('perfect');
          this.cameras.main.flash(300, 255, 255, 255);
          floatingText(this, this.scale.width / 2, this.boardY + BOARD_H * this.scaleS / 2, 'PERFECT CLEAR!', '#fbbf24', 34);
          break;
        case 'lines':
          this.onLinesCleared(ev);
          break;
        case 'gameover':
          break;
      }
    }
  }

  private onLinesCleared(ev: Extract<ReturnType<GameManager['drainEvents']>[number], { type: 'lines' }>): void {
    const settings = this.save.data.settings;
    audio.sfx(ev.count >= 4 ? 'tetris' : (`clear${Math.min(4, ev.count)}` as 'clear1'));
    if (this.manager.stats.combo > 1) audio.sfx('combo');

    // particles along cleared rows
    for (const row of ev.rows) {
      for (let x = 0; x < BOARD_COLS; x++) {
        this.burstAt(this.boardX + (x + 0.5) * CELL * this.scaleS, this.boardY + (row + 0.5) * CELL * this.scaleS, 0xffffff, 3);
      }
    }
    // colorful confetti popping upward then falling from cleared rows
    if (!settings.reducedMotion) {
      const confettiColors = [0x00f0ff, 0xffd700, 0xa855f7, 0x22c55e, 0xef4444, 0x3b82f6, 0xf97316];
      for (const row of ev.rows) {
        const em = this.add.particles(this.boardX, this.boardY + (row + 0.5) * CELL * this.scaleS, 'particle', {
          x: { min: 0, max: BOARD_W * this.scaleS },
          y: 0,
          lifespan: 1000,
          speedY: { min: -170, max: -50 },
          speedX: { min: -130, max: 130 },
          gravityY: 620,
          scale: { start: 0.9, end: 0 },
          rotate: { start: 0, end: 300 },
          quantity: 18,
          tint: confettiColors,
          emitting: false,
        });
        em.setDepth(95);
        em.explode(18);
        this.time.delayedCall(1200, () => em.destroy());
      }
    }
    if (settings.screenShake && !settings.reducedMotion) {
      this.cameras.main.shake(120 + ev.count * 40, 0.003 + ev.count * 0.002);
    }

    // label
    const label = CLEAR_LABELS[Math.min(4, ev.count)];
    const comboLabel = this.manager.stats.combo > 1 ? `  x${this.manager.stats.combo}!` : '';
    floatingText(this, this.scale.width / 2, this.boardY + 20, label + comboLabel, ev.count >= 4 ? '#fbbf24' : '#ffffff', 24 + ev.count * 4);

    // objective & quests
    this.objective.apply({ type: 'lines', value: ev.count });
    if (this.manager.stats.combo > 1) {
      this.objective.apply({ type: 'combo', value: this.manager.stats.combo });
      this.quests.setMax('combos', this.manager.stats.combo);
    }
    this.quests.record('lines', ev.count);
    this.energy.add([0, 5, 12, 18, 25][Math.min(4, ev.count)], this.energyMult());

    // boss damage
    if (this.boss) {
      const charDef = CHARACTERS.find((c) => c.id === this.save.data.selectedCharacter);
      const dmg = calculateBossDamage(ev.count, this.manager.stats.combo, this.manager.stats.backToBack > 1, charDef?.passive.bossDamage ?? 0);
      const res = this.boss.takeDamage(dmg);
      audio.sfx('bossHit');
      this.burstAt(this.scale.width / 2, this.boardY - 70, 0xef4444, 14);
      if (res.phaseChanged) {
        floatingText(this, this.scale.width / 2, this.boardY - 100, `${this.boss.def.emoji} ENRAGED!`, '#f43f5e', 24);
        this.cameras.main.shake(300, 0.01);
      }
      if (res.destroyed) this.onBossDefeated();
    }

    // special effects from cleared cells
    this.applySpecials(ev.result.specials);
  }

  private applySpecials(specials: { x: number; y: number; special: SpecialType }[]): void {
    for (const sp of specials) {
      const px = this.boardX + (sp.x + 0.5) * CELL * this.scaleS;
      const py = this.boardY + (sp.y + 0.5) * CELL * this.scaleS;
      this.burstAt(px, py, SPECIAL_COLORS[sp.special], 16);
      switch (sp.special) {
        case 'bomb': {
          const r = this.manager.board.explode(sp.x, sp.y, 1);
          this.cameras.main.shake(200, 0.008);
          this.rewardAreaEffect(r.destroyed, r.obstacles, r.treasures, '💣 BOOM!');
          break;
        }
        case 'lightning': {
          const r1 = this.manager.board.clearRow(sp.y);
          const r2 = this.manager.board.clearColumn(sp.x);
          this.cameras.main.flash(120, 250, 250, 150);
          this.rewardAreaEffect(r1.destroyed + r2.destroyed, r1.obstacles + r2.obstacles, r1.treasures + r2.treasures, '⚡ ZAP!');
          break;
        }
        case 'freeze':
          this.manager.timeFrozen = true;
          this.freezeUntil = this.elapsedMs + 6000;
          floatingText(this, px, py, '❄️ FREEZE!', '#38bdf8', 20);
          break;
        case 'fire': {
          const n = this.manager.board.destroyObstaclesInRow(sp.y);
          this.burstAt(px, py, 0xf97316, 20);
          if (n > 0) {
            this.manager.stats.obstaclesDestroyed += n;
            this.objective.apply({ type: 'obstacles', value: n });
          }
          break;
        }
        case 'magic': {
          const n = this.manager.board.destroyRandomFilled(4);
          this.rewardAreaEffect(n, 0, 0, '✨ MAGIC!');
          break;
        }
        case 'treasure':
          break; // handled by clear result
      }
    }
    // cascade: specials may complete new rows
    this.cascadeClears(0);
  }

  private cascadeClears(depth: number): void {
    if (depth > 2) return;
    const result = this.manager.board.clearLines();
    if (result.rows.length === 0) return;
    this.manager.stats.lines += result.rows.length;
    this.manager.stats.score += this.manager.calculateScore(result.rows.length) * 0.5;
    this.objective.apply({ type: 'lines', value: result.rows.length });
    this.manager.stats.treasures += result.treasuresCollected;
    if (result.treasuresCollected) this.quests.record('treasures', result.treasuresCollected);
    if (result.obstaclesDestroyed) {
      this.manager.stats.obstaclesDestroyed += result.obstaclesDestroyed;
      this.objective.apply({ type: 'obstacles', value: result.obstaclesDestroyed });
    }
    audio.sfx(`clear${Math.min(4, result.rows.length)}` as 'clear1');
    this.applySpecials(result.specials); // recurse via applySpecials -> cascadeClears
  }

  private rewardAreaEffect(destroyed: number, obstacles: number, treasures: number, label: string): void {
    if (destroyed > 0) this.manager.stats.score += destroyed * 15 * this.manager.stats.level;
    if (obstacles > 0) {
      this.manager.stats.obstaclesDestroyed += obstacles;
      this.objective.apply({ type: 'obstacles', value: obstacles });
    }
    if (treasures > 0) {
      this.manager.stats.treasures += treasures;
      this.save.addCoins(treasures * 15);
      this.objective.apply({ type: 'treasure', value: treasures });
      this.quests.record('treasures', treasures);
    }
    if (label) floatingText(this, this.scale.width / 2, this.boardY + 60, label, '#fbbf24', 22);
  }

  // ---------- boss ----------
  private applyBossAttack(type: string, cells: number, durationMs: number): void {
    if (!this.boss || !this.config.obstacle) return;
    audio.sfx('bossAttack');
    floatingText(this, this.scale.width / 2, this.boardY - 60, `${this.boss.def.emoji} ATTACK!`, '#f43f5e', 20);
    this.cameras.main.shake(200, 0.006);
    switch (type) {
      case 'garbage':
        this.manager.board.addObstacleRow(this.config.obstacle.kind as ObstacleKind, this.config.obstacle.color, cells);
        break;
      case 'meteor':
        this.manager.board.addObstacleCells(cells, this.config.obstacle.kind as ObstacleKind, this.config.obstacle.color);
        break;
      case 'freeze':
        this.manager.timeFrozen = true;
        this.freezeUntil = this.elapsedMs + durationMs;
        break;
      case 'darkness':
        this.darknessUntil = this.elapsedMs + durationMs;
        break;
    }
  }

  private onBossDefeated(): void {
    if (!this.boss) return;
    audio.sfx('victory');
    this.cameras.main.flash(400, 255, 220, 120);
    this.cameras.main.shake(500, 0.012);
    const bonus = this.boss.def.rewardCoins;
    this.save.addCoins(bonus);
    this.save.addGems(this.boss.def.rewardGems);
    this.quests.record('bossKills', 1);
    this.objective.apply({ type: 'bossDefeated', value: 1 });
    floatingText(this, this.scale.width / 2, this.boardY - 80, `👑 +${bonus} coins +${this.boss.def.rewardGems}💎`, '#fbbf24', 26);

    if (this.config.mode === 'bossRush') {
      this.time.delayedCall(1500, () => {
        const nextStage = this.bossRushStage + 1;
        const total = this.registry.get('bossRushScore') ?? 0;
        this.registry.set('bossRushScore', total + this.manager.stats.score);
        if (nextStage < 8) {
          const cfg = buildRunConfig('bossRush', { bossRushStage: nextStage });
          this.scene.restart({ config: cfg, bossRushStage: nextStage });
        } else {
          this.finishRun(true, 'ALL BOSSES DEFEATED!');
        }
      });
      return;
    }
    // adventure: victory handled by objective complete on next tick
  }

  // ---------- random events ----------
  private applyRandomEvent(id: RandomEventType): void {
    const def = RANDOM_EVENTS[id];
    audio.sfx('event');
    floatingText(this, this.scale.width / 2, this.scale.height * 0.25, `${def.emoji} ${def.name}`, `#${def.color.toString(16).padStart(6, '0')}`, 28);
    this.cameras.main.flash(150, 200, 200, 255);
    switch (id) {
      case 'doubleScore': this.manager.scoreMultiplier = 2; this.time.delayedCall(def.durationMs, () => { this.manager.scoreMultiplier = 1; }); break;
      case 'treasureRush': this.manager.config.specialChance = 0.5; this.time.delayedCall(def.durationMs, () => { this.manager.config.specialChance = this.baseSpecialChance; }); break;
      case 'meteorShower': this.rewardAreaEffect(this.manager.board.destroyRandomFilled(8), 0, 0, ''); break;
      case 'magicStorm': {
        for (let y = 0; y < BOARD_ROWS; y++) {
          if (this.manager.board.grid[y].some((c) => c.value)) {
            const r = this.manager.board.clearRow(y);
            this.rewardAreaEffect(r.destroyed, r.obstacles, r.treasures, '');
            break;
          }
        }
        break;
      }
      case 'mysteriousChest': {
        const coins = 100 + Math.floor(Math.random() * 200);
        this.save.addCoins(coins);
        floatingText(this, this.scale.width / 2, this.scale.height * 0.35, `🎁 +${coins} coins`, '#f97316', 24);
        break;
      }
      case 'blockFrenzy': this.manager.config.modifiers.fastGravity = true; this.time.delayedCall(def.durationMs, () => { this.manager.config.modifiers.fastGravity = false; }); break;
      case 'ancientPortal': this.rewardAreaEffect(this.manager.board.destroyRandomFilled(12), 0, 0, ''); break;
      case 'timeAttack':
        if (this.config.mode === 'timeAttack') this.timeLeftMs += 30000;
        else {
          // bonus koin, bukan skor flat - agar objective skor tetap harus diperjuangkan
          this.save.addCoins(150);
          floatingText(this, this.scale.width / 2, this.scale.height * 0.35, '⏱️ +150 coins!', '#38bdf8', 22);
        }
        break;
    }
  }

  // ---------- power-ups ----------
  private energyMult(): number {
    const charDef = CHARACTERS.find((c) => c.id === this.save.data.selectedCharacter);
    const compDef = COMPANIONS.find((c) => c.id === this.save.data.selectedCompanion);
    return 1 + (charDef?.passive.energy ?? 0) + (compDef?.passive.energy ?? 0);
  }

  private usePowerUp(id: PowerUpId): void {
    if (this.manager.paused || this.ending) return;
    if (!this.energy.spend(id)) {
      floatingText(this, this.scale.width / 2, this.scale.height - 110, 'Not enough energy!', '#f43f5e', 18);
      return;
    }
    audio.sfx('powerup');
    this.powerupsUsedThisRun++;
    this.quests.record('powerups', 1);
    const pu = POWER_UPS.find((p) => p.id === id)!;
    floatingText(this, this.scale.width / 2, this.scale.height - 140, `${pu.emoji} ${pu.name}!`, '#67e8f9', 20);
    const b = this.manager.board;
    const compDef = COMPANIONS.find((c) => c.id === this.save.data.selectedCompanion);
    const durMult = 1 + (compDef?.passive.powerDuration ?? 0);

    switch (id) {
      case 'hammer': {
        for (let y = BOARD_ROWS - 1; y >= 0; y--) {
          let hit = false;
          for (let x = 0; x < BOARD_COLS; x++) {
            if (b.grid[y][x].value) {
              const r = b.explode(x, y, 0);
              this.rewardAreaEffect(r.destroyed, r.obstacles, r.treasures, '');
              this.burstAt(this.boardX + (x + 0.5) * CELL * this.scaleS, this.boardY + (y + 0.5) * CELL * this.scaleS, 0xffffff, 8);
              hit = true;
              break;
            }
          }
          if (hit) break;
        }
        break;
      }
      case 'shuffle':
        this.manager.shuffleNext();
        break;
      case 'timeFreeze':
        this.manager.timeFrozen = true;
        this.freezeUntil = this.elapsedMs + 8000 * durMult;
        break;
      case 'fireBlast': {
        const r1 = b.clearRow(BOARD_ROWS - 1);
        const r2 = b.clearRow(BOARD_ROWS - 2);
        this.rewardAreaEffect(r1.destroyed + r2.destroyed, r1.obstacles + r2.obstacles, r1.treasures + r2.treasures, '');
        this.cameras.main.shake(250, 0.008);
        break;
      }
      case 'magicClear': {
        const r = b.explode(4, BOARD_ROWS - 3, 2);
        this.rewardAreaEffect(r.destroyed, r.obstacles, r.treasures, '');
        break;
      }
      case 'rainbow': {
        const col = b.getDensestColumn();
        const r = b.clearColumn(col);
        this.rewardAreaEffect(r.destroyed, r.obstacles, r.treasures, '');
        this.cameras.main.flash(150, 200, 150, 255);
        break;
      }
    }
    this.cascadeClears(0);
  }

  // ---------- rendering ----------
  private burstAt(x: number, y: number, tint: number, count: number): void {
    if (this.save.data.settings.reducedMotion) return;
    const em = this.add.particles(x, y, 'particle', {
      speed: { min: 40, max: 160 },
      lifespan: 500,
      scale: { start: 0.9, end: 0 },
      quantity: count,
      tint,
      emitting: false,
    });
    em.setDepth(90);
    em.explode(count);
    this.time.delayedCall(700, () => em.destroy());
  }

  private render(): void {
    // board frame
    const g = this.boardG;
    g.clear();
    g.fillStyle(0x0f172a, 0.75);
    g.fillRect(this.boardX - 4, this.boardY - 4, BOARD_W * this.scaleS + 8, BOARD_H * this.scaleS + 8);
    g.lineStyle(2, 0x475569, 1);
    g.strokeRect(this.boardX - 4, this.boardY - 4, BOARD_W * this.scaleS + 8, BOARD_H * this.scaleS + 8);

    // combo border glow - pulses while combo is hot
    const glow = this.borderGlow;
    glow.clear();
    const combo = this.manager.stats.combo;
    if (combo >= 3 && !this.save.data.settings.reducedMotion) {
      const t = this.time.now / 140;
      const alpha = 0.35 + 0.3 * Math.sin(t);
      const intensity = Math.min(1, (combo - 2) / 6);
      glow.lineStyle(5 + intensity * 6, combo >= 6 ? 0xf43f5e : 0xf59e0b, alpha);
      glow.strokeRect(this.boardX - 8, this.boardY - 8, BOARD_W * this.scaleS + 16, BOARD_H * this.scaleS + 16);
    }

    // grid cells
    let cellIdx = 0;
    let spIdx = 0;
    const grid = this.manager.board.grid;
    for (let y = 0; y < BOARD_ROWS; y++) {
      for (let x = 0; x < BOARD_COLS; x++) {
        const cell: Cell = grid[y][x];
        const img = this.cellPool[cellIdx++];
        if (!cell.value) { img.setVisible(false); continue; }
        img.setVisible(true);
        img.setPosition(this.boardX + (x + 0.5) * CELL * this.scaleS, this.boardY + (y + 0.5) * CELL * this.scaleS);
        img.setScale(this.scaleS);
        if (cell.obstacle) {
          img.setTexture('obstacle');
          img.setTint(cell.color);
        } else {
          img.setTexture('block');
          img.setTint(cell.color);
        }
        // special overlay
        if (cell.special) {
          const sp = this.specialPool[spIdx++];
          sp.setVisible(true);
          sp.setPosition(img.x, img.y);
          sp.setScale(this.scaleS * 0.7);
          sp.setTint(SPECIAL_COLORS[cell.special]);
          sp.setAlpha(0.9);
        }
      }
    }
    for (let i = spIdx; i < this.specialPool.length; i++) this.specialPool[i].setVisible(false);

    // ghost
    const piece = this.manager.currentPiece;
    const ghostY = this.manager.getGhostY();
    let pi = 0;
    const positions: Array<[number, number, boolean]> = [];
    for (let y = 0; y < piece.matrix.length; y++) {
      for (let x = 0; x < piece.matrix[y].length; x++) {
        if (piece.matrix[y][x]) {
          positions.push([piece.x + x, ghostY + y, true]);
          positions.push([piece.x + x, piece.y + y, false]);
        }
      }
    }
    // ghost first 4, piece next
    let gi = 0;
    pi = 0;
    for (const [x, y, isGhost] of positions) {
      const img = isGhost ? this.ghostImgs[gi++] : this.pieceImgs[pi++];
      if (!img) continue;
      img.setVisible(true);
      img.setTexture('block');
      img.setTint(piece.color);
      img.setPosition(this.boardX + (x + 0.5) * CELL * this.scaleS, this.boardY + (y + 0.5) * CELL * this.scaleS);
      img.setScale(this.scaleS);
    }
    for (let i = gi; i < this.ghostImgs.length; i++) this.ghostImgs[i].setVisible(false);
    for (let i = pi; i < this.pieceImgs.length; i++) this.pieceImgs[i].setVisible(false);
  }

  private updateHud(): void {
    this.hud.update({
      score: this.manager.stats.score,
      level: this.manager.stats.level,
      lines: this.manager.stats.lines,
      combo: this.manager.stats.combo,
      energy: this.energy.energy,
      maxEnergy: this.energy.max,
      nextPieces: this.manager.nextPieces,
      heldPiece: this.manager.heldPiece,
      objective: this.config.mode === 'endless' || this.config.mode === 'timeAttack' ? null : this.objective,
      boss: this.boss,
      timeLeftSec: this.config.timeLimitSec ? this.timeLeftMs / 1000 : null,
      darknessActive: this.elapsedMs < this.darknessUntil,
    });
  }

  // ---------- pause ----------
  private togglePause(): void {
    if (this.ending) return;
    this.manager.togglePause();
    audio.sfx('ui');
    if (this.manager.paused) this.showPauseOverlay();
    else this.hidePauseOverlay();
  }

  private showPauseOverlay(): void {
    if (this.pauseOverlay) return;
    const c = this.add.container(0, 0).setDepth(300);
    const w = this.scale.width;
    const h = this.scale.height;
    c.add(this.add.rectangle(w / 2, h / 2, w, h, 0x020617, 0.8));
    c.add(this.add.text(w / 2, h / 2 - 80, 'PAUSED', { fontFamily: 'Nunito', fontSize: '42px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5));
    c.add(createButton(this, w / 2, h / 2, '▶ RESUME', () => this.togglePause(), { bgColor: 0x10b981, width: 220 }));
    c.add(createButton(this, w / 2, h / 2 + 70, '✖ QUIT', () => this.quitToMenu(), { bgColor: 0xef4444, width: 220 }));
    this.pauseOverlay = c;
  }

  private hidePauseOverlay(): void {
    this.pauseOverlay?.destroy();
    this.pauseOverlay = null;
  }

  private quitToMenu(): void {
    this.recordSessionStats(false);
    audio.stopMusic();
    const target = this.config.mode === 'adventure' ? 'WorldMapScene' : 'MainMenuScene';
    this.scene.start(target, { worldId: this.config.worldId });
  }

  // ---------- run end ----------
  private finishRun(victory: boolean, overrideLabel?: string): void {
    if (this.ending) return;
    this.ending = true;
    const payload = this.computeRewards(victory, overrideLabel);
    this.recordSessionStats(victory);
    audio.stopMusic();
    audio.sfx(victory ? 'victory' : 'defeat');
    this.scene.start(victory ? 'VictoryScene' : 'GameOverScene', payload);
  }

  private computeRewards(victory: boolean, overrideLabel?: string): Record<string, unknown> {
    const s = this.manager.stats;
    const stars = victory
      ? s.score >= this.config.parScore ? 3 : s.score >= this.config.parScore * 0.65 ? 2 : 1
      : 0;
    const bossDefeated = this.boss !== null && this.boss.hp <= 0;
    const coins = Math.round((s.score / 100 + s.lines * 5 + (victory ? 100 : 0)) * (1 + (this.save.data.selectedCompanion ? this.coinBonus() : 0)));
    const xp = Math.round(s.score / 40 + s.lines * 3);
    const gems = bossDefeated ? this.boss?.def.rewardGems ?? 0 : 0;
    let firstClear = false;
    if (victory && this.config.mode === 'adventure') {
      firstClear = this.save.completeLevel(this.config.worldId, this.config.levelIndex, stars);
    }
    if (victory || this.config.mode === 'timeAttack') {
      this.save.recordBestScore(this.config.mode, s.score);
    }
    if (victory && this.config.mode === 'daily') {
      const dc = this.save.data.dailyChallenge;
      dc.completed = true;
      dc.bestScore = Math.max(dc.bestScore, s.score);
      this.save.addCoins(300);
      this.save.addXp(150);
      this.save.save();
    }
    return {
      victory,
      overrideLabel,
      mode: this.config.mode,
      worldId: this.config.worldId,
      levelIndex: this.config.levelIndex,
      stats: s,
      objectiveLabel: this.config.objective.label,
      progress: this.objective.progress(),
      stars,
      coins,
      xp,
      gems,
      firstClear,
      bossDefeated,
      bossRushStage: this.bossRushStage,
    };
  }

  private coinBonus(): number {
    const charDef = CHARACTERS.find((c) => c.id === this.save.data.selectedCharacter);
    const compDef = COMPANIONS.find((c) => c.id === this.save.data.selectedCompanion);
    return (charDef?.passive.coins ?? 0) + (compDef?.passive.coins ?? 0);
  }

  private recordSessionStats(victory: boolean): void {
    const s = this.manager.stats;
    const d = this.save.data;
    d.stats.gamesPlayed += 1;
    d.stats.totalLines += s.lines;
    d.stats.totalScore += s.score;
    d.stats.tetrisCount += s.tetrisCount;
    d.stats.treasures += s.treasures;
    d.stats.perfectClears += s.perfectClears;
    d.stats.maxCombo = Math.max(d.stats.maxCombo, s.maxCombo);
    d.stats.powerupsUsed += this.powerupsUsedThisRun;
    d.stats.playTimeSec += Math.round(this.elapsedMs / 1000);
    if (this.boss && this.boss.hp <= 0) d.stats.bossKills += 1;
    this.quests.record('games', 1);
    this.quests.record('totalScore', s.score);
    this.quests.setMax('combos', s.maxCombo);
    this.save.save();

    // achievements
    const newly = this.quests.checkAchievements({
      tetrisCount: d.stats.tetrisCount,
      maxCombo: d.stats.maxCombo,
      perfectClears: d.stats.perfectClears,
      bossKills: d.stats.bossKills,
      treasures: d.stats.treasures,
      timeAttackBest: d.bestScores['timeAttack'] ?? 0,
      endlessBest: d.bestScores['endless'] ?? 0,
      gamesPlayed: d.stats.gamesPlayed,
      worldsCleared: this.save.getWorldsCleared(),
      playTimeSec: d.stats.playTimeSec,
    });
    this.registry.set('newAchievements', newly);
    void victory;
  }
}
