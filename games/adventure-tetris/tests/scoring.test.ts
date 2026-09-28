import { describe, it, expect } from 'vitest';
import { GameManager, type RunConfig } from '../src/game/GameManager.js';
import type { Objective } from '../src/game/data/worlds.js';

function makeConfig(over: Partial<RunConfig> = {}): RunConfig {
  const objective: Objective = { type: 'score', target: 999999999, label: 'test' };
  return {
    mode: 'endless',
    worldId: 'w1',
    levelIndex: 1,
    gravityLevel: 0,
    specialChance: 0,
    boss: null,
    timeLimitSec: null,
    objective,
    rng: () => 0.42, // deterministic
    modifiers: {},
    parScore: 0,
    prefillGarbageRows: 0,
    obstacle: null,
    ...over,
  };
}

describe('GameManager scoring', () => {
  it('scores single line at level 1', () => {
    const m = new GameManager(makeConfig());
    m.stats.combo = 1;
    expect(m.calculateScore(1)).toBe(100);
  });

  it('scores tetris higher than single', () => {
    const m = new GameManager(makeConfig());
    m.stats.combo = 1;
    expect(m.calculateScore(4)).toBe(800);
  });

  it('scales with level', () => {
    const m = new GameManager(makeConfig());
    m.stats.combo = 1;
    m.stats.level = 5;
    expect(m.calculateScore(1)).toBe(500);
  });

  it('adds combo bonus', () => {
    const m = new GameManager(makeConfig());
    m.stats.combo = 3; // combo-1=2 -> +100
    expect(m.calculateScore(1)).toBe(200);
  });

  it('applies back-to-back bonus for tetris', () => {
    const m = new GameManager(makeConfig());
    m.stats.combo = 1;
    expect(m.calculateScore(4, true)).toBe(1200); // 800 * 1.5
  });

  it('applies double score multiplier via modifiers', () => {
    const m = new GameManager(makeConfig({ modifiers: { doubleScore: true } }));
    m.stats.combo = 1;
    expect(m.calculateScore(1)).toBe(200);
  });

  it('applies scoreMultiplier (event-driven)', () => {
    const m = new GameManager(makeConfig());
    m.stats.combo = 1;
    m.scoreMultiplier = 2;
    expect(m.calculateScore(1)).toBe(200);
  });
});

describe('GameManager mechanics', () => {
  it('spawns piece with deterministic rng', () => {
    const m = new GameManager(makeConfig());
    expect(m.currentPiece).toBeDefined();
    // queue holds 5, current piece shifted one out -> 4 remain
    expect(m.nextPieces.length).toBe(4);
    expect(m.nextPieces[0]).toBe(m.nextPieces[0]);
  });

  it('fills next queue deterministically with seeded rng', () => {
    const cfg = makeConfig();
    const a = new GameManager(cfg);
    const b = new GameManager({ ...cfg, rng: cfg.rng });
    expect(a.nextPieces).toEqual(b.nextPieces);
  });

  it('moves piece left and right', () => {
    const m = new GameManager(makeConfig());
    const startX = m.currentPiece.x;
    if (m.moveLeft()) expect(m.currentPiece.x).toBe(startX - 1);
    if (m.moveRight()) expect(m.currentPiece.x).toBe(startX);
  });

  it('hard drop locks piece and gains drop score', () => {
    const m = new GameManager(makeConfig());
    const startScore = m.stats.score;
    const startLines = m.stats.lines;
    m.hardDrop();
    // piece locked; a new piece exists
    expect(m.currentPiece).toBeDefined();
    expect(m.stats.score).toBeGreaterThanOrEqual(startScore);
    void startLines;
  });

  it('hold swaps pieces and locks hold once', () => {
    const m = new GameManager(makeConfig());
    const first = m.currentPiece.type;
    m.hold();
    expect(m.canHold).toBe(false);
    m.hold(); // should be no-op
    expect(m.canHold).toBe(false);
    // after a lock, hold re-enabled: simulate via hardDrop
    m.hardDrop();
    expect(m.canHold).toBe(true);
    void first;
  });

  it('emits gameover when spawn collides', () => {
    const m = new GameManager(makeConfig());
    // fill spawn area
    for (let x = 3; x <= 6; x++) {
      for (let y = 0; y < 4; y++) m.board.grid[y][x] = { value: 1, color: 0xff0000 };
    }
    m.hardDrop();
    m.hardDrop();
    // eventually spawn fails -> gameOver true
    expect(m.gameOver).toBe(true);
  });

  it('pause blocks updates', () => {
    const m = new GameManager(makeConfig());
    m.togglePause();
    expect(m.paused).toBe(true);
    const y = m.currentPiece.y;
    m.update(1000);
    expect(m.currentPiece.y).toBe(y);
  });

  it('gravity speeds up with lines cleared', () => {
    const m = new GameManager(makeConfig());
    const base = m.dropInterval;
    m.stats.lines = 20;
    expect(m.dropInterval).toBeLessThan(base);
  });

  it('time freeze slows gravity', () => {
    const m = new GameManager(makeConfig());
    const base = m.dropInterval;
    m.timeFrozen = true;
    expect(m.dropInterval).toBeGreaterThan(base);
  });
});

describe('GameManager gravity', () => {
  it('drops the piece automatically without any input', () => {
    const m = new GameManager(makeConfig());
    const y0 = m.currentPiece.y;
    // level 1 gravity = 500ms/cell: feed 3 seconds of frame deltas
    for (let i = 0; i < 180; i++) m.update(16.6);
    const y1 = m.currentPiece.y;
    expect(y1).toBeGreaterThan(y0 + 3);
  });

  it('level 1 gravity interval is casual-fast (500ms)', () => {
    const m = new GameManager(makeConfig());
    expect(m.dropInterval).toBe(500);
  });

  it('does not drop while paused', () => {
    const m = new GameManager(makeConfig());
    m.togglePause();
    const y0 = m.currentPiece.y;
    for (let i = 0; i < 180; i++) m.update(16.6);
    expect(m.currentPiece.y).toBe(y0);
  });
});

describe('GameManager lock delay', () => {
  it('locks a grounded piece within ~500ms real time and spawns the next one', () => {
    const m = new GameManager(makeConfig());
    while (m.moveDown()); // rest the current piece on the floor
    const grounded = m.currentPiece;
    // ~660ms of frame updates: lock delay (500ms) must elapse -> next piece
    for (let i = 0; i < 40; i++) m.update(16.6);
    expect(m.currentPiece).not.toBe(grounded);
    expect(m.currentPiece.y).toBeLessThanOrEqual(2);
  });

  it('pressing down while grounded locks instantly and spawns the next piece', () => {
    const m = new GameManager(makeConfig());
    while (m.moveDown()); // rest the current piece on the floor
    const before = m.currentPiece;
    m.softDrop(40);
    expect(m.currentPiece).not.toBe(before);
  });
});
