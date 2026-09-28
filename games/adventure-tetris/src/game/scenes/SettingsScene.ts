import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem.js';
import { audio } from '../systems/AudioSystem.js';
import { createButton, formatNumber } from '../ui/Buttons.js';

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SettingsScene' });
  }

  create(): void {
    const save = SaveSystem.get();
    const { width, height } = this.scale;
    const cx = width / 2;
    this.add.rectangle(cx, height / 2, width, height, 0x0f172a);

    this.add.text(16, 16, '◄', { fontSize: '30px', color: '#ffffff' })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { audio.sfx('ui'); this.scene.start('MainMenuScene'); });
    this.add.text(cx, 24, '⚙️ SETTINGS', { fontFamily: 'Nunito', fontSize: '24px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);

    const s = save.data.settings;
    let y = 100;

    // volume sliders
    y = this.addSlider(cx, y, '🎵 Music', s.musicVolume, (v) => {
      s.musicVolume = v;
      save.save();
      audio.setVolumes(s.musicVolume, s.sfxVolume);
    });
    y = this.addSlider(cx, y, '🔊 SFX', s.sfxVolume, (v) => {
      s.sfxVolume = v;
      save.save();
      audio.setVolumes(s.musicVolume, s.sfxVolume);
      audio.sfx('coin');
    });

    // toggles
    y += 10;
    y = this.addToggle(cx, y, '📳 Screen Shake', s.screenShake, (v) => { s.screenShake = v; save.save(); });
    y = this.addToggle(cx, y, '🎨 Colorblind Mode', s.colorblind, (v) => { s.colorblind = v; save.save(); });
    y = this.addToggle(cx, y, '🌀 Reduced Motion', s.reducedMotion, (v) => { s.reducedMotion = v; save.save(); });
    y = this.addToggle(cx, y, '📲 Haptics', s.haptics, (v) => { s.haptics = v; save.save(); });
    y = this.addToggle(cx, y, '🤚 Left-handed', s.leftHanded, (v) => { s.leftHanded = v; save.save(); });

    // stats summary
    y += 16;
    const d = save.data;
    this.add.text(cx, y, [
      `Games: ${d.stats.gamesPlayed} · Lines: ${formatNumber(d.stats.totalLines)} · Bosses: ${d.stats.bossKills}`,
      `Total Score: ${formatNumber(d.stats.totalScore)} · Play time: ${Math.round(d.stats.playTimeSec / 60)}m`,
    ].join('\n'), { fontFamily: 'Nunito', fontSize: '13px', color: '#64748b', align: 'center', lineSpacing: 6 }).setOrigin(0.5);

    // danger zone
    createButton(this, cx, height - 100, '🗑️ RESET PROGRESS', () => this.confirmReset(), { bgColor: 0x7f1d1d, width: 240, fontSize: 14 });
  }

  private addSlider(cx: number, y: number, label: string, value: number, onChange: (v: number) => void): number {
    const width = this.scale.width;
    const save = SaveSystem.get();
    this.add.text(Math.max(16, cx - 200), y - 8, label, { fontFamily: 'Nunito', fontSize: '16px', color: '#e2e8f0' });
    const pct = this.add.text(Math.min(width - 16, cx + 200), y - 8, `${Math.round(value * 100)}%`, {
      fontFamily: 'Nunito', fontSize: '14px', color: '#67e8f9',
    }).setOrigin(1, 0);

    const barW = Math.min(300, width - 130);
    const bar = this.add.rectangle(cx, y + 18, barW, 10, 0x334155).setOrigin(0.5);
    const fill = this.add.rectangle(cx - barW / 2, y + 18, barW * value, 10, 0x00f0ff).setOrigin(0, 0.5);
    const knob = this.add.circle(cx - barW / 2 + barW * value, y + 18, 11, 0xffffff).setInteractive({ draggable: true });

    this.input.setDraggable(knob);
    this.input.on('drag', (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject, dragX: number) => {
      if (obj !== knob) return;
      const min = cx - barW / 2;
      const v = Phaser.Math.Clamp((dragX - min) / barW, 0, 1);
      fill.width = barW * v;
      knob.x = min + barW * v;
      pct.setText(`${Math.round(v * 100)}%`);
      onChange(v);
      void bar;
      void save;
    });
    return y + 62;
  }

  private addToggle(cx: number, y: number, label: string, value: boolean, onChange: (v: boolean) => void): number {
    const width = this.scale.width;
    const t = this.add.text(cx - 200, y, label, { fontFamily: 'Nunito', fontSize: '16px', color: '#e2e8f0' });
    let isOn = value;
    const toggle = this.add.container(Math.min(cx + 170, width - 42), y + 8);
    const bg = this.add.rectangle(0, 0, 56, 26, isOn ? 0x22c55e : 0x475569, 1).setOrigin(0.5);
    const knob = this.add.circle(isOn ? 14 : -14, 0, 10, 0xffffff);
    const check = this.add.text(0, 0, isOn ? '✓' : '', { fontSize: '12px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    toggle.add([bg, knob, check]);
    toggle.setInteractive(new Phaser.Geom.Rectangle(-28, -13, 56, 26), Phaser.Geom.Rectangle.Contains);
    toggle.on('pointerover', () => toggle.setScale(1.08));
    toggle.on('pointerout', () => toggle.setScale(1));
    toggle.on('pointerdown', () => {
      audio.sfx('ui');
      isOn = !isOn;
      onChange(isOn);
      bg.fillColor = isOn ? 0x22c55e : 0x475569;
      check.setText(isOn ? '✓' : '');
      this.tweens.add({ targets: knob, x: isOn ? 14 : -14, duration: 140, ease: 'Back.easeOut' });
      this.tweens.add({ targets: toggle, scale: 0.92, duration: 70, yoyo: true });
    });
    void t;
    return y + 42;
  }

  private confirmReset(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const overlay = this.add.container(0, 0).setDepth(400);
    overlay.add(this.add.rectangle(cx, height / 2, width, height, 0x020617, 0.9).setInteractive());
    overlay.add(this.add.text(cx, height / 2 - 60, 'Reset semua progress?', {
      fontFamily: 'Nunito', fontSize: '24px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5));
    overlay.add(this.add.text(cx, height / 2 - 24, 'Tindakan ini tidak bisa dibatalkan!', {
      fontFamily: 'Nunito', fontSize: '14px', color: '#f43f5e',
    }).setOrigin(0.5));
    overlay.add(createButton(this, cx - 80, height / 2 + 30, 'YES, RESET', () => {
      SaveSystem.get().reset();
      this.scene.start('MainMenuScene');
    }, { bgColor: 0xef4444, width: 150, fontSize: 14 }));
    overlay.add(createButton(this, cx + 80, height / 2 + 30, 'CANCEL', () => overlay.destroy(), { bgColor: 0x475569, width: 130, fontSize: 14 }));
  }
}
