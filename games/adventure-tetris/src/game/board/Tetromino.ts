import type { TetrominoType, TetrominoShape } from '@/types';

export const TETROMINOES: Record<TetrominoType, TetrominoShape> = {
  I: {
    type: 'I',
    color: 0x00f0ff, // cyan
    matrix: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  },
  O: {
    type: 'O',
    color: 0xffd700, // yellow
    matrix: [
      [1, 1],
      [1, 1],
    ],
  },
  T: {
    type: 'T',
    color: 0xa855f7, // purple
    matrix: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
  },
  S: {
    type: 'S',
    color: 0x22c55e, // green
    matrix: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
  },
  Z: {
    type: 'Z',
    color: 0xef4444, // red
    matrix: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
  },
  J: {
    type: 'J',
    color: 0x3b82f6, // blue
    matrix: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
  },
  L: {
    type: 'L',
    color: 0xf97316, // orange
    matrix: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
  },
};

export const TETROMINO_TYPES: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

export const WALL_KICKS = {
  JLSTZ: [
    { from: '0->R', offsets: [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]] },
    { from: 'R->0', offsets: [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]] },
    { from: 'R->2', offsets: [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]] },
    { from: '2->R', offsets: [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]] },
    { from: '2->L', offsets: [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]] },
    { from: 'L->2', offsets: [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]] },
    { from: 'L->0', offsets: [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]] },
    { from: '0->L', offsets: [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]] },
  ],
  I: [
    { from: '0->R', offsets: [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]] },
    { from: 'R->0', offsets: [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]] },
    { from: 'R->2', offsets: [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]] },
    { from: '2->R', offsets: [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]] },
    { from: '2->L', offsets: [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]] },
    { from: 'L->2', offsets: [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]] },
    { from: 'L->0', offsets: [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]] },
    { from: '0->L', offsets: [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]] },
  ],
};
