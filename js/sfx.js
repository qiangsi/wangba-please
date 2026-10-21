'use strict';
// 音效引擎：全部 WebAudio 程序合成，无音频文件。
const SFX = {
  ac: null, out: null, muted: false, ambGain: null, sirenH: null,

  init() {
    if (this.ac) { if (this.ac.state === 'suspended') this.ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ac = new AC();
    this.out = this.ac.createGain();
    this.out.gain.value = 0.5;
    this.out.connect(this.ac.destination);
    // 环境底噪（网吧嗡嗡声）
    const buf = this.ac.createBuffer(1, this.ac.sampleRate * 2, this.ac.sampleRate);
    const d = buf.getChannelData(0);
    let v = 0;
    for (let i = 0; i < d.length; i++) { v = v * 0.98 + (Math.random() * 2 - 1) * 0.02; d[i] = v * 3; }
    const src = this.ac.createBufferSource();
    src.buffer = buf; src.loop = true;
    const lp = this.ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 320;
    this.ambGain = this.ac.createGain();
    this.ambGain.gain.value = 0;
    src.connect(lp); lp.connect(this.ambGain); this.ambGain.connect(this.out);
    src.start();
  },

  ambient(on) {
    this.init();
    if (!this.ambGain) return;
    this.ambGain.gain.linearRampToValueAtTime(on ? 0.5 : 0, this.ac.currentTime + 0.5);
  },

  toggleMute() {
    this.init();
    this.muted = !this.muted;
    if (this.out) this.out.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  },

  osc(type, f0, f1, t0, dur, vol, delay = 0) {
    if (!this.ac) return;
    const t = this.ac.currentTime + delay;
    const o = this.ac.createOscillator(), g = this.ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(20, f0), t);
    if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.out);
    o.start(t); o.stop(t + dur + 0.05);
  },

  noise(t0, dur, vol, fc = 1200, type = 'highpass', q = 0.8, delay = 0) {
    if (!this.ac) return;
    const t = this.ac.currentTime + delay;
    const n = Math.max(1, Math.floor(this.ac.sampleRate * dur));
    const buf = this.ac.createBuffer(1, n, this.ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ac.createBufferSource();
    src.buffer = buf;
    const f = this.ac.createBiquadFilter();
    f.type = type; f.frequency.value = fc; f.Q.value = q;
    const g = this.ac.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.out);
    src.start(t); src.stop(t + dur + 0.05);
  },

  play(name, vol = 1, delay = 0) {
    this.init();
    if (!this.ac) return;
    const v = vol;
    switch (name) {
      case 'click': this.osc('square', 1150, 0, 0, 0.035, 0.10 * v); break;
      case 'select': this.osc('square', 860, 980, 0, 0.05, 0.09 * v); break;
      case 'key': this.noise(0, 0.03, 0.10 * v, 2600); this.osc('square', 1400 + Math.random() * 300, 0, 0, 0.02, 0.05 * v); break;
      case 'paper': this.noise(0, 0.14, 0.16 * v, 1500, 'highpass', 0.6); break;
      case 'thud': this.noise(0, 0.08, 0.30 * v, 260, 'lowpass'); this.osc('sine', 120, 55, 0, 0.12, 0.35 * v); break;
      case 'stamp_app': this.noise(0, 0.07, 0.30 * v, 300, 'lowpass'); this.osc('sine', 130, 60, 0, 0.11, 0.4 * v); this.osc('triangle', 520, 0, 0, 0.06, 0.12 * v, 0.02); break;
      case 'stamp_deny': this.noise(0, 0.08, 0.32 * v, 220, 'lowpass'); this.osc('sine', 95, 48, 0, 0.13, 0.42 * v); break;
      case 'tray': this.noise(0, 0.16, 0.12 * v, 900, 'bandpass', 1.2); break;
      case 'tray_back': this.noise(0, 0.12, 0.10 * v, 700, 'bandpass', 1.2); break;
      case 'intercom': this.osc('square', 420, 380, 0, 0.18, 0.10 * v); this.osc('square', 620, 560, 0, 0.10, 0.07 * v, 0.19); break;
      case 'bell': this.osc('triangle', 1320, 0, 0, 0.9, 0.16 * v); this.osc('triangle', 1760, 0, 0, 0.7, 0.10 * v, 0.02); this.osc('sine', 660, 0, 0, 1.1, 0.08 * v); break;
      case 'day_hit': this.osc('square', 220, 110, 0, 0.22, 0.16 * v); this.noise(0, 0.1, 0.12 * v, 400, 'lowpass'); break;
      case 'whoosh': this.noise(0, 0.3, 0.14 * v, 800, 'bandpass', 0.7); break;
      case 'title': [523, 659, 784].forEach((f, i) => this.osc('triangle', f, 0, 0, 0.3, 0.10 * v, i * 0.09)); break;
      case 'sad': this.osc('triangle', 330, 0, 0, 0.3, 0.12 * v); this.osc('triangle', 262, 0, 0, 0.5, 0.12 * v, 0.25); break;
      case 'end': [392, 494, 587, 784].forEach((f, i) => this.osc('triangle', f, 0, 0, 0.7, 0.10 * v, i * 0.13)); break;
      case 'discrepancy': this.osc('square', 300, 150, 0, 0.16, 0.14 * v); this.osc('square', 200, 100, 0, 0.18, 0.12 * v, 0.1); break;
      case 'select_bad': this.osc('square', 500, 430, 0, 0.08, 0.07 * v); break;
      case 'xray': this.osc('sine', 200, 950, 0, 0.55, 0.10 * v); this.noise(0, 0.5, 0.04 * v, 3000, 'highpass'); break;
      case 'quiz_on': this.osc('square', 660, 880, 0, 0.12, 0.10 * v); break;
      case 'fight': this.noise(0, 0.2, 0.25 * v, 500, 'bandpass', 0.8); this.osc('square', 150, 60, 0, 0.16, 0.2 * v); break;
      case 'detain': this.noise(0, 0.35, 0.22 * v, 600, 'bandpass', 0.7); this.osc('square', 200, 90, 0, 0.3, 0.16 * v); break;
      case 'whistle': this.osc('sine', 2100, 2600, 0, 0.28, 0.14 * v); this.osc('sine', 2110, 2610, 0, 0.28, 0.08 * v); break;
      case 'glitch': for (let i = 0; i < 5; i++) this.noise(0, 0.04, 0.18 * v, 400 + Math.random() * 2800, 'bandpass', 2, i * 0.05); break;
      case 'fanfare': [523, 659, 784, 1047].forEach((f, i) => this.osc('triangle', f, 0, 0, 0.22, 0.13 * v, i * 0.11)); break;
      case 'coin': this.osc('square', 990, 0, 0, 0.06, 0.09 * v); this.osc('square', 1320, 0, 0, 0.25, 0.09 * v, 0.06); break;
      case 'citation': this.noise(0, 0.25, 0.1 * v, 1600, 'highpass'); this.osc('triangle', 880, 0, 0, 0.4, 0.09 * v, 0.2); break;
      case 'step': this.noise(0, 0.05, 0.10 * v, 300, 'lowpass'); break;
      case 'printer': break; // 由 printer() 定制
      default: this.osc('square', 600, 0, 0, 0.04, 0.08 * v);
    }
  },

  // 打印机：dur 秒的咔咔声
  printer(dur, vol = 1) {
    this.init();
    if (!this.ac) return;
    const n = Math.max(2, Math.round(dur * 9));
    for (let i = 0; i < n; i++) {
      this.noise(0, 0.05, 0.09 * vol, 1400 + Math.random() * 600, 'highpass', 1, i * (dur / n));
      this.osc('square', 180 + Math.random() * 60, 0, 0, 0.03, 0.05 * vol, i * (dur / n));
    }
  },

  // 旅客说话：一串短促的方波嘀咕（音高随角色）
  mumble(text, pitch, seed, vol = 1) {
    this.init();
    if (!this.ac) return;
    const chars = [...text].filter((c) => c.trim()).length;
    const n = Math.min(chars, 22);
    for (let i = 0; i < n; i++) {
      const f = pitch * (1 + (((seed + i * 7) % 5) - 2) * 0.045);
      this.osc('square', f, f * 1.02, 0, 0.045, 0.05 * vol, i * 0.05);
    }
  },

  siren(on) {
    this.init();
    if (!this.ac) return null;
    if (!on) { if (this.sirenH) { this.sirenH.g.gain.linearRampToValueAtTime(0, this.ac.currentTime + 0.3); const h = this.sirenH; setTimeout(() => { try { h.o1.stop(); h.o2.stop(); } catch (e) {} }, 500); this.sirenH = null; } return null; }
    const o1 = this.ac.createOscillator(), o2 = this.ac.createOscillator(), g = this.ac.createGain(), lfo = this.ac.createOscillator(), lg = this.ac.createGain();
    o1.type = 'square'; o2.type = 'square';
    o1.frequency.value = 620; o2.frequency.value = 620;
    lfo.type = 'sine'; lfo.frequency.value = 3.2; lg.gain.value = 180;
    lfo.connect(lg); lg.connect(o1.frequency); lg.connect(o2.frequency);
    o2.detain = undefined;
    g.gain.value = 0.0;
    g.gain.linearRampToValueAtTime(0.06, this.ac.currentTime + 0.3);
    o1.connect(g); o2.connect(g); g.connect(this.out);
    o1.start(); o2.start(); lfo.start();
    this.sirenH = { o1, o2, g, lfo };
    return this.sirenH;
  },

  stop(h) { if (h && h.g) { try { h.g.gain.linearRampToValueAtTime(0, this.ac.currentTime + 0.2); } catch (e) {} } },
};
