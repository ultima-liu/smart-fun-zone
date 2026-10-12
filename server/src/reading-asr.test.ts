import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateReadingAudio, transcribeReading, ReadingAsrError } from './reading-asr.js';
function recording(seconds = 1) {
  const wav = Buffer.alloc(44 + seconds * 32000);
  wav.write('RIFF');
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write('WAVE', 8);
  wav.write('fmt ', 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(16000, 24);
  wav.writeUInt32LE(32000, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(wav.length - 44, 40);
  return { language: 'en-US', audio: wav.toString('base64') };
}
test('recognizer accepts only audio and language, never an expected answer or hints', () => {
  assert.deepEqual(validateReadingAudio(recording()), recording());
  for (const key of ['target', 'expected', 'hotwords', 'prompt'])
    assert.throws(() => validateReadingAudio({ ...recording(), [key]: 'dad' }), ReadingAsrError);
});
test('rejects unsupported language, malformed PCM and overlong audio', () => {
  for (const value of [
    null,
    {},
    { ...recording(), language: 'zh-CN' },
    { ...recording(), audio: 'invalid' },
    recording(46),
  ])
    assert.throws(() => validateReadingAudio(value), ReadingAsrError);
  const audio = Buffer.from(recording().audio, 'base64');
  audio.writeUInt32LE(48000, 24);
  assert.throws(
    () => validateReadingAudio({ language: 'en-US', audio: audio.toString('base64') }),
    ReadingAsrError,
  );
});
test('missing recognizer reports unavailable instead of substituting another engine', async () => {
  await assert.rejects(
    transcribeReading(recording(), {
      python: '/missing/python',
      modelDir: '/missing/model',
      script: '/missing/script',
    }),
    (error: unknown) => error instanceof ReadingAsrError && error.status === 503,
  );
});

test('cancelled inference terminates its worker; unexpected engine cannot become a result',async()=>{
  const {mkdtemp,writeFile,rm}=await import('node:fs/promises');
  const {tmpdir}=await import('node:os');const {join}=await import('node:path');
  const folder=await mkdtemp(join(tmpdir(),'reading-worker-test-'));
  const modelDir=join(folder,'sense-voice');
  const {mkdir}=await import('node:fs/promises');await mkdir(modelDir);
  for(const name of ['model.int8.onnx','tokens.txt']) await writeFile(join(modelDir,name),'fixture');
  await writeFile(join(folder,'silero_vad.onnx'),'fixture');
  const script=join(folder,'worker.cjs'),options={python:process.execPath,modelDir,script};
  try {
    await writeFile(script,"process.stdin.resume(); setTimeout(()=>{},60000);");
    const controller=new AbortController();const pending=transcribeReading(recording(),options,controller.signal);
    controller.abort();await assert.rejects(pending,(error:unknown)=>error instanceof ReadingAsrError&&error.status===499);
    await writeFile(script,"process.stdin.resume(); process.stdin.on('end',()=>console.log(JSON.stringify({text:'dad',engine:'other'})));");
    await assert.rejects(transcribeReading(recording(),options),(error:unknown)=>error instanceof ReadingAsrError&&error.status===502);
  } finally {await rm(folder,{recursive:true,force:true});}
});
