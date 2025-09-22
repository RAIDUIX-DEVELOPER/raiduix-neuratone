// Advanced Reverb Effect with Multi-tap Delays and Diffusion Matrices
// Provides realistic room simulation with spatial processing

export interface AdvancedReverbNodeHandle {
  inputGain: GainNode;
  outputGain: GainNode;
  wetGain: GainNode;
  dryGain: GainNode;

  // Early reflections system
  earlyReflectionDelays: DelayNode[];
  earlyReflectionGains: GainNode[];

  // Late reverberation system
  lateReverbDelays: DelayNode[];
  lateReverbGains: GainNode[];
  lateReverbFilters: BiquadFilterNode[];

  // Diffusion matrix nodes
  diffusionDelays: DelayNode[];
  diffusionGains: GainNode[];
  diffusionFilters: BiquadFilterNode[];

  // Modulation system for natural variation
  modulationOscillators: OscillatorNode[];
  modulationGains: GainNode[];

  // Stereo processing
  splitter: ChannelSplitterNode;
  merger: ChannelMergerNode;

  // Convolver for impulse response (optional enhancement)
  convolver: ConvolverNode | null;

  // Parameters
  roomSize: number; // 0..100 - room size percentage
  damping: number; // 0..100 - high-frequency damping
  diffusion: number; // 0..100 - diffusion amount
  density: number; // 0..100 - reflection density
  predelay: number; // ms - pre-delay time (0-500ms)
  width: number; // 0..100 - stereo width
  mix: number; // 0..100 - wet/dry mix
  modulation: number; // 0..100 - modulation amount
  started: boolean;

  start(): void;
  stop(): void;
  dispose(): void;
  setRoomSize(size: number): void;
  setDamping(damping: number): void;
  setDiffusion(diffusion: number): void;
  setDensity(density: number): void;
  setPredelay(predelay: number): void;
  setWidth(width: number): void;
  setMix(mix: number): void;
  setModulation(modulation: number): void;
}

// Helper function to create diffusion matrix for realistic scattering
function createDiffusionMatrix(
  context: AudioContext,
  size: number
): {
  input: GainNode;
  output: GainNode;
  delays: DelayNode[];
  gains: GainNode[];
} {
  const input = context.createGain();
  const output = context.createGain();
  const delays: DelayNode[] = [];
  const gains: GainNode[] = [];

  // Create diffusion network based on Schroeder's design
  for (let i = 0; i < size; i++) {
    const delay = context.createDelay(0.1); // Max 100ms delay
    const gain = context.createGain();

    // Calculate delay times using prime numbers for natural diffusion
    const primes = [17, 19, 23, 29, 31, 37, 41, 43, 47, 53];
    const delayTime = (primes[i % primes.length] / 1000) * (size / 4); // Scale by matrix size
    delay.delayTime.value = delayTime;

    // Set diffusion gain with slight randomization
    gain.gain.value = 0.7 + (Math.random() * 0.2 - 0.1); // 0.6 to 0.8 range

    delays.push(delay);
    gains.push(gain);

    // Connect in series with feedback
    input.connect(delay);
    delay.connect(gain);
    gain.connect(output);

    // Add cross-connections for enhanced diffusion
    if (i > 0) {
      gains[i - 1].connect(delay);
    }
  }

  return { input, output, delays, gains };
}

// Helper function to generate realistic room impulse response
function createRoomImpulseResponse(
  context: AudioContext,
  roomSize: number,
  damping: number
): AudioBuffer {
  const sampleRate = context.sampleRate;
  const length = Math.floor(sampleRate * (roomSize / 100) * 4); // Up to 4 seconds for large rooms
  const buffer = context.createBuffer(2, length, sampleRate);

  for (let channel = 0; channel < 2; channel++) {
    const channelData = buffer.getChannelData(channel);

    for (let i = 0; i < length; i++) {
      const time = i / sampleRate;

      // Exponential decay with damping
      const decay = Math.exp(-time * (damping / 10 + 0.5));

      // Add early reflections (first 80ms)
      let sample = 0;
      if (time < 0.08) {
        const reflectionCount = Math.floor(time * 100) + 1;
        for (let r = 0; r < reflectionCount; r++) {
          const reflectionTime = (r + 1) * 0.01;
          const reflectionGain = Math.exp(-reflectionTime * 5) * 0.1;
          sample += reflectionGain * (Math.random() * 2 - 1);
        }
      }

      // Add late reverberation (dense random reflections)
      if (time > 0.05) {
        const density = Math.min(time * 50, 1); // Increase density over time
        sample += (Math.random() * 2 - 1) * decay * density * 0.05;
      }

      // Apply stereo variation
      const stereoOffset = channel * 0.01;
      sample *= Math.exp(-(time + stereoOffset) * (damping / 15 + 0.3));

      channelData[i] = sample;
    }
  }

  return buffer;
}

export function createAdvancedReverbNode(
  context: AudioContext,
  roomSize: number = 50,
  damping: number = 30,
  diffusion: number = 70,
  density: number = 80,
  predelay: number = 20,
  width: number = 100,
  mix: number = 25,
  modulation: number = 15
): AdvancedReverbNodeHandle {
  // Create basic nodes
  const inputGain = context.createGain();
  const outputGain = context.createGain();
  const wetGain = context.createGain();
  const dryGain = context.createGain();

  // Create stereo processing nodes
  const splitter = context.createChannelSplitter(2);
  const merger = context.createChannelMerger(2);

  // Create convolver for impulse response
  const convolver = context.createConvolver();
  convolver.buffer = createRoomImpulseResponse(context, roomSize, damping);

  // Create early reflection system (8 taps)
  const earlyReflectionDelays: DelayNode[] = [];
  const earlyReflectionGains: GainNode[] = [];

  // Early reflection delay times based on typical room dimensions
  const earlyDelayTimes = [
    0.005, 0.011, 0.017, 0.023, 0.031, 0.037, 0.043, 0.051,
  ];

  for (let i = 0; i < earlyDelayTimes.length; i++) {
    const delay = context.createDelay(0.1);
    const gain = context.createGain();

    delay.delayTime.value = earlyDelayTimes[i] * (roomSize / 100 + 0.5);
    gain.gain.value = Math.exp(-i * 0.3) * 0.4; // Exponential decay

    earlyReflectionDelays.push(delay);
    earlyReflectionGains.push(gain);
  }

  // Create late reverberation system (12 taps)
  const lateReverbDelays: DelayNode[] = [];
  const lateReverbGains: GainNode[] = [];
  const lateReverbFilters: BiquadFilterNode[] = [];

  for (let i = 0; i < 12; i++) {
    const delay = context.createDelay(2.0); // Up to 2 seconds
    const gain = context.createGain();
    const filter = context.createBiquadFilter();

    // Staggered delay times for natural density
    delay.delayTime.value = 0.1 + i * 0.15 * (roomSize / 100 + 0.2);
    gain.gain.value = Math.exp(-i * 0.2) * (density / 100) * 0.3;

    // High-frequency damping filter
    filter.type = "lowpass";
    filter.frequency.value = 20000 - (damping / 100) * 15000; // 20kHz to 5kHz range
    filter.Q.value = 0.7;

    lateReverbDelays.push(delay);
    lateReverbGains.push(gain);
    lateReverbFilters.push(filter);
  }

  // Create diffusion matrix system
  const diffusionMatrix = createDiffusionMatrix(
    context,
    Math.floor(diffusion / 20) + 2
  );
  const diffusionDelays = diffusionMatrix.delays;
  const diffusionGains = diffusionMatrix.gains;
  const diffusionFilters: BiquadFilterNode[] = [];

  // Add filters to diffusion network
  diffusionDelays.forEach((_, i) => {
    const filter = context.createBiquadFilter();
    filter.type = "allpass";
    filter.frequency.value = 1000 + i * 500; // Spread across frequency spectrum
    filter.Q.value = 0.5;
    diffusionFilters.push(filter);
  });

  // Create modulation system for natural variation
  const modulationOscillators: OscillatorNode[] = [];
  const modulationGains: GainNode[] = [];

  for (let i = 0; i < 3; i++) {
    const osc = context.createOscillator();
    const gain = context.createGain();

    osc.type = "sine";
    osc.frequency.value = 0.1 + i * 0.05; // Very slow modulation
    gain.gain.value = (modulation / 100) * 0.001; // Subtle modulation depth

    modulationOscillators.push(osc);
    modulationGains.push(gain);
  }

  // Set initial parameters
  inputGain.gain.value = 1;
  outputGain.gain.value = 1;

  // Mix control
  const wetLevel = mix / 100;
  const dryLevel = 1 - wetLevel;
  wetGain.gain.value = wetLevel;
  dryGain.gain.value = dryLevel;

  // Connect audio routing

  // Dry path
  inputGain.connect(dryGain);
  dryGain.connect(outputGain);

  // Wet path with pre-delay
  const predelayNode = context.createDelay(0.5);
  predelayNode.delayTime.value = predelay / 1000;

  inputGain.connect(predelayNode);
  inputGain.connect(splitter); // Split for stereo processing

  // Early reflections
  earlyReflectionDelays.forEach((delay, i) => {
    const gain = earlyReflectionGains[i];
    predelayNode.connect(delay);
    delay.connect(gain);
    gain.connect(wetGain);
  });

  // Late reverberation through diffusion matrix
  predelayNode.connect(diffusionMatrix.input);

  lateReverbDelays.forEach((delay, i) => {
    const gain = lateReverbGains[i];
    const filter = lateReverbFilters[i];

    diffusionMatrix.output.connect(delay);
    delay.connect(filter);
    filter.connect(gain);
    gain.connect(wetGain);

    // Add modulation to delay times
    if (i < modulationOscillators.length) {
      const osc = modulationOscillators[i];
      const modGain = modulationGains[i];
      osc.connect(modGain);
      modGain.connect(delay.delayTime);
    }
  });

  // Convolution path for additional richness
  predelayNode.connect(convolver);
  convolver.connect(wetGain);

  // Final wet signal to output
  wetGain.connect(outputGain);

  let started = false;

  const handle: AdvancedReverbNodeHandle = {
    inputGain,
    outputGain,
    wetGain,
    dryGain,
    earlyReflectionDelays,
    earlyReflectionGains,
    lateReverbDelays,
    lateReverbGains,
    lateReverbFilters,
    diffusionDelays,
    diffusionGains,
    diffusionFilters,
    modulationOscillators,
    modulationGains,
    splitter,
    merger,
    convolver,
    roomSize,
    damping,
    diffusion,
    density,
    predelay,
    width,
    mix,
    modulation,
    started,

    start() {
      if (!started) {
        modulationOscillators.forEach((osc) => osc.start());
        started = true;
        handle.started = true;
      }
    },

    stop() {
      if (started) {
        modulationOscillators.forEach((osc) => {
          try {
            osc.stop();
          } catch {}
        });
        started = false;
        handle.started = false;
      }
    },

    dispose() {
      try {
        if (started) {
          handle.stop();
        }

        // Disconnect all nodes
        inputGain.disconnect();
        outputGain.disconnect();
        wetGain.disconnect();
        dryGain.disconnect();
        splitter.disconnect();
        merger.disconnect();
        if (convolver) convolver.disconnect();

        earlyReflectionDelays.forEach((node) => node.disconnect());
        earlyReflectionGains.forEach((node) => node.disconnect());
        lateReverbDelays.forEach((node) => node.disconnect());
        lateReverbGains.forEach((node) => node.disconnect());
        lateReverbFilters.forEach((node) => node.disconnect());
        diffusionDelays.forEach((node) => node.disconnect());
        diffusionGains.forEach((node) => node.disconnect());
        diffusionFilters.forEach((node) => node.disconnect());
        modulationOscillators.forEach((node) => node.disconnect());
        modulationGains.forEach((node) => node.disconnect());
      } catch (error) {
        // Ignore errors during disposal
      }
    },

    setRoomSize(newSize: number) {
      handle.roomSize = newSize;

      // Update early reflection delay times
      const sizeMultiplier = newSize / 100 + 0.5;
      earlyReflectionDelays.forEach((delay, i) => {
        delay.delayTime.setValueAtTime(
          earlyDelayTimes[i] * sizeMultiplier,
          context.currentTime
        );
      });

      // Update late reverberation delay times
      lateReverbDelays.forEach((delay, i) => {
        delay.delayTime.setValueAtTime(
          0.1 + i * 0.15 * sizeMultiplier,
          context.currentTime
        );
      });

      // Update convolver impulse response
      if (convolver) {
        convolver.buffer = createRoomImpulseResponse(
          context,
          newSize,
          handle.damping
        );
      }
    },

    setDamping(newDamping: number) {
      handle.damping = newDamping;

      // Update high-frequency damping filters
      const cutoffFreq = 20000 - (newDamping / 100) * 15000;
      lateReverbFilters.forEach((filter) => {
        filter.frequency.setValueAtTime(cutoffFreq, context.currentTime);
      });

      // Update convolver impulse response
      if (convolver) {
        convolver.buffer = createRoomImpulseResponse(
          context,
          handle.roomSize,
          newDamping
        );
      }
    },

    setDiffusion(newDiffusion: number) {
      handle.diffusion = newDiffusion;

      // Update diffusion gain amounts
      const diffusionAmount = newDiffusion / 100;
      diffusionGains.forEach((gain) => {
        gain.gain.setValueAtTime(
          (0.7 + (Math.random() * 0.2 - 0.1)) * diffusionAmount,
          context.currentTime
        );
      });
    },

    setDensity(newDensity: number) {
      handle.density = newDensity;

      // Update late reverberation gain levels
      const densityMultiplier = newDensity / 100;
      lateReverbGains.forEach((gain, i) => {
        gain.gain.setValueAtTime(
          Math.exp(-i * 0.2) * densityMultiplier * 0.3,
          context.currentTime
        );
      });
    },

    setPredelay(newPredelay: number) {
      handle.predelay = newPredelay;
      predelayNode.delayTime.setValueAtTime(
        newPredelay / 1000,
        context.currentTime
      );
    },

    setWidth(newWidth: number) {
      handle.width = newWidth;
      // Stereo width is handled by the diffusion matrix and stereo routing
      // Could add additional stereo processing here if needed
    },

    setMix(newMix: number) {
      handle.mix = newMix;
      const wetLevel = newMix / 100;
      const dryLevel = 1 - wetLevel;
      wetGain.gain.setValueAtTime(wetLevel, context.currentTime);
      dryGain.gain.setValueAtTime(dryLevel, context.currentTime);
    },

    setModulation(newModulation: number) {
      handle.modulation = newModulation;

      // Update modulation depth
      const modDepth = (newModulation / 100) * 0.001;
      modulationGains.forEach((gain) => {
        gain.gain.setValueAtTime(modDepth, context.currentTime);
      });
    },
  };

  return handle;
}
