export const GRAVITY_TABLE = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
];

export function getDropInterval(level: number): number {
  const frames = [
    1000, 793, 618, 473, 355, 262, 190, 136, 96, 67, 47, 33, 23, 16, 11, 8, 6, 4, 3, 2
  ];
  if (level >= frames.length) return 1;
  return frames[level] ?? 1;
}

export const LOCK_DELAY_MS = 500;
export const LOCK_DELAY_RESET_MOVE = 50;
export const DAS_DELAY_MS = 170;
export const DAS_REPEAT_MS = 30;
export const SOFT_DROP_INTERVAL_MS = 30;
