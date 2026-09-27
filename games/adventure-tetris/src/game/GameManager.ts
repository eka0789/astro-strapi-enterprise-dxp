import type { ActivePiece, SpecialType, GameMode, ClearResult, TetrominoType, ObstacleKind } from '@/types';
import { TETROMINO_TYPES } from './board/Tetromino.js';
import { Board } from './board/Board.js';
import { getDropInterval, LOCK_DELAY_MS, SOFT_DROP_INTERVAL_MS } from './utils/constants.js';
import type { BossDef, Objective } from './data/worlds.js';

export interface GameStats {
  score: number;
  level: number;
  lines: number;
  combo: number;
  maxCombo: number;
  backToBack: number;
  treasures: number;
  obstaclesDestroyed: number;
  tetrisCount: number;
  perfectClears: number;
}

export type ManagerEvent =
  | { type: 'lines'; count: number; rows: number[]; result: ClearResult }
  | { type: 'treasure'; count: number }
  | { type: 'obstacles'; count: number }
  | { type: 'tetris'; count: number }
  | { type: 'perfect' }
  | { type: 'lock' }
  | { type: 'levelUp'; level: number }
  | { type: 'gameover' }
  | { type: 'hold' }
  | { type: 'move' }
  | { type: 'rotate' }
  | { type: 'drop'; cells: number; trail: { xs: number[]; fromY: number; toY: number } };

export interface RunConfig {
  mode: GameMode;
  worldId: string;
  levelIndex: number;
  gravityLevel: number;
  specialChance: number;
  boss: BossDef | null;
  timeLimitSec: number | null;
  objective: Objective;
  rng: () => number;
  modifiers: { doubleScore?: boolean; fastGravity?: boolean };
  parScore: number;
  prefillGarbageRows: number;
  obstacle: { kind: string; color: number } | null;
}

const SPECIAL_POOL: Array<{ type: SpecialType; weight: number }> = [
  { type: 'bomb', weight: 25 },
  { type: 'lightning', weight: 20 },
  { type: 'treasure', weight: 20 },
  { type: 'freeze', weight: 15 },
  { type: 'fire', weight: 10 },
  { type: 'magic', weight: 10 },
];

function pickSpecial(rng: () => number): SpecialType {
  const total = SPECIAL_POOL.reduce((a, b) => a + b.weight, 0);
  let roll = rng() * total;
  for (const s of SPECIAL_POOL) {
    roll -= s.weight;
    if (roll <= 0) return s.type;
  }
  return 'bomb';
}

export class GameManager {
  board: Board;
  currentPiece: ActivePiece;
  nextPieces: TetrominoType[];
  heldPiece: TetrominoType | null;
  canHold: boolean;
  stats: GameStats;
  config: RunConfig;
  dropTimer: number;
  lockTimer: number;
  softDropTimer: number;
  gameOver: boolean;
  paused: boolean;
  timeFrozen = false; // gravity slowdown active
  scoreMultiplier = 1; // set by scene (doubleScore event)
  pendingEvents: ManagerEvent[] = [];
  private lockResets = 0;

  constructor(config: RunConfig) {
    this.config = config;
    this.board = new Board();
    this.nextPieces = [];
    this.heldPiece = null;
    this.canHold = true;
    this.stats = {
      score: 0, level: config.gravityLevel + 1, lines: 0, combo: 0, maxCombo: 0,
      backToBack: 0, treasures: 0, obstaclesDestroyed: 0, tetrisCount: 0, perfectClears: 0,
    };
    this.dropTimer = 0;
    this.lockTimer = 0;
    this.softDropTimer = 0;
    this.gameOver = false;
    this.paused = false;
    if (config.prefillGarbageRows > 0 && config.obstacle) {
      this.board.addGarbageRows(config.prefillGarbageRows, config.obstacle.kind as ObstacleKind, config.obstacle.color, config.rng);
    }
    this.currentPiece = this.spawnPiece();
  }

  reset(): void {
    const cfg = this.config;
    this.board.reset();
    this.nextPieces = [];
    this.heldPiece = null;
    this.canHold = true;
    this.stats = {
      score: 0, level: cfg.gravityLevel + 1, lines: 0, combo: 0, maxCombo: 0,
      backToBack: 0, treasures: 0, obstaclesDestroyed: 0, tetrisCount: 0, perfectClears: 0,
    };
    this.dropTimer = 0;
    this.lockTimer = 0;
    this.softDropTimer = 0;
    this.gameOver = false;
    this.paused = false;
    this.timeFrozen = false;
    this.scoreMultiplier = 1;
    this.pendingEvents = [];
    this.currentPiece = this.spawnPiece();
  }

  private fillNextQueue(): void {
    while (this.nextPieces.length < 5) {
      this.nextPieces.push(TETROMINO_TYPES[Math.floor(this.config.rng() * TETROMINO_TYPES.length)]);
    }
  }

  private spawnPiece(): ActivePiece {
    this.fillNextQueue();
    const type = this.nextPieces.shift()!;
    const piece = this.board.createPiece(type);
    if (!this.board.isValidPosition(piece)) {
      this.gameOver = true;
      this.pendingEvents.push({ type: 'gameover' });
    }
    return piece;
  }

  get effectiveGravityLevel(): number {
    let g = this.config.gravityLevel + Math.floor(this.stats.lines / 10);
    if (this.config.modifiers.fastGravity) g += 4;
    return g;
  }

  get dropInterval(): number {
    let interval = getDropInterval(this.effectiveGravityLevel);
    if (this.timeFrozen) interval *= 2.5;
    return interval;
  }

  update(delta: number): void {
    if (this.gameOver || this.paused) return;
    this.dropTimer += delta;
    const interval = this.dropInterval;
    let guard = 0;
    while (this.dropTimer >= interval && guard < 5) {
      this.dropTimer -= interval;
      guard++;
      if (!this.moveDown()) break;
    }
  }

  moveDown(): boolean {
    if (this.board.isValidPosition(this.currentPiece, 0, 1)) {
      this.currentPiece.y += 1;
      this.lockTimer = 0;
      this.lockResets = 0;
      return true;
    }
    this.tickLock();
    return false;
  }

  private tickLock(): void {
    this.lockTimer += 16;
    if (this.lockTimer >= LOCK_DELAY_MS) {
      this.lockPiece();
    }
  }

  lockPiece(): void {
    const specialCells: SpecialType[] = [];
    const cellCount = this.currentPiece.matrix.flat().filter(Boolean).length;
    if (this.config.specialChance > 0 && this.config.rng() < this.config.specialChance) {
      const idx = Math.floor(this.config.rng() * cellCount);
      for (let i = 0; i < cellCount; i++) {
        if (i === idx) specialCells[i] = pickSpecial(this.config.rng);
      }
    }
    this.board.lockPiece(this.currentPiece, specialCells);

    const result = this.board.clearLines();
    if (result.rows.length > 0) {
      const lines = result.rows.length;
      this.stats.lines += lines;
      this.stats.combo += 1;
      this.stats.maxCombo = Math.max(this.stats.maxCombo, this.stats.combo);
      if (lines === 4) {
        this.stats.tetrisCount += 1;
        this.pendingEvents.push({ type: 'tetris', count: 1 });
      }
      if (result.perfectClear) {
        this.stats.perfectClears += 1;
        this.pendingEvents.push({ type: 'perfect' });
      }
      const isTetris = lines === 4;
      const b2bActive = isTetris && this.stats.backToBack > 0;
      this.stats.backToBack = isTetris ? this.stats.backToBack + 1 : 0;
      this.stats.score += this.calculateScore(lines, b2bActive);
      if (result.treasuresCollected > 0) {
        this.stats.treasures += result.treasuresCollected;
        this.pendingEvents.push({ type: 'treasure', count: result.treasuresCollected });
      }
      if (result.obstaclesDestroyed > 0) {
        this.stats.obstaclesDestroyed += result.obstaclesDestroyed;
        this.pendingEvents.push({ type: 'obstacles', count: result.obstaclesDestroyed });
      }
      this.pendingEvents.push({ type: 'lines', count: lines, rows: result.rows, result });

      const newLevel = this.config.gravityLevel + 1 + Math.floor(this.stats.lines / 10);
      if (newLevel > this.stats.level) {
        this.stats.level = newLevel;
        this.pendingEvents.push({ type: 'levelUp', level: newLevel });
      }
    } else {
      this.stats.combo = 0;
    }

    this.canHold = true;
    this.pendingEvents.push({ type: 'lock' });
    this.currentPiece = this.spawnPiece();
  }

  calculateScore(lines: number, b2bActive = false): number {
    const base = [0, 100, 300, 500, 800][Math.min(4, lines)] ?? 0;
    const comboBonus = Math.max(0, this.stats.combo - 1) * 50;
    const b2bBonus = b2bActive ? base * 0.5 : 0;
    const perfectBonus = this.stats.perfectClears > 0 && lines >= 1 ? 1000 : 0;
    return Math.round((base + comboBonus + b2bBonus + perfectBonus) * this.stats.level * this.scoreMultiplier * (this.config.modifiers.doubleScore ? 2 : 1));
  }

  moveLeft(): boolean {
    if (this.board.isValidPosition(this.currentPiece, -1, 0)) {
      this.currentPiece.x -= 1;
      this.resetLockOnMove();
      this.pendingEvents.push({ type: 'move' });
      return true;
    }
    return false;
  }

  moveRight(): boolean {
    if (this.board.isValidPosition(this.currentPiece, 1, 0)) {
      this.currentPiece.x += 1;
      this.resetLockOnMove();
      this.pendingEvents.push({ type: 'move' });
      return true;
    }
    return false;
  }

  rotate(clockwise = true): boolean {
    const rotated = this.board.tryRotate(this.currentPiece, clockwise);
    if (rotated) {
      this.currentPiece = rotated;
      this.resetLockOnMove();
      this.pendingEvents.push({ type: 'rotate' });
      return true;
    }
    return false;
  }

  hardDrop(): void {
    let cells = 0;
    const cols = new Set<number>();
    let fromY = Infinity;
    for (let y = 0; y < this.currentPiece.matrix.length; y++) {
      for (let x = 0; x < this.currentPiece.matrix[y].length; x++) {
        if (this.currentPiece.matrix[y][x]) {
          cols.add(this.currentPiece.x + x);
          fromY = Math.min(fromY, this.currentPiece.y + y);
        }
      }
    }
    while (this.board.isValidPosition(this.currentPiece, 0, 1)) {
      this.currentPiece.y += 1;
      cells++;
    }
    this.stats.score += cells * 2;
    this.pendingEvents.push({ type: 'drop', cells, trail: { xs: [...cols], fromY, toY: this.currentPiece.y } });
    this.lockPiece();
  }

  softDrop(delta: number): boolean {
    this.softDropTimer += delta;
    if (this.softDropTimer >= SOFT_DROP_INTERVAL_MS) {
      this.softDropTimer = 0;
      if (this.board.isValidPosition(this.currentPiece, 0, 1)) {
        this.currentPiece.y += 1;
        this.stats.score += 1;
        this.dropTimer = 0;
        return true;
      }
    }
    return false;
  }

  hold(): void {
    if (!this.canHold) return;
    if (this.heldPiece === null) {
      this.heldPiece = this.currentPiece.type;
      this.currentPiece = this.spawnPiece();
    } else {
      const temp = this.currentPiece.type;
      this.currentPiece = this.board.createPiece(this.heldPiece);
      this.heldPiece = temp;
    }
    this.canHold = false;
    this.pendingEvents.push({ type: 'hold' });
  }

  shuffleNext(): void {
    this.nextPieces = this.nextPieces
      .map((v) => ({ v, r: this.config.rng() }))
      .sort((a, b) => a.r - b.r)
      .map((o) => o.v);
  }

  private resetLockOnMove(): void {
    if (!this.board.isValidPosition(this.currentPiece, 0, 1)) {
      if (this.lockResets < 15) {
        this.lockTimer = Math.max(0, this.lockTimer - 50);
        this.lockResets++;
      }
    } else {
      this.lockTimer = 0;
      this.lockResets = 0;
    }
  }

  togglePause(): void {
    this.paused = !this.paused;
  }

  drainEvents(): ManagerEvent[] {
    const events = this.pendingEvents;
    this.pendingEvents = [];
    return events;
  }

  getGhostY(): number {
    return this.board.getGhostY(this.currentPiece);
  }
}

// helper type to keep garbage injection type-safe without importing ObstacleKind into manager public API
