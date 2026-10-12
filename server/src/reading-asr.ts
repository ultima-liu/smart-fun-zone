import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
export const readingAsrOptions = {
  python: process.env.READING_ASR_PYTHON ?? path.join(root, 'var/reading-asr/venv/bin/python'),
  modelDir: process.env.READING_ASR_MODEL_DIR ?? path.join(root, 'var/reading-asr/sense-voice'),
  script: path.join(root, 'scripts/reading-asr.py'),
};
const files = ['model.int8.onnx', 'tokens.txt', '../silero_vad.onnx'];
export function readingAsrConfigured(options = readingAsrOptions) {
  return (
    existsSync(options.python) &&
    files.every((name) => existsSync(path.join(options.modelDir, name)))
  );
}
export class ReadingAsrError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function validateReadingAudio(input: unknown): { language: 'en-US'; audio: string } {
  if (
    !input ||
    typeof input !== 'object' ||
    Object.keys(input).some((key) => !['language', 'audio'].includes(key))
  )
    throw new ReadingAsrError('识别只接收本次录音和语言。');
  const body = input as { language?: unknown; audio?: unknown };
  if (
    body.language !== 'en-US' ||
    typeof body.audio !== 'string' ||
    body.audio.length > 1_921_000 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(body.audio)
  )
    throw new ReadingAsrError('请提交有效的英语短录音。');
  const wav = Buffer.from(body.audio, 'base64');
  if (
    wav.length < 46 ||
    wav.toString('ascii', 0, 4) !== 'RIFF' ||
    wav.toString('ascii', 8, 12) !== 'WAVE' ||
    wav.toString('ascii', 12, 16) !== 'fmt ' ||
    wav.readUInt32LE(16) !== 16 ||
    wav.readUInt16LE(20) !== 1 ||
    wav.readUInt16LE(22) !== 1 ||
    wav.readUInt32LE(24) !== 16000 ||
    wav.readUInt32LE(28) !== 32000 ||
    wav.readUInt16LE(32) !== 2 ||
    wav.readUInt16LE(34) !== 16 ||
    wav.toString('ascii', 36, 40) !== 'data' ||
    wav.readUInt32LE(4) !== wav.length - 8 ||
    wav.readUInt32LE(40) !== wav.length - 44 ||
    (wav.length - 44) % 2 ||
    wav.length - 44 > 45 * 32000
  )
    throw new ReadingAsrError('录音格式无效，需要45秒以内的16kHz单声道录音。');
  return { language: 'en-US', audio: body.audio };
}
let active = 0;
/** The target is deliberately absent from the recognizer input. No answer biasing or word substitution. */
export async function transcribeReading(
  input: unknown,
  options = readingAsrOptions,
  signal?: AbortSignal,
): Promise<{ text: string; engine: string }> {
  const payload = validateReadingAudio(input);
  if (!readingAsrConfigured(options))
    throw new ReadingAsrError('英语朗读识别服务尚未就绪，请稍后再试。', 503);
  if (active >= 2) throw new ReadingAsrError('正在处理其他录音，请稍后再试。', 429);
  if (signal?.aborted) throw new ReadingAsrError('本次识别已取消。', 499);
  active++;
  try {
    return await new Promise((resolve, reject) => {
      const process = spawn(options.python, [options.script, options.modelDir], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      let output = '',
        settled = false;
      const done = (error?: ReadingAsrError, result?: { text: string; engine: string }) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        signal?.removeEventListener('abort', abort);
        if (error) {
          process.kill();
          reject(error);
        } else resolve(result!);
      };
      const abort = () => done(new ReadingAsrError('本次识别已取消。', 499));
      const timeout = setTimeout(
        () => done(new ReadingAsrError('朗读识别超时，请稍后再试。', 504)),
        45_000,
      );
      signal?.addEventListener('abort', abort, { once: true });
      process.stdout.on('data', (chunk) => {
        output += chunk.toString();
        if (output.length > 16_000) done(new ReadingAsrError('识别服务返回异常。', 502));
      });
      process.stderr.on('data', () => {}); // Do not expose or persist recordings or process diagnostics.
      process.on('error', () => done(new ReadingAsrError('英语识别服务启动失败。', 503)));
      process.stdin.on('error', () => done(new ReadingAsrError('英语识别服务连接失败。', 502)));
      process.on('close', (code) => {
        if (settled) return;
        try {
          const result = JSON.parse(output) as { text?: unknown; engine?: unknown };
          if (
            code !== 0 ||
            typeof result.text !== 'string' ||
            result.text.length > 6000 ||
            result.engine !== 'sense-voice'
          )
            throw new Error();
          done(undefined, { text: result.text, engine: result.engine });
        } catch {
          done(new ReadingAsrError('英语识别未完成，请再试一次。', 502));
        }
      });
      process.stdin.end(JSON.stringify(payload));
    });
  } finally {
    active--;
  }
}
