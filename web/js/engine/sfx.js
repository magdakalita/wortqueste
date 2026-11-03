// Tiny synthesized sound effects (Web Audio) – no audio files needed.

const SOUNDS = {
  jump:   [[520, 0.08, "square", 0.05], [780, 0.06, "square", 0.04]],
  star:   [[988, 0.06, "square", 0.05], [1319, 0.1, "square", 0.05]],
  stomp:  [[220, 0.08, "triangle", 0.12], [140, 0.1, "triangle", 0.1]],
  hurt:   [[300, 0.1, "sawtooth", 0.06], [180, 0.18, "sawtooth", 0.06]],
  open:   [[440, 0.08, "triangle", 0.08], [660, 0.12, "triangle", 0.08]],
  unlock: [[523, 0.09, "triangle", 0.1], [659, 0.09, "triangle", 0.1], [784, 0.09, "triangle", 0.1], [1047, 0.2, "triangle", 0.1]],
  right:  [[659, 0.1, "sine", 0.15], [988, 0.2, "sine", 0.15]],
  wrong:  [[330, 0.12, "sine", 0.12], [262, 0.22, "sine", 0.12]],
  finish: [[523, 0.12, "square", 0.05], [659, 0.12, "square", 0.05], [784, 0.12, "square", 0.05], [1047, 0.12, "square", 0.05], [784, 0.12, "square", 0.05], [1047, 0.35, "square", 0.05]],
};

export class Sfx {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  play(name) {
    if (this.muted) return;
    const notes = SOUNDS[name];
    if (!notes) return;
    try {
      this.ctx ??= new AudioContext();
      let t = this.ctx.currentTime;
      for (const [freq, dur, type, vol] of notes) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(gain).connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + dur);
        t += dur * 0.9;
      }
    } catch {
      // Audio is optional.
    }
  }
}
