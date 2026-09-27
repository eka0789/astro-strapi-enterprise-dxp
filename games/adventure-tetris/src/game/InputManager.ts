import type { GameManager } from './GameManager.js';
import type { PowerUpId } from './systems/EnergySystem.js';
import { POWER_UPS } from './systems/EnergySystem.js';

export interface InputCallbacks {
  onPause: () => void;
  onPowerUp: (id: PowerUpId) => void;
}

const DAS_DELAY = 170;
const ARR_REPEAT = 33;

export class InputManager {
  private keys = new Set<string>();
  private dasTimers: Record<string, number> = {};
  private lastTouchX: number | null = null;
  private lastTouchY: number | null = null;
  private touchStartX: number | null = null;
  private touchStartY: number | null = null;
  private touchStartTime = 0;
  private movedThisTouch = false;
  private touchThreshold = 28;
  private swipeThreshold = 60;
  private destroyed = false;

  constructor(private game: GameManager, private callbacks: InputCallbacks) {
    this.setupKeyboard();
    this.setupTouch();
  }

  destroy(): void {
    this.destroyed = true;
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('touchstart', this.onTouchStart);
    window.removeEventListener('touchmove', this.onTouchMove);
    window.removeEventListener('touchend', this.onTouchEnd);
  }

  private setupKeyboard(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (this.destroyed) return;
    const key = e.key;
    if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' '].includes(key)) e.preventDefault();
    if (this.keys.has(key)) return;
    this.keys.add(key);
    this.handleKeyDown(key);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.key);
    delete this.dasTimers[e.key];
  };

  private handleKeyDown(key: string): void {
    switch (key) {
      case 'ArrowLeft': case 'a': case 'A':
        this.game.moveLeft();
        this.dasTimers[key] = 0;
        break;
      case 'ArrowRight': case 'd': case 'D':
        this.game.moveRight();
        this.dasTimers[key] = 0;
        break;
      case 'ArrowUp': case 'w': case 'W': case 'x': case 'X':
        this.game.rotate(true);
        break;
      case 'z': case 'Z':
        this.game.rotate(false);
        break;
      case ' ':
        this.game.hardDrop();
        break;
      case 'c': case 'C':
        this.game.hold();
        break;
      case 'Escape': case 'p': case 'P':
        this.callbacks.onPause();
        break;
      default:
        if (/^[1-6]$/.test(key)) {
          const pu = POWER_UPS[parseInt(key, 10) - 1];
          if (pu) this.callbacks.onPowerUp(pu.id);
        }
    }
  }

  private setupTouch(): void {
    window.addEventListener('touchstart', this.onTouchStart, { passive: false });
    window.addEventListener('touchmove', this.onTouchMove, { passive: false });
    window.addEventListener('touchend', this.onTouchEnd, { passive: false });
  }

  private onTouchStart = (e: TouchEvent): void => {
    if (this.destroyed || e.touches.length !== 1) return;
    const t = e.touches[0];
    this.touchStartX = t.clientX;
    this.touchStartY = t.clientY;
    this.lastTouchX = t.clientX;
    this.lastTouchY = t.clientY;
    this.touchStartTime = performance.now();
    this.movedThisTouch = false;
  };

  private onTouchMove = (e: TouchEvent): void => {
    if (this.destroyed || e.touches.length !== 1 || this.lastTouchX === null || this.lastTouchY === null) return;
    const t = e.touches[0];
    const dx = t.clientX - this.lastTouchX;
    const dy = t.clientY - this.lastTouchY;
    this.lastTouchX = t.clientX;
    this.lastTouchY = t.clientY;

    if (Math.abs(dx) > this.touchThreshold) {
      if (dx > 0) this.game.moveRight(); else this.game.moveLeft();
      this.movedThisTouch = true;
    }
    if (dy > this.touchThreshold) {
      this.game.softDrop(16);
      this.movedThisTouch = true;
    }
  };

  private onTouchEnd = (_e: TouchEvent): void => {
    if (this.destroyed || this.touchStartX === null || this.touchStartY === null || this.lastTouchX === null || this.lastTouchY === null) return;
    const dx = this.lastTouchX - this.touchStartX;
    const dy = this.lastTouchY - this.touchStartY;
    const duration = performance.now() - this.touchStartTime;
    const isQuickTap = duration < 250 && Math.abs(dx) < this.swipeThreshold && Math.abs(dy) < this.swipeThreshold && !this.movedThisTouch;

    if (isQuickTap) {
      this.game.rotate(true);
    } else if (dy < -this.swipeThreshold && Math.abs(dx) < this.swipeThreshold * 1.5) {
      this.game.hardDrop();
    }

    this.touchStartX = null;
    this.touchStartY = null;
    this.lastTouchX = null;
    this.lastTouchY = null;
  };

  update(delta: number): void {
    for (const key of ['ArrowLeft', 'a', 'A']) {
      if (this.keys.has(key) && this.dasTimers[key] !== undefined) {
        this.dasTimers[key] += delta;
        if (this.dasTimers[key] >= DAS_DELAY) {
          this.dasTimers[key] -= ARR_REPEAT;
          this.game.moveLeft();
        }
      }
    }
    for (const key of ['ArrowRight', 'd', 'D']) {
      if (this.keys.has(key) && this.dasTimers[key] !== undefined) {
        this.dasTimers[key] += delta;
        if (this.dasTimers[key] >= DAS_DELAY) {
          this.dasTimers[key] -= ARR_REPEAT;
          this.game.moveRight();
        }
      }
    }
    for (const key of ['ArrowDown', 's', 'S']) {
      if (this.keys.has(key)) this.game.softDrop(delta);
    }
  }
}
