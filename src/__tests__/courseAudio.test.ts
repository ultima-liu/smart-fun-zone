import { expect, it, vi } from 'vitest';
import { audioBufferToWav, recordingToWav } from '../courseAssessment';

function buffer(duration = 0.5, channels = [new Float32Array(24000).fill(0), new Float32Array(24000).fill(0.8)]) {
  return { duration, sampleRate: 48000, numberOfChannels: channels.length, getChannelData: (i: number) => channels[i] };
}
it('双声道上传保留第二声道的实际作答，转换为 16k 单声道 PCM WAV', async () => {
  const file = audioBufferToWav(buffer());
  const bytes = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(reader.result as ArrayBuffer); reader.onerror = reject; reader.readAsArrayBuffer(file);
  });
  const view = new DataView(bytes);
  expect(view.getUint16(22, true)).toBe(1);
  expect(view.getUint32(24, true)).toBe(16000);
  expect(view.getUint16(34, true)).toBe(16);
  expect(bytes.byteLength).toBe(44 + 8000 * 2);
  expect(view.getInt16(44, true)).toBeCloseTo(13106, -1);
});
it('超过时长的作答拒绝上传，不悄悄截断后提交检查', () => {
  expect(() => audioBufferToWav(buffer(45.01))).toThrow('45 秒');
  expect(() => audioBufferToWav(buffer(0))).toThrow('有效声音');
  expect(() => audioBufferToWav(buffer(NaN))).toThrow('有效声音');
});
it('损坏的上传文件解码失败也关闭 AudioContext', async () => {
  const close = vi.fn();
  vi.stubGlobal('AudioContext', class { close = close; decodeAudioData = vi.fn().mockRejectedValue(new Error('文件损坏')); });
  try {
    await expect(recordingToWav({ arrayBuffer: async () => new ArrayBuffer(8) } as Blob)).rejects.toThrow('文件损坏');
    expect(close).toHaveBeenCalledOnce();
  } finally { vi.unstubAllGlobals(); }
});
