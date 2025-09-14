// AudioWorkletProcessor for white, pink, and brown noise
// Pink uses Paul Kellet's filter; Brown is integrated white with drift clamp.
class NoiseProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: "gain",
        defaultValue: 0.25,
        minValue: 0,
        maxValue: 1,
        automationRate: "k-rate",
      },
    ];
  }
  constructor() {
    super();
    this.type = "white";
    this.b0 = this.b1 = this.b2 = this.b3 = this.b4 = this.b5 = this.b6 = 0;
    this.brown = 0;
    this.port.onmessage = (e) => {
      if (e?.data?.type === "setType") {
        const next = String(e.data.value || "").toLowerCase();
        if (next === "white" || next === "pink" || next === "brown")
          this.type = next;
      }
    };
  }
  process(_inputs, outputs, parameters) {
    const output = outputs[0];
    const channel = output[0];
    const gainParam = parameters.gain;
    const frames = channel.length;
    for (let i = 0; i < frames; i++) {
      const g = gainParam.length > 1 ? gainParam[i] : gainParam[0];
      let sample = 0;
      const white = Math.random() * 2 - 1;
      if (this.type === "white") {
        sample = white;
      } else if (this.type === "pink") {
        this.b0 = 0.99886 * this.b0 + white * 0.0555179;
        this.b1 = 0.99332 * this.b1 + white * 0.0750759;
        this.b2 = 0.969 * this.b2 + white * 0.153852;
        this.b3 = 0.8665 * this.b3 + white * 0.3104856;
        this.b4 = 0.55 * this.b4 + white * 0.5329522;
        this.b5 = -0.7616 * this.b5 - white * 0.016898;
        const pink =
          this.b0 +
          this.b1 +
          this.b2 +
          this.b3 +
          this.b4 +
          this.b5 +
          this.b6 +
          white * 0.5362;
        this.b6 = white * 0.115926;
        sample = pink * 0.11;
      } else {
        this.brown = (this.brown + 0.02 * white) / 1.02;
        if (this.brown < -1) this.brown = -1;
        if (this.brown > 1) this.brown = 1;
        sample = this.brown * 3.5;
      }
      channel[i] = sample * g;
    }
    return true;
  }
}
registerProcessor("noise-processor", NoiseProcessor);
