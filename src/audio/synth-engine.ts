// Main synthesizer engine - manages AudioWorklet and effects chain

import { SynthParams, DEFAULT_PARAMS } from '../types';
import { Phaser, Saturator, MultiFilter } from './effects';

export class SynthEngine {
  private context: AudioContext;
  private workletNode?: AudioWorkletNode;
  private analyser: AnalyserNode;
  private compressor: DynamicsCompressorNode;
  private masterGain: GainNode;

  // Delay effect nodes
  private delayInput: GainNode;
  private delayNode: DelayNode;
  private delayFilter: BiquadFilterNode;
  private delayFeedback: GainNode;
  private delayWet: GainNode;

  // New effects
  private filter: MultiFilter;
  private phaser: Phaser;
  private saturator: Saturator;

  private params: SynthParams = { ...DEFAULT_PARAMS };
  private isPlaying = false;

  constructor() {
    this.context = new AudioContext();

    // Create audio nodes
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 2048;

    this.compressor = this.context.createDynamicsCompressor();
    this.compressor.threshold.value = -6.0;
    this.compressor.knee.value = 12.0;
    this.compressor.ratio.value = 12.0;
    this.compressor.attack.value = 0.1;

    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = 0.5;

    // Delay setup
    this.delayInput = this.context.createGain();
    this.delayNode = this.context.createDelay();
    this.delayFilter = this.context.createBiquadFilter();
    this.delayFeedback = this.context.createGain();
    this.delayWet = this.context.createGain();

    this.delayInput.gain.value = 1.0;
    this.delayFeedback.gain.value = 0.0;
    this.delayWet.gain.value = 0.0;

    // New effects
    this.filter = new MultiFilter(this.context);
    this.phaser = new Phaser(this.context);
    this.saturator = new Saturator(this.context);
  }

  async init(): Promise<void> {
    // Load and register the AudioWorklet processor
    try {
      // Embed the worklet code as a blob for Vite compatibility
      const workletCode = this.getWorkletCode();
      const blob = new Blob([workletCode], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);

      await this.context.audioWorklet.addModule(url);

      // Create the worklet node
      this.workletNode = new AudioWorkletNode(this.context, 'bytebeat-processor', {
        processorOptions: {
          sampleRate: this.context.sampleRate,
        },
      });

      // Set up audio routing
      this.connectAudioGraph();

      console.log('SynthEngine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AudioWorklet:', error);
      throw error;
    }
  }

  private getWorkletCode(): string {
    return `
const TAU = 2.0 * Math.PI;

class BytebeatProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super(options);
    this.t = 0;
    this.i = 0;
    this.scriptGain = 0.5;
    this.bitRate = 8;
    this.targetSampleRate = 8000;
    this.sampleRate = options.processorOptions?.sampleRate || 44100;
    this.osc1Gain = 0.0;
    this.osc1Mod = 0.0;
    this.osc1Freq = 440;
    this.osc1Phase = 0;
    this.osc1Theta = false;
    this.osc2Gain = 0.0;
    this.osc2Mod = 0.0;
    this.osc2Freq = 440;
    this.osc2Phase = 0;
    this.osc2Theta = false;
    this.bytebeatFn = (t, i) => t | i;

    this.port.onmessage = (event) => {
      const { type, data } = event.data;
      if (type === 'updateParams') {
        this.updateParams(data);
      } else if (type === 'updateFormula') {
        this.updateFormula(data);
      }
    };
  }

  updateParams(params) {
    if (params.scriptGain !== undefined) this.scriptGain = params.scriptGain;
    if (params.bitRate !== undefined) this.bitRate = params.bitRate;
    if (params.targetSampleRate !== undefined) this.targetSampleRate = params.targetSampleRate;
    if (params.osc1Gain !== undefined) this.osc1Gain = params.osc1Gain;
    if (params.osc1Mod !== undefined) this.osc1Mod = params.osc1Mod;
    if (params.osc1Freq !== undefined) this.osc1Freq = params.osc1Freq;
    if (params.osc1Theta !== undefined) this.osc1Theta = params.osc1Theta;
    if (params.osc2Gain !== undefined) this.osc2Gain = params.osc2Gain;
    if (params.osc2Mod !== undefined) this.osc2Mod = params.osc2Mod;
    if (params.osc2Freq !== undefined) this.osc2Freq = params.osc2Freq;
    if (params.osc2Theta !== undefined) this.osc2Theta = params.osc2Theta;
  }

  updateFormula(formula) {
    try {
      const sanitized = formula.replace(
        /abs|exp|round|sqrt|sin|cos|tan|floor|ceil|log|PI|E/g,
        (str) => \`Math.\${str}\`
      );
      this.bytebeatFn = new Function('t', 'i', \`return \${sanitized};\`);
    } catch (e) {
      console.error('Error compiling bytebeat formula:', e);
    }
  }

  bitDivisor() {
    return 1 << (this.bitRate - 1);
  }

  bitMask() {
    return (1 << this.bitRate) - 1;
  }

  thetaIncrement() {
    return this.targetSampleRate / this.sampleRate;
  }

  phaseIncrement(frequency) {
    return TAU * frequency / this.sampleRate;
  }

  bitShift(frame) {
    return (this.bitMask() & frame) / this.bitDivisor();
  }

  oscSine(phase, modIndex, modPhase) {
    return Math.sin(phase + (modIndex * Math.cos(modPhase)));
  }

  process(_inputs, outputs, _parameters) {
    const output = outputs[0];
    const channel = output[0];

    for (this.i = 0; this.i < channel.length; this.i++) {
      this.t += this.thetaIncrement();
      const bytebeatOutput = this.bitShift(this.bytebeatFn(this.t, this.i));

      this.osc1Phase += this.phaseIncrement(this.osc1Freq);
      if (this.osc1Theta) {
        this.osc1Phase += this.thetaIncrement();
      }
      const osc1Output = 0.5 * this.oscSine(this.osc1Phase, this.osc1Mod, bytebeatOutput);

      this.osc2Phase += this.phaseIncrement(this.osc2Freq);
      if (this.osc2Theta) {
        this.osc2Phase += this.thetaIncrement();
      }
      const osc2Output = 0.5 * this.oscSine(this.osc2Phase, this.osc2Mod, osc1Output);

      channel[this.i] = 0.5 * (
        (this.scriptGain * bytebeatOutput) +
        (this.osc1Gain * osc1Output) +
        (this.osc2Gain * osc2Output)
      );
    }

    if (this.osc1Phase >= TAU) {
      this.osc1Phase -= TAU;
    }
    if (this.osc2Phase >= TAU) {
      this.osc2Phase -= TAU;
    }

    return true;
  }
}

registerProcessor('bytebeat-processor', BytebeatProcessor);
    `;
  }

  private connectAudioGraph(): void {
    if (!this.workletNode) return;

    // Main signal path:
    // workletNode -> delayInput -> [delay chain] -> saturator -> filter -> phaser -> compressor -> masterGain -> analyser -> destination

    // Delay chain
    this.delayInput.connect(this.delayNode);
    this.delayNode.connect(this.delayFilter);
    this.delayFilter.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);
    this.delayFeedback.connect(this.delayWet);

    // Main chain
    this.workletNode.connect(this.delayInput);
    this.delayWet.connect(this.saturator.getInput());
    this.workletNode.connect(this.saturator.getInput());

    this.saturator.connect(this.filter.getInput());
    this.filter.connect(this.phaser.getInput());
    this.phaser.connect(this.compressor);
    this.compressor.connect(this.masterGain);
  }

  async play(): Promise<void> {
    if (this.isPlaying) return;

    // Resume context if suspended (modern browsers require this)
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }

    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.context.destination);
    this.isPlaying = true;

    console.log('Audio playing - Context state:', this.context.state);
  }

  stop(): void {
    if (!this.isPlaying) return;

    this.masterGain.disconnect();
    this.analyser.disconnect();
    this.isPlaying = false;
  }

  updateParams(newParams: Partial<SynthParams>): void {
    this.params = { ...this.params, ...newParams };

    // Update worklet
    if (this.workletNode) {
      this.workletNode.port.postMessage({
        type: 'updateParams',
        data: this.params,
      });
    }

    // Update delay
    if (newParams.delayMix !== undefined) {
      this.delayWet.gain.value = newParams.delayMix;
    }
    if (newParams.delayFeedback !== undefined) {
      this.delayFeedback.gain.value = newParams.delayFeedback;
    }
    if (newParams.delayTime !== undefined) {
      this.delayNode.delayTime.value = newParams.delayTime;
    }
    if (newParams.delayFilterFreq !== undefined) {
      this.delayFilter.frequency.value = newParams.delayFilterFreq;
    }

    // Update filter
    if (newParams.filterEnabled !== undefined) {
      // Filter is always in the chain, just adjust gain if needed
    }
    if (newParams.filterType !== undefined) {
      this.filter.setType(newParams.filterType);
    }
    if (newParams.filterFreq !== undefined) {
      this.filter.setFrequency(newParams.filterFreq);
    }
    if (newParams.filterQ !== undefined) {
      this.filter.setQ(newParams.filterQ);
    }

    // Update phaser
    if (newParams.phaserEnabled !== undefined) {
      this.phaser.setEnabled(newParams.phaserEnabled);
    }
    if (newParams.phaserRate !== undefined) {
      this.phaser.setRate(newParams.phaserRate);
    }
    if (newParams.phaserDepth !== undefined) {
      this.phaser.setDepth(newParams.phaserDepth);
    }
    if (newParams.phaserFeedback !== undefined) {
      this.phaser.setFeedback(newParams.phaserFeedback);
    }

    // Update saturator
    if (newParams.saturationEnabled !== undefined) {
      this.saturator.setEnabled(newParams.saturationEnabled);
    }
    if (newParams.saturationAmount !== undefined) {
      this.saturator.setAmount(newParams.saturationAmount);
    }

    // Update master gain
    if (newParams.masterGain !== undefined) {
      this.masterGain.gain.value = newParams.masterGain;
    }
  }

  updateFormula(formula: string): void {
    this.params.bytebeatFormula = formula;

    if (this.workletNode) {
      this.workletNode.port.postMessage({
        type: 'updateFormula',
        data: formula,
      });
    }
  }

  getAnalyser(): AnalyserNode {
    return this.analyser;
  }

  getParams(): SynthParams {
    return { ...this.params };
  }

  getContext(): AudioContext {
    return this.context;
  }

  isActive(): boolean {
    return this.isPlaying;
  }
}
