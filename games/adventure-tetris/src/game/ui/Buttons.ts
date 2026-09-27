import Phaser from 'phaser';
import { audio } from '../systems/AudioSystem.js';

export interface ButtonOpts {
  bgColor?: number;
  fontSize?: number;
  width?: number;
  enabled?: boolean;
}

export function createButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  opts: ButtonOpts = {}
): Phaser.GameObjects.Container {
  const { bgColor = 0x3b82f6, fontSize = 22, width } = opts;
  const c = scene.add.container(x, y);
  const txt = scene.add
    .text(0, 0, label, {
      fontFamily: 'Nunito', fontSize: `${fontSize}px`, color: '#ffffff', fontStyle: 'bold',
    })
    .setOrigin(0.5);
  const padX = width ? 0 : 24;
  const w = width ?? txt.width + padX * 2;
  const h = fontSize + 18;
  const bg = scene.add.graphics();
  bg.fillStyle(bgColor, 1);
  bg.fillRoundedRect(-w / 2, -h / 2, w, h, 12);
  bg.lineStyle(2, 0xffffff, 0.25);
  bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 12);
  c.add([bg, txt]);
  c.setSize(w, h);
  c.setInteractive({ useHandCursor: true });
  c.on('pointerover', () => scene.tweens.add({ targets: c, scale: 1.06, duration: 100 }));
  c.on('pointerout', () => scene.tweens.add({ targets: c, scale: 1, duration: 100 }));
  c.on('pointerdown', () => {
    audio.sfx('ui');
    clickBurst(scene, x, y, bgColor, 9);
    scene.tweens.add({ targets: c, scale: 0.94, duration: 60, yoyo: true, onComplete: onClick });
  });
  return c;
}

export function floatingText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  msg: string,
  color = '#ffffff',
  fontSize = 24
): void {
  const t = scene.add
    .text(x, y, msg, { fontFamily: 'Nunito', fontSize: `${fontSize}px`, color, fontStyle: 'bold' })
    .setOrigin(0.5)
    .setDepth(100);
  scene.tweens.add({
    targets: t,
    y: y - 60,
    alpha: 0,
    scale: 1.3,
    duration: 900,
    ease: 'Cubic.easeOut',
    onComplete: () => t.destroy(),
  });
}

// Animated world-themed background: gradient + drifting glow particles
export function makeWorldBackground(scene: Phaser.Scene, bgTop: number, bgBottom: number, particleColor: number): void {
  const w = scene.scale.width;
  const h = scene.scale.height;
  const bg = scene.add.graphics();
  bg.scrollFactorX = 0; bg.scrollFactorY = 0;
  const steps = 24;
  const top = Phaser.Display.Color.IntegerToColor(bgTop);
  const bottom = Phaser.Display.Color.IntegerToColor(bgBottom);
  for (let i = 0; i < steps; i++) {
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(top, bottom, steps, i);
    bg.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
    bg.fillRect(0, (h / steps) * i - 1, w, h / steps + 2);
  }
  bg.setDepth(-10);

  const emitter = scene.add.particles(0, 0, 'glow', {
    x: { min: 0, max: w },
    y: { min: -40, max: h + 40 },
    lifespan: 6000,
    speedY: { min: -18, max: -6 },
    speedX: { min: -8, max: 8 },
    scale: { start: 0.5, end: 0.1 },
    alpha: { start: 0.25, end: 0 },
    quantity: 1,
    frequency: 400,
    tint: particleColor,
  });
  emitter.setDepth(-9);
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

// ---------- UI/UX enhancement helpers ----------

const PIECE_SHAPES: Record<string, number[][]> = {
  I: [[1, 1, 1, 1]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  Z: [[1, 1, 0], [0, 1, 1]],
  J: [[1, 0, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]],
};

const PIECE_COLORS: Record<string, number> = {
  I: 0x00f0ff, O: 0xffd700, T: 0xa855f7, S: 0x22c55e, Z: 0xef4444, J: 0x3b82f6, L: 0xf97316,
};

// Renders a real tetromino shape from block textures (no emoji dependency).
export function drawMiniPiece(
  scene: Phaser.Scene,
  x: number,
  y: number,
  type: string,
  cell = 14,
  alpha = 1
): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const m = PIECE_SHAPES[type] ?? PIECE_SHAPES.O;
  const w = m[0].length;
  const h = m.length;
  for (let r = 0; r < h; r++) {
    for (let q = 0; q < w; q++) {
      if (m[r][q]) {
        const img = scene.add
          .image((q - (w - 1) / 2) * cell, (r - (h - 1) / 2) * cell, 'block')
          .setTint(PIECE_COLORS[type] ?? 0xffffff)
          .setDisplaySize(cell - 2, cell - 2);
        c.add(img);
      }
    }
  }
  c.setAlpha(alpha);
  return c;
}

// Redraw the contents of a container produced by drawMiniPiece with a new piece type.
export function redrawMiniPiece(c: Phaser.GameObjects.Container, type: string, cell = 14): void {
  const scene = c.scene;
  c.removeAll(true);
  const m = PIECE_SHAPES[type] ?? PIECE_SHAPES.O;
  const w = m[0].length;
  const h = m.length;
  for (let r = 0; r < h; r++) {
    for (let q = 0; q < w; q++) {
      if (m[r][q]) {
        c.add(
          scene.add
            .image((q - (w - 1) / 2) * cell, (r - (h - 1) / 2) * cell, 'block')
            .setTint(PIECE_COLORS[type] ?? 0xffffff)
            .setDisplaySize(cell - 2, cell - 2)
        );
      }
    }
  }
}

// Ambient falling tetromino blocks for menu backgrounds.
// Returns the container so scenes can apply pointer parallax.
export function makeFallingBlocks(scene: Phaser.Scene, count = 12): Phaser.GameObjects.Container {
  const palette = Object.values(PIECE_COLORS);
  const wrap = scene.add.container(0, 0).setDepth(-8);
  for (let i = 0; i < count; i++) {
    const size = 16 + Math.random() * 26;
    const startX = Math.random() * scene.scale.width;
    const startY = -60 - Math.random() * scene.scale.height;
    const img = scene.add
      .image(startX, startY, 'block')
      .setTint(palette[i % palette.length])
      .setDisplaySize(size, size)
      .setAlpha(0.12 + Math.random() * 0.18)
      .setAngle(Math.random() * 360);
    wrap.add(img);
    const dur = 9000 + Math.random() * 9000;
    scene.tweens.add({
      targets: img,
      y: scene.scale.height + 60,
      angle: img.angle + (Math.random() > 0.5 ? 120 : -120),
      duration: dur,
      delay: Math.random() * 4000,
      repeat: -1,
      onRepeat: () => {
        img.setX(Math.random() * scene.scale.width);
        img.setY(-60);
      },
    });
  }
  return wrap;
}

// Staggered entrance: fade + slide for a list of game objects.
export function staggerIn(targets: Phaser.GameObjects.GameObject[], offsetX = 0, offsetY = 46, stepMs = 70): void {
  targets.forEach((t, i) => {
    const obj = t as Phaser.GameObjects.Container & { x: number; y: number; alpha: number };
    const baseX = obj.x;
    const baseY = obj.y;
    obj.setAlpha(0);
    obj.x = baseX + offsetX;
    obj.y = baseY + offsetY;
    (obj.scene as Phaser.Scene).tweens.add({
      targets: obj,
      x: baseX,
      y: baseY,
      alpha: 1,
      duration: 380,
      delay: i * stepMs,
      ease: 'Back.easeOut',
    });
  });
}

// Continuous gentle pulse for primary CTA buttons.
export function pulseButton(btn: Phaser.GameObjects.Container, scale = 1.05, periodMs = 1100): void {
  btn.scene.tweens.add({
    targets: btn,
    scale: { from: 1, to: scale },
    duration: periodMs,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
}

// Spark particle burst at a point (button clicks, node picks, celebrations).
export function clickBurst(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color = 0xffffff,
  count = 10
): void {
  const em = scene.add.particles(x, y, 'particle', {
    speed: { min: 60, max: 230 },
    lifespan: 420,
    scale: { start: 0.85, end: 0 },
    quantity: count,
    tint: color,
    emitting: false,
  });
  em.setDepth(400);
  em.explode(count);
  scene.time.delayedCall(700, () => em.destroy());
}

// Celebration confetti rain (victory screens).
export function makeConfetti(scene: Phaser.Scene, durationMs = 6000): void {
  const colors = [0xf43f5e, 0xf59e0b, 0x22c55e, 0x3b82f6, 0xa855f7, 0x00f0ff];
  const em = scene.add.particles(0, 0, 'particle', {
    x: { min: 0, max: scene.scale.width },
    y: -12,
    lifespan: 4200,
    speedY: { min: 90, max: 260 },
    speedX: { min: -50, max: 50 },
    rotate: { start: 0, end: 360 },
    scale: { min: 0.5, max: 1.1 },
    quantity: 2,
    frequency: 110,
    tint: colors,
  });
  em.setDepth(150);
  scene.time.delayedCall(durationMs, () => em.destroy());
}

// Icon tokens that fly from A to B (reward collection feel).
export function coinFly(
  scene: Phaser.Scene,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  icon = '💰',
  count = 8,
  onArrive?: () => void
): void {
  for (let i = 0; i < count; i++) {
    const t = scene.add.text(fromX, fromY, icon, { fontSize: '22px' }).setDepth(320);
    t.setScale(0);
    scene.tweens.add({ targets: t, scale: 1, duration: 140, delay: i * 80 });
    scene.tweens.add({
      targets: t,
      x: { from: fromX, to: toX },
      y: { from: fromY, to: toY },
      delay: 120 + i * 85,
      duration: 620,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        t.destroy();
        onArrive?.();
      },
    });
  }
}
