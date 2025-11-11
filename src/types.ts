// Core synthesizer types and interfaces

export interface SynthParams {
  // Bytebeat parameters
  scriptGain: number;
  bitRate: number;
  targetSampleRate: number;
  bytebeatFormula: string;

  // Oscillator 1
  osc1Gain: number;
  osc1Mod: number;
  osc1Freq: number;
  osc1Phase: number;
  osc1Theta: boolean;

  // Oscillator 2
  osc2Gain: number;
  osc2Mod: number;
  osc2Freq: number;
  osc2Phase: number;
  osc2Theta: boolean;

  // Delay
  delayMix: number;
  delayFeedback: number;
  delayTime: number;
  delayFilterFreq: number;

  // New effects
  filterEnabled: boolean;
  filterType: BiquadFilterType;
  filterFreq: number;
  filterQ: number;

  phaserEnabled: boolean;
  phaserRate: number;
  phaserDepth: number;
  phaserFeedback: number;

  saturationEnabled: boolean;
  saturationAmount: number;

  // Master output
  masterGain: number;
}

export interface Patch {
  name: string;
  params: SynthParams;
  timestamp: number;
}

export interface AudioWorkletMessage {
  type: 'updateParams' | 'updateFormula';
  data: any;
}

export const DEFAULT_PARAMS: SynthParams = {
  scriptGain: 0.5,
  bitRate: 8,
  targetSampleRate: 8000,
  bytebeatFormula: 't | i',

  osc1Gain: 0.0,
  osc1Mod: 0.0,
  osc1Freq: 440,
  osc1Phase: 0,
  osc1Theta: false,

  osc2Gain: 0.0,
  osc2Mod: 0.0,
  osc2Freq: 440,
  osc2Phase: 0,
  osc2Theta: false,

  delayMix: 0.0,
  delayFeedback: 0.0,
  delayTime: 0.0,
  delayFilterFreq: 22050,

  filterEnabled: false,
  filterType: 'lowpass',
  filterFreq: 1000,
  filterQ: 1,

  phaserEnabled: false,
  phaserRate: 0.5,
  phaserDepth: 0.5,
  phaserFeedback: 0.5,

  saturationEnabled: false,
  saturationAmount: 0.0,

  masterGain: 0.5,
};
