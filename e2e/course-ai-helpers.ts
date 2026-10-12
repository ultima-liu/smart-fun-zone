import { type Locator, type Page } from '@playwright/test';

export const aiWav = (() => {
  const bytes = Buffer.alloc(44 + 1600 * 2);
  bytes.write('RIFF'); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVE', 8); bytes.write('fmt ', 12);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(16000, 24); bytes.writeUInt32LE(32000, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36); bytes.writeUInt32LE(bytes.length - 44, 40);
  return bytes;
})();
export async function mockCourseMicrophone(page: Page) {
  await page.route('**/api/reading-asr/transcribe', async route => {
    const result = await page.evaluate(() => ({ text: (window as any).__localReadingText ?? '', error: (window as any).__localReadingError }));
    await route.fulfill({ status: result.error ? 503 : 200, json: result.error ? {ok:false,error:result.error} : {ok:true,text:result.text,engine:'sense-voice'} });
  });
  await page.addInitScript(base64 => {
    const w = window as any;
    const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => {
      const track = { kind:'audio', readyState:'live', label:'测试麦克风', stop: () => { track.readyState='ended'; w.__courseMicStops = (w.__courseMicStops ?? 0) + 1; } };
      w.__courseMicTrack = track;
      return { getTracks: () => [track], getAudioTracks: () => [track] };
    } } });
    w.MediaRecorder = class {
      state = 'inactive'; mimeType = 'audio/wav'; onstop: (() => void) | null = null; ondataavailable: ((e: { data: Blob }) => void) | null = null;
      start() { this.state = 'recording'; }
      stop() { this.state = 'inactive'; queueMicrotask(() => { this.ondataavailable?.({ data: new Blob([bytes], { type: 'audio/wav' }) }); this.onstop?.(); }); }
    };
    w.SpeechRecognition = class {
      lang = ''; continuous = false; interimResults = false;
      onstart: any = null; onaudiostart: any = null; onresult: any = null; onend: any = null; onerror: any = null;
      start(track?: unknown) { w.__courseAsr = this; w.__courseAsrTrack = track; this.onstart?.(); this.onaudiostart?.(); }
      stop() { this.onend?.(); }
      abort() { this.onend?.(); }
    };
  }, aiWav.toString('base64'));
}
export async function sayReading(page: Page, scope: Locator, said?: string) {
  const check = await scope.getAttribute('data-reading-target') !== null ? scope : scope.locator('.speech-reading-check:visible').first();
  const button = check.getByRole('button', { name: /^(开始读，自动检查|开始跟读|重新读)$/ });
  if (await button.isVisible()) await button.click();
  const target = await check.getAttribute('data-reading-target');
  if (await check.getAttribute('data-reading-engine') === 'local') {
    await page.evaluate(text => { (window as any).__localReadingText=text; }, said ?? target ?? '');
    await check.getByRole('button', {name:/^(说完了，检查|结束收音)$/}).click();
    return;
  }
  await page.evaluate(text => {
    const rec = (window as any).__courseAsr;
    if (!rec) throw new Error('识别会话未启动');
    rec.onresult?.({ results: [[{ transcript: text }]] }); rec.onend?.();
  }, said ?? target ?? '');
}
export async function mockCourseAI(page: Page, respond?: (body: any) => {status?: number; verdict?: 'pass'|'retry'; feedback?: string}) {
  await page.route('**/api/course/assess', async route => {
    const body = route.request().postDataJSON();
    const outcome = respond?.(body) ?? {};
    const verdict = outcome.verdict ?? 'pass';
    const status = outcome.status ?? 200;
    await route.fulfill({ status, json: status === 200 ? { ok: true, result: {
      verdict, feedback: outcome.feedback ?? (verdict === 'pass' ? '这次作答符合要求。' : '请把数学关系说清楚，再试一次。'),
      checks: body.criteria.map(() => ({ met: verdict === 'pass', feedback: verdict === 'pass' ? '已核对实际作答。' : '还需要补充实际作答。' })),
    }} : { ok: false, error: 'AI 服务暂时不可用，请重试。' } });
  });
}
export async function answerCourseTask(scope: Locator, kind: 'answer'|'audio' = 'answer', answer = '两部分合起来得到整体。') {
  const check = scope.locator('.automatic-course-check:visible').first();
  if (kind === 'audio') {
    await check.getByRole('button', { name: '🎤 我来说', exact: true }).click();
    await check.getByRole('button', { name: '说完了', exact: true }).click();
  } else {
    await check.getByRole('textbox', { name: '我的作答', exact: true }).fill(answer);
  }
}
