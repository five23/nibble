# Nibble 3.0 - Modern Bytebeat Synthesizer

![Nibble Logo](./img/nibble.png)

A modern, powerful bytebeat synthesizer rebuilt from the ground up with TypeScript and modern Web Audio API. Create mesmerizing algorithmic music with mathematical expressions, advanced audio effects, and real-time visualization.

## 🚀 Features

### Core Bytebeat Engine
- **Real-time bytebeat synthesis** - Write JavaScript expressions that generate audio
- **Variable bit depth** (1-16 bit) and sample rate control
- **Live formula editing** with automatic compilation
- **Two serial injection-locked oscillators** with phase modulation
- **Support for complex math functions**: sin, cos, tan, exp, log, sqrt, floor, ceil, and more

### Advanced Effects Chain
- **Multi-mode Filter** - 8 filter types (lowpass, highpass, bandpass, notch, allpass, peaking, lowshelf, highshelf)
- **Phaser** - Rich modulation with adjustable rate, depth, and feedback
- **Saturation/Distortion** - Warm analog-style soft clipping
- **Delay** - Echo effect with feedback control and built-in filter
- **Compressor** - Dynamic range compression for consistent levels

### Modern Features
- **Patch Management** - Save, load, export, and import your creations
- **6 Built-in Presets** - Start creating immediately with example patches
- **Real-time Waveform Visualization** - See your sound as you create
- **LocalStorage Integration** - Your patches persist between sessions
- **Responsive Design** - Works on desktop and mobile devices

## 🎵 Quick Start

### Live Demo
Visit the [live demo](https://five23.github.io/nibble/) to start creating immediately.

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📖 How to Use

### Creating Sounds

1. **Enter a bytebeat formula** in the formula input field. For example:
   - `t | i` - Simple bitwise pattern
   - `t * ((t >> 8 | t >> 9) & 46 & t >> 8)` - Classic bytebeat
   - `sin(t / 20) * 127` - Sine wave

2. **Click Play** to hear your creation

3. **Adjust parameters**:
   - **Input Gain**: Controls bytebeat output level
   - **Bit Rate**: Lower values create more lo-fi sounds (1-16)
   - **Sample Rate**: Higher = more high frequency content

### Using Oscillators

The two oscillators can add tonal elements to your bytebeat:

- **Osc 1**: Can be modulated by the bytebeat output
- **Osc 2**: Can be modulated by Oscillator 1
- **Theta Mode**: Locks oscillator to the bytebeat time variable

### Applying Effects

- **Filter**: Shape the frequency content of your sound
- **Phaser**: Add swirling, psychedelic modulation
- **Saturation**: Add warmth and harmonics
- **Delay**: Create echoes and rhythmic patterns

### Saving Your Work

1. Enter a name in the "Patch name" field
2. Click "Save Patch" to store in browser
3. Click "Export Current" to download as JSON
4. Click "Import Patch" to load saved JSON files

## 🔧 Technical Details

### Architecture

- **TypeScript** - Type-safe code with modern ES2020+ features
- **Vite** - Lightning-fast build tool and dev server
- **AudioWorklet** - Runs audio processing in a separate thread for glitch-free performance
- **Web Audio API** - Native browser audio with zero latency

### Audio Graph

```
BytebeatWorklet → Delay → Saturation → Filter → Phaser → Compressor → Master → Output
```

### Browser Compatibility

- Chrome/Edge 66+
- Firefox 76+
- Safari 14.1+
- Any browser with AudioWorklet support

## 📚 Bytebeat Formulas

### Available Functions

All standard JavaScript Math functions are available:
- Trigonometric: `sin`, `cos`, `tan`
- Exponential: `exp`, `log`, `sqrt`
- Rounding: `floor`, `ceil`, `round`
- Other: `abs`
- Constants: `PI`, `E`

### Variables

- `t` - Time variable (increments based on sample rate)
- `i` - Current sample index in the buffer

### Example Formulas

```javascript
// Sierpinski harmony
(t & t >> 8) * (t >> 4)

// Rhythmic chaos
t * (t >> 8 * (t >> 15 | t >> 8) & (20 | (5 << (t >> 19))))

// Smooth sine wave
sin(t / 20) * 127

// Complex pattern
((t * 5 & t >> 7) | (t * 3 & t >> 10))

// Melodic sequence
(t * (42 & t >> 10))
```

## 🎨 Preset Patches

- **Classic Bytebeat** - The iconic bytebeat sound
- **Sierpinski Harmony** - Mathematical beauty in sound
- **Rhythmic Chaos** - Complex evolving patterns
- **Phased Bliss** - Smooth tones with phaser effect
- **Saturated Drive** - Distorted lo-fi rhythms
- **Filtered Dreams** - Ambient filtered textures with delay

## 🛠️ Development

### Project Structure

```
nibble/
├── src/
│   ├── audio/
│   │   ├── synth-engine.ts    # Main audio engine
│   │   └── effects.ts         # Audio effects (phaser, saturator, filter)
│   ├── ui/
│   │   ├── visualizer.ts      # Waveform visualization
│   │   └── controls.ts        # UI controls management
│   ├── types.ts               # TypeScript interfaces
│   ├── patch-manager.ts       # Patch save/load system
│   ├── main.ts                # Application entry point
│   └── style.css              # Styling
├── public/                    # Static assets
├── index.html                 # Main HTML
├── vite.config.ts            # Vite configuration
└── package.json              # Dependencies
```

### Key Technologies

- **TypeScript 5.3** - Type safety and modern JavaScript
- **Vite 5.0** - Fast development and optimized builds
- **Web Audio API** - Low-latency audio processing
- **AudioWorklet** - Separate audio thread
- **LocalStorage API** - Client-side patch storage

## 🎓 Learning Resources

### Bytebeat
- [Original Bytebeat Article](http://canonical.org/~kragen/bytebeat/)
- [Viznut's Bytebeat](http://www.youtube.com/watch?v=GtQdIYUtAHg)

### Web Audio
- [MDN Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [AudioWorklet](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet)

## ⚠️ Important Notes

- **Start with low volume!** Bytebeat can produce very loud sounds
- Some formulas may produce DC offset or extreme values
- Complex formulas may cause high CPU usage
- Save your patches regularly

## 📝 License

MIT License - Feel free to use, modify, and distribute

## 🙏 Credits

- Inspired by Viznut's groundbreaking work on bytebeat
- Original GUI concept using xgui.js
- Completely rebuilt with modern web technologies

## 🤝 Contributing

Contributions welcome! This is a complete modernization featuring:
- Modern TypeScript architecture
- AudioWorklet for glitch-free audio
- Advanced effects chain
- Comprehensive patch management
- Responsive modern UI

---

**Built with** ❤️ **and** 🔊 **by the bytebeat community**
