/*jslint browser: true, bitwise: true, newcap:true */
/*global  $, AudioContext, webkitAudioContext, Uint8Array */
$(window)
    .load(function () {
    "use strict";
    var bufferSize = 2048,
        outputChannels = 2,
        bits = 16,
        mask = (1 << bits) - 1,
        div = 1 << (bits - 1),        
        defaultSampleRate = 44100,
        targetSampleRate = 192000,
        dx = targetSampleRate/defaultSampleRate,
        ft1 = function () { return ((t/16)/8)|(t<<1)&(t>>(t/128)); },
        lastGain=0.25,
        context,
        scriptProcessor,
        delayInput,
        delayWet,
        delayFilter,
        delayNode,
        delayFeedback,
        compressor,
        analyser,
        mainOutput,
        freqBinCount,
        analyserContext,
        leftBuffer,
        rightBuffer,
        t = 0,
        i = 0;
        
    function init() {
        if (typeof AudioContext === "function") {
            context = new AudioContext();
        } else if (typeof webkitAudioContext === "function") {
            context = new webkitAudioContext();
        } else {
            $('#audioError').modal({show:'true', backdrop:'static', keyboard:'false'});
        }
        scriptProcessor = context.createScriptProcessor(bufferSize, 0, outputChannels);
        delayInput = context.createGainNode();
        delayWet = context.createGainNode();
        delayFilter = context.createBiquadFilter();
        delayNode = context.createDelayNode();
        delayFeedback = context.createGainNode();
        mainOutput = context.createGainNode();
        analyser = context.createAnalyser();
        compressor = context.createDynamicsCompressor();
        analyser.smoothingTimeConstant = 0;
        analyser.fftSize = bufferSize;
        mainOutput.gain.value = 0.0;
        delayNode.delayTime.setValueAtTime(0, 0);
        delayInput.gain.value = 1.0;
        delayFeedback.gain.value = 0.5;
        delayWet.gain.value = 0.0;
        delayFilter.frequency.value = 20000;
        scriptProcessor.connect(delayInput);
        delayInput.connect(delayNode);
        delayNode.connect(delayFilter);
        delayFilter.connect(delayFeedback);
        delayFeedback.connect(delayNode);
        delayFeedback.connect(delayWet);
        delayWet.connect(compressor);
        scriptProcessor.connect(compressor);
        compressor.connect(mainOutput);
        analyserContext = $("#wave").get()[0].getContext("2d");
        analyserContext.fillStyle = "#ffffff";
        freqBinCount = new Uint8Array(analyser.frequencyBinCount);          
    }
    
    init();
    
    /*=======================================================+~
     : Script Input Process Window
    ~+=======================================================*/
    scriptProcessor.onaudioprocess = function (e) {
        analyser.getByteTimeDomainData(freqBinCount);
        leftBuffer  = e.outputBuffer.getChannelData(0);
        rightBuffer = e.outputBuffer.getChannelData(1);        
        analyserContext.clearRect(0, 0, 512, 256);
        for (i=0; i<bufferSize; i+=1) {
            leftBuffer[i] = rightBuffer[i] = (mask & ft1(t))/div;
            analyserContext.fillRect(i, freqBinCount[i], 1, 1);
            t += dx;
        }
    }
    
    /*=======================================================+~
     : Eval fT1 Input
    ~+=======================================================*/
    $('.ft1').keyup(function () {
        var v = $(this).val()
            .replace(/abs|exp|round|sqrt|sin|cos|tan|floor|ceil|log|PI|E/g,

        function (str) {
            return "Math." + str;
        });
        try {
            eval(v);
            var e = "ft1 = function(t){ return " + v + "; };";
            eval(e);
        } catch (e) {}
    });
    
    /*=======================================================+~
     : Play
    ~+=======================================================*/
    $('#ft1Play').click(function () {
        mainOutput.connect(analyser);
        analyser.connect(context.destination);
        mainOutput.gain.value = lastGain;
    });    
    
    /*=======================================================+~
     : Pause
    ~+=======================================================*/
    $('#ft1Pause').click(function () {
        lastGain = mainOutput.gain.value;
        mainOutput.gain.value = 0;
        analyser.disconnect();
        mainOutput.disconnect();
    });
        
    /*=======================================================+~
     : Update Bitrate
    ~+=======================================================*/
    $('#updateBitrate').change(function () {
        bits = $(this).val();            
        mask = (1 << bits) - 1;
        div = 1 << (bits - 1);
    });

    /*=======================================================+~
     : Update Target Sample Rate
    ~+=======================================================*/
    $('#updateSampleRate').change(function() {
        targetSampleRate = $(this).val();
        dx = targetSampleRate/defaultSampleRate;
    });
    
    /*=======================================================+~
     : Gain
    ~+=======================================================*/
    $("#mainOutput").dial({
        min: 0,
        max: 50,
        width: 80,
        height: 80,
        fgColor: "#eee",
        bgColor: "#333",
        noScroll: true,
        change: function (e) {
            mainOutput.gain.value = (e/100).toFixed(2);
        }
    });
    
    /*=======================================================+~
     : Delay
    ~+=======================================================*/
    $("#delayFeedback").dial({
        min: 0,
        max: 91,
        width: 80,
        height: 80,
        fgColor: "#eee",
        bgColor: "#333",
        noScroll: true,       
        change: function(e){
            delayFeedback.gain.value = (e/100).toFixed(2);
        }
    });    
    $("#delayTime").dial({
        min: 0,
        max: bufferSize,
        width: 80,
        height: 80,
        fgColor: "#eee",
        bgColor: "#333",
        noScroll: true,
        change: function(e){
            delayNode.delayTime.linearRampToValueAtTime(e, i);
        }
    });    
    $("#delayFilter").dial({
        min: 0,
        max: 22050,
        width: 80,
        height: 80,
        fgColor: "#eee",
        bgColor: "#333",
        noScroll: true,
        change: function(e){
            delayFilter.frequency.value = e;
        }
    });    
    $("#delayWet").dial({
        min: 0,
        max: 100,
        width: 80,
        height: 80,
        fgColor: "#eee",
        bgColor: "#333",
        noScroll: true,
        change: function (e) {
            delayWet.gain.value = (e/100).toFixed(2);
        }
    });
    $('#abs').popover({
        placement:'bottom',
        title:'abs(x) | Absolute Value',
        trigger:'hover',
        content:'Returns the absolute value of x.'
    });
    $('#exp').popover({
        placement:'bottom',
        title:'exp(x) | Exponential',
        trigger:'hover',
        content:'Returns E^x, where x is the argument, and E is Euler\'s constant, the base of the natural logarithms.'
    });
    $('#round').popover({
        placement:'bottom',
        title:'round(x) | Round',
        trigger:'hover',
        content:'Returns the value of x rounded to the nearest integer. \n\
                 If the fractional part of x is greater than or equal to .5, \n\
                 the argument is rounded to the next higher integer. \n\
                 If the fractional part of x is less than .5, \n\
                 the argument is rounded to the next lower integer.'
    });
    $('#sqrt').popover({
        placement:'bottom',
        title:'sqrt(x) | Square Root',
        trigger:'hover',
        content:'Returns the square root of x.'
    });
    $('#sin').popover({
        placement:'bottom',
        title:'sin(x) | Sine',
        trigger:'hover',
        content:'Returns the sine of x.'
    });
    $('#cos').popover({
        placement:'bottom',
        title:'cos(x) | Cosine',
        trigger:'hover',
        content:'Returns the cosine of x.'
    });
    $('#tan').popover({
        placement:'bottom',
        title:'tan(x) | Tangent',
        trigger:'hover',
        content:'Returns the tangent of x.'
    });
    $('#floor').popover({
        placement:'bottom',
        title:'floor(x) | Floor',
        trigger:'hover',
        content:'Returns the the largest integer, less than or equal to x.'
    });
    $('#ceil').popover({
        placement:'bottom',
        title:'ceil(x) | Ceiling',
        trigger:'hover',
        content:'Returns the smallest integer, greater than or equal to x.'
    });
    $('#log').popover({
        placement:'bottom',
        title:'log(x) | Natural Logarithm',
        trigger:'hover',
        content:'Returns the natural logarithm (base E) of x.'
    });
    $('#PI').popover({
        placement:'bottom',
        title:'PI | Pi',
        trigger:'hover',
        content:'Returns the ratio of the circumference of a circle to its diameter (~3.14159).'
    });
    $('#E').popover({
        placement:'bottom',
        title:'E | Euler\'s Constant',
        trigger:'hover',
        content:'Returns the mathematical constant E, the base of natural logarithms, approximately 2.718.'
    });
    
});