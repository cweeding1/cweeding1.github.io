// A small generative lofi engine built on the Web Audio API. Nothing is
// streamed: chords, bass, drums, a chiptune lead and vinyl crackle are all
// synthesized and scheduled in the browser.

export interface Track {
  title: string;
  bpm: number;
  // [bass root as MIDI note, chord intervals above root]
  chords: [number, number[]][];
}

const MAJ9 = [0, 4, 7, 11, 14];
const MIN9 = [0, 3, 7, 10, 14];
const DOM9 = [0, 4, 10, 14];
const MIN11 = [0, 3, 10, 14, 17];

export const TRACKS: Track[] = [
  { title: "Pixel Rain", bpm: 74, chords: [[40, MIN9], [45, DOM9], [38, MAJ9], [47, MIN9]] },
  { title: "Night Shift", bpm: 70, chords: [[41, MIN9], [37, MAJ9], [46, MIN11], [36, DOM9]] },
  { title: "Bonus Stage", bpm: 82, chords: [[41, MAJ9], [40, MIN9], [38, MIN9], [36, MAJ9]] },
  { title: "Continue?", bpm: 68, chords: [[45, MIN9], [41, MAJ9], [36, MAJ9], [43, DOM9]] },
];

const LOOKAHEAD = 1.2; // seconds scheduled ahead, so background-tab timer throttling doesn't cause gaps
const TICK_MS = 50;
const SWING = 0.16; // fraction of an 8th note the off-beats are pushed late

const midiToHz = (m: number) => 440 * 2 ** ((m - 69) / 12);
const rand = (a: number, b: number) => a + Math.random() * (b - a);

export class LofiEngine {
  readonly ctx: AudioContext;
  readonly analyser: AnalyserNode;
  private master: GainNode;
  private trackBus: GainNode | null = null;
  private wobble: GainNode;
  private noise: AudioBuffer;
  private timer: number | undefined;
  private step = 0;
  private nextTime = 0;
  private track: Track = TRACKS[0];

  constructor(volume: number) {
    this.ctx = new AudioContext();
    const ctx = this.ctx;

    this.master = ctx.createGain();
    this.master.gain.value = volume;

    // Dark, warm tone: roll off the highs and glue everything with a compressor.
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 3200;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 3;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 64;
    this.master.connect(tone).connect(comp).connect(this.analyser).connect(ctx.destination);

    // Slow pitch wobble, like a worn tape, applied to the keys.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.35;
    this.wobble = ctx.createGain();
    this.wobble.gain.value = 7; // cents
    lfo.connect(this.wobble);
    lfo.start();

    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    this.startCrackle();
  }

  setVolume(v: number) {
    this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }

  play(track: Track) {
    this.stopScheduler();
    const now = this.ctx.currentTime;
    if (this.trackBus) {
      const old = this.trackBus;
      old.gain.setTargetAtTime(0, now, 0.15);
      setTimeout(() => old.disconnect(), 1500);
    }
    this.trackBus = this.ctx.createGain();
    this.trackBus.connect(this.master);
    this.track = track;
    this.step = 0;
    this.nextTime = now + 0.1;
    this.timer = window.setInterval(() => this.schedule(), TICK_MS);
    this.schedule();
  }

  pause() {
    return this.ctx.suspend();
  }

  resume() {
    return this.ctx.resume();
  }

  private stopScheduler() {
    window.clearInterval(this.timer);
  }

  private schedule() {
    const eighth = 60 / this.track.bpm / 2;
    while (this.nextTime < this.ctx.currentTime + LOOKAHEAD) {
      const swing = this.step % 2 === 1 ? eighth * SWING : 0;
      this.playStep(this.step, this.nextTime + swing);
      this.nextTime += eighth;
      this.step++;
    }
  }

  private playStep(step: number, t: number) {
    const bus = this.trackBus!;
    const eighth = 60 / this.track.bpm / 2;
    const inBar = step % 8;
    const bar = Math.floor(step / 8);
    const [root, intervals] = this.track.chords[bar % this.track.chords.length];

    // Drums: boom-bap kick, laid-back snare, soft hats.
    if (inBar === 0 || inBar === 5 || (inBar === 7 && Math.random() < 0.3)) this.kick(bus, t);
    if (inBar === 2 || inBar === 6) this.snare(bus, t + 0.012);
    if (Math.random() < 0.92) this.hat(bus, t, inBar % 2 === 0 ? 0.09 : 0.05);

    // Keys on the downbeat, with a gentle restrike late in the bar.
    if (inBar === 0) this.chord(bus, t, root, intervals, eighth * 6, 1);
    if (inBar === 7 && Math.random() < 0.6) this.chord(bus, t, root, intervals, eighth * 1.5, 0.6);

    if (inBar === 0) this.bass(bus, t, root, eighth * 3.5);
    if (inBar === 4 && Math.random() < 0.7) this.bass(bus, t, root + (Math.random() < 0.5 ? 7 : 12), eighth * 2.5);

    // A sparse chiptune lead that rests every fourth bar.
    if (bar % 4 !== 3 && Math.random() < 0.3) {
      const pool = intervals.map((i) => root + 36 + i);
      const note = pool[Math.floor(Math.random() * pool.length)];
      this.lead(bus, t, note, eighth * (Math.random() < 0.5 ? 1 : 2));
    }
  }

  private envGain(dest: AudioNode, t: number, peak: number, attack: number, dur: number) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(dest);
    return g;
  }

  private kick(dest: AudioNode, t: number) {
    const o = this.ctx.createOscillator();
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    o.connect(this.envGain(dest, t, 0.8, 0.005, 0.38));
    o.start(t);
    o.stop(t + 0.4);
  }

  private noiseHit(dest: AudioNode, t: number, type: BiquadFilterType, freq: number, peak: number, dur: number) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    src.connect(f).connect(this.envGain(dest, t, peak, 0.003, dur));
    src.start(t, Math.random() * 1.5);
    src.stop(t + dur + 0.05);
  }

  private snare(dest: AudioNode, t: number) {
    this.noiseHit(dest, t, "bandpass", 1700, 0.35, 0.2);
    const o = this.ctx.createOscillator();
    o.type = "triangle";
    o.frequency.value = 190;
    o.connect(this.envGain(dest, t, 0.12, 0.003, 0.1));
    o.start(t);
    o.stop(t + 0.12);
  }

  private hat(dest: AudioNode, t: number, peak: number) {
    this.noiseHit(dest, t, "highpass", 7500, peak * rand(0.7, 1.1), 0.05);
  }

  private chord(dest: AudioNode, t: number, root: number, intervals: number[], dur: number, vel: number) {
    // Electric-piano-ish voice: sine plus a quiet detuned triangle, with a little strum.
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1900;
    filter.connect(dest);
    intervals.forEach((iv, n) => {
      const start = t + n * 0.012;
      const hz = midiToHz(root + 12 + iv);
      const g = this.envGain(filter, start, 0.07 * vel, 0.02, dur);
      for (const [type, detune, level] of [["sine", -4, 1], ["triangle", 5, 0.35]] as const) {
        const o = this.ctx.createOscillator();
        o.type = type;
        o.frequency.value = hz;
        o.detune.value = detune;
        this.wobble.connect(o.detune);
        o.onended = () => this.wobble.disconnect(o.detune);
        const lvl = this.ctx.createGain();
        lvl.gain.value = level;
        o.connect(lvl).connect(g);
        o.start(start);
        o.stop(start + dur + 0.05);
      }
    });
  }

  private bass(dest: AudioNode, t: number, note: number, dur: number) {
    const o = this.ctx.createOscillator();
    o.frequency.value = midiToHz(note);
    o.connect(this.envGain(dest, t, 0.32, 0.01, dur));
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private lead(dest: AudioNode, t: number, note: number, dur: number) {
    const o = this.ctx.createOscillator();
    o.type = "square";
    o.frequency.value = midiToHz(note);
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 1400;
    const g = this.envGain(f, t, 0.035, 0.01, dur);
    // Echo for a dreamier feel.
    const delay = this.ctx.createDelay();
    delay.delayTime.value = (60 / this.track.bpm) * 0.75;
    const fb = this.ctx.createGain();
    fb.gain.value = 0.35;
    f.connect(dest);
    f.connect(delay).connect(fb).connect(delay);
    fb.connect(dest);
    o.connect(g);
    o.start(t);
    o.stop(t + dur + 0.05);
    setTimeout(() => {
      f.disconnect();
      delay.disconnect();
      fb.disconnect();
    }, (t - this.ctx.currentTime + dur) * 1000 + 4000);
  }

  private startCrackle() {
    const ctx = this.ctx;
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * 0.04; // hiss
      if (Math.random() < 0.0006) d[i] = rand(-1, 1); // pops
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 2500;
    f.Q.value = 0.6;
    const g = ctx.createGain();
    g.gain.value = 0.35;
    src.connect(f).connect(g).connect(this.master);
    src.start();
  }
}
