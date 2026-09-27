import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem.js';
import { audio } from '../systems/AudioSystem.js';
import { createButton, makeWorldBackground, formatNumber, staggerIn, clickBurst } from '../ui/Buttons.js';
import { WORLDS, getWorldLevels, nodeIcon, type LevelDef } from '../data/worlds.js';
import { buildRunConfig } from '../data/modes.js';
import { CHARACTERS } from '../data/meta.js';

export class WorldMapScene extends Phaser.Scene {
  private worldIdx = 0;

  constructor() {
    super({ key: 'WorldMapScene' });
  }

  init(data: { worldId?: string }): void {
    const save = SaveSystem.get();
    const passed = data.worldId ? WORLDS.findIndex((w) => w.id === data.worldId) : 0;
    const firstIncomplete = WORLDS.findIndex((w) => (save.data.worldProgress[w.id] ?? 0) < 10);
    this.worldIdx = passed >= 0 ? passed : Math.max(0, firstIncomplete);
  }

  create(): void {
    const save = SaveSystem.get();
    const world = WORLDS[this.worldIdx];
    const { width, height } = this.scale;
    audio.startMusic(world.musicRoot);

    makeWorldBackground(this, world.theme.bgTop, world.theme.bgBottom, world.theme.particle);

    // header
    const header = this.add.container(0, 0).setDepth(50);
    header.add(this.add.text(16, 14, '◄', { fontSize: '30px', color: '#ffffff' }).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      audio.sfx('ui');
      this.scene.start('MainMenuScene');
    }));
    header.add(this.add.text(width / 2, 22, `${world.emoji} ${world.name.toUpperCase()}`, {
      fontFamily: 'Nunito', fontSize: '24px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5, 0));
    header.add(this.add.text(width - 16, 14, `💰 ${formatNumber(save.data.coins)} 💎 ${save.data.gems}`, {
      fontFamily: 'Nunito', fontSize: '15px', color: '#fbbf24', fontStyle: 'bold',
    }).setOrigin(1, 0));

    // world switcher
    const canPrev = this.worldIdx > 0 && (save.data.worldProgress[WORLDS[this.worldIdx - 1].id] ?? 0) >= 10;
    const canNext = this.worldIdx < WORLDS.length - 1 && (save.data.worldProgress[world.id] ?? 0) >= 10;
    if (canPrev) {
      header.add(this.add.text(40, height / 2, '◀', { fontSize: '42px', color: '#ffffff' }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        audio.sfx('ui');
        this.scene.restart({ worldId: WORLDS[this.worldIdx - 1].id });
      }));
    }
    if (canNext) {
      header.add(this.add.text(width - 40, height / 2, '▶', { fontSize: '42px', color: '#ffffff' }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        audio.sfx('ui');
        this.scene.restart({ worldId: WORLDS[this.worldIdx + 1].id });
      }));
    }

    // world progress dots
    const dotsY = 56;
    WORLDS.forEach((w, i) => {
      const cleared = (save.data.worldProgress[w.id] ?? 0) >= 10;
      const dot = this.add.circle(width / 2 + (i - WORLDS.length / 2 + 0.5) * 26, dotsY, 8, cleared ? 0x22c55e : i === this.worldIdx ? 0x3b82f6 : 0x334155);
      dot.setStrokeStyle(2, 0xffffff, 0.4);
      header.add(dot);
    });

    // level nodes - zigzag path
    const levels = getWorldLevels(world.id);
    const startY = 110;
    const spacing = Math.min(62, (height - 220) / 10);
    const positions = levels.map((lvl, i) => ({
      lvl,
      x: width / 2 + Math.sin(i * 1.1) * (width * 0.22),
      y: startY + i * spacing,
    }));

    // dotted adventure path between consecutive nodes
    const path = this.add.graphics().setDepth(5);
    path.fillStyle(world.theme.accent, 0.55);
    for (let i = 0; i < positions.length - 1; i++) {
      const a = positions[i];
      const b = positions[i + 1];
      const steps = 6;
      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        const px = a.x + (b.x - a.x) * t;
        const py = a.y + (b.y - a.y) * t;
        path.fillCircle(px, py, 3);
      }
    }
    // animated dash flowing along the path (energy feel)
    const flow = this.add.graphics().setDepth(6);
    this.time.addEvent({
      delay: 90,
      loop: true,
      callback: () => {
        flow.clear();
        flow.fillStyle(0xffffff, 0.85);
        this.flowT = (this.flowT + 0.05) % 1;
        for (let i = 0; i < positions.length - 1; i++) {
          const a = positions[i];
          const b = positions[i + 1];
          const t = this.flowT;
          const px = a.x + (b.x - a.x) * t;
          const py = a.y + (b.y - a.y) * t;
          flow.fillCircle(px, py, 4);
        }
      },
    });

    const nodes: Phaser.GameObjects.Container[] = [];
    positions.forEach((pos) => {
      nodes.push(this.createNode(pos.lvl, pos.x, pos.y));
    });
    staggerIn(nodes, 0, 60, 60);

    // bottom bar
    const charDef = CHARACTERS.find((c) => c.id === save.data.selectedCharacter);
    const bottom = this.add.container(0, 0).setDepth(50);
    bottom.add(this.add.text(16, height - 30, `${charDef?.emoji ?? '🧑'} ${charDef?.name ?? ''}`, {
      fontFamily: 'Nunito', fontSize: '14px', color: '#ffffff',
    }).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.scene.start('CollectionScene')));
    bottom.add(createButton(this, width - 90, height - 26, '🛒 SHOP', () => this.scene.start('ShopScene'), { bgColor: 0xf59e0b, fontSize: 15, width: 130 }));
  }

  private flowT = 0;

  private createNode(lvl: LevelDef, x: number, y: number): Phaser.GameObjects.Container {
    const save = SaveSystem.get();
    const unlocked = save.isLevelUnlocked(lvl.worldId, lvl.index);
    const stars = save.data.stars[`${lvl.worldId}_${lvl.index}`] ?? 0;

    const nodeColor = unlocked
      ? lvl.kind === 'boss' ? 0xef4444 : lvl.kind === 'miniBoss' ? 0xf97316 : lvl.kind === 'treasure' ? 0x22c55e : 0x3b82f6
      : 0x334155;

    const node = this.add.container(x, y).setDepth(10);
    const circle = this.add.circle(0, 0, 26, nodeColor);
    circle.setStrokeStyle(3, 0xffffff, unlocked ? 0.9 : 0.3);
    node.add(circle);
    const icon = this.add.text(0, 0, unlocked ? nodeIcon(lvl.kind) : '🔒', { fontSize: '22px' }).setOrigin(0.5);
    node.add(icon);

    const label = this.add.text(0, 36, `${lvl.index}. ${lvl.name}`, {
      fontFamily: 'Nunito', fontSize: '12px', color: unlocked ? '#e2e8f0' : '#64748b', fontStyle: 'bold',
      align: 'center', wordWrap: { width: 110 },
    }).setOrigin(0.5, 0);
    node.add(label);

    if (stars > 0) {
      node.add(this.add.text(0, -38, '⭐'.repeat(stars), { fontSize: '10px' }).setOrigin(0.5));
    }

    if (unlocked) {
      const isCurrent = (save.data.worldProgress[lvl.worldId] ?? 0) === lvl.index - 1;
      if (isCurrent) {
        const ring = this.add.circle(0, 0, 32, 0x000000, 0);
        ring.setStrokeStyle(3, 0xfbbf24, 1);
        node.add(ring);
        this.tweens.add({ targets: ring, scale: 1.15, alpha: 0.4, duration: 800, yoyo: true, repeat: -1 });
        // node bobs gently to invite a click (after entrance stagger settles)
        this.time.delayedCall(1100, () => {
          this.tweens.add({ targets: node, y: y - 6, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        });
      }
      node.setSize(52, 52);
      node.setInteractive({ useHandCursor: true });
      node.on('pointerover', () => this.tweens.add({ targets: node, scale: 1.1, duration: 100 }));
      node.on('pointerout', () => this.tweens.add({ targets: node, scale: 1, duration: 100 }));
      node.on('pointerdown', () => {
        audio.sfx('ui');
        // pop + burst before transitioning
        node.disableInteractive();
        clickBurst(this, x, y, nodeColor, 14);
        this.tweens.add({ targets: node, scale: 1.3, duration: 130, yoyo: true, ease: 'Quad.easeOut' });
        this.time.delayedCall(240, () => {
          const config = buildRunConfig('adventure', { worldId: lvl.worldId, levelIndex: lvl.index });
          this.scene.start('LevelIntroScene', { config });
        });
      });
    }
    return node;
  }
}
