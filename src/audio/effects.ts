// Audio effects processors

export class Phaser {
  private input: GainNode;
  private output: GainNode;
  private allpassFilters: BiquadFilterNode[] = [];
  private feedback: GainNode;
  private lfo: OscillatorNode;
  private lfoGain: GainNode;
  private depth: GainNode;
  private bypass = true;

  constructor(context: AudioContext) {
    // Create nodes
    this.input = context.createGain();
    this.output = context.createGain();
    this.feedback = context.createGain();
    this.depth = context.createGain();

    // Create 6 allpass filters for phaser effect
    const numStages = 6;
    for (let i = 0; i < numStages; i++) {
      const filter = context.createBiquadFilter();
      filter.type = 'allpass';
      filter.frequency.value = 1000 * (i + 1);
      this.allpassFilters.push(filter);
    }

    // Create LFO
    this.lfo = context.createOscillator();
    this.lfo.frequency.value = 0.5; // Hz
    this.lfoGain = context.createGain();
    this.lfoGain.gain.value = 500; // Modulation depth

    // Connect LFO to filters
    this.lfo.connect(this.lfoGain);
    for (const filter of this.allpassFilters) {
      this.lfoGain.connect(filter.frequency);
    }

    // Connect filters in series
    this.input.connect(this.allpassFilters[0]);
    for (let i = 0; i < numStages - 1; i++) {
      this.allpassFilters[i].connect(this.allpassFilters[i + 1]);
    }

    // Feedback loop
    this.allpassFilters[numStages - 1].connect(this.feedback);
    this.feedback.connect(this.allpassFilters[0]);

    // Output
    this.allpassFilters[numStages - 1].connect(this.depth);
    this.depth.connect(this.output);

    // Dry signal
    this.input.connect(this.output);

    // Start LFO
    this.lfo.start();
  }

  connect(destination: AudioNode): void {
    this.output.connect(destination);
  }

  disconnect(): void {
    this.output.disconnect();
  }

  getInput(): AudioNode {
    return this.input;
  }

  setEnabled(enabled: boolean): void {
    this.bypass = !enabled;
    if (enabled) {
      this.depth.gain.value = 0.5;
    } else {
      this.depth.gain.value = 0;
    }
  }

  setRate(rate: number): void {
    // rate: 0-1, maps to 0.1-5 Hz
    this.lfo.frequency.value = 0.1 + rate * 4.9;
  }

  setDepth(depth: number): void {
    // depth: 0-1
    if (!this.bypass) {
      this.depth.gain.value = depth;
    }
    this.lfoGain.gain.value = depth * 1000;
  }

  setFeedback(feedback: number): void {
    // feedback: 0-1
    this.feedback.gain.value = feedback * 0.9;
  }
}

export class Saturator {
  private input: GainNode;
  private output: GainNode;
  private waveshaper: WaveShaperNode;
  private preGain: GainNode;
  private postGain: GainNode;
  private bypass = true;

  constructor(context: AudioContext) {
    this.input = context.createGain();
    this.output = context.createGain();
    this.waveshaper = context.createWaveShaper();
    this.preGain = context.createGain();
    this.postGain = context.createGain();

    // Default curve (no saturation)
    this.updateCurve(0);

    // Connect: input -> preGain -> waveshaper -> postGain -> output
    this.input.connect(this.preGain);
    this.preGain.connect(this.waveshaper);
    this.waveshaper.connect(this.postGain);
    this.postGain.connect(this.output);

    // Dry signal bypass
    this.input.connect(this.output);
  }

  connect(destination: AudioNode): void {
    this.output.connect(destination);
  }

  disconnect(): void {
    this.output.disconnect();
  }

  getInput(): AudioNode {
    return this.input;
  }

  setEnabled(enabled: boolean): void {
    this.bypass = !enabled;
    if (enabled) {
      this.postGain.gain.value = 1.0;
      this.preGain.disconnect();
      this.preGain.connect(this.waveshaper);
    } else {
      this.preGain.disconnect();
      this.postGain.gain.value = 0;
    }
  }

  setAmount(amount: number): void {
    // amount: 0-1
    this.updateCurve(amount);
    this.preGain.gain.value = 1 + amount * 9; // 1x to 10x gain
    this.postGain.gain.value = this.bypass ? 0 : 1 / (1 + amount * 2);
  }

  private updateCurve(amount: number): void {
    const samples = 2048;
    const curve = new Float32Array(samples);
    const deg = amount * 50; // Distortion degree

    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;

      if (amount === 0) {
        curve[i] = x; // No distortion
      } else {
        // Soft clipping curve
        curve[i] = ((3 + deg) * x * 20) / (Math.PI + deg * Math.abs(x));
        // Clamp to [-1, 1]
        curve[i] = Math.max(-1, Math.min(1, curve[i]));
      }
    }

    this.waveshaper.curve = curve;
  }
}

export class MultiFilter {
  private filter: BiquadFilterNode;

  constructor(context: AudioContext) {
    this.filter = context.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 1000;
    this.filter.Q.value = 1;
  }

  connect(destination: AudioNode): void {
    this.filter.connect(destination);
  }

  disconnect(): void {
    this.filter.disconnect();
  }

  getInput(): AudioNode {
    return this.filter;
  }

  setType(type: BiquadFilterType): void {
    this.filter.type = type;
  }

  setFrequency(freq: number): void {
    this.filter.frequency.value = freq;
  }

  setQ(q: number): void {
    this.filter.Q.value = q;
  }
}
