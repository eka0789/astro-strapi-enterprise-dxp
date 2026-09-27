import Phaser from 'phaser';

// Generates all textures procedurally - no external assets required.
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    this.makeBlockTexture();
    this.makeParticleTexture();
    this.makeGlowTexture();
    this.makeObstacleTexture();

    this.scene.start('MainMenuScene');
  }

  private makeBlockTexture(): void {
    const g = this.add.graphics();
    const s = 32;
    // base block - white so it can be tinted
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(1, 1, s - 2, s - 2, 6);
    g.fillStyle(0xffffff, 0.35);
    g.fillRoundedRect(5, 5, s - 14, s - 14, 4);
    g.generateTexture('block', s, s);
    g.clear();

    // special overlay: white diamond
    g.fillStyle(0xffffff, 1);
    g.fillRect(s / 2 - 5, 3, 10, 10);
    g.generateTexture('special_mark', s, s);
    g.clear();
    g.destroy();
  }

  private makeParticleTexture(): void {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 8, 8);
    g.generateTexture('particle', 8, 8);
    g.clear();
    g.destroy();
  }

  private makeGlowTexture(): void {
    const g = this.add.graphics();
    const r = 32;
    for (let i = r; i > 0; i -= 2) {
      g.fillStyle(0xffffff, 0.03 + (1 - i / r) * 0.05);
      g.fillCircle(r, r, i);
    }
    g.generateTexture('glow', r * 2, r * 2);
    g.clear();
    g.destroy();
  }

  private makeObstacleTexture(): void {
    const g = this.add.graphics();
    const s = 32;
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, s, s);
    g.fillStyle(0x000000, 0.25);
    for (let i = 0; i < 4; i++) {
      g.fillRect(4 + i * 7, 4 + (i % 2) * 8, 4, s - 10);
    }
    g.generateTexture('obstacle', s, s);
    g.clear();
    g.destroy();
  }
}
