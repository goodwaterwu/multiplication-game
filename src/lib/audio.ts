// Arcade Audio Synthesizer using Web Audio API

class ArcadeAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private nextNoteTime: number = 0;
  private isPlaying: boolean = false;
  private timerID: number | null = null;
  private sequenceIndex: number = 0;

  // Background Music Sequence (Raised one octave for better visibility on small speakers)
  private sequence = [
    // Bar 1
    { freq: 130.81, dur: 0.2 }, { freq: 130.81, dur: 0.2 }, { freq: 261.63, dur: 0.2 }, { freq: 130.81, dur: 0.2 },
    // Bar 2
    { freq: 116.54, dur: 0.2 }, { freq: 116.54, dur: 0.2 }, { freq: 233.08, dur: 0.2 }, { freq: 116.54, dur: 0.2 },
    // Bar 3
    { freq: 87.31, dur: 0.2 }, { freq: 87.31, dur: 0.2 }, { freq: 174.61, dur: 0.2 }, { freq: 87.31, dur: 0.2 },
    // Bar 4
    { freq: 98.00, dur: 0.2 }, { freq: 98.00, dur: 0.2 }, { freq: 196.00, dur: 0.2 }, { freq: 98.00, dur: 0.2 },
  ];

  public init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.5; // Increased Global volume
      this.masterGain.connect(this.ctx.destination);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = 0.5; // Increased BGM volume (20% boost)
      this.bgmGain.connect(this.masterGain);
    }
    // Always try to resume if suspended
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(err => console.error('Audio resume failed:', err));
    }
  }

  // Explicitly resume audio context (must be called from user interaction event)
  public async resume() {
    this.init();
    if (this.ctx?.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  private playTone(freq: number, type: OscillatorType, duration: number, startTime: number = 0) {
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);
    
    // Envelope
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime + startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + startTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(this.ctx.currentTime + startTime);
    osc.stop(this.ctx.currentTime + startTime + duration);
  }

  private scheduler() {
    if (!this.ctx || !this.bgmGain || !this.isPlaying) return;

    // Lookahead: 0.1s
    while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
      this.scheduleNote(this.sequence[this.sequenceIndex], this.nextNoteTime);
      this.nextNoteTime += 0.25; // tempo
      this.sequenceIndex = (this.sequenceIndex + 1) % this.sequence.length;
    }
    
    this.timerID = window.setTimeout(() => this.scheduler(), 25);
  }

  private scheduleNote(note: { freq: number, dur: number }, time: number) {
    if (!this.ctx || !this.bgmGain) return;

    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();

    // Use 'triangle' wave for clearer sound on small speakers than 'sawtooth'
    osc.type = 'triangle'; 
    osc.frequency.value = note.freq;

    // Envelope for BGM note
    env.gain.setValueAtTime(0, time);
    env.gain.linearRampToValueAtTime(0.3, time + 0.05);
    env.gain.linearRampToValueAtTime(0, time + note.dur);

    osc.connect(env);
    env.connect(this.bgmGain);

    osc.start(time);
    osc.stop(time + note.dur);
  }

  startBGM() {
    this.init();
    if (this.isPlaying) return;
    
    this.isPlaying = true;
    this.sequenceIndex = 0;
    if (this.ctx) {
        this.nextNoteTime = this.ctx.currentTime + 0.1;
        this.scheduler();
    }
  }

  stopBGM() {
    this.isPlaying = false;
    if (this.timerID) {
      clearTimeout(this.timerID);
      this.timerID = null;
    }
  }

  playClick() {
    this.playTone(800, 'square', 0.05);
  }

  playCorrect() {
    this.init();
    // Coin sound / Ding
    this.playTone(1200, 'sine', 0.1, 0);
    this.playTone(1800, 'sine', 0.2, 0.1);
  }

  playWrong() {
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(50, this.ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  playLevelComplete() {
    this.init();
    // Victory fanfare (simple arpeggio)
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C Major
    notes.forEach((freq, i) => {
      this.playTone(freq, 'square', 0.1, i * 0.1);
    });
    this.playTone(1046.50, 'square', 0.4, 0.4);
  }

  playGameOver() {
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 1.0);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.0);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 1.0);
  }

  playVictory() {
    this.init();
    // Final victory sequence
    const notes = [523.25, 523.25, 523.25, 659.25, 783.99, 659.25, 783.99, 1046.50];
    const timing = [0, 0.2, 0.4, 0.6, 0.8, 1.2, 1.4, 1.6];
    
    notes.forEach((freq, i) => {
      this.playTone(freq, 'square', 0.15, timing[i] * 0.3);
    });
  }
}

export const audio = new ArcadeAudio();
