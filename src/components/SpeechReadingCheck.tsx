import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useAsr } from '../speechAssess';
import { useLocalReadingAsr } from '../useLocalReadingAsr';
import { matchReading } from '../readingCheck';
import { stopEnglishNarration } from '../englishTabNarration';
import type { CourseAssessmentResult } from '../courseAssessment';
import './automatic-course-check.css';

export default function SpeechReadingCheck({ target, language = 'en-US', autoStart = false, onPass, presentation = 'inline', art, contextSentence }: {
  target: string; language?: 'en-US' | 'zh-CN'; autoStart?: boolean; onPass: (result: CourseAssessmentResult, assisted?: boolean) => void;
  presentation?: 'inline' | 'player'; art?: string; contextSentence?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [assisted, setAssisted] = useState(false);
  const activeTarget = assisted && contextSentence ? contextSentence : target;
  const singleWord = language === 'en-US' && activeTarget.trim().split(/\s+/).length === 1;
  const targetKey = `${language}:${activeTarget}`;
  const stopAsr = useRef<() => void>(() => {});
  const [heard, setHeard] = useState('');
  const playback = useRef<HTMLAudioElement>(null);
  const [replaying, setReplaying] = useState(false);
  const currentTarget = useRef(targetKey); currentTarget.current = targetKey;
  const completed = useRef(false);
  const [feedback, setFeedback] = useState('读完后系统自动检查，可以重复练习。');
  const [passed, setPassed] = useState(false);
  const [matchPercent, setMatchPercent] = useState<number | null>(null);
  const receiveReading = (said: string, candidates: readonly string[] = [said]) => {
    if (currentTarget.current !== targetKey || host.current?.closest('[hidden]')) return;
    const recognized = candidates.find(text => matchReading(activeTarget, text, language).pass) ?? said;
    const match = matchReading(activeTarget, recognized, language);
    // Keep the service's primary transcript visible, even when a genuine alternative matches.
    setHeard(said);
    setMatchPercent(Math.round(Math.min(match.coverage, match.precision) * 100));
    setPassed(match.pass);
    if (!match.pass) { if (singleWord) stopAsr.current(); setFeedback('识别结果与目标不同，可以回听本次录音或再读一次。'); return; }
    stopAsr.current();
    const feedback = assisted ? '已核对短句中的目标词，本次记为借助提示完成。' : '已自动核对读出的内容，与目标基本一致。';
    setFeedback(feedback);
    if (!completed.current) {
      completed.current = true;
      onPass({ verdict: 'pass', feedback, checks: [{ met: true, feedback: '读出的目标内容基本完整。' }, { met: true, feedback: '读出的内容与目标基本一致。' }] }, assisted);
    }
  };
  const browserAsr = useAsr(receiveReading, language, { continuous: !singleWord, interimResults: true, maxAlternatives: 5, stopOnSpeechEnd: singleWord, waitForAudio: true, captureMicrophone: true });
  const localAsr = useLocalReadingAsr(receiveReading, singleWord);
  const asr = language === 'en-US' ? localAsr : browserAsr;
  stopAsr.current = asr.stop;
  const start = useCallback(() => { playback.current?.pause(); setReplaying(false); stopEnglishNarration(); setHeard(''); completed.current = false; setPassed(false); setMatchPercent(null); setFeedback('正在听，请读屏幕里的目标内容。'); asr.start(); }, [asr.start]);
  useEffect(() => {
    playback.current?.pause(); asr.stop(); asr.clearRecording(); setReplaying(false); setHeard(''); completed.current = false; setPassed(false); setMatchPercent(null); setFeedback('读完后系统自动检查，可以重复练习。');
  }, [targetKey, asr.stop, asr.clearRecording]);
  useEffect(() => { setAssisted(false); }, [target, language]);
  const autoStarted = useRef('');
  useEffect(() => {
    if (autoStart && asr.supported && autoStarted.current !== targetKey) { autoStarted.current = targetKey; start(); }
  }, [autoStart, asr.supported, targetKey, start]);
  useEffect(() => {
    if (!asr.listening || asr.preparing || asr.finishing) return;
    const timer = window.setTimeout(() => { asr.finish(); }, singleWord ? 12_000 : 45_000);
    return () => window.clearTimeout(timer);
  }, [asr.listening, asr.preparing, asr.finishing, asr.finish, singleWord]);
  useEffect(() => {
    const observer = new MutationObserver(() => { if (host.current?.closest('[hidden]')) { playback.current?.pause(); setReplaying(false); asr.stop(); } });
    for (let node = host.current?.parentElement; node; node = node.parentElement) observer.observe(node, { attributes: true, attributeFilter: ['hidden'] });
    return () => observer.disconnect();
  }, [asr.stop]);
  useEffect(() => {
    const container = host.current;
    return () => container?.querySelector('audio')?.pause();
  }, []);
  const captureDetails = <>
    {asr.listening && !asr.preparing && asr.explicitTrack && <div className="reading-input-level" aria-label="麦克风输入音量"><span>收音</span><span className="reading-input-meter"><i style={{ width: `${asr.level * 100}%` }} /></span></div>}
    {!asr.listening && !asr.finishing && !passed && (asr.said || asr.error || asr.audioUrl) && <details className="reading-capture-details">
      <summary>检查收音</summary>
      {asr.device && <span className="reading-input-device">麦克风：{asr.device}</span>}
      <span>服务原文：{asr.said || asr.draft || '没有返回文字'}（{language === 'en-US' ? '本地英语识别' : language}）</span>
      {asr.audioUrl && <><audio ref={playback} src={asr.audioUrl} hidden onEnded={() => setReplaying(false)} /><button type="button" onClick={() => {
        if (replaying) { playback.current?.pause(); setReplaying(false); }
        else { stopEnglishNarration(); if (playback.current) { playback.current.currentTime = 0; void playback.current.play().then(() => setReplaying(true)).catch(() => setReplaying(false)); } }
      }}>{replaying ? '停止回听' : '回听本次录音'}</button><small>仅保留在本页，重新录音后清除。</small></>}
    </details>}
  </>;
  if (presentation === 'player') return <div className="speech-reading-check en-player-reading" ref={host} aria-label="自动跟读检查" data-reading-target={target} data-reading-engine={language === 'en-US' ? 'local' : 'browser'}>
    <div className={`en-player-art ${asr.listening ? 'on' : ''} ${passed ? 'pass' : ''}`}>
      {art ? <img src={art} alt="" draggable={false} /> : <span className="en-player-mic" aria-hidden="true">🎙️</span>}
      {asr.listening && <span className="en-player-wave" aria-hidden="true"><i /><i /><i /><i /><i /></span>}
      {passed && <span className="en-player-pass" aria-hidden="true">✓</span>}
    </div>
    <strong className="en-player-title" aria-label={target}>{target.split(/\s+/).map((word, index) => <span key={index} className="en-player-word" style={{ '--i': index } as CSSProperties}>{word}</span>)}</strong>
    {matchPercent !== null && <div className="en-player-meter" role="img" aria-label={`内容匹配 ${matchPercent}%`}><i style={{ width: `${matchPercent}%` }} /></div>}
    <p className="en-player-note" role="status">{!asr.supported ? '此浏览器不支持跟读' : asr.error || (passed ? '读对啦！' : asr.finishing ? '正在识别…' : asr.preparing ? '正在准备麦克风…' : asr.listening ? '正在听，请开始读'  : matchPercent !== null ? '识别结果未匹配' : feedback.includes('超时') ? '收音超时，再读一次' : feedback.startsWith('正在听') ? '没有返回识别结果' : '点麦克风开始跟读')}</p>
    {captureDetails}
    <div className="en-player-ops">
      <button type="button" className={`en-player-btn primary ${matchPercent === null ? 'big' : ''}`} disabled={!asr.supported || asr.preparing || asr.finishing} onClick={asr.listening ? asr.finish : start} aria-label={asr.listening ? '结束收音' : matchPercent !== null ? '重新读' : '开始跟读'}>{asr.listening ? '🎙' : matchPercent !== null ? '🔄' : '🎤'}</button>
    </div>
  </div>;
  return <div className="automatic-course-check speech-reading-check" ref={host} aria-label="自动跟读检查" data-reading-target={activeTarget} data-reading-engine={language === 'en-US' ? 'local' : 'browser'}>
    <div className="course-answer-voice"><button type="button" disabled={!asr.supported || asr.preparing || asr.finishing} onClick={asr.listening ? asr.finish : start}>{asr.finishing ? '正在识别…' : asr.preparing ? '正在准备麦克风…' : asr.listening ? '说完了，检查' : '开始读，自动检查'}</button></div>
    {assisted && <p className="reading-context-sentence" lang="en">{contextSentence}</p>}
    {(heard || asr.draft || asr.said) && <p className="reading-heard">听到：{asr.listening ? asr.draft || heard : heard || asr.said || asr.draft}</p>}
    <p role="status">{!asr.supported ? '当前浏览器不支持跟读，请换一个支持的浏览器再试。' : asr.error || (passed ? `✓ ${feedback}` : asr.finishing ? '正在核对识别结果…' : asr.preparing ? '等麦克风准备好，再开始读。' : !asr.listening && !asr.said && feedback.startsWith('正在听') ? '没有收到识别文字，请等“正在听”出现后再读。' : feedback)}</p>
    {captureDetails}
    {contextSentence && !passed && !asr.listening && (asr.error || matchPercent !== null || feedback.startsWith('正在听') || assisted) && <div className="reading-context-actions"><button type="button" onClick={() => { asr.stop(); setAssisted(value => !value); }}>{assisted ? '只读单词' : '放进短句再读'}</button></div>}
  </div>;
}
