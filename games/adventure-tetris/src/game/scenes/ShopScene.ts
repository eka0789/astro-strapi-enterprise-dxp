import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem.js';
import { audio } from '../systems/AudioSystem.js';
import { createButton, floatingText, formatNumber, staggerIn } from '../ui/Buttons.js';
import { CHARACTERS, COMPANIONS, CHESTS, type CharacterDef, type CompanionDef, type ChestDef } from '../data/meta.js';
import { mulberry32, seedFromString } from '../data/modes.js';

type Tab = 'characters' | 'companions' | 'chests';

interface ChestReward {
  coins: number;
  gems: number;
  character?: CharacterDef;
  companion?: CompanionDef;
  chestName: string;
}

export function openChest(def: ChestDef, rng: () => number = Math.random): ChestReward {
  const coins = def.coinRange[0] + Math.floor(rng() * (def.coinRange[1] - def.coinRange[0]));
  const reward: ChestReward = { coins, gems: 0, chestName: def.name };
  if (rng() < def.gemChance) {
    reward.gems = def.gemRange[0] + Math.floor(rng() * (def.gemRange[1] - def.gemRange[0]));
  }
  const save = SaveSystem.get();
  const lockedChars = CHARACTERS.filter((c) => c.price > 0 && !save.data.unlockedCharacters.includes(c.id));
  const lockedComps = COMPANIONS.filter((c) => !save.data.unlockedCompanions.includes(c.id));
  if (lockedChars.length > 0 && rng() < def.characterChance) {
    reward.character = lockedChars[Math.floor(rng() * lockedChars.length)];
  } else if (lockedComps.length > 0 && rng() < def.companionChance) {
    reward.companion = lockedComps[Math.floor(rng() * lockedComps.length)];
  }
  return reward;
}

export class ShopScene extends Phaser.Scene {
  private tab: Tab = 'characters';
  private listContainer: Phaser.GameObjects.Container | null = null;

  constructor() {
    super({ key: 'ShopScene' });
  }

  create(): void {
    this.build();
  }

  private build(): void {
    const save = SaveSystem.get();
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x0f172a);

    // header (compact on narrow screens so title and currency never collide)
    const narrow = width < 560;
    this.add.text(16, 16, '◄', { fontSize: '30px', color: '#ffffff' })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { audio.sfx('ui'); this.scene.start('MainMenuScene'); });
    this.add.text(width / 2, 24, '🛒 SHOP', { fontFamily: 'Nunito', fontSize: narrow ? '18px' : '24px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(width - 16, narrow ? 26 : 18, `💰 ${formatNumber(save.data.coins)}   💎 ${save.data.gems}`, {
      fontFamily: 'Nunito', fontSize: narrow ? '13px' : '16px', color: '#fbbf24', fontStyle: 'bold',
    }).setOrigin(1, 0);

    // tabs
    const tabs: Array<[Tab, string, number]> = [
      ['characters', '🦸 CHARACTERS', 0x3b82f6],
      ['companions', '🐾 COMPANIONS', 0x22c55e],
      ['chests', '🎁 CHESTS', 0xf59e0b],
    ];
    const tabW = Math.min(160, Math.floor((width - 40) / 3));
    const tabSpacing = tabW + 10;
    const tabY = narrow ? 80 : 64;
    tabs.forEach(([id, label, color], i) => {
      createButton(this, width / 2 + (i - 1) * tabSpacing, tabY, label, () => {
        this.tab = id;
        audio.sfx('ui');
        this.listContainer?.destroy();
        this.build();
      }, { bgColor: this.tab === id ? color : 0x334155, fontSize: narrow ? 12 : 14, width: tabW });
    });

    this.listContainer = this.add.container(0, 0);
    const startY = narrow ? 130 : 110;
    const rows: Phaser.GameObjects.Container[] = [];
    if (this.tab === 'characters') {
      CHARACTERS.forEach((c, i) => rows.push(this.characterRow(c, width / 2, startY + i * 66)));
    } else if (this.tab === 'companions') {
      COMPANIONS.forEach((c, i) => rows.push(this.companionRow(c, width / 2, startY + i * 66)));
    } else {
      CHESTS.forEach((c, i) => rows.push(this.chestRow(c, width / 2, startY + i * 66)));
    }
    this.listContainer.add(rows);
    staggerIn(rows, 40, 26, 45);
    void height;
  }

  private rowGeom(x: number): { rowW: number; rowLeft: number; rowRight: number } {
    const rowW = Math.min(480, this.scale.width - 40);
    return { rowW, rowLeft: x - rowW / 2, rowRight: x + rowW / 2 };
  }

  private rowBg(x: number, y: number, color = 0x1e293b): Phaser.GameObjects.Rectangle {
    return this.add.rectangle(x, y, Math.min(480, this.scale.width - 40), 58, color, 0.95)
      .setStrokeStyle(1, 0x334155, 1);
  }

  private characterRow(c: CharacterDef, x: number, y: number): Phaser.GameObjects.Container {
    const save = SaveSystem.get();
    const owned = save.data.unlockedCharacters.includes(c.id);
    const equipped = save.data.selectedCharacter === c.id;
    const { rowLeft, rowRight } = this.rowGeom(x);
    const row = this.add.container(0, 0);
    row.add(this.rowBg(x, y, equipped ? 0x14532d : 0x1e293b));
    row.add(this.add.text(rowLeft + 10, y, `${c.emoji}`, { fontSize: '28px' }).setOrigin(0, 0.5));
    row.add(this.add.text(rowLeft + 52, y - 10, c.name, { fontFamily: 'Nunito', fontSize: '16px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0, 0.5));
    row.add(this.add.text(rowLeft + 52, y + 10, c.desc, { fontFamily: 'Nunito', fontSize: '12px', color: '#94a3b8' }).setOrigin(0, 0.5));

    if (equipped) {
      row.add(this.add.text(rowRight - 66, y, '✓ EQUIPPED', { fontFamily: 'Nunito', fontSize: '14px', color: '#22c55e', fontStyle: 'bold' }).setOrigin(0.5));
    } else if (owned) {
      row.add(createButton(this, rowRight - 66, y, 'EQUIP', () => {
        save.data.selectedCharacter = c.id;
        save.save();
        audio.sfx('reward');
        this.listContainer?.destroy();
        this.build();
      }, { bgColor: 0x22c55e, fontSize: 13, width: 110 }));
    } else {
      const canBuy = c.gemPrice ? save.data.gems >= c.gemPrice : save.data.coins >= c.price;
      const label = c.gemPrice ? `💎 ${c.gemPrice}` : `💰 ${formatNumber(c.price)}`;
      row.add(createButton(this, rowRight - 66, y, label, () => this.buyCharacter(c), {
        bgColor: canBuy ? 0xf59e0b : 0x475569, fontSize: 13, width: 110, enabled: canBuy,
      }));
    }
    return row;
  }

  private companionRow(c: CompanionDef, x: number, y: number): Phaser.GameObjects.Container {
    const save = SaveSystem.get();
    const owned = save.data.unlockedCompanions.includes(c.id);
    const equipped = save.data.selectedCompanion === c.id;
    const { rowLeft, rowRight } = this.rowGeom(x);
    const row = this.add.container(0, 0);
    row.add(this.rowBg(x, y, equipped ? 0x14532d : 0x1e293b));
    row.add(this.add.text(rowLeft + 10, y, `${c.emoji}`, { fontSize: '28px' }).setOrigin(0, 0.5));
    row.add(this.add.text(rowLeft + 52, y - 10, c.name, { fontFamily: 'Nunito', fontSize: '16px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0, 0.5));
    row.add(this.add.text(rowLeft + 52, y + 10, c.desc, { fontFamily: 'Nunito', fontSize: '12px', color: '#94a3b8' }).setOrigin(0, 0.5));

    if (equipped) {
      row.add(this.add.text(rowRight - 66, y, '✓ EQUIPPED', { fontFamily: 'Nunito', fontSize: '14px', color: '#22c55e', fontStyle: 'bold' }).setOrigin(0.5));
    } else if (owned) {
      row.add(createButton(this, rowRight - 66, y, 'EQUIP', () => {
        save.data.selectedCompanion = c.id;
        save.save();
        audio.sfx('reward');
        this.listContainer?.destroy();
        this.build();
      }, { bgColor: 0x22c55e, fontSize: 13, width: 110 }));
    } else {
      const canBuy = save.data.coins >= c.price;
      row.add(createButton(this, rowRight - 66, y, `💰 ${formatNumber(c.price)}`, () => this.buyCompanion(c), {
        bgColor: canBuy ? 0xf59e0b : 0x475569, fontSize: 13, width: 110,
      }));
    }
    return row;
  }

  private chestRow(c: ChestDef, x: number, y: number): Phaser.GameObjects.Container {
    const save = SaveSystem.get();
    const { rowLeft, rowRight } = this.rowGeom(x);
    const narrow = this.scale.width < 560;
    const desc = narrow
      ? `Coins ${c.coinRange[0]}-${c.coinRange[1]}`
      : `Coins ${c.coinRange[0]}-${c.coinRange[1]} · Char ${Math.round(c.characterChance * 100)}% · Buddy ${Math.round(c.companionChance * 100)}%`;
    const row = this.add.container(0, 0);
    row.add(this.rowBg(x, y));
    row.add(this.add.text(rowLeft + 10, y, `${c.emoji}`, { fontSize: '28px' }).setOrigin(0, 0.5));
    row.add(this.add.text(rowLeft + 52, y - 10, c.name, { fontFamily: 'Nunito', fontSize: '16px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0, 0.5));
    row.add(this.add.text(rowLeft + 52, y + 10, desc, { fontFamily: 'Nunito', fontSize: '11px', color: '#94a3b8' }).setOrigin(0, 0.5));

    const canCoins = save.data.coins >= c.priceCoins;
    if (narrow) {
      row.add(createButton(this, rowRight - 60, y, `💰 ${formatNumber(c.priceCoins)}`, () => this.buyChest(c), {
        bgColor: canCoins ? 0xf59e0b : 0x475569, fontSize: 13, width: 110,
      }));
      if (c.priceGems > 0) {
        const canGems = save.data.gems >= c.priceGems;
        row.add(createButton(this, rowRight - 160, y, `💎 ${c.priceGems}`, () => this.buyChest(c, true), {
          bgColor: canGems ? 0x8b5cf6 : 0x475569, fontSize: 11, width: 70,
        }));
      }
    } else {
      row.add(createButton(this, rowRight - 180, y, `💰 ${formatNumber(c.priceCoins)}`, () => this.buyChest(c), {
        bgColor: canCoins ? 0xf59e0b : 0x475569, fontSize: 13, width: 120,
      }));
      if (c.priceGems > 0) {
        const canGems = save.data.gems >= c.priceGems;
        row.add(createButton(this, rowRight - 60, y, `💎 ${c.priceGems}`, () => this.buyChest(c, true), {
          bgColor: canGems ? 0x8b5cf6 : 0x475569, fontSize: 13, width: 110,
        }));
      }
    }
    return row;
  }

  private buyCharacter(c: CharacterDef): void {
    const save = SaveSystem.get();
    const ok = c.gemPrice ? save.spendGems(c.gemPrice) : save.spendCoins(c.price);
    if (!ok) { this.failFlash(); return; }
    save.data.unlockedCharacters.push(c.id);
    save.data.selectedCharacter = c.id;
    save.save();
    audio.sfx('chest');
    floatingText(this, this.scale.width / 2, this.scale.height / 2, `${c.emoji} ${c.name} UNLOCKED!`, '#22c55e', 26);
    this.time.delayedCall(700, () => { this.listContainer?.destroy(); this.build(); });
  }

  private buyCompanion(c: CompanionDef): void {
    const save = SaveSystem.get();
    if (!save.spendCoins(c.price)) { this.failFlash(); return; }
    save.data.unlockedCompanions.push(c.id);
    save.data.selectedCompanion = c.id;
    save.save();
    audio.sfx('chest');
    floatingText(this, this.scale.width / 2, this.scale.height / 2, `${c.emoji} ${c.name} JOINED!`, '#22c55e', 26);
    this.time.delayedCall(700, () => { this.listContainer?.destroy(); this.build(); });
  }

  private buyChest(c: ChestDef, useGems = false): void {
    const save = SaveSystem.get();
    const ok = useGems ? save.spendGems(c.priceGems) : save.spendCoins(c.priceCoins);
    if (!ok) { this.failFlash(); return; }
    // deterministic-ish reward but random per purchase
    const rng = mulberry32(seedFromString(`${Date.now()}_${c.id}`));
    const reward = openChest(c, rng);
    save.addCoins(reward.coins);
    if (reward.gems) save.addGems(reward.gems);
    if (reward.character) save.data.unlockedCharacters.push(reward.character.id);
    if (reward.companion) save.data.unlockedCompanions.push(reward.companion.id);
    save.save();
    this.showChestOpening(c, reward);
  }

  private showChestOpening(c: ChestDef, reward: ChestReward): void {
    const { width, height } = this.scale;
    const overlay = this.add.container(0, 0).setDepth(400);
    overlay.add(this.add.rectangle(width / 2, height / 2, width, height, 0x020617, 0.9).setInteractive());
    const chest = this.add.text(width / 2, height / 2 - 40, c.emoji, { fontSize: '90px' }).setOrigin(0.5);
    overlay.add(chest);
    this.tweens.add({ targets: chest, scaleX: 1.15, scaleY: 0.9, duration: 120, yoyo: true, repeat: 4 });
    audio.sfx('chest');

    this.time.delayedCall(900, () => {
      this.tweens.add({ targets: chest, alpha: 0, scale: 2, duration: 300 });
      const lines = [
        `💰 +${reward.coins}`,
        reward.gems ? `💎 +${reward.gems}` : '',
        reward.character ? `${reward.character.emoji} ${reward.character.name} UNLOCKED!` : '',
        reward.companion ? `${reward.companion.emoji} ${reward.companion.name} JOINED!` : '',
      ].filter(Boolean);
      const rewardText = this.add.text(width / 2, height / 2 + 40, lines.join('\n'), {
        fontFamily: 'Nunito', fontSize: '22px', color: '#fbbf24', fontStyle: 'bold', align: 'center', lineSpacing: 10,
      }).setOrigin(0.5).setAlpha(0);
      overlay.add(rewardText);
      this.tweens.add({ targets: rewardText, alpha: 1, scale: { from: 0.7, to: 1 }, duration: 350, ease: 'Back.easeOut' });
      audio.sfx('reward');
      overlay.add(createButton(this, width / 2, height / 2 + 160, 'CLAIM', () => {
        overlay.destroy();
        this.listContainer?.destroy();
        this.build();
      }, { bgColor: 0x22c55e, width: 180 }));
    });
  }

  private failFlash(): void {
    audio.sfx('defeat');
    floatingText(this, this.scale.width / 2, this.scale.height / 2 + 80, 'Not enough currency!', '#f43f5e', 20);
  }
}
