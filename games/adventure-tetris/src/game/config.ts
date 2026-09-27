import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { MainMenuScene } from './scenes/MainMenuScene.js';
import { WorldMapScene } from './scenes/WorldMapScene.js';
import { LevelIntroScene } from './scenes/LevelIntroScene.js';
import { GameplayScene } from './scenes/GameplayScene.js';
import { VictoryScene } from './scenes/VictoryScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { ShopScene } from './scenes/ShopScene.js';
import { CollectionScene } from './scenes/CollectionScene.js';
import { SettingsScene } from './scenes/SettingsScene.js';
import { DailyChallengeScene } from './scenes/DailyChallengeScene.js';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: 'app',
  backgroundColor: '#0f172a',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 } },
  },
  scene: [
    BootScene, MainMenuScene, WorldMapScene, LevelIntroScene, GameplayScene,
    VictoryScene, GameOverScene, ShopScene, CollectionScene, SettingsScene, DailyChallengeScene,
  ],
  render: {
    pixelArt: false,
    antialias: true,
  },
};
