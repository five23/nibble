// Waveform visualizer

export class Visualizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private analyser: AnalyserNode;
  private dataArray: Uint8Array<ArrayBuffer>;
  private animationId: number | null = null;

  constructor(canvas: HTMLCanvasElement, analyser: AnalyserNode) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.analyser = analyser;
    this.dataArray = new Uint8Array(analyser.frequencyBinCount);

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private resize(): void {
    const parent = this.canvas.parentElement;
    if (parent) {
      this.canvas.width = parent.clientWidth;
      this.canvas.height = parent.clientHeight;
    }
  }

  start(): void {
    if (this.animationId !== null) return;
    this.draw();
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.clear();
  }

  private clear(): void {
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private draw(): void {
    this.animationId = requestAnimationFrame(() => this.draw());

    // Get time domain data
    this.analyser.getByteTimeDomainData(this.dataArray);

    // Clear canvas
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw waveform
    this.ctx.strokeStyle = '#0f0';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();

    const sliceWidth = this.canvas.width / this.dataArray.length;
    let x = 0;

    for (let i = 0; i < this.dataArray.length; i++) {
      const v = this.dataArray[i] / 128.0;
      const y = (v * this.canvas.height) / 2;

      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    this.ctx.stroke();

    // Draw grid
    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 1;

    // Horizontal center line
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.canvas.height / 2);
    this.ctx.lineTo(this.canvas.width, this.canvas.height / 2);
    this.ctx.stroke();

    // Vertical lines
    const gridLines = 10;
    for (let i = 0; i <= gridLines; i++) {
      const x = (i * this.canvas.width) / gridLines;
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }
  }
}
