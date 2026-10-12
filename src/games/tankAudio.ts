import type { TankSound } from './tankEngine';
type Track = TankSound | 'idle' | 'move';
const recordings = new Map<Track, Promise<ArrayBuffer | null>>();
function recording(track: Track) {
  let promise = recordings.get(track);
  if (!promise) {
    promise = fetch(`/assets/games/tank/audio/${track}-fc-v1.wav`)
      .then((r) => (r.ok ? r.arrayBuffer() : null))
      .catch(() => null);
    recordings.set(track, promise);
    void promise.then((v) => {
      if (!v) recordings.delete(track);
    });
  }
  return promise;
}
export function preloadTankAudio() {
  for (const track of [
    'intro',
    'over',
    'fire',
    'brick',
    'steel',
    'armor',
    'enemy',
    'player',
    'hq',
    'bonus',
    'appear',
    'pickup',
    'life',
    'pause',
    'ice',
    'idle',
    'move',
    'score',
  ] as Track[])
    void recording(track);
}
/** Original FC event recordings. No oscillators, invented melody or warning-as-engine aliases. */
export class TankAudio {
  private context: AudioContext | null = null;
  private buffers = new Map<Track, Promise<AudioBuffer | null>>();
  private voices = new Map<AudioBufferSourceNode, { gain: GainNode; track: Track }>();
  private generation = 0;
  private engineGeneration = 0;
  private enabled = false;
  private engine: 'idle' | 'move' | null = null;
  private disposed = false;
  private getContext() {
    if (this.disposed) return null;
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
  private async play(track: Track, loop = false) {
    const ctx = this.getContext();
    if (!ctx || !this.enabled) return;
    const generation = this.generation,
      engineGeneration = this.engineGeneration;
    let pending = this.buffers.get(track);
    if (!pending) {
      pending = recording(track)
        .then((data) => (data ? ctx.decodeAudioData(data.slice(0)) : null))
        .catch(() => null);
      this.buffers.set(track, pending);
      void pending.then((value) => {
        if (!value && this.buffers.get(track) === pending) this.buffers.delete(track);
      });
    }
    const buffer = await pending;
    if (
      !buffer ||
      !this.enabled ||
      this.disposed ||
      generation !== this.generation ||
      ctx !== this.context ||
      ctx.state === 'closed' ||
      (loop && (engineGeneration !== this.engineGeneration || track !== this.engine))
    )
      return;
    // Cartridge voices replace the same sound instead of layering rapid automatic fire.
    this.stopTrack(track);
    const source = ctx.createBufferSource(),
      gain = ctx.createGain();
    source.buffer = buffer;
    source.loop = loop;
    gain.gain.value = loop ? 0.18 : track === 'fire' || track === 'ice' ? 0.3 : 0.6;
    source.connect(gain);
    gain.connect(ctx.destination);
    this.voices.set(source, { gain, track });
    source.onended = () => {
      this.voices.delete(source);
      source.disconnect();
      gain.disconnect();
    };
    source.start();
  }
  private stopTrack(track: Track) {
    for (const [source, voice] of this.voices)
      if (voice.track === track) {
        source.onended = null;
        try {
          source.stop();
        } catch {
          /* already ended */
        }
        source.disconnect();
        voice.gain.disconnect();
        this.voices.delete(source);
      }
  }
  enable(value: boolean) {
    this.enabled = value;
    if (!value) this.stop();
    else this.getContext();
  }
  events(events: TankSound[]) {
    if (this.enabled) for (const event of events) void this.play(event);
  }
  movement(running: boolean, moving: boolean) {
    const next = running && this.enabled ? (moving ? 'move' : 'idle') : null;
    if (next === this.engine) return;
    this.engineGeneration++;
    this.engine = next;
    this.stopTrack('idle');
    this.stopTrack('move');
    if (next) void this.play(next, true);
  }
  stop() {
    this.generation++;
    this.engineGeneration++;
    this.engine = null;
    for (const track of new Set([...this.voices.values()].map((v) => v.track)))
      this.stopTrack(track);
  }
  dispose() {
    this.stop();
    this.disposed = true;
    const ctx = this.context;
    this.context = null;
    if (ctx) void ctx.close().catch(() => {});
  }
}
