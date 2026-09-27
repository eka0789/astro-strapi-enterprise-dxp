// Energy system - fuels power-ups

export const POWER_UPS = [
  { id: 'hammer', name: 'Hammer', emoji: '🔨', cost: 15, desc: 'Hancurkan 1 cell terbawah' },
  { id: 'shuffle', name: 'Shuffle', emoji: '🔀', cost: 20, desc: 'Acak piece berikutnya' },
  { id: 'timeFreeze', name: 'Time Freeze', emoji: '❄️', cost: 30, desc: 'Perlambat gravitasi 8s' },
  { id: 'fireBlast', name: 'Fire Blast', emoji: '🔥', cost: 40, desc: 'Hancurkan 2 baris bawah' },
  { id: 'magicClear', name: 'Magic Clear', emoji: '✨', cost: 50, desc: 'Hancurkan area 5x5' },
  { id: 'rainbow', name: 'Rainbow', emoji: '🌈', cost: 60, desc: 'Bersihkan kolom terpadat' },
] as const;

export type PowerUpId = (typeof POWER_UPS)[number]['id'];

export const POWER_UP_COSTS: Record<PowerUpId, number> = {
  hammer: 15,
  shuffle: 20,
  timeFreeze: 30,
  fireBlast: 40,
  magicClear: 50,
  rainbow: 60,
};

export class EnergySystem {
  energy = 0;
  max = 100;

  constructor(startEnergy = 0) {
    this.energy = Math.min(this.max, startEnergy);
  }

  add(n: number, multiplier = 1): void {
    this.energy = Math.min(this.max, this.energy + Math.round(n * multiplier));
  }

  canAfford(id: PowerUpId): boolean {
    return this.energy >= POWER_UP_COSTS[id];
  }

  spend(id: PowerUpId): boolean {
    const cost = POWER_UP_COSTS[id];
    if (this.energy < cost) return false;
    this.energy -= cost;
    return true;
  }

  ratio(): number {
    return this.energy / this.max;
  }
}
