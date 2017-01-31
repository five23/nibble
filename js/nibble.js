/*jslint browser: true, bitwise: true, newcap:true, strict:false, unused:false */
/*global  $, AudioContext, webkitAudioContext, Uint8Array */

Math.TAU = 2.0 * Math.PI;

$(window)
    .on('load', function () {
        "use strict";

        var t = 0,
            i = 0,
            outBuffer,
            context,
            lastGain = 0.5;

        if (typeof AudioContext === "function") {
            context = new AudioContext();
        } else if (typeof webkitAudioContext === "function") {
            context = new webkitAudioContext();
        } else {
            $('#audioError').modal({
                show: 'true',
                backdrop: 'static',
                keyboard: 'false'
            });
        }

        var nibble = new Object({
            outputChannels: 1,
            bitRate: 8,
            defaultSampleRate: 44100,
            targetSampleRate: 8000,
            scriptGain: 0.5,
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
            freqBin: 0,
            analyser: context.createAnalyser(),
            delayInput: context.createGain(),
            delayWet: context.createGain(),
            delayFilter: context.createBiquadFilter(),
            delayNode: context.createDelay(),
            delayFeedback: context.createGain(),
            mainOutput: context.createGain(),
            compressor: context.createDynamicsCompressor(),
            scriptProcessor: context.createScriptProcessor(0, 0, 1),
            ctx: $("#wave").get()[0].getContext("2d"),
            viewport: document.getElementById("viewport"),
            bitDivisor: function () {
                return 1 << (this.bitRate - 1);
            },
            bitMask: function () {
                return (1 << this.bitRate) - 1;
            },
            thetaIncrement: function () {
                return (this.targetSampleRate / this.defaultSampleRate);
            },
            phaseIncrement: function (frequency) {
                return Math.TAU * frequency / this.defaultSampleRate;
            },
            ft1: function () {
                return (t | i);
            },
            oscSine: function (phase, modIndex, modPhase) {
                return Math.sin(phase + (modIndex * Math.cos(modPhase)));
            },
            bitShift: function (frame) {
                return (this.bitMask() & frame) / this.bitDivisor();
            },
            returnProcess: function (e) {

                outBuffer = e.outputBuffer.getChannelData(0);

                nibble.process();
            },
            process: function () {

                this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

                this.analyser.getByteTimeDomainData(this.freqBin);

                for (i = 0; i < outBuffer.length; i += 1) {

                    this.ctx.fillRect(i, this.freqBin[i], 1, 1);

                    this.frame();
                }

                if (this.osc1Phase >= Math.TAU) {
                    this.osc1Phase -= Math.TAU;
                }

                if (this.osc2Phase >= Math.TAU) {
                    this.osc2Phase -= Math.TAU;
                }
            },
            frame: function () {

                t += this.thetaIncrement();

                var _ft1 = this.bitShift(this.ft1(t));

                this.osc1Phase += this.phaseIncrement(this.osc1Freq);

                if (this.osc1Theta) {
                    this.osc1Phase += this.thetaIncrement();
                }

                var _osc1 = 0.5 * this.oscSine(this.osc1Phase, this.osc1Mod, _ft1);

                this.osc2Phase += this.phaseIncrement(this.osc2Freq);

                if (this.osc2Theta) {
                    this.osc2Phase += this.thetaIncrement();
                }

                var _osc2 = 0.5 * this.oscSine(this.osc2Phase, this.osc2Mod, _osc1);

                outBuffer[i] = 0.5 * ((this.scriptGain * _ft1) + (this.osc1Gain * _osc1) + (this.osc2Gain * _osc2));
            },
            init: function () {
                this.compressor.threshold.value = -6.0;
                this.compressor.knee.value = 12.0;
                this.compressor.ratio.value = 12.0;
                this.compressor.attack.value = 0.1;
                this.mainOutput.gain.value = 0.5;
                this.delayInput.gain.value = 1.0;
                this.delayFeedback.gain.value = 0.0;
                this.delayWet.gain.value = 0.0;
                this.scriptProcessor.connect(this.delayInput);
                this.delayInput.connect(this.delayNode);
                this.delayNode.connect(this.delayFilter);
                this.delayFilter.connect(this.delayFeedback);
                this.delayFeedback.connect(this.delayNode);
                this.delayFeedback.connect(this.delayWet);
                this.delayWet.connect(this.compressor);
                this.scriptProcessor.connect(this.compressor);
                this.compressor.connect(this.mainOutput);
                this.freqBin = new Uint8Array(this.analyser.frequencyBinCount);
                this.ctx.canvas.width = this.viewport.clientWidth;
                this.ctx.canvas.height = this.viewport.clientHeight;
                this.ctx.fillStyle = "#fff";

                $('.ft1').keyup(function () {

                    var v = $(this).val()
                        .replace(/abs|exp|round|sqrt|sin|cos|tan|floor|ceil|log|PI|E/g, function (str) {
                            return "Math." + str;
                        });
                    try {
                        eval(v);
                        var e = "nibble.ft1 = function(t) { return " + v + "; };";
                        eval(e);
                    } catch (e) {}

                });

                $('#ft1Play').click(function () {
                    nibble.mainOutput.connect(nibble.analyser);
                    nibble.analyser.connect(context.destination);
                    nibble.mainOutput.gain.value = lastGain;
                });

                $('#ft1Pause').click(function () {
                    lastGain = nibble.mainOutput.gain.value;
                    nibble.mainOutput.gain.value = 0;
                    nibble.analyser.disconnect();
                    nibble.mainOutput.disconnect();
                });

                this.scriptProcessor.onaudioprocess = this.returnProcess;
            },
            initGui: function () {

                var gui = new xgui({
                    width: 890,
                    height: 175
                });

                document.getElementById('xgui').appendChild(gui.getDomElement());

                var scriptGainGui = new gui.Knob({
                    x: 5,
                    y: 20,
                    radius: 25,
                    value: 0.5,
                    min: 0,
                    max: 1,
                    decimals: 2
                }).value.bind(this, "scriptGain");

                var scriptGainLabel = new gui.Label({
                    x: 0,
                    y: 0,
                    text: "Input Gain"
                });

                var bitRateGui = new gui.Knob({
                    x: 70,
                    y: 20,
                    radius: 25,
                    value: 8,
                    min: 1,
                    max: 16,
                    step: 1
                }).value.bind(this, "bitRate");

                var bitRateLabel = new gui.Label({
                    x: 70,
                    y: 0,
                    text: "Bit Rate"
                });

                var sampleRateGui = new gui.HSlider({
                    x: 140,
                    y: 25,
                    value: 8000.0,
                    width: 720,
                    height: 40,
                    min: 8000.0,
                    max: 5644800.0,
                }).value.bind(this, "targetSampleRate");

                var sampleRateLabel = new gui.Label({
                    x: 140,
                    y: 0,
                    text: "Sample Rate (Hz)"
                });

                var osc1GainGui = new gui.Knob({
                    x: 5,
                    y: 110,
                    value: 0,
                    radius: 25,
                    min: 0,
                    max: 1,
                    decimals: 2
                }).value.bind(this, "osc1Gain");

                var osc1GainLabel = new gui.Label({
                    x: 0,
                    y: 90,
                    text: "Osc 1 Gain"
                });

                var osc1ModGui = new gui.Knob({
                    x: 70,
                    y: 110,
                    radius: 25,
                    value: 0.0,
                    min: 0.0,
                    max: 1.0,
                    decimals: 3
                }).value.bind(this, "osc1Mod");

                var osc1ModLabel = new gui.Label({
                    x: 70,
                    y: 90,
                    text: "Osc 1 Mod"
                });

                var osc2GainGui = new gui.Knob({
                    x: 135,
                    y: 110,
                    radius: 25,
                    value: 0,
                    min: 0,
                    max: 1,
                    decimals: 2
                }).value.bind(this, "osc2Gain");

                var osc2GainLabel = new gui.Label({
                    x: 135,
                    y: 90,
                    text: "Osc 2 Gain"
                });

                var osc2ModGui = new gui.Knob({
                    x: 200,
                    y: 110,
                    radius: 25,
                    value: 0.0,
                    min: 0.0,
                    max: 1000.0,
                    decimals: 3
                }).value.bind(this, "osc2Mod");

                var osc2ModLabel = new gui.Label({
                    x: 200,
                    y: 90,
                    text: "Osc 2 Mod"
                });

                var oscFreqGui = new gui.TrackPad({
                    x: 265,
                    y: 110,
                    width: 270,
                    height: 50,
                    min: 0,
                    max: 440,
                    decimals: 2
                });

                oscFreqGui.value1.bind(this, "osc1Freq");
                oscFreqGui.value2.bind(this, "osc2Freq");

                var oscFreqLabel = new gui.Label({
                    x: 265,
                    y: 90,
                    text: "Osc 1 / 2 Freq"
                });

                var osc1ThetaGui = new gui.CheckBox({
                    x: 380,
                    y: 90,
                    text: " Osc 1 Theta",
                    selected: false
                }).value.bind(this, "osc1Theta");

                var osc2ThetaGui = new gui.CheckBox({
                    x: 460,
                    y: 90,
                    text: " Osc 2 Theta",
                    selected: false
                }).value.bind(this, "osc2Theta");

                var delayWetGui = new gui.Knob({
                    x: 550,
                    y: 110,
                    value: 0.0,
                    radius: 25,
                    min: 0.0,
                    max: 0.9,
                    step: 0.0001,
                    decimals: 4
                }).value.bind(this.delayWet.gain, "value");

                var delayWetLabel = new gui.Label({
                    x: 550,
                    y: 90,
                    text: "Delay Mix"
                });

                var delayFeedbackGui = new gui.Knob({
                    x: 615,
                    y: 110,
                    value: 0.0,
                    radius: 25,
                    min: 0.0,
                    max: 0.85,
                    step: 0.0001,
                    decimals: 4
                }).value.bind(this.delayFeedback.gain, "value");

                var delayFeedbackLabel = new gui.Label({
                    x: 615,
                    y: 90,
                    text: "Feedback"
                });

                var delayTimeGui = new gui.Knob({
                    x: 680,
                    y: 110,
                    value: 0.0,
                    radius: 25,
                    min: 0.0,
                    max: 0.01,
                    step: 0.0001,
                    decimals: 4
                }).value.bind(this.delayNode.delayTime, "value");

                var delayTimeLabel = new gui.Label({
                    x: 680,
                    y: 90,
                    text: "Delay Time"
                });

                var delayFilterGui = new gui.Knob({
                    x: 745,
                    y: 110,
                    value: 0.0,
                    radius: 25,
                    min: 0,
                    max: 22050,
                    decimals: 2
                }).value.bind(this.delayFilter.frequency, "value");

                var delayFilterLabel = new gui.Label({
                    x: 745,
                    y: 90,
                    text: "Delay Filter"
                });

                var mainOutGui = new gui.Knob({
                    x: 810,
                    y: 110,
                    value: 0.5,
                    radius: 25,
                    min: 0,
                    max: 1.0,
                    decimals: 2
                }).value.bind(this.mainOutput.gain, "value");

                var mainOutLabel = new gui.Label({
                    x: 810,
                    y: 90,
                    text: "Output Gain"
                });
            },
            initPopovers: function () {

                $('#abs').popover({
                    placement: 'bottom',
                    title: 'abs(x) | Absolute Value',
                    trigger: 'hover',
                    content: 'Returns the absolute value of x.'
                });
                $('#exp').popover({
                    placement: 'bottom',
                    title: 'exp(x) | Exponential',
                    trigger: 'hover',
                    content: 'Returns E^x, where x is the argument, and E is Euler\'s constant, the base of the natural logarithms.'
                });
                $('#round').popover({
                    placement: 'bottom',
                    title: 'round(x) | Round',
                    trigger: 'hover',
                    content: 'Returns the value of x rounded to the nearest integer.'
                });
                $('#sqrt').popover({
                    placement: 'bottom',
                    title: 'sqrt(x) | Square Root',
                    trigger: 'hover',
                    content: 'Returns the square root of x.'
                });
                $('#sin').popover({
                    placement: 'bottom',
                    title: 'sin(x) | Sine',
                    trigger: 'hover',
                    content: 'Returns the sine of x.'
                });
                $('#cos').popover({
                    placement: 'bottom',
                    title: 'cos(x) | Cosine',
                    trigger: 'hover',
                    content: 'Returns the cosine of x.'
                });
                $('#tan').popover({
                    placement: 'bottom',
                    title: 'tan(x) | Tangent',
                    trigger: 'hover',
                    content: 'Returns the tangent of x.'
                });
                $('#floor').popover({
                    placement: 'bottom',
                    title: 'floor(x) | Floor',
                    trigger: 'hover',
                    content: 'Returns the the largest integer, less than or equal to x.'
                });
                $('#ceil').popover({
                    placement: 'bottom',
                    title: 'ceil(x) | Ceiling',
                    trigger: 'hover',
                    content: 'Returns the smallest integer, greater than or equal to x.'
                });
                $('#log').popover({
                    placement: 'bottom',
                    title: 'log(x) | Natural Logarithm',
                    trigger: 'hover',
                    content: 'Returns the natural logarithm (base E) of x.'
                });
                $('#PI').popover({
                    placement: 'bottom',
                    title: 'PI | Pi',
                    trigger: 'hover',
                    content: 'Returns the ratio of the circumference of a circle to its diameter (~3.14159).'
                });
                $('#E').popover({
                    placement: 'bottom',
                    title: 'E | Euler\'s Constant',
                    trigger: 'hover',
                    content: 'Returns the mathematical constant E, the base of natural logarithms, approximately 2.718.'
                });
                $('#lerp').popover({
                    placement: 'bottom',
                    title: 'lerp(x, v0, v1) | Linear Interpolation',
                    trigger: 'hover',
                    content: 'Returns an interpolation between two inputs (v0, v1) for a parameter (x) in the range [0, 1]'
                });
                $('#clamp').popover({
                    placement: 'bottom',
                    title: 'clamp(x, v0, v1) | Clamp',
                    trigger: 'hover',
                    content: 'Limit a value (x) to an interval (v0, v1)'
                });
                $('#normalize').popover({
                    placement: 'bottom',
                    title: 'normalize(x, v0, v1) | Normalize',
                    trigger: 'hover',
                    content: 'Normalizes a value (x) from a given range (v0, v1) into a value between -1.0 and 1.0'
                });
                $('#map').popover({
                    placement: 'bottom',
                    title: 'map(x, v0, v1, vx0, vx1, clamp) | Map',
                    trigger: 'hover',
                    content: 'Re-maps a value (x) from one range (v0, v1) to another (vx0, vx1)'
                });
                $('#outBuffer').popover({
                    placement: 'bottom',
                    title: 'outBuffer[i] | Output Buffer',
                    trigger: 'hover',
                    content: 'Returns output sample data (frame) at index (i)'
                });
                $('#gradient').popover({
                    placement: 'bottom',
                    title: 'gradient | Compute Gradients (1D-4D)',
                    trigger: 'hover',
                    html: true,
                    content: 'gradient1d(hash, x)<br /> gradient2d(hash, x, y)<br /> gradient3d(hash, x, y, z)<br /> gradient4d(hash, x, y, z, t)'
                });
                $('#simplexNoise').popover({
                    placement: 'bottom',
                    title: 'simplexNoise | Simplex Noise (1D-4D)',
                    trigger: 'hover',
                    html: true,
                    content: 'simplexNoise1d(x)<br /> simplexNoise2d(x, y)<br /> simplexNoise3d(x, y, z)<br /> simplexNoise4d(x, y, z, w)'
                });
                $('#signedNoise').popover({
                    placement: 'bottom',
                    title: 'signedNoise | Signed Noise (1D-4D)',
                    trigger: 'hover',
                    html: true,
                    content: 'signedNoise1d(x)<br /> signedNoise2d(x, y)<br /> signedNoise3d(x, y, z)<br /> signedNoise4d(x, y, z, w)'
                });
                $('#nibble').popover({
                    placement: 'right',
                    trigger: 'hover',
                    html: true,
                    content: '<img src="img/empty.jpg" width="40" height="44" />'
                });
            }
        });

        nibble.init();
        nibble.initGui();
        nibble.initPopovers();

        function int(value) {
            return value | 0;
        }

        function floor32(x) {
            return ((x) > 0) ? (int(x)) : ((int(x)) - 1);
        }

        function gradient1d(hash, x) {
            var h = int(hash & 15);
            var grad = 1.0 + (h & 7); /* Gradient value 1.0, 2.0, ..., 8.0 */
            if (h & 8) {
                grad = -grad;
            } /* Set a random sign for the gradient */
            return (grad * x); /* Multiply the gradient with the distance */
        }

        function gradient2d(hash, x, y) {
            var h = int(hash & 7); /* Convert low 3 bits of hash code */
            var u = h < 4 ? x : y; /* into 8 simple gradient directions, */
            var v = h < 4 ? y : x; /* and compute the dot product with (x,y). */
            return ((h & 1) ? -u : u) + ((h & 2) ? -2.0 * v : 2.0 * v);
        }

        function gradient3d(hash, x, y, z) {
            var h = int(hash & 15); /* Convert low 4 bits of hash code into 12 simple */
            var u = h < 8 ? x : y; /* gradient directions, and compute dot product. */
            var v = h < 4 ? y : h === 12 || h === 14 ? x : z;
            return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
        }

        function gradient4d(hash, x, y, z, t) {
            var h = int(hash & 31); /* Convert low 5 bits of hash code into 32 simple */
            var u = h < 24 ? x : y; /* gradient directions, and compute dot product. */
            var v = h < 16 ? y : z;
            var w = h < 8 ? z : t;
            return ((h & 1) ? -u : u) + ((h & 2) ? -v : v) + ((h & 4) ? -w : w);
        }


        var permutation = [
            151, 160, 137, 91, 90, 15,
                131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23,
                    190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33,
                    88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166,
                    77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244,
                    102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196,
                    135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123,
                5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42,
                    223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
                    129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228,
                    251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107,
                    49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254,
                    138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180,
                    151, 160, 137, 91, 90, 15,
                131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23,
                    190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33,
                    88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166,
                    77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244,
                    102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196,
                    135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123,
                5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42,
                    223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
                    129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228,
                    251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107,
                    49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254,
                    138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180
            ];

        var simplexLookup = [
            [0, 1, 2, 3],
            [0, 1, 3, 2],
            [0, 0, 0, 0],
            [0, 2, 3, 1],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [1, 2, 3, 0],
            [0, 2, 1, 3],
            [0, 0, 0, 0],
            [0, 3, 1, 2],
            [0, 3, 2, 1],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [1, 3, 2, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [1, 2, 0, 3],
            [0, 0, 0, 0],
            [1, 3, 0, 2],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [2, 3, 0, 1],
            [2, 3, 1, 0],
            [1, 0, 2, 3],
            [1, 0, 3, 2],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [2, 0, 3, 1],
            [0, 0, 0, 0],
            [2, 1, 3, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [2, 0, 1, 3],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [3, 0, 1, 2],
            [3, 0, 2, 1],
            [0, 0, 0, 0],
            [3, 1, 2, 0],
            [2, 1, 0, 3],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [3, 1, 0, 2],
            [0, 0, 0, 0],
            [3, 2, 0, 1],
            [3, 2, 1, 0]
        ];

        function lerp(x, v0, v1) {
            return v0 + (v1 - v0) * x;
        }

        function clamp(x, v0, v1) {
            return x < v0 ? v0 : x > v1 ? v1 : x;
        }

        function normalize(x, v0, v1) {
            return clamp((x - v0) / (v1 - v0), -1.0, 1.0);
        }

        function map(x, v0, v1, vx0, vx1, clamp) {
            if (Math.abs(v0 - v1) < 1e-15) {
                return vx0;
            } else {
                var _x = ((x - v0) / (v1 - v0) * (vx1 - vx0) + vx0);
                if (clamp) {
                    if (vx1 < vx0) {
                        if (_x < vx1) {
                            _x = vx1;
                        } else if (_x > vx0) {
                            _x = vx0;
                        }
                    } else {
                        if (_x > vx1) {
                            _x = vx1;
                        } else if (_x < vx0) {
                            _x = vx0;
                        }
                    }
                }
                return _x;
            }
        }

        function signedNoise1d(x) {
            var i0 = floor32(x);
            var i1 = i0 + 1;
            var x0 = x - i0;
            var x1 = x0 - 1.0;
            var t1 = 1.0 - x1 * x1;
            t1 *= t1;
            var t0 = 1.0 - x0 * x0;
            t0 *= t0;

            var n0 = t0 * t0 * gradient1d(permutation[i0 & 0xff], x0);
            var n1 = t1 * t1 * gradient1d(permutation[i1 & 0xff], x1);

            /* The maximum value of this noise is 8*(3/4)^4 = 2.53125 */
            /* A factor of 0.395 would scale to fit exactly within [-1,1], but */
            /* we want to match PRMan's 1D noise, so we scale it down some more. */
            return 0.25 * (n0 + n1);
        }

        function signedNoise2d(x, y) {
            var F2 = 0.366025403;
            var G2 = 0.211324865;

            var n0, n1, n2; /* Noise contributions from the three corners */

            /* Skew the input space to determine which simplexLookup cell we're in */
            var s = (x + y) * F2; /* Hairy factor for 2D */
            var xs = x + s;
            var ys = y + s;
            var i = floor32(xs);
            var j = floor32(ys);

            var t = (i + j) * G2;
            var X0 = i - t; /* Unskew the cell origin back to (x,y) space */
            var Y0 = j - t;
            var x0 = x - X0; /* The x,y distances from the cell origin */
            var y0 = y - Y0;

            var x1, y1, x2, y2;
            var ii, jj;
            var t0, t1, t2;

            var i1, j1; /* Offsets for second (middle) corner of simplexLookup in (i,j) coords */
            if (x0 > y0) {
                i1 = 1;
                j1 = 0;
            } /* lower triangle, XY order: (0,0)->(1,0)->(1,1) */
            else {
                i1 = 0;
                j1 = 1;
            } /* upper triangle, YX order: (0,0)->(0,1)->(1,1) */

            /* Offsets for middle corner in (x,y) unskewed coords */
            x1 = x0 - i1 + G2;
            y1 = y0 - j1 + G2;

            /* Offsets for last corner in (x,y) unskewed coords */
            x2 = x0 - 1.0 + 2.0 * G2;
            y2 = y0 - 1.0 + 2.0 * G2;

            /* Wrap the integer indices at 256, to avoid indexing permutation[] out of bounds */
            ii = i % 256;
            jj = j % 256;

            /* Calculate the contribution from the three corners */
            t0 = 0.5 - x0 * x0 - y0 * y0;
            if (t0 < 0.0) {
                n0 = 0.0;
            } else {
                t0 *= t0;
                n0 = t0 * t0 * gradient2d(permutation[ii + permutation[jj]], x0, y0);
            }

            t1 = 0.5 - x1 * x1 - y1 * y1;
            if (t1 < 0.0) {
                n1 = 0.0;
            } else {
                t1 *= t1;
                n1 = t1 * t1 * gradient2d(permutation[ii + i1 + permutation[jj + j1]], x1, y1);
            }

            t2 = 0.5 - x2 * x2 - y2 * y2;
            if (t2 < 0.0) {
                n2 = 0.0;
            } else {
                t2 *= t2;
                n2 = t2 * t2 * gradient2d(permutation[ii + 1 + permutation[jj + 1]], x2, y2);
            }

            /* Add contributions from each corner to get the final noise value. */
            /* The result is scaled to return values in the interval [-1,1]. */
            return 40.0 * (n0 + n1 + n2); /* TODO: The scale factor is preliminary! */
        }

        function signedNoise3d(x, y, z) {
            /* Simple skewing factors for the 3D case */
            var F3 = 0.333333333;
            var G3 = 0.166666667;

            var n0, n1, n2, n3; /* Noise contributions from the four corners */

            /* Skew the input space to determine which simplexLookup cell we're in */
            var s = (x + y + z) * F3; /* Very nice and simple skew factor for 3D */
            var xs = x + s;
            var ys = y + s;
            var zs = z + s;
            var i = floor32(xs);
            var j = floor32(ys);
            var k = floor32(zs);

            var t = (i + j + k) * G3;
            var X0 = i - t; /* Unskew the cell origin back to (x,y,z) space */
            var Y0 = j - t;
            var Z0 = k - t;
            var x0 = x - X0; /* The x,y,z distances from the cell origin */
            var y0 = y - Y0;
            var z0 = z - Z0;

            var x1, y1, z1, x2, y2, z2, x3, y3, z3;
            var ii, jj, kk;
            var t0, t1, t2, t3;

            /* For the 3D case, the simplexLookup shape is a slightly irregular tetrahedron. */
            /* Determine which simplexLookup we are in. */
            var i1, j1, k1; /* Offsets for second corner of simplexLookup in (i,j,k) coords */
            var i2, j2, k2; /* Offsets for third corner of simplexLookup in (i,j,k) coords */

            /* This code would benefit from a backport from the GLSL version! */
            if (x0 >= y0) {
                if (y0 >= z0) {
                    i1 = 1;
                    j1 = 0;
                    k1 = 0;
                    i2 = 1;
                    j2 = 1;
                    k2 = 0;
                } /* X Y Z order */
                else if (x0 >= z0) {
                    i1 = 1;
                    j1 = 0;
                    k1 = 0;
                    i2 = 1;
                    j2 = 0;
                    k2 = 1;
                } /* X Z Y order */
                else {
                    i1 = 0;
                    j1 = 0;
                    k1 = 1;
                    i2 = 1;
                    j2 = 0;
                    k2 = 1;
                } /* Z X Y order */
            } else { /* x0<y0 */
                if (y0 < z0) {
                    i1 = 0;
                    j1 = 0;
                    k1 = 1;
                    i2 = 0;
                    j2 = 1;
                    k2 = 1;
                } /* Z Y X order */
                else if (x0 < z0) {
                    i1 = 0;
                    j1 = 1;
                    k1 = 0;
                    i2 = 0;
                    j2 = 1;
                    k2 = 1;
                } /* Y Z X order */
                else {
                    i1 = 0;
                    j1 = 1;
                    k1 = 0;
                    i2 = 1;
                    j2 = 1;
                    k2 = 0;
                } /* Y X Z order */
            }

            x1 = x0 - i1 + G3; /* Offsets for second corner in (x,y,z) coords */
            y1 = y0 - j1 + G3;
            z1 = z0 - k1 + G3;
            x2 = x0 - i2 + 2.0 * G3; /* Offsets for third corner in (x,y,z) coords */
            y2 = y0 - j2 + 2.0 * G3;
            z2 = z0 - k2 + 2.0 * G3;
            x3 = x0 - 1.0 + 3.0 * G3; /* Offsets for last corner in (x,y,z) coords */
            y3 = y0 - 1.0 + 3.0 * G3;
            z3 = z0 - 1.0 + 3.0 * G3;

            /* Wrap the integer indices at 256, to avoid indexing permutation[] out of bounds */
            ii = i % 256;
            jj = j % 256;
            kk = k % 256;

            /* Calculate the contribution from the four corners */
            t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
            if (t0 < 0.0) {
                n0 = 0.0;
            } else {
                t0 *= t0;
                n0 = t0 * t0 * gradient3d(permutation[ii + permutation[jj + permutation[kk]]], x0, y0, z0);
            }

            t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
            if (t1 < 0.0) {
                n1 = 0.0;
            } else {
                t1 *= t1;
                n1 = t1 * t1 * gradient3d(permutation[ii + i1 + permutation[jj + j1 + permutation[kk + k1]]], x1, y1, z1);
            }

            t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
            if (t2 < 0.0) {
                n2 = 0.0;
            } else {
                t2 *= t2;
                n2 = t2 * t2 * gradient3d(permutation[ii + i2 + permutation[jj + j2 + permutation[kk + k2]]], x2, y2, z2);
            }

            t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
            if (t3 < 0.0) {
                n3 = 0.0;
            } else {
                t3 *= t3;
                n3 = t3 * t3 * gradient3d(permutation[ii + 1 + permutation[jj + 1 + permutation[kk + 1]]], x3, y3, z3);
            }

            /* Add contributions from each corner to get the final noise value. */
            /* The result is scaled to stay just inside [-1,1] */
            return 32.0 * (n0 + n1 + n2 + n3); /* TODO: The scale factor is preliminary! */
        }

        function signedNoise4d(x, y, z, w) {
            /* The skewing and unskewing factors are hairy again for the 4D case */
            var F4 = 0.309016994; /* F4 = (Math.sqrt(5.0)-1.0)/4.0 */
            var G4 = 0.138196601; /* G4 = (5.0-Math.sqrt(5.0))/20.0 */

            var n0, n1, n2, n3, n4; /* Noise contributions from the five corners */

            /* Skew the (x,y,z,w) space to determine which cell of 24 simplices we're in */
            var s = (x + y + z + w) * F4; /* Factor for 4D skewing */
            var xs = x + s;
            var ys = y + s;
            var zs = z + s;
            var ws = w + s;
            var i = floor32(xs);
            var j = floor32(ys);
            var k = floor32(zs);
            var l = floor32(ws);

            var t = (i + j + k + l) * G4; /* Factor for 4D unskewing */
            var X0 = i - t; /* Unskew the cell origin back to (x,y,z,w) space */
            var Y0 = j - t;
            var Z0 = k - t;
            var W0 = l - t;

            var x0 = x - X0; /* The x,y,z,w distances from the cell origin */
            var y0 = y - Y0;
            var z0 = z - Z0;
            var w0 = w - W0;

            /* For the 4D case, the simplexLookup is a 4D shape I won't even try to describe. */
            /* To find out which of the 24 possible simplices we're in, we need to */
            /* determine the magnitude ordering of x0, y0, z0 and w0. */
            /* The method below is a good way of finding the ordering of x,y,z,w and */
            /* then find the correct traversal order for the simplexLookup we're in. */
            /* First, six pair-wise comparisons are performed between each possible pair */
            /* of the four coordinates, and the results are used to add up binary bits */
            /* for an integer index. */
            var c1 = int((x0 > y0) ? 32 : 0);
            var c2 = int((x0 > z0) ? 16 : 0);
            var c3 = int((y0 > z0) ? 8 : 0);
            var c4 = int((x0 > w0) ? 4 : 0);
            var c5 = int((y0 > w0) ? 2 : 0);
            var c6 = int((z0 > w0) ? 1 : 0);
            var c = c1 + c2 + c3 + c4 + c5 + c6;

            var i1, j1, k1, l1; /* The integer offsets for the second simplexLookup corner */
            var i2, j2, k2, l2; /* The integer offsets for the third simplexLookup corner */
            var i3, j3, k3, l3; /* The integer offsets for the fourth simplexLookup corner */

            var x1, y1, z1, w1, x2, y2, z2, w2, x3, y3, z3, w3, x4, y4, z4, w4;
            var ii, jj, kk, ll;
            var t0, t1, t2, t3, t4;

            /* simplexLookup[c] is a 4-vector with the numbers 0, 1, 2 and 3 in some order. */
            /* Many values of c will never occur, since e.g. x>y>z>w makes x<z, y<w and x<w */
            /* impossible. Only the 24 indices which have non-zero entries make any sense. */
            /* The number 3 in the "simplexLookup" array is at the position of the largest coordinate. */
            i1 = simplexLookup[c][0] >= 3 ? 1 : 0;
            j1 = simplexLookup[c][1] >= 3 ? 1 : 0;
            k1 = simplexLookup[c][2] >= 3 ? 1 : 0;
            l1 = simplexLookup[c][3] >= 3 ? 1 : 0;
            /* The number 2 in the "simplexLookup" array is at the second largest coordinate. */
            i2 = simplexLookup[c][0] >= 2 ? 1 : 0;
            j2 = simplexLookup[c][1] >= 2 ? 1 : 0;
            k2 = simplexLookup[c][2] >= 2 ? 1 : 0;
            l2 = simplexLookup[c][3] >= 2 ? 1 : 0;
            /* The number 1 in the "simplexLookup" array is at the second smallest coordinate. */
            i3 = simplexLookup[c][0] >= 1 ? 1 : 0;
            j3 = simplexLookup[c][1] >= 1 ? 1 : 0;
            k3 = simplexLookup[c][2] >= 1 ? 1 : 0;
            l3 = simplexLookup[c][3] >= 1 ? 1 : 0;
            /* The fifth corner has all coordinate offsets = 1, so no need to look that up. */

            x1 = x0 - i1 + G4; /* Offsets for second corner in (x,y,z,w) coords */
            y1 = y0 - j1 + G4;
            z1 = z0 - k1 + G4;
            w1 = w0 - l1 + G4;
            x2 = x0 - i2 + 2.0 * G4; /* Offsets for third corner in (x,y,z,w) coords */
            y2 = y0 - j2 + 2.0 * G4;
            z2 = z0 - k2 + 2.0 * G4;
            w2 = w0 - l2 + 2.0 * G4;
            x3 = x0 - i3 + 3.0 * G4; /* Offsets for fourth corner in (x,y,z,w) coords */
            y3 = y0 - j3 + 3.0 * G4;
            z3 = z0 - k3 + 3.0 * G4;
            w3 = w0 - l3 + 3.0 * G4;
            x4 = x0 - 1.0 + 4.0 * G4; /* Offsets for last corner in (x,y,z,w) coords */
            y4 = y0 - 1.0 + 4.0 * G4;
            z4 = z0 - 1.0 + 4.0 * G4;
            w4 = w0 - 1.0 + 4.0 * G4;

            /* Wrap the integer indices at 256, to avoid indexing permutation[] out of bounds */
            ii = i % 256;
            jj = j % 256;
            kk = k % 256;
            ll = l % 256;

            /* Calculate the contribution from the five corners */
            t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0 - w0 * w0;
            if (t0 < 0.0) {
                n0 = 0.0;
            } else {
                t0 *= t0;
                n0 = t0 * t0 * gradient4d(permutation[ii + permutation[jj + permutation[kk + permutation[ll]]]], x0, y0, z0, w0);
            }

            t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1 - w1 * w1;
            if (t1 < 0.0) {
                n1 = 0.0;
            } else {
                t1 *= t1;
                n1 = t1 * t1 * gradient4d(permutation[ii + i1 + permutation[jj + j1 + permutation[kk + k1 + permutation[ll + l1]]]], x1, y1, z1, w1);
            }

            t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2 - w2 * w2;
            if (t2 < 0.0) {
                n2 = 0.0;
            } else {
                t2 *= t2;
                n2 = t2 * t2 * gradient4d(permutation[ii + i2 + permutation[jj + j2 + permutation[kk + k2 + permutation[ll + l2]]]], x2, y2, z2, w2);
            }

            t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3 - w3 * w3;
            if (t3 < 0.0) {
                n3 = 0.0;
            } else {
                t3 *= t3;
                n3 = t3 * t3 * gradient4d(permutation[ii + i3 + permutation[jj + j3 + permutation[kk + k3 + permutation[ll + l3]]]], x3, y3, z3, w3);
            }

            t4 = 0.6 - x4 * x4 - y4 * y4 - z4 * z4 - w4 * w4;
            if (t4 < 0.0) {
                n4 = 0.0;
            } else {
                t4 *= t4;
                n4 = t4 * t4 * gradient4d(permutation[ii + 1 + permutation[jj + 1 + permutation[kk + 1 + permutation[ll + 1]]]], x4, y4, z4, w4);
            }

            /* Sum up and scale the result to cover the range [-1,1] */
            return 27.0 * (n0 + n1 + n2 + n3 + n4); /* TODO: The scale factor is preliminary! */
        }

        function simplexNoise1d(x) {
            return signedNoise1d(x) * 0.5 + 0.5;
        }

        function simplexNoise2d(x, y) {
            return signedNoise2d(x, y) * 0.5 + 0.5;
        }

        function simplexNoise3d(x, y, z) {
            return signedNoise3d(x, y, z) * 0.5 + 0.5;
        }

        function simplexNoise4d(x, y, z, w) {
            return signedNoise4d(x, y, z, w) * 0.5 + 0.5;
        }

    });
