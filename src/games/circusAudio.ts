import soundtrack from './circusSoundtrack.json';

// Rendered from the original FC NSF sound driver, rather than a new arrangement.
const TRACKS = [0, 1, 1, 0, 2] as const;
export class CircusAudio {
  private context: AudioContext | null = null;
  private voices = new Set<OscillatorNode>();
  private enabled = true;
  private music: AudioBufferSourceNode | null = null;
  private requestedTrack: number | null = null;
  private request = 0;
  private buffers = new Map<number, Promise<AudioBuffer>>();
  private getContext() {
    if (!this.context) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.context = new AC();
    }
    if (this.context.state === 'suspended') void this.context.resume().catch(() => {});
    return this.context;
  }
  private tone(midi: number, at: number, duration: number, volume = 0.032, end?: number) {
    if (!this.enabled) return;
    const c = this.getContext();
    if (!c || !midi) return;
    const osc = c.createOscillator(),
      gain = c.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(440 * 2 ** ((midi - 69) / 12), at);
    if (end) osc.frequency.exponentialRampToValueAtTime(end, at + duration);
    gain.gain.setValueAtTime(volume, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    this.voices.add(osc);
    osc.onended = () => {
      this.voices.delete(osc);
      osc.disconnect();
      gain.disconnect();
    };
    osc.start(at);
    osc.stop(at + duration + 0.01);
  }
  start(stage: number, enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.stop();
      return;
    }
    const track = TRACKS[Math.max(0, Math.min(4, stage - 1))];
    if (this.requestedTrack === track) return;
    this.stopMusic();
    const c = this.getContext();
    if (!c) return;
    this.requestedTrack = track;
    const request = this.request;
    const info = soundtrack.tracks[track];
    let buffer = this.buffers.get(track);
    if (!buffer) {
      buffer = fetch(`${import.meta.env.BASE_URL}assets/circus/audio/${info.file}`)
        .then((response) => {
          if (!response.ok) throw new Error(`Circus soundtrack: ${response.status}`);
          return response.arrayBuffer();
        })
        .then((bytes) => c.decodeAudioData(bytes));
      this.buffers.set(track, buffer);
    }
    void buffer
      .then((decoded) => {
        // A fetch/decode finishing after pause, mute, stage change or exit must stay silent.
        if (request !== this.request || !this.enabled || this.context !== c) return;
        const source = c.createBufferSource(),
          gain = c.createGain();
        source.buffer = decoded;
        source.loop = true;
        source.loopStart = info.loopStart;
        source.loopEnd = Math.min(info.loopEnd, decoded.duration);
        gain.gain.value = 0.45;
        source.connect(gain);
        gain.connect(c.destination);
        source.onended = () => {
          source.disconnect();
          gain.disconnect();
          if (this.music === source) this.music = null;
        };
        this.music = source;
        source.start();
      })
      .catch(() => {
        this.buffers.delete(track);
        if (request === this.request) this.requestedTrack = null;
      });
  }
  effect(event: string, enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) return;
    const c = this.getContext();
    if (!c) return;
    if (event === 'jump' || event === 'bounce') this.tone(67, c.currentTime, 0.14, 0.045, 1100);
    else if (event === 'hurt') this.tone(60, c.currentTime, 0.35, 0.045, 100);
    else if (event === 'clear' || event === 'life')
      [72, 76, 79, 84].forEach((note, i) => this.tone(note, c.currentTime + i * 0.1, 0.18, 0.04));
    else this.tone(event === 'catch' ? 79 : 84, c.currentTime, 0.07, 0.025);
  }
  stopMusic() {
    this.request++;
    this.requestedTrack = null;
    if (this.music) {
      try {
        this.music.stop();
      } catch {
        /* already stopped */
      }
      this.music = null;
    }
  }
  stop() {
    this.stopMusic();
    for (const osc of this.voices) {
      try {
        osc.stop();
      } catch {
        /* already ended */
      }
    }
    this.voices.clear();
  }
  dispose() {
    this.stop();
    if (this.context) void this.context.close().catch(() => {});
    this.context = null;
    this.buffers.clear();
  }
}
