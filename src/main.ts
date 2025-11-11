// Main entry point for Nibble Bytebeat Synthesizer

import { SynthEngine } from './audio/synth-engine';
import { PatchManager } from './patch-manager';
import { Visualizer } from './ui/visualizer';
import { Controls } from './ui/controls';
import './style.css';

class App {
  private engine: SynthEngine;
  private patchManager: PatchManager;
  private visualizer: Visualizer | null = null;

  constructor() {
    this.engine = new SynthEngine();
    this.patchManager = new PatchManager();
  }

  async init(): Promise<void> {
    try {
      // Initialize the synth engine
      await this.engine.init();

      // Set up visualizer
      const canvas = document.getElementById('waveform-canvas') as HTMLCanvasElement;
      if (canvas) {
        this.visualizer = new Visualizer(canvas, this.engine.getAnalyser());
      }

      // Set up controls
      new Controls(this.engine, this.patchManager);

      // Set up play/stop button handlers for visualizer
      const playBtn = document.getElementById('play-btn') as HTMLButtonElement;
      const stopBtn = document.getElementById('stop-btn') as HTMLButtonElement;

      playBtn?.addEventListener('click', async () => {
        this.visualizer?.start();
      });

      stopBtn?.addEventListener('click', () => {
        this.visualizer?.stop();
      });

      console.log('Nibble initialized successfully!');
    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.showError('Failed to initialize audio. Please reload the page.');
    }
  }

  private showError(message: string): void {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.body.insertBefore(errorDiv, document.body.firstChild);
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  const app = new App();
  await app.init();
});
