// UI Controls management

import { SynthParams } from '../types';
import { SynthEngine } from '../audio/synth-engine';
import { PatchManager } from '../patch-manager';

export class Controls {
  private engine: SynthEngine;
  private patchManager: PatchManager;
  private formulaInput: HTMLInputElement;

  constructor(engine: SynthEngine, patchManager: PatchManager) {
    this.engine = engine;
    this.patchManager = patchManager;

    this.formulaInput = document.getElementById('formula-input') as HTMLInputElement;

    this.setupControls();
    this.setupPresets();
    this.setupPatchManagement();
  }

  private setupControls(): void {
    // Play/Stop buttons
    const playBtn = document.getElementById('play-btn') as HTMLButtonElement;
    const stopBtn = document.getElementById('stop-btn') as HTMLButtonElement;

    playBtn?.addEventListener('click', async () => {
      await this.engine.play();
      playBtn.disabled = true;
      stopBtn.disabled = false;
    });

    stopBtn?.addEventListener('click', () => {
      this.engine.stop();
      playBtn.disabled = false;
      stopBtn.disabled = true;
    });

    // Formula input
    this.formulaInput?.addEventListener('input', (e) => {
      const value = (e.target as HTMLInputElement).value;
      try {
        this.engine.updateFormula(value);
      } catch (error) {
        console.error('Invalid formula:', error);
      }
    });

    // Parameter controls
    this.setupSlider('script-gain', 'scriptGain', 0, 1, 0.01);
    this.setupSlider('bit-rate', 'bitRate', 1, 16, 1);
    this.setupSlider('sample-rate', 'targetSampleRate', 8000, 5644800, 1000);

    // Oscillator 1
    this.setupSlider('osc1-gain', 'osc1Gain', 0, 1, 0.01);
    this.setupSlider('osc1-mod', 'osc1Mod', 0, 1, 0.001);
    this.setupSlider('osc1-freq', 'osc1Freq', 0, 440, 1);
    this.setupCheckbox('osc1-theta', 'osc1Theta');

    // Oscillator 2
    this.setupSlider('osc2-gain', 'osc2Gain', 0, 1, 0.01);
    this.setupSlider('osc2-mod', 'osc2Mod', 0, 1000, 0.001);
    this.setupSlider('osc2-freq', 'osc2Freq', 0, 440, 1);
    this.setupCheckbox('osc2-theta', 'osc2Theta');

    // Delay
    this.setupSlider('delay-mix', 'delayMix', 0, 0.9, 0.0001);
    this.setupSlider('delay-feedback', 'delayFeedback', 0, 0.85, 0.0001);
    this.setupSlider('delay-time', 'delayTime', 0, 0.01, 0.0001);
    this.setupSlider('delay-filter', 'delayFilterFreq', 0, 22050, 10);

    // Filter
    this.setupCheckbox('filter-enabled', 'filterEnabled');
    this.setupSelect('filter-type', 'filterType');
    this.setupSlider('filter-freq', 'filterFreq', 20, 20000, 1);
    this.setupSlider('filter-q', 'filterQ', 0.1, 20, 0.1);

    // Phaser
    this.setupCheckbox('phaser-enabled', 'phaserEnabled');
    this.setupSlider('phaser-rate', 'phaserRate', 0, 1, 0.01);
    this.setupSlider('phaser-depth', 'phaserDepth', 0, 1, 0.01);
    this.setupSlider('phaser-feedback', 'phaserFeedback', 0, 1, 0.01);

    // Saturation
    this.setupCheckbox('saturation-enabled', 'saturationEnabled');
    this.setupSlider('saturation-amount', 'saturationAmount', 0, 1, 0.01);

    // Master
    this.setupSlider('master-gain', 'masterGain', 0, 1, 0.01);
  }

  private setupSlider(id: string, param: keyof SynthParams, min: number, max: number, step: number): void {
    const slider = document.getElementById(id) as HTMLInputElement;
    const valueDisplay = document.getElementById(`${id}-value`) as HTMLSpanElement;

    if (!slider) return;

    slider.min = min.toString();
    slider.max = max.toString();
    slider.step = step.toString();

    const currentValue = this.engine.getParams()[param];
    if (typeof currentValue === 'number') {
      slider.value = currentValue.toString();
      if (valueDisplay) {
        valueDisplay.textContent = this.formatValue(currentValue, step);
      }
    }

    slider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      if (valueDisplay) {
        valueDisplay.textContent = this.formatValue(value, step);
      }
      this.engine.updateParams({ [param]: value } as Partial<SynthParams>);
    });
  }

  private setupCheckbox(id: string, param: keyof SynthParams): void {
    const checkbox = document.getElementById(id) as HTMLInputElement;
    if (!checkbox) return;

    const currentValue = this.engine.getParams()[param];
    if (typeof currentValue === 'boolean') {
      checkbox.checked = currentValue;
    }

    checkbox.addEventListener('change', (e) => {
      const value = (e.target as HTMLInputElement).checked;
      this.engine.updateParams({ [param]: value } as Partial<SynthParams>);
    });
  }

  private setupSelect(id: string, param: keyof SynthParams): void {
    const select = document.getElementById(id) as HTMLSelectElement;
    if (!select) return;

    const currentValue = this.engine.getParams()[param];
    if (typeof currentValue === 'string') {
      select.value = currentValue;
    }

    select.addEventListener('change', (e) => {
      const value = (e.target as HTMLSelectElement).value;
      this.engine.updateParams({ [param]: value } as Partial<SynthParams>);
    });
  }

  private formatValue(value: number, step: number): string {
    if (step >= 1) {
      return value.toFixed(0);
    } else if (step >= 0.01) {
      return value.toFixed(2);
    } else if (step >= 0.001) {
      return value.toFixed(3);
    } else {
      return value.toFixed(4);
    }
  }

  private setupPresets(): void {
    const presetSelect = document.getElementById('preset-select') as HTMLSelectElement;
    const loadPresetBtn = document.getElementById('load-preset-btn') as HTMLButtonElement;

    if (!presetSelect || !loadPresetBtn) return;

    // Populate presets
    const presets = this.patchManager.getPresets();
    presets.forEach((preset) => {
      const option = document.createElement('option');
      option.value = preset.name;
      option.textContent = preset.name;
      presetSelect.appendChild(option);
    });

    loadPresetBtn.addEventListener('click', () => {
      const presetName = presetSelect.value;
      const preset = presets.find((p) => p.name === presetName);
      if (preset) {
        this.loadPatch(preset.params);
      }
    });
  }

  private setupPatchManagement(): void {
    const savePatchBtn = document.getElementById('save-patch-btn') as HTMLButtonElement;
    const patchNameInput = document.getElementById('patch-name-input') as HTMLInputElement;
    const exportPatchBtn = document.getElementById('export-patch-btn') as HTMLButtonElement;
    const importPatchBtn = document.getElementById('import-patch-btn') as HTMLButtonElement;
    const importFileInput = document.getElementById('import-file-input') as HTMLInputElement;

    // Save patch
    savePatchBtn?.addEventListener('click', () => {
      const name = patchNameInput?.value.trim();
      if (!name) {
        alert('Please enter a patch name');
        return;
      }

      const params = this.engine.getParams();
      this.patchManager.savePatch(name, params);
      alert(`Patch "${name}" saved!`);
      this.updatePatchList();
    });

    // Export patch
    exportPatchBtn?.addEventListener('click', () => {
      const params = this.engine.getParams();
      const patch = {
        name: patchNameInput?.value || 'Untitled',
        params,
        timestamp: Date.now(),
      };

      const json = JSON.stringify(patch, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `${patch.name}.json`;
      a.click();

      URL.revokeObjectURL(url);
    });

    // Import patch
    importPatchBtn?.addEventListener('click', () => {
      importFileInput?.click();
    });

    importFileInput?.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = e.target?.result as string;
          this.patchManager.importPatch(json);
          alert('Patch imported successfully!');
          this.updatePatchList();
        } catch (error) {
          alert('Failed to import patch: ' + error);
        }
      };
      reader.readAsText(file);
    });

    this.updatePatchList();
  }

  private updatePatchList(): void {
    const patchList = document.getElementById('patch-list') as HTMLDivElement;
    if (!patchList) return;

    patchList.innerHTML = '';

    const patches = this.patchManager.getAllPatches();
    patches.forEach((patch) => {
      const item = document.createElement('div');
      item.className = 'patch-item';

      const nameSpan = document.createElement('span');
      nameSpan.textContent = patch.name;
      nameSpan.className = 'patch-name';
      nameSpan.addEventListener('click', () => {
        this.loadPatch(patch.params);
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Delete';
      deleteBtn.className = 'delete-btn';
      deleteBtn.addEventListener('click', () => {
        if (confirm(`Delete patch "${patch.name}"?`)) {
          this.patchManager.deletePatch(patch.name);
          this.updatePatchList();
        }
      });

      item.appendChild(nameSpan);
      item.appendChild(deleteBtn);
      patchList.appendChild(item);
    });
  }

  private loadPatch(params: SynthParams): void {
    this.engine.updateParams(params);
    this.formulaInput.value = params.bytebeatFormula;

    // Update all UI controls
    this.updateUIFromParams(params);
  }

  private updateUIFromParams(params: SynthParams): void {
    // Update all sliders, checkboxes, and selects to match the loaded params
    Object.entries(params).forEach(([key, value]) => {
      const element = document.getElementById(key.replace(/([A-Z])/g, '-$1').toLowerCase());
      if (element instanceof HTMLInputElement) {
        if (element.type === 'checkbox') {
          element.checked = value as boolean;
        } else if (element.type === 'range' || element.type === 'number') {
          element.value = value.toString();
          const valueDisplay = document.getElementById(`${element.id}-value`);
          if (valueDisplay) {
            const step = parseFloat(element.step || '1');
            valueDisplay.textContent = this.formatValue(value as number, step);
          }
        }
      } else if (element instanceof HTMLSelectElement) {
        element.value = value as string;
      }
    });
  }
}
