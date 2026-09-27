import Phaser from 'phaser';
import { gameConfig } from './game/config.js';
import './styles/ui.css';

const app = document.getElementById('app');
if (app) {
  new Phaser.Game(gameConfig);
} else {
  console.error('App container not found');
}
