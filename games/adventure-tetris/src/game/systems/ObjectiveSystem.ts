// Objective system - tracks level goals
import type { Objective } from '../data/worlds.js';

export type GameEventType =
  | 'lines' | 'combo' | 'score' | 'obstacles' | 'treasure' | 'tetris' | 'bossDefeated' | 'garbage';

export interface GameEvent {
  type: GameEventType;
  value: number;
}

export class ObjectiveSystem {
  objective: Objective;
  progressValue = 0;
  complete = false;

  constructor(objective: Objective) {
    this.objective = objective;
  }

  apply(event: GameEvent): void {
    if (this.complete) return;
    const t = this.objective.type;

    if (t === 'boss') {
      if (event.type === 'bossDefeated') {
        this.progressValue = 1;
        this.complete = true;
      }
      return;
    }
    if (event.type !== t) return;

    switch (t) {
      case 'combo':
        this.progressValue = Math.max(this.progressValue, event.value);
        break;
      case 'score':
        this.progressValue = event.value; // absolute score
        break;
      case 'lines':
      case 'tetris':
      case 'treasure':
      case 'obstacles':
      case 'garbage':
        this.progressValue += event.value;
        break;
    }
    this.progressValue = Math.min(this.progressValue, this.objective.target);
    this.complete = this.progressValue >= this.objective.target;
  }

  tick(deltaSec: number): void {
    if (this.complete || this.objective.type !== 'survive') return;
    this.progressValue += deltaSec;
    if (this.progressValue >= this.objective.target) {
      this.progressValue = this.objective.target;
      this.complete = true;
    }
  }

  progress(): number {
    return Math.min(1, this.progressValue / this.objective.target);
  }

  progressText(): string {
    const t = this.objective.target;
    const v = Math.floor(this.progressValue);
    if (this.objective.type === 'score') {
      return `${v.toLocaleString('en-US')} / ${t.toLocaleString('en-US')}`;
    }
    if (this.objective.type === 'survive') {
      return `${v}s / ${t}s`;
    }
    if (this.objective.type === 'boss') {
      return this.complete ? 'DEFEATED!' : 'FIGHT!';
    }
    return `${v} / ${t}`;
  }
}
