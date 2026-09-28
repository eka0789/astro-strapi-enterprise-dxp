import Phaser from 'phaser';
import { gameConfig } from './game/config.js';
import './styles/ui.css';

const app = document.getElementById('app');
if (app) {
  const game = new Phaser.Game(gameConfig);
  (window as unknown as { __adventris: Phaser.Game }).__adventris = game;
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
