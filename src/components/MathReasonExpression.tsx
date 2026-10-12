import { useCallback, useEffect, useRef, useState } from 'react';
import { blobDataUrl, checkCourse, recordingToWav, type CourseAssessmentRequest, type CourseAssessmentResult } from '../courseAssessment';
import { recordMathEvidence } from '../mathLearning';
import { stopSpeaking } from '../speech';
import { useStore } from '../store';
import { useMathLessonTaskProgress } from './MathTextbookTaskPack';
import '../math-teaching.css';

/** 一次表达直接交给 AI 检查，不再另填答案或做关系选择。 */
export default function MathReasonExpression({ lessonId, question, options, answer, onReady }: { lessonId: string; question: string; options: string[]; answer: number; onReady: () => void }) {
  const childId = useStore(s => s.activeChildId);
  const [said, setSaid] = useMathLessonTaskProgress('reason-said-v1', '');
  const [, setShared] = useMathLessonTaskProgress('reason-shared-v1', false);
  const [, setReady] = useMathLessonTaskProgress('reason-checked-v1', false);
  const [result, setResult] = useMathLessonTaskProgress<CourseAssessmentResult | null>('reason-ai-result-v1', null);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [composing, setComposing] = useState(false);
  const [message, setMessage] = useState('');
  const host = useRef<HTMLElement>(null);
  const active = useRef(true);
  const generation = useRef(0);
  const request = useRef<AbortController | null>(null);
  const debounce = useRef<number>();
  const recordingTimer = useRef<number>();
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const dirty = useRef(false);
  const lastChecked = useRef('');
  const evidence = useRef<Pick<CourseAssessmentRequest, 'answer' | 'audio'> | null>(null);
  const latest = useRef({ childId, lessonId, question, options, answer, said, onReady, setShared, setReady, setResult });
  latest.current = { childId, lessonId, question, options, answer, said, onReady, setShared, setReady, setResult };

  const cancel = useCallback(() => {
    generation.current++;
    request.current?.abort();
    window.clearTimeout(debounce.current);
    setBusy(false);
  }, []);
  const check = useCallback(async (input: Pick<CourseAssessmentRequest, 'answer' | 'audio'>) => {
    if (!active.current || host.current?.closest('[hidden]') || (!input.answer?.trim() && !input.audio)) return;
    const key = JSON.stringify(input);
    if (key === lastChecked.current) return;
    cancel(); dirty.current = false; lastChecked.current = key; evidence.current = input;
    const current = generation.current;
    const controller = new AbortController(); request.current = controller;
    const task = latest.current;
    setBusy(true); setMessage(''); task.setResult(null);
    const timeout = window.setTimeout(() => controller.abort(), 65_000);
    try {
      const report = await checkCourse({ subject: '数学', lessonId: task.lessonId, taskId: 'reason-expression',
        prompt: `${task.question}。参考意思：${task.options[task.answer]}。孩子说出一个合理的相关理由即可，意思接近就通过，不要求复述参考答案或展开所有步骤。`,
        criteria: ['看核心意思：围绕问题表达一个合理理由，与参考意思接近或属于其他正确解释即通过。接受口语、短句、省略和不规范措辞，不要求逐项说齐观察点、数量和操作步骤。只有明显数学错误、离题或没有实际表达时才需再试。'], requirement: 'answer', ...input,
      }, controller.signal);
      if (!active.current || current !== generation.current || host.current?.closest('[hidden]')) return;
      task.setResult(report);
      if (report.verdict === 'pass') {
        task.setShared(true); task.setReady(true); task.onReady();
        recordMathEvidence(task.childId, { lessonId: task.lessonId, taskId: 'reason-expression', objective: '表达数学理由', level: 'independent', source: 'ai', context: 'reason', note: report.feedback });
      }
    } catch (error) {
      if (active.current && current === generation.current) {
        lastChecked.current = '';
        setMessage(controller.signal.aborted ? '没有检查成功，点“再试一次”就好。' : error instanceof Error ? error.message : '没有检查成功，点“再试一次”就好。');
      }
    } finally {
      window.clearTimeout(timeout);
      if (active.current && current === generation.current) setBusy(false);
    }
  }, [cancel]);

  useEffect(() => {
    if (!dirty.current || !said.trim() || composing || recording || preparing) return;
    debounce.current = window.setTimeout(() => void check({ answer: said.trim() }), 1800);
    return () => window.clearTimeout(debounce.current);
  }, [said, composing, recording, preparing, check]);
  useEffect(() => {
    active.current = true;
    const stop = () => {
      cancel(); dirty.current = false;
      window.clearTimeout(recordingTimer.current);
      if (recorder.current?.state === 'recording') recorder.current.stop();
      stream.current?.getTracks().forEach(track => track.stop());
    };
    const observer = new MutationObserver(() => {
      if (host.current?.closest('[hidden]')) { stop(); setRecording(false); setPreparing(false); }
    });
    for (let node = host.current?.parentElement; node; node = node.parentElement) observer.observe(node, { attributes: true, attributeFilter: ['hidden'] });
    return () => { active.current = false; observer.disconnect(); stop(); };
  }, [cancel]);

  const edit = (value: string) => {
    cancel(); lastChecked.current = ''; dirty.current = true; evidence.current = null;
    setResult(null); setMessage(''); setSaid(value);
  };
  const startVoice = async () => {
    if (preparing || recording) return;
    cancel(); dirty.current = false; lastChecked.current = ''; evidence.current = null;
    setResult(null); setMessage(''); setSaid(''); setPreparing(true); stopSpeaking();
    const operation = generation.current;
    let input: MediaStream | null = null;
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('麦克风暂时不能用，可以把想法写下来。');
      input = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!active.current || operation !== generation.current) { input.getTracks().forEach(track => track.stop()); return; }
      stream.current = input;
      const media = new MediaRecorder(input); recorder.current = media;
      const recordingInput = input;
      const chunks: BlobPart[] = [];
      media.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      media.onstop = async () => {
        window.clearTimeout(recordingTimer.current); recordingInput.getTracks().forEach(track => track.stop());
        if (!active.current || operation !== generation.current) return;
        setRecording(false); setPreparing(true);
        try {
          const wav = await recordingToWav(new Blob(chunks, { type: media.mimeType }));
          const url = await blobDataUrl(wav);
          if (active.current && operation === generation.current) {
            setPreparing(false);
            void check({ audio: { data: url.split(',')[1], format: 'wav' } });
          }
        } catch {
          if (active.current && operation === generation.current) setMessage('没有听清，点“我来讲理由”再说一次，也可以写下来。');
        } finally { if (active.current && operation === generation.current) setPreparing(false); }
      };
      media.start(); setRecording(true);
      recordingTimer.current = window.setTimeout(() => { if (media.state === 'recording') media.stop(); }, 44_000);
    } catch (error) {
      input?.getTracks().forEach(track => track.stop());
      if (active.current && operation === generation.current) setMessage(error instanceof Error ? error.message : '请允许使用麦克风，也可以把想法写下来。');
    } finally { if (active.current && operation === generation.current) setPreparing(false); }
  };

  return <section className="math-reason-expression math-reason-simple" ref={host} aria-label="用自己的方式讲理由">
    <header className="math-reason-heading"><h3>{question}</h3><p>写下你的想法，或者说给我听。说完、写完，我来检查。</p></header>
    <label className="math-reason-input">我的想法<textarea aria-label="我的数学理由" value={said} disabled={recording || preparing} maxLength={240} placeholder="我这样做是因为……" onChange={event => edit(event.target.value)} onCompositionStart={() => { cancel(); lastChecked.current = ''; setResult(null); setComposing(true); }} onCompositionEnd={() => setComposing(false)} onBlur={event => { if (dirty.current && !composing && !recording && !preparing) void check({ answer: event.currentTarget.value.trim() }); }} /></label>
    <div className="math-reason-actions"><button type="button" className="mt-mic" disabled={preparing} onClick={() => recording ? recorder.current?.stop() : void startVoice()}>{recording ? '说完了' : preparing ? '正在准备…' : '🎤 我来讲理由'}</button><span>{recording ? '正在听，说完点一下“说完了”。' : busy ? '正在检查你的想法…' : preparing ? '正在听你的录音…' : '写完后会自动检查'}</span></div>
    <div className="math-reason-feedback" aria-live="polite" aria-busy={busy}>
      {result && <div role="status" className={`math-reason-result ${result.verdict}`}><b>{result.verdict === 'pass' ? '✓ 说得对！' : '再想一想'}</b><p>{result.feedback}</p></div>}
      {message && <div role="status"><p>{message}</p>{evidence.current && <button type="button" disabled={busy || preparing || recording} onClick={() => evidence.current && void check(evidence.current)}>再试一次</button>}</div>}
    </div>
  </section>;
}
