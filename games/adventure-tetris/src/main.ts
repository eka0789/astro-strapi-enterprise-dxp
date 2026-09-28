import Phaser from 'phaser';
import { gameConfig } from './game/config.js';
import { buildRunConfig } from './game/data/modes.js';
import './styles/ui.css';

const app = document.getElementById('app');
if (app) {
  const game = new Phaser.Game(gameConfig);
  const w = window as unknown as {
    __adventris: Phaser.Game;
    __scene: (key: string, data?: unknown) => void;
    __startRun: (mode: string) => void;
  };
  w.__adventris = game;
  // dev/test hooks for the visual audit harness (stop the previous scene first,
  // because SceneManager.start alone leaves the current scene running)
  const stopOthers = (except?: string) => {
    game.scene.getScenes(true).forEach((s) => {
      if (s.scene.key !== except) game.scene.stop(s.scene.key);
    });
  };
  w.__scene = (key, data) => {
    stopOthers(key);
    game.scene.start(key, data as object);
  };
  w.__startRun = (mode) => {
    stopOthers('LevelIntroScene');
    const config = buildRunConfig(mode as 'endless');
    game.scene.start('LevelIntroScene', { config, skipIntro: true });
  };

  // Menus compute their layout once in create(), so on viewport changes
  // (phone rotation, window resize) restart the active menu scene.
  // GameplayScene rebuilds its HUD itself; reward scenes must not re-run
  // because create() re-applies the rewards.
  const noRestart = new Set(['GameplayScene', 'BootScene', 'VictoryScene', 'GameOverScene', 'LevelIntroScene']);
  let resizeTimer: number | undefined;
  game.scale.on('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      game.scene.getScenes(true).forEach((s) => {
        if (!noRestart.has(s.scene.key)) s.scene.restart();
      });
    }, 200);
  });
} else {
  console.error('App container not found');
}

// PWA: register service worker for offline play + installability
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW unsupported context (e.g. some webviews) - game still works
    });
  });
}
