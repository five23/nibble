// Patch management - save/load synth presets

import { Patch, SynthParams, DEFAULT_PARAMS } from './types';

const STORAGE_KEY = 'nibble-patches';
const MAX_PATCHES = 50;

export class PatchManager {
  private patches: Patch[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.patches = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load patches from storage:', error);
      this.patches = [];
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.patches));
    } catch (error) {
      console.error('Failed to save patches to storage:', error);
    }
  }

  savePatch(name: string, params: SynthParams): void {
    const patch: Patch = {
      name,
      params: { ...params },
      timestamp: Date.now(),
    };

    // Check if patch with same name exists
    const existingIndex = this.patches.findIndex((p) => p.name === name);
    if (existingIndex >= 0) {
      this.patches[existingIndex] = patch;
    } else {
      this.patches.push(patch);
    }

    // Limit number of patches
    if (this.patches.length > MAX_PATCHES) {
      // Remove oldest patches
      this.patches.sort((a, b) => b.timestamp - a.timestamp);
      this.patches = this.patches.slice(0, MAX_PATCHES);
    }

    this.saveToStorage();
  }

  loadPatch(name: string): SynthParams | null {
    const patch = this.patches.find((p) => p.name === name);
    return patch ? { ...patch.params } : null;
  }

  deletePatch(name: string): void {
    this.patches = this.patches.filter((p) => p.name !== name);
    this.saveToStorage();
  }

  getAllPatches(): Patch[] {
    return [...this.patches].sort((a, b) => b.timestamp - a.timestamp);
  }

  exportPatch(name: string): string {
    const patch = this.patches.find((p) => p.name === name);
    if (!patch) {
      throw new Error(`Patch "${name}" not found`);
    }
    return JSON.stringify(patch, null, 2);
  }

  exportAllPatches(): string {
    return JSON.stringify(this.patches, null, 2);
  }

  importPatch(jsonString: string): void {
    try {
      const data = JSON.parse(jsonString);

      if (Array.isArray(data)) {
        // Importing multiple patches
        for (const patch of data) {
          if (this.isValidPatch(patch)) {
            this.savePatch(patch.name, patch.params);
          }
        }
      } else if (this.isValidPatch(data)) {
        // Importing single patch
        this.savePatch(data.name, data.params);
      } else {
        throw new Error('Invalid patch format');
      }
    } catch (error) {
      console.error('Failed to import patch:', error);
      throw error;
    }
  }

  private isValidPatch(data: any): data is Patch {
    return (
      data &&
      typeof data.name === 'string' &&
      data.params &&
      typeof data.params === 'object'
    );
  }

  getDefaultParams(): SynthParams {
    return { ...DEFAULT_PARAMS };
  }

  // Preset patches
  getPresets(): Patch[] {
    return [
      {
        name: 'Classic Bytebeat',
        params: {
          ...DEFAULT_PARAMS,
          bytebeatFormula: 't * ((t >> 8 | t >> 9) & 46 & t >> 8)',
          scriptGain: 0.6,
          bitRate: 8,
          targetSampleRate: 8000,
        },
        timestamp: Date.now(),
      },
      {
        name: 'Sierpinski Harmony',
        params: {
          ...DEFAULT_PARAMS,
          bytebeatFormula: '(t & t >> 8) * (t >> 4)',
          scriptGain: 0.5,
          bitRate: 8,
          targetSampleRate: 8000,
        },
        timestamp: Date.now(),
      },
      {
        name: 'Rhythmic Chaos',
        params: {
          ...DEFAULT_PARAMS,
          bytebeatFormula: 't * (t >> 8 * (t >> 15 | t >> 8) & (20 | (5 << (t >> 19))))',
          scriptGain: 0.5,
          bitRate: 8,
          targetSampleRate: 8000,
        },
        timestamp: Date.now(),
      },
      {
        name: 'Phased Bliss',
        params: {
          ...DEFAULT_PARAMS,
          bytebeatFormula: 'sin(t / 20) * 127',
          scriptGain: 0.4,
          phaserEnabled: true,
          phaserRate: 0.3,
          phaserDepth: 0.7,
          phaserFeedback: 0.6,
        },
        timestamp: Date.now(),
      },
      {
        name: 'Saturated Drive',
        params: {
          ...DEFAULT_PARAMS,
          bytebeatFormula: '(t * 5 & t >> 7) | (t * 3 & t >> 10)',
          scriptGain: 0.3,
          saturationEnabled: true,
          saturationAmount: 0.7,
        },
        timestamp: Date.now(),
      },
      {
        name: 'Filtered Dreams',
        params: {
          ...DEFAULT_PARAMS,
          bytebeatFormula: 't * (42 & t >> 10)',
          scriptGain: 0.6,
          filterEnabled: true,
          filterType: 'lowpass',
          filterFreq: 2000,
          filterQ: 5,
          delayMix: 0.3,
          delayTime: 0.005,
          delayFeedback: 0.4,
        },
        timestamp: Date.now(),
      },
    ];
  }
}
