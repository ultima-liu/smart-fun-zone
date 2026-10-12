export type CourseEvidenceRequirement = 'answer' | 'audio';
export type CourseAssessmentResult = { verdict: 'pass' | 'retry'; feedback: string; checks: { met: boolean; feedback: string }[] };
export type CourseAssessmentRequest = {
  subject: '语文' | '英语' | '数学'; lessonId: string; taskId: string; prompt: string;
  criteria: string[]; requirement: CourseEvidenceRequirement; supported?: boolean;
  answer?: string; exampleAnswer?: string; referenceAudio?: string; audio?: { data: string; format: 'wav' | 'mp3' };
};
export async function checkCourse(task: CourseAssessmentRequest, signal: AbortSignal): Promise<CourseAssessmentResult> {
  const token = localStorage.getItem('sfz_token');
  const response = await fetch('/api/course/assess', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(task), signal,
  });
  const data = await response.json() as { ok?: boolean; result?: CourseAssessmentResult; error?: string };
  if (!response.ok || !data.ok || !data.result) throw new Error(response.status === 401 ? '请先登录孩子或家长账号，再让 AI 检查。' : data.error || 'AI 检查暂时不可用，请重试。');
  const result = data.result;
  if (!['pass', 'retry'].includes(result.verdict) || !result.feedback || !Array.isArray(result.checks)
    || result.checks.length !== task.criteria.length || result.checks.some(item => typeof item.met !== 'boolean' || typeof item.feedback !== 'string')) {
    throw new Error('AI 没有返回完整检查结果，请重试。');
  }
  return { ...result, verdict: result.verdict === 'pass' && result.checks.every(item => item.met) ? 'pass' : 'retry' };
}

/** Browser recordings are decoded into real PCM WAV; never submit a transcript as pronunciation evidence. */
export async function recordingToWav(blob: Blob): Promise<Blob> {
  const context = new AudioContext();
  try {
    const audio = await context.decodeAudioData(await blob.arrayBuffer());
    return audioBufferToWav(audio);
  } finally { await context.close(); }
}

/** Keep all of the answer, including both stereo channels; reject overlong audio instead of silently cutting it. */
export function audioBufferToWav(audio: Pick<AudioBuffer, 'duration' | 'sampleRate' | 'numberOfChannels' | 'getChannelData'>): Blob {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0 || !Number.isFinite(audio.sampleRate) || audio.sampleRate <= 0 || audio.numberOfChannels < 1) throw new Error('录音没有有效声音，请重新录制。');
    if (audio.duration > 45) throw new Error('录音不能超过 45 秒，请缩短后重新提交。');
    const rate = 16000;
    const count = Math.floor(audio.duration * rate);
    if (!count) throw new Error('录音太短，请重新录制。');
    const channels = Array.from({ length: audio.numberOfChannels }, (_, index) => audio.getChannelData(index));
    const bytes = new ArrayBuffer(44 + count * 2);
    const view = new DataView(bytes);
    const label = (offset: number, value: string) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); };
    label(0, 'RIFF'); view.setUint32(4, 36 + count * 2, true); label(8, 'WAVE'); label(12, 'fmt ');
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    label(36, 'data'); view.setUint32(40, count * 2, true);
    for (let i = 0; i < count; i++) {
      const position = i * audio.sampleRate / rate;
      const first = Math.floor(position);
      const mixed = channels.reduce((sum, samples) => sum + (samples[first] ?? 0) * (1 - (position - first)) + (samples[first + 1] ?? samples[first] ?? 0) * (position - first), 0) / channels.length;
      const value = Math.max(-1, Math.min(1, mixed));
      view.setInt16(44 + i * 2, value < 0 ? value * 32768 : value * 32767, true);
    }
    return new Blob([bytes], { type: 'audio/wav' });
}
export function blobDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('文件无法读取。')); reader.readAsDataURL(blob);
  });
}
