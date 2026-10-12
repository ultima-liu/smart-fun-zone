/** Chrome 135+ 桌面端支持把明确的音轨交给识别器；Safari / Android 不支持此参数。 */
export function supportsReadingAudioTrack(userAgent = navigator.userAgent) {
  const chrome = /(?:Chrome|HeadlessChrome)\/(\d+)/.exec(userAgent);
  return !!chrome && Number(chrome[1]) >= 135 && !/Android|iPhone|iPad/.test(userAgent);
}

export type ReadingMicrophone = { track: MediaStreamTrack; close: (keepRecording: boolean) => void };

/** 采集同一条音轨供回听和识别；是否送到识别服务由调用者决定。 */
export async function openReadingMicrophone(onLevel: (level: number) => void, onRecording: (audio: Blob) => void, onDevice: (name: string) => void, options: {requireRecording?: boolean; onError?: () => void} = {}): Promise<ReadingMicrophone> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const track = stream.getAudioTracks()[0];
  if (!track || track.readyState !== 'live') {
    stream.getTracks().forEach(item => item.stop());
    throw new DOMException('No live microphone track', 'NotReadableError');
  }
  onDevice(track.label || '默认麦克风');
  let recorder: MediaRecorder | undefined;
  let context: AudioContext | undefined;
  let frame = 0, closed = false, keep = false;
  const chunks: Blob[] = [];
  try {
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    recorder.onstop = () => {
      if (keep && chunks.length) onRecording(new Blob(chunks, { type: recorder?.mimeType || chunks[0].type }));
      else if (keep && options.requireRecording) options.onError?.();
      chunks.length = 0;
    };
    recorder.onerror = () => options.onError?.();
    recorder.start();
  } catch {
    if (options.requireRecording) {stream.getTracks().forEach(item => item.stop());throw new Error('Recording unavailable');}
    /* 回听不支持时仍允许音轨识别。 */
  }
  try {
    context = new AudioContext();
    const analyser = context.createAnalyser(); analyser.fftSize = 256;
    context.createMediaStreamSource(stream).connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    let last = 0;
    const measure = (time: number) => {
      if (closed) return;
      if (time - last >= 100) {
        analyser.getFloatTimeDomainData(samples);
        const rms = Math.sqrt(samples.reduce((sum, sample) => sum + sample * sample, 0) / samples.length);
        onLevel(Math.min(1, rms * 6)); last = time;
      }
      frame = requestAnimationFrame(measure);
    };
    frame = requestAnimationFrame(measure);
    void context.resume().catch(() => {});
  } catch { /* 音量显示不支持时仍允许识别。 */ }
  return { track, close(keepRecording) {
    if (closed) return;
    closed = true; keep = keepRecording;
    cancelAnimationFrame(frame);
    if (context) void context.close().catch(() => {});
    try { if (recorder?.state === 'recording') recorder.stop(); }
    catch { if (keepRecording && options.requireRecording) options.onError?.(); }
    finally { stream.getTracks().forEach(item => item.stop()); }
  } };
}
