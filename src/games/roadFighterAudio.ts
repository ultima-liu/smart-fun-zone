/** Original FC recordings. Track provenance is kept beside the runtime assets. */
const TRACKS = {
  start: 'start-fc-v1.mp3',
  checkpoint: 'checkpoint-fc-v1.mp3',
  goal: 'goal-fc-v1.mp3',
  over: 'over-fc-v1.mp3',
  engine: 'engine-fc-v2.wav',
  lowFuel: 'low-fuel-fc-v2.wav',
  crash: 'crash-fc-v1.mp3',
  skid: 'skid-fc-v1.mp3',
  fuel: 'fuel-fc-v1.mp3',
} as const;
type Track = keyof typeof TRACKS;
const recordings = new Map<Track, Promise<ArrayBuffer | null>>();
function recording(track: Track) {
  let pending = recordings.get(track);
  if (!pending) {
    pending = fetch(`/assets/games/road-fighter/audio/${TRACKS[track]}`)
      .then((response) => (response.ok ? response.arrayBuffer() : null))
      .catch(() => null);
    recordings.set(track, pending);
    void pending.then((data) => {
      if (!data) recordings.delete(track);
    });
  }
  return pending;
}
export function preloadRoadAudio() {
  for (const track of Object.keys(TRACKS) as Track[]) void recording(track);
}

export class RoadAudio {
  private context: AudioContext | null = null;
  private buffers = new Map<Track, Promise<AudioBuffer | null>>();
  private engine: AudioBufferSourceNode | null = null;
  private engineGain: GainNode | null = null;
  private voices = new Map<AudioBufferSourceNode, { gain: GainNode; track: Track }>();
  private generation = 0;
  private trackGeneration = new Map<Track, number>();
  private enabled = false;
  private running = false;
  private speed = 0;
  private spinning = false;
  private crashing = false;
  private fuel = 100;
  private lowFuel = false;

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
  private buffer(context: AudioContext, track: Track) {
    let pending = this.buffers.get(track);
    if (!pending) {
      pending = recording(track)
        .then((data) => (data ? context.decodeAudioData(data.slice(0)) : null))
        .catch(() => null);
      this.buffers.set(track, pending);
      void pending.then((data) => {
        if (!data && this.buffers.get(track) === pending) this.buffers.delete(track);
      });
    }
    return pending;
  }
  private async play(track: Track, volume: number, loop = false) {
    const context = this.getContext();
    if (!context || !this.enabled) return;
    const generation = this.generation;
    const trackGeneration = this.trackGeneration.get(track);
    const buffer = await this.buffer(context, track);
    // Never resurrect a delayed sound after mute, pause, reset or unmount.
    if (
      !buffer ||
      !this.enabled ||
      generation !== this.generation ||
      trackGeneration !== this.trackGeneration.get(track) ||
      context !== this.context ||
      context.state === 'closed'
    )
      return;
    const source = context.createBufferSource(),
      gain = context.createGain();
    source.buffer = buffer;
    source.loop = loop;
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(context.destination);
    this.voices.set(source, { gain, track });
    source.onended = () => {
      this.voices.delete(source);
      source.disconnect();
      gain.disconnect();
    };
    if (track === 'engine') {
      this.engine = source;
      this.engineGain = gain;
      this.update(this.speed, this.spinning, this.crashing, this.fuel);
    }
    source.start();
  }
  start(enabled: boolean, playIntro = false) {
    this.enabled = enabled;
    if (!enabled) {
      this.stop();
      return;
    }
    if (this.running) return;
    if (!this.getContext()) return;
    this.running = true;
    if (playIntro) {
      this.speed = 0;
      this.spinning = false;
      this.crashing = false;
      this.fuel = 100;
    }
    void this.play('engine', 0, true);
    if (playIntro) void this.play('start', 0.35);
  }
  update(speed: number, spinning: boolean, crashing: boolean, fuel = 100) {
    this.speed = speed;
    this.spinning = spinning;
    this.crashing = crashing;
    this.fuel = fuel;
    const warn = this.running && this.enabled && fuel > 0 && fuel < 10;
    if (warn !== this.lowFuel) {
      this.lowFuel = warn;
      if (warn) void this.play('lowFuel', 0.18, true);
      else this.stopTrack('lowFuel');
    }
    const context = this.context;
    if (!context || !this.engine || !this.engineGain) return;
    // Change the original engine recording with the revs, without a synthetic voice.
    this.engine.playbackRate.setTargetAtTime(0.65 + (speed / 400) * 0.7, context.currentTime, 0.06);
    this.engineGain.gain.setTargetAtTime(
      crashing || speed < 1 ? 0 : spinning ? 0.035 : 0.09,
      context.currentTime,
      0.03,
    );
  }
  private stopTrack(track: Track) {
    this.trackGeneration.set(track, (this.trackGeneration.get(track) ?? 0) + 1);
    for (const [source, voice] of this.voices) {
      if (voice.track === track) this.release(source, voice.gain);
    }
  }
  effect(event: string, enabled: boolean) {
    if (!enabled) {
      this.stop();
      return;
    }
    this.enabled = true;
    if (event === 'saved' || event === 'crash') this.stopTrack('skid');
    const track: Track | undefined =
      event === 'clear'
        ? 'checkpoint'
        : event === 'goal'
          ? 'goal'
          : event === 'over'
            ? 'over'
            : event === 'crash' || event === 'skid' || event === 'fuel'
              ? event
              : undefined;
    // Recovery, the cameo and empty-tank coasting do not introduce invented tunes.
    if (track) void this.play(track, track === 'crash' ? 0.4 : 0.35);
  }
  private release(source: AudioBufferSourceNode, gain: GainNode) {
    source.onended = null;
    try {
      source.stop();
    } catch {
      /* already ended */
    }
    source.disconnect();
    gain.disconnect();
    this.voices.delete(source);
  }
  stop() {
    this.generation++;
    this.enabled = false;
    this.running = false;
    this.lowFuel = false;
    for (const [source, voice] of this.voices) this.release(source, voice.gain);
    this.engine = null;
    this.engineGain = null;
  }
  dispose() {
    this.stop();
    if (this.context) void this.context.close().catch(() => {});
    this.context = null;
    this.buffers.clear();
  }
}
