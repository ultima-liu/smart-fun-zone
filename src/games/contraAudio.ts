import soundtrack from './contraSoundtrack.json';
import effects from './contraEffects.json';
type Track = keyof typeof soundtrack;
type Effect = keyof typeof effects;
const recordings = { ...soundtrack, ...effects };
export function contraMusicTrack(stage: number, boss = false): Track {
  if ((stage === 2 || stage === 4) && boss) return 'boss';
  return (
    (['jungle', 'base', 'waterfall', 'base', 'snow', 'energy', 'jungle', 'lair'] as Track[])[
      stage - 1
    ] ?? 'jungle'
  );
}
export class ContraAudio {
  private context: AudioContext | null = null;
  private music: AudioBufferSourceNode | null = null;
  private voices = new Set<AudioScheduledSourceNode>();
  private buffers = new Map<Track | Effect, Promise<AudioBuffer | null>>();
  private generation = 0;
  private enabled = false;
  private current: Track | null = null;
  private open() {
    const Constructor = window.AudioContext;
    if (!Constructor) return null;
    if (!this.context || this.context.state === 'closed') this.context = new Constructor();
    if (this.context.state === 'suspended') void this.context.resume().catch(() => {});
    return this.context;
  }
  private buffer(track: Track | Effect, context: AudioContext) {
    let pending = this.buffers.get(track);
    if (!pending) {
      pending = fetch(
        `${import.meta.env.BASE_URL}assets/games/contra/audio/${recordings[track].file}`,
      )
        .then((r) => (r.ok ? r.arrayBuffer() : null))
        .then((data) => (data ? context.decodeAudioData(data) : null))
        .catch(() => null);
      this.buffers.set(track, pending);
      void pending.then((buffer) => {
        if (!buffer && this.buffers.get(track) === pending) this.buffers.delete(track);
      });
    }
    return pending;
  }
  async start(stage: number, enabled: boolean, boss = false) {
    this.enabled = enabled;
    if (!enabled) {
      this.stop();
      return;
    }
    const track = contraMusicTrack(stage, boss);
    if (this.current === track) return;
    this.stopMusic();
    this.current = track;
    const context = this.open(),
      generation = this.generation;
    if (!context) {
      this.current = null;
      return;
    }
    const pending = this.buffer(track, context);
    for (const effect of Object.keys(effects) as Effect[]) void this.buffer(effect, context);
    const buffer = await pending;
    if (
      !buffer ||
      !this.enabled ||
      generation !== this.generation ||
      this.current !== track ||
      context.state === 'closed'
    ) {
      if (!buffer && this.current === track) this.current = null;
      return;
    }
    const source = context.createBufferSource(),
      gain = context.createGain();
    source.buffer = buffer;
    source.loop = true;
    const loop = soundtrack[track].loop;
    if (loop) {
      source.loopStart = loop.start;
      source.loopEnd = loop.end;
    }
    gain.gain.value = 0.35;
    source.connect(gain);
    gain.connect(context.destination);
    this.music = source;
    this.voices.add(source);
    source.onended = () => {
      this.voices.delete(source);
      source.disconnect();
      gain.disconnect();
    };
    source.start();
  }
  async jingle(track: 'clear' | 'over' | 'ending', enabled: boolean) {
    if (!enabled) return;
    this.enabled = enabled;
    const context = this.open(),
      generation = this.generation;
    if (!context) return;
    const buffer = await this.buffer(track, context);
    if (!buffer || generation !== this.generation || !this.enabled || context.state === 'closed')
      return;
    const source = context.createBufferSource(),
      gain = context.createGain();
    source.buffer = buffer;
    gain.gain.value = 0.4;
    source.connect(gain);
    gain.connect(context.destination);
    this.voices.add(source);
    source.onended = () => {
      this.voices.delete(source);
      source.disconnect();
      gain.disconnect();
    };
    source.start();
  }
  async effect(event: string, enabled: boolean) {
    if (!enabled || !this.enabled || !(event in effects)) return;
    const context = this.open(),
      generation = this.generation;
    if (!context) return;
    const buffer = await this.buffer(event as Effect, context);
    if (!buffer || !this.enabled || generation !== this.generation || context.state === 'closed')
      return;
    const source = context.createBufferSource(),
      gain = context.createGain();
    source.buffer = buffer;
    // Original noise/transient channels need a clear foreground against the music.
    gain.gain.value = event.startsWith('shot') ? 0.26 : 0.65;
    source.connect(gain);
    gain.connect(context.destination);
    this.voices.add(source);
    source.onended = () => {
      this.voices.delete(source);
      source.disconnect();
      gain.disconnect();
    };
    source.start();
  }
  stopMusic() {
    this.generation++;
    this.current = null;
    if (this.music) {
      try {
        this.music.stop();
      } catch {
        /* Already ended. */
      }
      this.voices.delete(this.music);
      this.music = null;
    }
  }
  stop() {
    this.enabled = false;
    this.stopMusic();
    for (const source of this.voices) {
      try {
        source.stop();
      } catch {
        /* Already ended. */
      }
    }
    this.voices.clear();
  }
  dispose() {
    this.stop();
    const context = this.context;
    this.context = null;
    this.buffers.clear();
    if (context && context.state !== 'closed') void context.close().catch(() => {});
  }
}
