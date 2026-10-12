import soundtrack from './bomberSoundtrack.json';
export type BomberTrack = keyof typeof soundtrack;
const downloads = new Map<BomberTrack, Promise<ArrayBuffer | null>>();
function recording(track: BomberTrack) {
  let pending = downloads.get(track);
  if (!pending) {
    pending = fetch(`/assets/games/bomber/audio/${soundtrack[track].file}`).then(r => r.ok ? r.arrayBuffer() : null).catch(() => null);
    downloads.set(track, pending);
    void pending.then(data => { if (!data) downloads.delete(track); });
  }
  return pending;
}
export function preloadBomberAudio() { for (const track of Object.keys(soundtrack) as BomberTrack[]) void recording(track); }
/** Original APU recordings and decoded DMC sample, with async cancellation. */
export class BomberAudio {
  private context: AudioContext | null = null;
  private buffers = new Map<BomberTrack, Promise<AudioBuffer | null>>();
  private voices = new Map<AudioBufferSourceNode, { gain: GainNode; music: boolean; track: BomberTrack }>();
  private generation = 0;
  private effectsGeneration = 0;
  private desired: BomberTrack | null = null;
  unlock() {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    if (!this.context) this.context = new AC();
    if (this.context.state === 'suspended') void this.context.resume().catch(() => {});
    return this.context;
  }
  private async play(track: BomberTrack, music: boolean, token: number, ended?: () => void) {
    const context = this.unlock(); if (!context) return;
    const effectToken = this.effectsGeneration;
    let pending = this.buffers.get(track);
    if (!pending) {
      pending = recording(track).then(data => data ? context.decodeAudioData(data.slice(0)) : null).catch(() => null);
      this.buffers.set(track, pending);
      void pending.then(data => { if (!data) this.buffers.delete(track); });
    }
    const buffer = await pending;
    if (!buffer || token !== this.generation || context !== this.context || context.state === 'closed' || !music && effectToken !== this.effectsGeneration) return;
    const source = context.createBufferSource(), gain = context.createGain();
    source.buffer = buffer; gain.gain.value = music ? .26 : .32;
    // The original has one DMC channel: chain explosions restart it, never stack it.
    if (track === 'blast') for (const [previous, voice] of this.voices) {
      if (voice.track === 'blast') this.release(previous, voice.gain);
    }
    const loop = soundtrack[track].loop;
    if (loop) { source.loop = true; source.loopStart = loop.start; source.loopEnd = Math.min(loop.end, buffer.duration); }
    if (track === 'title') source.loop = true;
    source.connect(gain); gain.connect(context.destination); this.voices.set(source, {gain, music, track});
    source.onended = () => { this.voices.delete(source); source.disconnect(); gain.disconnect(); if (token === this.generation) ended?.(); };
    source.start();
  }
  music(track: BomberTrack, intro = false) {
    this.unlock();
    if (this.desired === track) return;
    this.stop(); this.desired = track;
    const token = this.generation;
    if (intro) void this.play('start', true, token, () => { void this.play(track, true, token); });
    else void this.play(track, true, token);
  }
  effect(event: string, enabled: boolean) {
    if (!enabled) return;
    const track: BomberTrack | undefined = ({ plant:'plant', blast:'blast', power:'power', hurt:'hurt', stepHorizontal:'step-horizontal', stepVertical:'step-vertical', pause:'pause' } as Record<string, BomberTrack>)[event];
    if (track) void this.play(track, false, this.generation);
  }
  muteEffects() {
    this.effectsGeneration++;
    for (const [source, voice] of this.voices) if (!voice.music) this.release(source, voice.gain);
  }
  private release(source: AudioBufferSourceNode, gain: GainNode) {
    source.onended = null; try { source.stop(); } catch { /* already ended */ }
    source.disconnect(); gain.disconnect(); this.voices.delete(source);
  }
  stop() {
    this.generation++; this.desired = null;
    for (const [source, voice] of this.voices) this.release(source, voice.gain);
  }
  dispose() {
    this.stop(); if (this.context) void this.context.close().catch(() => {});
    this.context = null; this.buffers.clear();
  }
}
