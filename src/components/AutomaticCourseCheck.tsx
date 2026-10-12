import { useCallback, useEffect, useRef, useState } from 'react';
import { blobDataUrl, checkCourse, recordingToWav, type CourseAssessmentRequest, type CourseAssessmentResult } from '../courseAssessment';
import { stopSpeaking } from '../speech';
import './automatic-course-check.css';

type Props = Omit<CourseAssessmentRequest, 'audio'> & {
  onPass: (result: CourseAssessmentResult) => void;
  voice?: boolean;
};

/** 使用活动里的原答案自动检查；没有原输入时才提供一个作答入口。 */
export default function AutomaticCourseCheck({ subject, lessonId, taskId, prompt, criteria, requirement = 'answer', answer, exampleAnswer, supported = false, referenceAudio, onPass, voice }: Props) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(false);
  const [recording, setRecording] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [composing, setComposing] = useState(false);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<CourseAssessmentResult | null>(null);
  const host = useRef<HTMLDivElement>(null);
  const active = useRef(true);
  const generation = useRef(0);
  const request = useRef<AbortController | null>(null);
  const pending = useRef(false);
  const debounce = useRef<number>();
  const recordingTimer = useRef<number>();
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const lastChecked = useRef('');
  const evidence = useRef<Pick<CourseAssessmentRequest, 'answer' | 'audio'> | null>(null);
  const text = answer ?? note;
  const currentText = useRef(text);
  currentText.current = text;
  const dirty = useRef(Boolean(answer?.trim()));
  const latest = useRef({ subject, lessonId, taskId, prompt, criteria, requirement, supported, referenceAudio, exampleAnswer, onPass, answer });
  latest.current = { subject, lessonId, taskId, prompt, criteria, requirement, supported, referenceAudio, exampleAnswer, onPass, answer };
  const cancel = useCallback(() => {
    generation.current++; request.current?.abort(); window.clearTimeout(debounce.current);
    if (pending.current) lastChecked.current = '';
    pending.current = false; setBusy(false);
  }, []);
  const check = useCallback(async (input: Pick<CourseAssessmentRequest, 'answer' | 'audio'>) => {
    const task = latest.current;
    if (!active.current || host.current?.closest('[hidden]') || (task.requirement === 'audio' ? !input.audio : !input.answer?.trim() && !input.audio)) return;
    const key = JSON.stringify(input);
    if (lastChecked.current === key) return;
    cancel(); dirty.current = false; lastChecked.current = key; evidence.current = input;
    const current = generation.current;
    const controller = new AbortController(); request.current = controller;
    pending.current = true; setBusy(true); setResult(null); setMessage('');
    const timeout = window.setTimeout(() => controller.abort(), 65_000);
    try {
      const report = await checkCourse({ subject: task.subject, lessonId: task.lessonId, taskId: task.taskId, prompt: task.prompt,
        criteria: task.criteria, requirement: task.requirement, supported: task.supported, exampleAnswer: task.exampleAnswer, referenceAudio: task.referenceAudio, ...input,
      }, controller.signal);
      if (!active.current || current !== generation.current || host.current?.closest('[hidden]') || (input.answer !== undefined && task.answer !== latest.current.answer)) return;
      setResult(report); if (report.verdict === 'pass') task.onPass(report);
    } catch (error) {
      if (active.current && current === generation.current) {
        lastChecked.current = '';
        setMessage(controller.signal.aborted ? '这次没有检查成功，可以再试一次。' : error instanceof Error ? error.message : '这次没有检查成功，可以再试一次。');
      }
    } finally {
      window.clearTimeout(timeout);
      if (active.current && current === generation.current) { pending.current = false; setBusy(false); }
    }
  }, [cancel]);
  const previousAnswer = useRef(answer);
  useEffect(() => {
    if (previousAnswer.current === answer) return;
    previousAnswer.current = answer;
    cancel(); lastChecked.current = ''; dirty.current = true; evidence.current = null; setResult(null); setMessage('');
    window.clearTimeout(recordingTimer.current);
    if (recorder.current?.state === 'recording') recorder.current.stop();
    stream.current?.getTracks().forEach(track => track.stop()); setRecording(false); setPreparing(false);
  }, [answer, cancel]);
  const criteriaKey = JSON.stringify(criteria);
  useEffect(() => {
    cancel(); lastChecked.current = ''; setNote(''); setResult(null); setMessage('');
    dirty.current = Boolean(latest.current.answer?.trim());
    window.clearTimeout(recordingTimer.current);
    if (recorder.current?.state === 'recording') recorder.current.stop();
    stream.current?.getTracks().forEach(track => track.stop()); setRecording(false); setPreparing(false);
  }, [subject, lessonId, taskId, prompt, requirement, supported, exampleAnswer, referenceAudio, criteriaKey, cancel]);
  useEffect(() => {
    if (!visible || !dirty.current || !text.trim() || requirement === 'audio' || composing || recording || preparing) return;
    debounce.current = window.setTimeout(() => void check({ answer: text.trim() }), 1800);
    return () => window.clearTimeout(debounce.current);
  }, [text, requirement, composing, recording, preparing, visible, criteriaKey, prompt, supported, exampleAnswer, referenceAudio, check]);
  useEffect(() => {
    active.current = true;
    const stop = () => {
      cancel(); dirty.current = false; window.clearTimeout(recordingTimer.current);
      if (recorder.current?.state === 'recording') recorder.current.stop();
      stream.current?.getTracks().forEach(track => track.stop());
    };
    const updateVisibility = () => {
      const shown = !host.current?.closest('[hidden]');
      if (!shown) { stop(); setRecording(false); setPreparing(false); }
      else if (!lastChecked.current && currentText.current.trim()) dirty.current = true;
      setVisible(shown);
    };
    const observer = new MutationObserver(updateVisibility);
    updateVisibility();
    for (let node = host.current?.parentElement; node; node = node.parentElement) observer.observe(node, { attributes: true, attributeFilter: ['hidden'] });
    const scope = host.current?.closest('main') ?? host.current?.parentElement;
    const beginComposition = () => { cancel(); lastChecked.current = ''; setComposing(true); };
    const endComposition = () => setComposing(false);
    scope?.addEventListener('compositionstart', beginComposition, true);
    scope?.addEventListener('compositionend', endComposition, true);
    return () => {
      active.current = false; observer.disconnect(); stop();
      scope?.removeEventListener('compositionstart', beginComposition, true); scope?.removeEventListener('compositionend', endComposition, true);
    };
  }, [cancel]);
  const edit = (value: string) => {
    cancel(); dirty.current = true; lastChecked.current = ''; evidence.current = null; setResult(null); setMessage(''); setNote(value);
  };
  const startVoice = async () => {
    if (preparing || recording) return;
    cancel(); dirty.current = false; lastChecked.current = ''; evidence.current = null;
    setResult(null); setMessage(''); setPreparing(true); stopSpeaking();
    const operation = generation.current;
    let input: MediaStream | null = null;
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('麦克风暂时不能用，请允许使用麦克风后再试。');
      input = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!active.current || operation !== generation.current) { input.getTracks().forEach(track => track.stop()); return; }
      stream.current = input;
      const media = new MediaRecorder(input); recorder.current = media;
      const recordingInput = input; const chunks: BlobPart[] = [];
      media.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      media.onstop = async () => {
        window.clearTimeout(recordingTimer.current); recordingInput.getTracks().forEach(track => track.stop());
        if (!active.current || operation !== generation.current) return;
        setRecording(false); setPreparing(true);
        try {
          const wav = await recordingToWav(new Blob(chunks, { type: media.mimeType })); const url = await blobDataUrl(wav);
          if (active.current && operation === generation.current) { setPreparing(false); void check({ audio: { data: url.split(',')[1], format: 'wav' } }); }
        } catch {
          if (active.current && operation === generation.current) setMessage('没有听清，可以再说一次。');
        } finally { if (active.current && operation === generation.current) setPreparing(false); }
      };
      media.start(); setRecording(true);
      recordingTimer.current = window.setTimeout(() => { if (media.state === 'recording') media.stop(); }, 44_000);
    } catch {
      input?.getTracks().forEach(track => track.stop());
      if (active.current && operation === generation.current) setMessage('请允许使用麦克风后再说一次。');
    } finally { if (active.current && operation === generation.current) setPreparing(false); }
  };
  const showInput = requirement === 'answer' && answer === undefined;
  const showVoice = voice ?? (requirement === 'audio' || answer === undefined);
  return <div className="automatic-course-check" ref={host} aria-label="自动检查">
    {showInput && <label>我的想法<textarea aria-label="我的作答" value={note} maxLength={3000} disabled={recording || preparing} placeholder="写下来，或者说给我听" onChange={event => edit(event.target.value)} onBlur={event => { if (dirty.current && !composing && !recording && !preparing) void check({ answer: event.currentTarget.value.trim() }); }} /></label>}
    {showVoice && <div className="course-answer-voice"><button type="button" disabled={preparing} onClick={() => recording ? recorder.current?.stop() : void startVoice()}>{recording ? '说完了' : preparing ? '正在准备…' : '🎤 我来说'}</button>{recording && <span>正在听，说完点一下“说完了”。</span>}</div>}
    <div aria-live="polite" aria-busy={busy}>
      {busy && <p role="status">正在看看你的想法…</p>}
      {result && <div role="status" className={`course-check-result ${result.verdict}`}><b>{result.verdict === 'pass' ? '✓ 完成了' : '再想一想'}</b><p>{result.feedback}</p></div>}
      {message && <div role="status"><p>{message}</p>{evidence.current && <button type="button" disabled={busy || preparing || recording} onClick={() => evidence.current && void check(evidence.current)}>再试一次</button>}</div>}
    </div>
  </div>;
}
