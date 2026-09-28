import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem.js';
import { audio } from '../systems/AudioSystem.js';
import {
  createButton, makeWorldBackground, formatNumber,
  makeFallingBlocks, staggerIn, pulseButton, clickBurst,
} from '../ui/Buttons.js';
import { CHARACTERS } from '../data/meta.js';
import { WORLDS } from '../data/worlds.js';
import { buildRunConfig } from '../data/modes.js';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    const save = SaveSystem.get();
    const { width, height } = this.scale;
    const cx = width / 2;
    const settings = save.data.settings;
    audio.setVolumes(settings.musicVolume, settings.sfxVolume);
    audio.startMusic(220);

    const w1 = WORLDS[0];
    makeWorldBackground(this, w1.theme.bgTop, w1.theme.bgBottom, w1.theme.particle);
    const falling = makeFallingBlocks(this, 14);

    // mouse parallax on the falling blocks + sparkle on any click
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      falling.setX((p.x - width / 2) * 0.035);
      falling.setY((p.y - height / 2) * 0.035);
    });
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      clickBurst(this, p.x, p.y, 0x67e8f9, 8);
    });

    // profile bar with currency count-up
    const charDef = CHARACTERS.find((c) => c.id === save.data.selectedCharacter);
    this.add.text(16, 12, `${charDef?.emoji ?? '🧑'} LV ${save.data.playerLevel}`, {
      fontFamily: 'Nunito', fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
    }).setDepth(60);
    const currencyLabel = this.add.text(width - 16, 12, '', {
      fontFamily: 'Nunito', fontSize: '16px', color: '#fbbf24', fontStyle: 'bold',
    }).setOrigin(1, 0).setDepth(60);
    this.tweens.addCounter({
      from: 0, to: save.data.coins, duration: 900, ease: 'Cubic.easeOut',
      onUpdate: (t) => currencyLabel.setText(`💰 ${formatNumber(Math.round(t.getValue() ?? 0))}   💎 ${save.data.gems}`),
    });

    // logo with glow pulse
    const logoFontSize = Math.min(64, Math.floor(width / 12));
    const logoGlow = this.add.image(cx, height * 0.16 + 10, 'glow')
      .setDisplaySize(logoFontSize * 8, logoFontSize * 3.2)
      .setTint(0xfbbf24).setAlpha(0.18).setDepth(-5);
    this.tweens.add({ targets: logoGlow, alpha: 0.32, scale: 1.08, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const logo = this.add.text(cx, height * 0.16, 'ADVENTURE TETRIS', {
      fontFamily: 'Nunito', fontSize: logoFontSize + 'px', color: '#fbbf24', fontStyle: 'bold',
      stroke: '#7c2d12', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(10);
    logo.setScale(0);
    this.tweens.add({ targets: logo, scale: 1, duration: 550, ease: 'Back.easeOut' });
    this.tweens.add({ targets: logo, y: height * 0.16 + 8, duration: 1600, delay: 550, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const tagline = this.add.text(cx, height * 0.16 + logoFontSize * 0.75 + 16, 'Susun Bloknya, Jelajahi Dunianya!', {
      fontFamily: 'Nunito', fontSize: '18px', color: '#cbd5e1',
    }).setOrigin(0.5).setDepth(10);
    tagline.setAlpha(0);
    this.tweens.add({ targets: tagline, alpha: 1, duration: 500, delay: 400 });

    // continue info
    const curWorld = WORLDS.find((w) => (save.data.worldProgress[w.id] ?? 0) < 10) ?? WORLDS[WORLDS.length - 1];
    const curLevel = (save.data.worldProgress[curWorld.id] ?? 0) + 1;
    this.add.text(cx, height * 0.32, `${curWorld.emoji} ${curWorld.nameId} · Level ${curLevel} · ⭐ ${save.getTotalStars()}`, {
      fontFamily: 'Nunito', fontSize: '15px', color: '#93c5fd',
    }).setOrigin(0.5);

    // main buttons
    const narrow0 = width < 480;
    const btnY = height * (narrow0 ? 0.36 : 0.42);
    const gap = narrow0 ? 54 : 58;
    const adventureBtn = createButton(this, cx, btnY, '🗺️ ADVENTURE', () => {
      this.scene.start('WorldMapScene', { worldId: curWorld.id });
    }, { bgColor: 0x22c55e, width: 260 });
    pulseButton(adventureBtn, 1.04, 1300);

    const endlessBtn = createButton(this, cx, btnY + gap, '♾️ ENDLESS', () => {
      this.startGame(buildRunConfig('endless'));
    }, { bgColor: 0x3b82f6, width: 260 });

    const dailyDone = save.data.dailyChallenge.completed;
    const dailyBtn = createButton(this, cx, btnY + gap * 2, dailyDone ? '✅ DAILY CHALLENGE' : '📅 DAILY CHALLENGE', () => {
      this.scene.start('DailyChallengeScene');
    }, { bgColor: dailyDone ? 0x475569 : 0x8b5cf6, width: 260 });

    // secondary buttons - horizontal row on desktop, stacked on narrow screens
    const secY = btnY + gap * 3 + 12;
    const narrow = width < 480;
    const secW = narrow ? 220 : 142;
    const secGap = narrow ? 84 : 152;
    const modesBtn = createButton(this, narrow ? cx : cx - secW - 10, secY, '⏱️ MODES', () => this.showModesPanel(), { bgColor: 0x6366f1, width: secW, fontSize: 16 });
    const shopBtn = createButton(this, narrow ? cx : cx, narrow ? secY + secGap : secY, '🛒 SHOP', () => this.scene.start('ShopScene'), { bgColor: 0xf59e0b, width: secW, fontSize: 16 });
    const collBtn = createButton(this, narrow ? cx : cx + secW + 10, narrow ? secY + secGap * 2 : secY, '📦 COLLECTION', () => this.scene.start('CollectionScene'), { bgColor: 0x0ea5e9, width: secW, fontSize: 16 });

    const settingsBtn = createButton(this, cx, narrow ? secY + secGap * 3 : secY + 54, '⚙️ SETTINGS', () => this.scene.start('SettingsScene'), { bgColor: 0x475569, width: 200 });

    // staggered entrance
    staggerIn([adventureBtn, endlessBtn, dailyBtn, modesBtn, shopBtn, collBtn, settingsBtn], 0, 46, 70);

    // best scores footer
    const best = save.data.bestScores;
    this.add.text(cx, height - 18,
      `Best — Endless: ${formatNumber(best['endless'] ?? 0)} · Time Attack: ${formatNumber(best['timeAttack'] ?? 0)}`,
      { fontFamily: 'Nunito', fontSize: '13px', color: '#64748b' }).setOrigin(0.5);

    // unlock audio on first gesture
    this.input.once('pointerdown', () => audio.ensureContext());
  }

  private showModesPanel(): void {
    const { width, height } = this.scale;
    const panel = this.add.container(0, 0).setDepth(300);
    panel.add(this.add.rectangle(width / 2, height / 2, width, height, 0x020617, 0.85).setInteractive());
    panel.add(this.add.text(width / 2, height / 2 - 140, 'GAME MODES', { fontFamily: 'Nunito', fontSize: '30px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5));

    const modes: Array<[string, string, number]> = [
      ['⏱️ TIME ATTACK', 'Score max dalam 120 detik', 0x38bdf8],
      ['👑 BOSS RUSH', 'Lawan semua boss!', 0xef4444],
      ['🧩 PUZZLE', 'Bersihkan obstacle', 0x8b5cf6],
      ['🔥 SURVIVAL', 'Bertahan dari sampah', 0xf97316],
    ];
    modes.forEach(([label, desc, color], i) => {
      const y = height / 2 - 70 + i * 62;
      panel.add(this.add.text(width / 2, y - 34, desc, { fontFamily: 'Nunito', fontSize: '13px', color: '#94a3b8' }).setOrigin(0.5));
      const btn = createButton(this, width / 2, y, label, () => {
        panel.destroy();
        const mode = i === 0 ? 'timeAttack' : i === 1 ? 'bossRush' : i === 2 ? 'puzzle' : 'survival';
        if (mode === 'bossRush') this.registry.set('bossRushScore', 0);
        this.startGame(buildRunConfig(mode as 'timeAttack' | 'bossRush' | 'puzzle' | 'survival'));
      }, { bgColor: color, width: 220 });
      panel.add(btn);
    });
    panel.add(createButton(this, width / 2, height / 2 + 210, 'CLOSE', () => panel.destroy(), { bgColor: 0x475569, width: 160 }));
  }

  private startGame(config: ReturnType<typeof buildRunConfig>): void {
    audio.ensureContext();
    this.scene.start('LevelIntroScene', { config, skipIntro: config.mode !== 'adventure' });
  }
}
