export const GRAVITY_TABLE = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
];

export function getDropInterval(level: number): number {
  // Casual-tuned curve: level 1 drops every 500ms (guideline's 1000ms reads as
  // "the piece is stuck" to casual players) and ramps a step quicker.
  const frames = [
    500, 430, 360, 300, 250, 210, 175, 145, 120, 95, 75, 60, 48, 38, 30, 24, 18, 14, 11, 8
  ];
  if (level >= frames.length) return 1;
  return frames[level] ?? 1;
}

export const LOCK_DELAY_MS = 500;
export const LOCK_DELAY_RESET_MOVE = 50;
export const DAS_DELAY_MS = 170;
export const DAS_REPEAT_MS = 30;
export const SOFT_DROP_INTERVAL_MS = 30;
