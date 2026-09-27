import { describe, it, expect } from 'vitest';
import { Board } from '../src/game/board/Board.js';
import { TETROMINOES } from '../src/game/board/Tetromino.js';
import type { ActivePiece } from '../src/types/index.js';

function makePiece(type: keyof typeof TETROMINOES, x = 3, y = 0): ActivePiece {
  const shape = TETROMINOES[type];
  return { type, x, y, rotation: 0, matrix: shape.matrix.map((r) => [...r]), color: shape.color };
}

function fillCell(b: Board, x: number, y: number): void {
  b.grid[y][x] = { value: 1, color: 0xff0000 };
}

describe('Board', () => {
  it('creates a 10x20 empty grid', () => {
    const b = new Board();
    expect(b.width).toBe(10);
    expect(b.height).toBe(20);
    expect(b.grid.length).toBe(20);
    expect(b.grid[0].length).toBe(10);
    expect(b.countFilled()).toBe(0);
  });

  it('rejects out-of-bounds positions', () => {
    const b = new Board();
    const p = makePiece('O', 9, 0); // O occupies 2 cols -> x=9 overflows
    expect(b.isValidPosition(p)).toBe(false);
    const p2 = makePiece('O', -1, 0);
    expect(b.isValidPosition(p2)).toBe(false);
    const p3 = makePiece('O', 4, 19);
    expect(b.isValidPosition(p3)).toBe(false);
    const p4 = makePiece('O', 4, 0);
    expect(b.isValidPosition(p4)).toBe(true);
  });

  it('detects collision with existing blocks', () => {
    const b = new Board();
    fillCell(b, 4, 1);
    const p = makePiece('O', 4, 0);
    expect(b.isValidPosition(p)).toBe(false);
  });

  it('locks a piece into the grid', () => {
    const b = new Board();
    const p = makePiece('O', 4, 18);
    b.lockPiece(p, []);
    expect(b.grid[19][4].value).toBe(1);
    expect(b.grid[19][5].value).toBe(1);
    expect(b.grid[18][4].value).toBe(1);
    expect(b.grid[18][5].value).toBe(1);
  });

  it('clears full rows and shifts down', () => {
    const b = new Board();
    for (let x = 0; x < 10; x++) fillCell(b, x, 19);
    const result = b.clearLines();
    expect(result.rows).toEqual([19]);
    expect(b.countFilled()).toBe(0);
    expect(b.grid[19][0].value).toBe(0);
  });

  it('clears multiple rows at once', () => {
    const b = new Board();
    for (const y of [18, 19]) for (let x = 0; x < 10; x++) fillCell(b, x, y);
    const result = b.clearLines();
    expect(result.rows.length).toBe(2);
    expect(b.countFilled()).toBe(0);
  });

  it('counts treasures collected on clear', () => {
    const b = new Board();
    for (let x = 0; x < 10; x++) {
      b.grid[19][x] = x === 5 ? { value: 1, color: 0xffffff, special: 'treasure' } : { value: 1, color: 0xffffff };
    }
    const result = b.clearLines();
    expect(result.treasuresCollected).toBe(1);
  });

  it('explodes an area', () => {
    const b = new Board();
    fillCell(b, 5, 10);
    fillCell(b, 4, 9);
    const r = b.explode(5, 10, 1);
    expect(r.destroyed).toBe(2);
    expect(b.countFilled()).toBe(0);
  });

  it('clears a row and a column (lightning)', () => {
    const b = new Board();
    fillCell(b, 0, 19);
    fillCell(b, 5, 10);
    const r1 = b.clearRow(19);
    expect(r1.destroyed).toBe(1);
    const r2 = b.clearColumn(5);
    expect(r2.destroyed).toBe(1);
    expect(b.countFilled()).toBe(0);
  });

  it('adds obstacle rows with holes', () => {
    const b = new Board();
    b.addGarbageRows(2, 'vine', 0x166534, () => 0.5);
    expect(b.countObstacles()).toBeGreaterThan(0);
    // bottom two rows must have at least one hole each
    expect(b.grid[19].some((c) => c.value === 0)).toBe(true);
    expect(b.grid[18].some((c) => c.value === 0)).toBe(true);
  });

  it('finds densest column', () => {
    const b = new Board();
    for (let y = 15; y < 20; y++) fillCell(b, 3, y);
    fillCell(b, 0, 19);
    expect(b.getDensestColumn()).toBe(3);
  });

  it('computes ghost Y as landing position', () => {
    const b = new Board();
    const p = makePiece('O', 4, 0);
    expect(b.getGhostY(p)).toBe(18);
  });

  it('game over when top row blocked', () => {
    const b = new Board();
    fillCell(b, 0, 0);
    expect(b.isGameOver()).toBe(true);
  });

  it('SRS rotation applies wall kicks near wall', () => {
    const b = new Board();
    const p = makePiece('L', 8, 5); // L spans 3 cols; at x=8 right edge
    const rotated = b.tryRotate(p, true);
    // rotation may succeed directly or via kick; must not return null when space exists
    expect(rotated).not.toBeNull();
  });
});
