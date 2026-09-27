export interface Position {
  x: number;
  y: number;
}

export type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

export interface TetrominoShape {
  type: TetrominoType;
  color: number;
  matrix: number[][];
}

export interface ActivePiece {
  type: TetrominoType;
  x: number;
  y: number;
  rotation: number;
  matrix: number[][];
  color: number;
}

export type SpecialType =
  | 'bomb' | 'lightning' | 'treasure' | 'freeze' | 'fire' | 'magic';

export type ObstacleKind = 'vine' | 'ice' | 'lava' | 'shadow' | 'crystal' | 'slime' | 'storm' | 'void';

export interface Cell {
  value: number; // 0 empty, 1 block, 2 obstacle
  color: number;
  special?: SpecialType;
  obstacle?: ObstacleKind;
}

export interface SpecialTrigger {
  x: number;
  y: number;
  special: SpecialType;
}

export interface ClearResult {
  rows: number[];
  specials: SpecialTrigger[];
  obstaclesDestroyed: number;
  treasuresCollected: number;
  perfectClear: boolean;
}

export type GameState = 'menu' | 'playing' | 'paused' | 'gameover' | 'victory';

export type GameMode = 'adventure' | 'endless' | 'timeAttack' | 'daily' | 'bossRush' | 'puzzle' | 'survival';
