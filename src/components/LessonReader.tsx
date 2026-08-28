import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type TouchEvent as RTouchEvent,
} from 'react';
import { pinyin } from 'pinyin-pro';
import { speakSeq, speakOnce, stopSpeaking, playSfx } from '../speech';
import { compareText, compareTime, estimateSec, judge, judgeTime, type CompareResult } from '../speechCompare';
import { themeEmojis } from '../content/lessonTheme';
import { useI18n } from '../i18n';
import CharCard from './CharCard';

interface Props {
  text: string;
  words: string[];
  mode: 'read' | 'listen';
  onDone: () => void;
  /** 课文标题（书页页眉显示） */
  title?: string;
  /** 本课分词得到的真词表（构建期 segmentit 生成） */
  textWords?: string[];
  /** 朗读语言（英语课文用 en，中文用 zh） */
  speechLang?: 'zh' | 'en';
  /** 中文翻译（英语课文：与 text 段落结构一致，逐段对照） */
  translation?: string;
  /** 是否高亮本课关键词/生字（数学例题内容默认不高亮，保持课本素净） */
  highlightWords?: boolean;
}

const HAN = /[\u4e00-\u9fff]/;

/** 看课文书页：每页约容纳的字数（接近真实书页密度，一篇普通课文 1~2 页） */
const PAGE_LIMIT = 800;

type FollowPhase = 'idle' | 'speaking' | 'prompt' | 'recording' | 'review';

/** 浏览器语音识别的最小结构化类型（兼容 SpeechRecognition / webkitSpeechRecognition） */
interface SR {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: unknown) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SRConstructor = new () => SR;

function srCtor(): SRConstructor | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as {
    SpeechRecognition?: SRConstructor;
    webkitSpeechRecognition?: SRConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

interface TranscriptEvent {
  resultIndex: number;
  results: { isFinal: boolean; [i: number]: { transcript: string } }[];
}

/** 课文阅读器：看课文(自己读/点段朗读) + 听读(听一遍 + 逐句跟读录音) */
export default function LessonReader({ text, words, mode, onDone, title, textWords, speechLang = 'zh', translation, highlightWords = true }: Props) {
  const { t } = useI18n();
  const paras = useMemo(() => text.split('\n').map((s) => s.trim()).filter(Boolean), [text]);
  const wordSet = useMemo(() => new Set(words.join('')), [words]);
  const [showPinyin, setShowPinyin] = useState(false);
  // 英语课文：注音改为"翻译"开关
  const [showTrans, setShowTrans] = useState(false);
  const isEnglish = speechLang === 'en';
  const [slow, setSlow] = useState(false);
  const [activeChar, setActiveChar] = useState<string | null>(null);
  // 看课文：点段朗读高亮
  const [readingPara, setReadingPara] = useState(-1);
  // 看课文：书页分页（长课文翻页）
  const [page, setPage] = useState(0);
  const [flip, setFlip] = useState<{ to: number; dir: 1 | -1 } | null>(null);
  const touchXRef = useRef(-1);
  // 听读：听一遍 + 逐句跟读
  const [playing, setPlaying] = useState(false);
  const [activeSentence, setActiveSentence] = useState(-1);
  const [followIdx, setFollowIdx] = useState(-1);
  const [phase, setPhase] = useState<FollowPhase>('idle');
  const [micError, setMicError] = useState(false);
  const [compare, setCompare] = useState<CompareResult | null>(null);
  const [srError, setSrError] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recUrlRef = useRef<string | null>(null);
  const recognitionRef = useRef<SR | null>(null);
  const transcriptRef = useRef('');
  // 轻量打分：音量检测（记录孩子开口朗读的时长）
  const meterCtxRef = useRef<AudioContext | null>(null);
  const meterTimerRef = useRef<number | null>(null);
  const voiceMsRef = useRef(0);
  const recStartRef = useRef(0);

  // 每段逐字拼音（与字符一一对应）
  const paraPy = useMemo(
    () => paras.map((p) => pinyin(p, { toneType: 'symbol', type: 'array', nonZh: 'spaced' })),
    [paras],
  );

  // 英语课文中文翻译（与 text 段落结构一致，逐段对照）
  const transLines = useMemo(
    () => (translation ? translation.split('\n').map((s) => s.trim()) : []),
    [translation],
  );

  // 长课文按段落分页：累积到约一页字数后翻页（短课文只有一页）
  const pages = useMemo(() => {
    const result: number[][] = [];
    let cur: number[] = [];
    let len = 0;
    paras.forEach((p, pi) => {
      const pl = p.length;
      if (cur.length > 0 && len + pl > PAGE_LIMIT) {
        result.push(cur);
        cur = [];
        len = 0;
      }
      cur.push(pi);
      len += pl;
    });
    if (cur.length > 0) result.push(cur);
    return result;
  }, [paras]);

  const sentences = useMemo(
    () => text.split(/[。！？；\n]+/).map((s) => s.trim()).filter(Boolean),
    [text],
  );

  // 课文主题配图（由分词结果匹配内容，像真实课本一样配图）
  const illustration = useMemo(() => themeEmojis(textWords ?? []), [textWords]);

  const rate = slow ? 0.8 : 0.95;

  const setRec = (url: string | null) => {
    if (recUrlRef.current) URL.revokeObjectURL(recUrlRef.current);
    recUrlRef.current = url;
  };

  // 卸载时释放录音资源并停止朗读（切步骤/切页面立即中断"听一遍"）
  useEffect(() => {
    const rec = recRef;
    const stream = streamRef;
    const urlRef = recUrlRef;
    const sr = recognitionRef;
    return () => {
      stopSpeaking();
      try {
        rec.current?.stop();
      } catch {
        /* 已停止 */
      }
      stream.current?.getTracks().forEach((tr) => tr.stop());
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      try {
        sr.current?.abort();
      } catch {
        /* 已停止 */
      }
      if (meterTimerRef.current !== null) window.clearInterval(meterTimerRef.current);
      try {
        void meterCtxRef.current?.close();
      } catch {
        /* 已关闭 */
      }
    };
  }, []);

  const startRecording = async () => {
    setMicError(false);
    if (
      typeof window === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      setMicError(true);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream);
      recRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        setRec(URL.createObjectURL(blob));
        stream.getTracks().forEach((tr) => tr.stop());
        streamRef.current = null;
        const target = sentences[followIdx] ?? '';
        const recMs = Math.max(1, Date.now() - recStartRef.current);
        const voiceSec = voiceMsRef.current / 1000;
        const voiceRatio = Math.min(1, voiceMsRef.current / recMs);
        const refSec = estimateSec(target, rate);
        stopVolumeMeter();
        finishRecognition(() => {
          setCompare(
            transcriptRef.current
              ? compareText(target, transcriptRef.current)
              : compareTime(voiceSec, refSec, voiceRatio),
          );
          setPhase('review');
        });
      };
      rec.start();
      startRecognition();
      startVolumeMeter(stream);
      setPhase('recording');
    } catch {
      setMicError(true);
      setPhase('prompt');
    }
  };

  /** 开始语音识别（孩子朗读时同步转文字；不支持则静默降级） */
  const startRecognition = () => {
    transcriptRef.current = '';
    setSrError(null);
    const Ctor = srCtor();
    if (!Ctor) {
      recognitionRef.current = null;
      return;
    }
    const sr = new Ctor();
    sr.lang = speechLang === 'en' ? 'en-US' : 'zh-CN';
    sr.continuous = true;
    sr.interimResults = false;
    sr.maxAlternatives = 1;
    sr.onresult = (e) => {
      const ev = e as TranscriptEvent;
      let t = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        if (ev.results[i].isFinal) t += ev.results[i][0]?.transcript ?? '';
      }
      if (t) transcriptRef.current += t;
    };
    sr.onerror = (e) => {
      // Chrome 的语音识别依赖 Google 服务器，国内网络不可达时报 network 错误
      setSrError((e as { error?: string }).error ?? 'unknown');
    };
    recognitionRef.current = sr;
    try {
      sr.start();
    } catch {
      recognitionRef.current = null;
    }
  };

  /** 停止识别并等最终结果（带兜底超时，避免卡住） */
  const finishRecognition = (cb: () => void) => {
    const sr = recognitionRef.current;
    if (!sr) {
      cb();
      return;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      recognitionRef.current = null;
      cb();
    };
    sr.onend = finish;
    window.setTimeout(finish, 1500);
    try {
      sr.stop();
    } catch {
      finish();
    }
  };

  /** 音量检测：每 50ms 采样，累计孩子开口的毫秒数（纯本地，无网络） */
  const startVolumeMeter = (stream: MediaStream) => {
    try {
      const ctx = new AudioContext();
      meterCtxRef.current = ctx;
      void ctx.resume();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      src.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      voiceMsRef.current = 0;
      recStartRef.current = Date.now();
      meterTimerRef.current = window.setInterval(() => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        if (Math.sqrt(sum / data.length) > 0.02) voiceMsRef.current += 50;
      }, 50);
    } catch {
      /* 音量检测失败不影响录音 */
    }
  };

  const stopVolumeMeter = () => {
    if (meterTimerRef.current !== null) {
      window.clearInterval(meterTimerRef.current);
      meterTimerRef.current = null;
    }
    try {
      void meterCtxRef.current?.close();
    } catch {
      /* 已关闭 */
    }
    meterCtxRef.current = null;
  };

  const stopRecording = () => {
    try {
      recRef.current?.stop();
    } catch {
      /* 已停止 */
    }
  };

  const playBack = () => {
    if (!recUrlRef.current) return;
    const a = new Audio(recUrlRef.current);
    void a.play().catch(() => {});
  };

  const resetFollow = () => {
    setFollowIdx(-1);
    setPhase('idle');
    setMicError(false);
    setCompare(null);
    setSrError(null);
    setRec(null);
  };

  /** 退出跟读：停止朗读 + 取消录音（不让 onstop 再进入回放态） */
  const cancelRecording = () => {
    const rec = recRef.current;
    if (rec) {
      rec.onstop = null;
      try {
        rec.stop();
      } catch {
        /* 已停止 */
      }
    }
    recRef.current = null;
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    try {
      recognitionRef.current?.abort();
    } catch {
      /* 已停止 */
    }
    recognitionRef.current = null;
    stopVolumeMeter();
  };

  const exitFollow = () => {
    stopSpeaking();
    cancelRecording();
    resetFollow();
    setActiveSentence(-1);
  };

  const stopPlayAll = () => {
    stopSpeaking();
    setPlaying(false);
    setActiveSentence(-1);
  };

  const goFollow = (i: number) => {
    if (i >= sentences.length) {
      playSfx('win');
      resetFollow();
      setActiveSentence(-1);
      return;
    }
    setFollowIdx(i);
    setActiveSentence(i);
    setCompare(null);
    setSrError(null);
    setPhase('speaking');
    speakOnce(sentences[i], speechLang, rate, () => setPhase('prompt'));
  };

  const startFollow = () => {
    stopSpeaking();
    setPlaying(false);
    setRec(null);
    goFollow(0);
  };

  const nextFollow = () => {
    setRec(null);
    setMicError(false);
    goFollow(followIdx + 1);
  };

  const playAll = () => {
    resetFollow();
    setPlaying(true);
    setActiveSentence(0);
    speakSeq(sentences, speechLang, rate, (i) => setActiveSentence(i), () => {
      setPlaying(false);
      setActiveSentence(-1);
    });
  };

  /* 看课文：自己读 —— 书本式排版（3D 翻书动画）、点哪段读哪段、点字查字卡、拼音开关 */
  if (mode === 'read') {
    const readPara = (pi: number) => {
      setReadingPara(pi);
      speakOnce(paras[pi], speechLang, rate, () =>
        setReadingPara((prev) => (prev === pi ? -1 : prev)),
      );
    };

    const goTo = (to: number) => {
      if (flip || to === page || to < 0 || to >= pages.length) return;
      setFlip({ to, dir: to > page ? 1 : -1 });
    };
    const prevPage = () => goTo(page - 1);
    const nextPage = () => goTo(page + 1);

    // 触摸左右滑动翻页
    const onTouchStart = (e: RTouchEvent) => {
      touchXRef.current = e.touches[0].clientX;
    };
    const onTouchEnd = (e: RTouchEvent) => {
      if (touchXRef.current < 0 || pages.length <= 1) return;
      const dx = e.changedTouches[0].clientX - touchXRef.current;
      touchXRef.current = -1;
      if (dx < -48) nextPage();
      else if (dx > 48) prevPage();
    };

    // 单页内容：页眉 + 课文配图 + 正文 + 页脚（页码）
    const renderPage = (pi: number) => (
      <div className={`book-face ${isEnglish ? 'en' : ''}`}>
        <header className="book-header">
          <span className="book-orn" aria-hidden="true">
            ❀
          </span>
          <span className="book-header-title">{title}</span>
          <span className="book-orn" aria-hidden="true">
            ❀
          </span>
        </header>
        {pi === 0 && illustration.length > 0 && (
          <div className="book-illustration" aria-hidden="true">
            {illustration.map((e) => (
              <span key={e} className="book-illustration-emoji">
                {e}
              </span>
            ))}
          </div>
        )}
        <div className="book-body">
          {pages[pi].map((pIdx) => {
            const para = paras[pIdx];
            return (
              <div
                key={pIdx}
                className={`reader-para-block ${readingPara === pIdx ? 'reading' : ''}`}
                onClick={() => readPara(pIdx)}
              >
                <p className={`reader-para ${showPinyin ? 'with-py' : ''}`}>
                  {Array.from(para).map((ch, i) => {
                    if (!HAN.test(ch)) return <span key={i}>{ch}</span>;
                    const hl = highlightWords && wordSet.has(ch);
                    return (
                      <ruby
                        key={i}
                        className={`reader-char ${hl ? 'hl' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveChar(ch);
                        }}
                      >
                        {ch}
                        {showPinyin && <rt className="py">{paraPy[pIdx]?.[i] ?? ''}</rt>}
                      </ruby>
                    );
                  })}
                </p>
                {isEnglish && showTrans && transLines[pIdx] && (
                  <p className="reader-trans">{transLines[pIdx]}</p>
                )}
              </div>
            );
          })}
        </div>
        <footer className="book-footer">
          <span className="book-page-no">
            · {pi + 1} / {pages.length} ·
          </span>
        </footer>
      </div>
    );

    const onFlipEnd = () => {
      if (!flip) return;
      setPage(flip.to);
      setFlip(null);
    };

    return (
      <div className="lesson-reader read">
        <div className="reader-toolbar">
          {isEnglish ? (
            <button
              className={`tool-btn ${showTrans ? 'on' : ''}`}
              onClick={() => setShowTrans((v) => !v)}
            >
              🔤 {t('translate')}
            </button>
          ) : (
            <button
              className={`tool-btn ${showPinyin ? 'on' : ''}`}
              onClick={() => setShowPinyin((v) => !v)}
            >
              🔤 {t('pinyinOn')}
            </button>
          )}
          <button className={`tool-btn ${slow ? 'on' : ''}`} onClick={() => setSlow((v) => !v)}>
            🐢 {t('slow')}
          </button>
          <button className="tool-btn done" onClick={onDone}>
            ✅ {t('readDone')}
          </button>
        </div>
        <p className="tap-para-tip">👆 {t('tapParaTip')}</p>

        <div className="book-wrap">
          {pages.length > 1 && (
            <button
              className="book-arrow"
              onClick={prevPage}
              disabled={!!flip || page === 0}
              aria-label={t('prevPage')}
            >
              ◀
            </button>
          )}

          <div
            className={`book ${flip ? 'turning' : ''}`}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {flip && <div className="book-layer under">{renderPage(flip.to)}</div>}
            <div
              className={`book-layer over ${flip ? (flip.dir === 1 ? 'flip-next' : 'flip-prev') : ''}`}
              onAnimationEnd={onFlipEnd}
            >
              {renderPage(page)}
            </div>
          </div>

          {pages.length > 1 && (
            <button
              className="book-arrow"
              onClick={nextPage}
              disabled={!!flip || page === pages.length - 1}
              aria-label={t('nextPage')}
            >
              ▶
            </button>
          )}
        </div>

        {activeChar && (
          <CharCard
            char={activeChar}
            onClose={() => setActiveChar(null)}
            context={text}
            textWords={textWords}
          />
        )}
      </div>
    );
  }

  /* 听读：听一遍（逐句高亮）+ 逐句跟读录音（听原句 → 轮到你 → 录音 → 回放对比 → 下一句） */
  const parts: { s: string }[] = [];
  const re = /[^。！？；\n]+[。！？；]?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) parts.push({ s: m[0] });

  return (
    <div className="lesson-reader listen">
      <div className="listen-toolbar">
        <button className={`tool-btn ${slow ? 'on' : ''}`} onClick={() => setSlow((v) => !v)}>
          🐢 {t('slow')}
        </button>
        <button
          className="tool-btn"
          onClick={playing ? stopPlayAll : playAll}
          disabled={phase !== 'idle'}
        >
          {playing ? `⏹ ${t('stopListen')}` : `▶️ ${t('listenAll')}`}
        </button>
        <button className="tool-btn done" onClick={phase !== 'idle' ? exitFollow : startFollow}>
          {phase !== 'idle' ? `✖️ ${t('exitFollow')}` : `🎤 ${t('followRead')}`}
        </button>
        <button className="tool-btn gold" onClick={onDone}>
          ✅ {t('listenDone')}
        </button>
      </div>

      {phase !== 'idle' && (
        <div className="follow-card">
          <span className="follow-count">
            {followIdx + 1}/{sentences.length}
          </span>
          <div className="follow-hint">
            {phase === 'speaking' && <>🔊 {t('listenThis')}…</>}
            {phase === 'prompt' && !micError && <>🎤 {t('yourTurn')}</>}
            {phase === 'prompt' && micError && <span className="mic-err">⚠️ {t('micNeed')}</span>}
            {phase === 'recording' && <>🔴 {t('recording')}</>}
            {phase === 'review' &&
              (compare ? <>🎉 {t('compareTitle')}</> : <>🎙️ {t('listenMine')}</>)}
          </div>

          {phase === 'review' && compare && compare.kind === 'text' && (
            <div className="compare-box">
              <div className="compare-stars">{'⭐'.repeat(judge(compare.score).stars)}</div>
              <div className="compare-line">
                {t('compareChars', { n: compare.matched, total: compare.total })}
              </div>
              <div className="compare-judge">{t(judge(compare.score).key)}</div>
            </div>
          )}
          {phase === 'review' && compare && compare.kind === 'time' && (
            <div className="compare-box">
              <div className="compare-stars">{'⭐'.repeat(judgeTime(compare).stars)}</div>
              <div className="compare-line">
                {t('compareSeconds', {
                  n: compare.voiceSec.toFixed(1),
                  m: compare.refSec.toFixed(1),
                })}
              </div>
              <div className="compare-judge">{t(judgeTime(compare).key)}</div>
              <div className="compare-note">ℹ️ {t('timeFallback')}</div>
            </div>
          )}
          {phase === 'review' && !compare && (
            <div className="compare-note">
              ℹ️{' '}
              {srError === 'network' || srError === 'service-not-allowed'
                ? t('srNetErr')
                : srError === 'not-allowed'
                  ? t('srMicDenied')
                  : srError === 'no-speech'
                    ? t('srNoSpeech')
                    : t('noScore')}
            </div>
          )}

          <div className="follow-actions">
            {phase === 'prompt' && (
              <>
                <button
                  className="tool-btn"
                  onClick={() => speakOnce(sentences[followIdx], speechLang, rate)}
                >
                  🔊 {t('hearOriginal')}
                </button>
                <button className="tool-btn warn" onClick={startRecording}>
                  🎤 {t('startRecord')}
                </button>
                <button className="tool-btn" onClick={nextFollow}>
                  {t('skipRecord')} ➡️
                </button>
              </>
            )}
            {phase === 'recording' && (
              <button className="tool-btn warn" onClick={stopRecording}>
                ⏹ {t('stopRecord')}
              </button>
            )}
            {phase === 'review' && (
              <>
                <button className="tool-btn done" onClick={playBack}>
                  🎵 {t('playMyVoice')}
                </button>
                <button
                  className="tool-btn"
                  onClick={() => speakOnce(sentences[followIdx], speechLang, rate)}
                >
                  🔊 {t('hearOriginal')}
                </button>
                <button className="tool-btn warn" onClick={startRecording}>
                  🎤 {t('reRecord')}
                </button>
                <button className="tool-btn done" onClick={nextFollow}>
                  {t('nextSentence')} ➡️
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="listen-text">
        {parts.map((p, i) => (
          <span
            key={i}
            className={`listen-sentence ${activeSentence === i ? 'active' : ''}`}
            onClick={() => {
              speakOnce(p.s, speechLang, rate);
              setActiveSentence(i);
            }}
          >
            {p.s}
          </span>
        ))}
      </div>
    </div>
  );
}
