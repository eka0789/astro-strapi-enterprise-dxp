import { TETROMINO_TYPES, TETROMINOES } from './Tetromino.js';
import type { ActivePiece, Cell, Position, TetrominoType, SpecialType, ObstacleKind, ClearResult, SpecialTrigger } from '@/types';

export class Board {
  width: number;
  height: number;
  grid: Cell[][];
  spawnX: number;
  spawnY: number;

  constructor(width = 10, height = 20) {
    this.width = width;
    this.height = height;
    this.spawnX = Math.floor(width / 2) - 1;
    this.spawnY = 0;
    this.grid = this.createEmptyGrid();
  }

  createEmptyGrid(): Cell[][] {
    return Array.from({ length: this.height }, () =>
      Array.from({ length: this.width }, () => ({ value: 0, color: 0 }))
    );
  }

  reset(): void {
    this.grid = this.createEmptyGrid();
  }

  createPiece(type: TetrominoType): ActivePiece {
    const shape = TETROMINOES[type];
    const matrix = shape.matrix.map((row: number[]) => [...row]);
    return {
      type,
      x: this.spawnX - Math.floor(matrix.length / 2),
      y: 0,
      rotation: 0,
      matrix,
      color: shape.color,
    };
  }

  getRandomPiece(rng: () => number = Math.random): ActivePiece {
    const type = TETROMINO_TYPES[Math.floor(rng() * TETROMINO_TYPES.length)];
    return this.createPiece(type);
  }

  isValidPosition(piece: ActivePiece, dx = 0, dy = 0, matrix = piece.matrix): boolean {
    for (let y = 0; y < matrix.length; y++) {
      for (let x = 0; x < matrix[y].length; x++) {
        if (matrix[y][x]) {
          const nx = piece.x + x + dx;
          const ny = piece.y + y + dy;
          if (nx < 0 || nx >= this.width || ny >= this.height) return false;
          if (ny < 0) continue;
          if (this.grid[ny][nx].value) return false;
        }
      }
    }
    return true;
  }

  lockPiece(piece: ActivePiece, specialCells: SpecialType[]): void {
    let cellIndex = 0;
    for (let y = 0; y < piece.matrix.length; y++) {
      for (let x = 0; x < piece.matrix[y].length; x++) {
        if (piece.matrix[y][x]) {
          const ny = piece.y + y;
          const nx = piece.x + x;
          if (ny >= 0 && ny < this.height && nx >= 0 && nx < this.width) {
            const cell: Cell = { value: 1, color: piece.color };
            if (specialCells[cellIndex]) cell.special = specialCells[cellIndex];
            this.grid[ny][nx] = cell;
          }
          cellIndex++;
        }
      }
    }
  }

  rotate(matrix: number[][]): number[][] {
    const N = matrix.length;
    const result: number[][] = Array.from({ length: N }, () => Array(N).fill(0));
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        result[x][N - 1 - y] = matrix[y][x];
      }
    }
    return result;
  }

  tryRotate(piece: ActivePiece, clockwise = true): ActivePiece | null {
    const rotated = clockwise
      ? this.rotate(piece.matrix)
      : this.rotate(this.rotate(this.rotate(piece.matrix)));

    if (this.isValidPosition(piece, 0, 0, rotated)) {
      return { ...piece, matrix: rotated, rotation: (piece.rotation + (clockwise ? 1 : -1) + 4) % 4 };
    }

    const kickSet = piece.type === 'I' ? WALL_KICKS_I[piece.rotation] : WALL_KICKS_JLSTZ[piece.rotation];
    for (const kick of kickSet) {
      if (this.isValidPosition(piece, kick.x, kick.y, rotated)) {
        return {
          ...piece,
          matrix: rotated,
          x: piece.x + kick.x,
          y: piece.y + kick.y,
          rotation: (piece.rotation + (clockwise ? 1 : -1) + 4) % 4,
        };
      }
    }
    return null;
  }

  // ---- line clearing with specials ----
  findFullRows(): number[] {
    const rows: number[] = [];
    for (let y = 0; y < this.height; y++) {
      if (this.grid[y].every((c) => c.value !== 0)) rows.push(y);
    }
    return rows;
  }

  clearLines(): ClearResult {
    const fullRows = this.findFullRows();
    const specials: SpecialTrigger[] = [];
    let obstaclesDestroyed = 0;
    let treasuresCollected = 0;

    for (const y of fullRows) {
      for (let x = 0; x < this.width; x++) {
        const cell = this.grid[y][x];
        if (cell.obstacle) obstaclesDestroyed++;
        if (cell.special === 'treasure') treasuresCollected++;
        if (cell.special && cell.special !== 'treasure') {
          specials.push({ x, y, special: cell.special });
        }
      }
    }

    // Remove rows descending (indices stay valid), then restore height with empty rows.
    for (const y of [...fullRows].sort((a, b) => b - a)) {
      this.grid.splice(y, 1);
    }
    for (let i = 0; i < fullRows.length; i++) {
      this.grid.unshift(Array.from({ length: this.width }, () => ({ value: 0, color: 0 })));
    }

    const perfectClear = this.countFilled() === 0;
    return { rows: fullRows, specials, obstaclesDestroyed, treasuresCollected, perfectClear };
  }

  // ---- area effects (specials & power-ups) ----
  explode(x: number, y: number, radius: number): { destroyed: number; obstacles: number; treasures: number } {
    let destroyed = 0;
    let obstacles = 0;
    let treasures = 0;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) continue;
        const cell = this.grid[ny][nx];
        if (cell.value) {
          destroyed++;
          if (cell.obstacle) obstacles++;
          if (cell.special === 'treasure') treasures++;
          this.grid[ny][nx] = { value: 0, color: 0 };
        }
      }
    }
    return { destroyed, obstacles, treasures };
  }

  clearRow(y: number): { destroyed: number; obstacles: number; treasures: number } {
    let destroyed = 0;
    let obstacles = 0;
    let treasures = 0;
    if (y < 0 || y >= this.height) return { destroyed, obstacles, treasures };
    for (let x = 0; x < this.width; x++) {
      const cell = this.grid[y][x];
      if (cell.value) {
        destroyed++;
        if (cell.obstacle) obstacles++;
        if (cell.special === 'treasure') treasures++;
        this.grid[y][x] = { value: 0, color: 0 };
      }
    }
    return { destroyed, obstacles, treasures };
  }

  clearColumn(x: number): { destroyed: number; obstacles: number; treasures: number } {
    let destroyed = 0;
    let obstacles = 0;
    let treasures = 0;
    if (x < 0 || x >= this.width) return { destroyed, obstacles, treasures };
    for (let y = 0; y < this.height; y++) {
      const cell = this.grid[y][x];
      if (cell.value) {
        destroyed++;
        if (cell.obstacle) obstacles++;
        if (cell.special === 'treasure') treasures++;
        this.grid[y][x] = { value: 0, color: 0 };
      }
    }
    return { destroyed, obstacles, treasures };
  }

  destroyObstaclesInRow(y: number): number {
    let count = 0;
    if (y < 0 || y >= this.height) return 0;
    for (let x = 0; x < this.width; x++) {
      if (this.grid[y][x].obstacle) {
        this.grid[y][x] = { value: 0, color: 0 };
        count++;
      }
    }
    return count;
  }

  destroyRandomFilled(n: number, rng: () => number = Math.random): number {
    const filled: Position[] = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y][x].value) filled.push({ x, y });
      }
    }
    let destroyed = 0;
    for (let i = 0; i < n && filled.length > 0; i++) {
      const idx = Math.floor(rng() * filled.length);
      const p = filled.splice(idx, 1)[0];
      this.grid[p.y][p.x] = { value: 0, color: 0 };
      destroyed++;
    }
    return destroyed;
  }

  getDensestColumn(): number {
    let best = 0;
    let bestCount = -1;
    for (let x = 0; x < this.width; x++) {
      let count = 0;
      for (let y = 0; y < this.height; y++) {
        if (this.grid[y][x].value) count++;
      }
      if (count > bestCount) {
        bestCount = count;
        best = x;
      }
    }
    return best;
  }

  // ---- obstacles / garbage ----
  addObstacleRow(obstacle: ObstacleKind, color: number, cells: number, rng: () => number = Math.random): number {
    const y = this.height - 1;
    let placed = 0;
    const emptyCols: number[] = [];
    for (let x = 0; x < this.width; x++) if (!this.grid[y][x].value) emptyCols.push(x);
    for (let i = emptyCols.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [emptyCols[i], emptyCols[j]] = [emptyCols[j], emptyCols[i]];
    }
    for (let i = 0; i < Math.min(cells, emptyCols.length); i++) {
      this.grid[y][emptyCols[i]] = { value: 2, color, obstacle };
      placed++;
    }
    return placed;
  }

  addObstacleCells(count: number, obstacle: ObstacleKind, color: number, rng: () => number = Math.random): number {
    let placed = 0;
    for (let i = 0; i < count; i++) {
      for (let attempt = 0; attempt < 20; attempt++) {
        const x = Math.floor(rng() * this.width);
        const y = this.height - 1 - Math.floor(rng() * (this.height / 2));
        if (!this.grid[y][x].value) {
          this.grid[y][x] = { value: 2, color, obstacle };
          placed++;
          break;
        }
      }
    }
    return placed;
  }

  countObstacles(): number {
    let count = 0;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y][x].obstacle) count++;
      }
    }
    return count;
  }

  countFilled(): number {
    let count = 0;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y][x].value) count++;
      }
    }
    return count;
  }

  addGarbageRows(rows: number, obstacle: ObstacleKind, color: number, rng: () => number = Math.random): void {
    for (let i = 0; i < rows; i++) {
      this.grid.splice(0, 1);
      const row: Cell[] = Array.from({ length: this.width }, () => ({ value: 0, color: 0 }));
      const holes = 1 + Math.floor(rng() * 2);
      for (let x = 0; x < this.width; x++) row[x] = { value: 2, color, obstacle };
      for (let h = 0; h < holes; h++) {
        const hx = Math.floor(rng() * this.width);
        row[hx] = { value: 0, color: 0 };
      }
      this.grid.push(row);
    }
  }

  getGhostY(piece: ActivePiece): number {
    let ghostY = piece.y;
    while (this.isValidPosition(piece, 0, ghostY - piece.y + 1, piece.matrix)) {
      ghostY++;
    }
    return ghostY;
  }

  isGameOver(): boolean {
    return this.grid[0].some((cell) => cell.value !== 0);
  }
}

const WALL_KICKS_JLSTZ: Position[][] = [
  [{ x: -1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: -2 }, { x: -1, y: -2 }],
  [{ x: 1, y: 0 }, { x: 1, y: -1 }, { x: 0, y: 2 }, { x: 1, y: 2 }],
  [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: -2 }, { x: 1, y: -2 }],
  [{ x: -1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: 2 }, { x: -1, y: 2 }],
];

const WALL_KICKS_I: Position[][] = [
  [{ x: -2, y: 0 }, { x: 1, y: 0 }, { x: -2, y: -1 }, { x: 1, y: 2 }],
  [{ x: -1, y: 0 }, { x: 2, y: 0 }, { x: -1, y: 2 }, { x: 2, y: -1 }],
  [{ x: 2, y: 0 }, { x: -1, y: 0 }, { x: 2, y: 1 }, { x: -1, y: -2 }],
  [{ x: 1, y: 0 }, { x: -2, y: 0 }, { x: 1, y: -2 }, { x: -2, y: 1 }],
];
