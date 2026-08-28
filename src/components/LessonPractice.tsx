import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { pinyin } from 'pinyin-pro';
import { speak, playSfx } from '../speech';
import { useI18n } from '../i18n';
import { StarBurst } from './ui';
import { WORD_DICT } from '../content/wordDict';

type QType = 'hear' | 'pinyin' | 'fill' | 'sort' | 'find';

interface Opt {
  label: string;
  correct: boolean;
}

interface Q {
  type: QType;
  speakText?: string;
  showChar?: string;
  fillShown?: string;
  options?: Opt[];
  sentences?: string[];
}

const HAN = /[\u4e00-\u9fff]/;

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function uniqueHan(text: string): string[] {
  return [...new Set([...text].filter((c) => HAN.test(c)))];
}

function splitSentences(text: string): string[] {
  return text
    .split(/[。！？；\n]+/)
    .map((s) => s.trim())
    .filter((s) => [...s].filter((c) => HAN.test(c)).length >= 2);
}

/** 从课文生成整套练习：听音指字 / 看字拼音 / 选词填空 / 句子排序 / 课文寻字 */
function genQuestions(text: string, words: string[]): Q[] {
  const qs: Q[] = [];
  const allChars = uniqueHan(text);
  const wordPool = [...new Set(words.filter((w) => w.length === 1))];
  const sentences = splitSentences(text);

  // 听音指字
  const hearN = Math.min(3, wordPool.length);
  const hearPool = shuffle(wordPool);
  for (let i = 0; i < hearN; i++) {
    const ans = hearPool[i];
    const dist = shuffle(allChars.filter((c) => c !== ans)).slice(0, 3);
    if (dist.length < 3) continue;
    qs.push({
      type: 'hear',
      speakText: ans,
      options: shuffle([ans, ...dist]).map((c) => ({ label: c, correct: c === ans })),
    });
  }

  // 看字拼音
  const pyPool = shuffle(wordPool);
  for (let i = 0; i < Math.min(3, pyPool.length); i++) {
    const ans = pyPool[i];
    const ansPy = pinyin(ans, { toneType: 'symbol' });
    const dist = shuffle(allChars.filter((c) => c !== ans).map((c) => pinyin(c, { toneType: 'symbol' })))
      .filter((p) => p !== ansPy)
      .slice(0, 3);
    if (dist.length < 3) continue;
    qs.push({
      type: 'pinyin',
      showChar: ans,
      options: shuffle([ansPy, ...dist]).map((p) => ({ label: p, correct: p === ansPy })),
    });
  }

  // 选词填空（挖掉句中一个二字词）
  const fillSentence = sentences.find((s) => [...s].filter((c) => HAN.test(c)).length >= 4) ?? sentences[0];
  if (fillSentence) {
    const chars = [...fillSentence];
    const pairPool: string[] = [];
    for (let i = 0; i < chars.length - 1; i++) {
      if (HAN.test(chars[i]) && HAN.test(chars[i + 1])) pairPool.push(chars[i] + chars[i + 1]);
    }
    const uniqPairs = [...new Set(pairPool)];
    if (uniqPairs.length >= 2) {
      const ans = uniqPairs[Math.floor(Math.random() * uniqPairs.length)];
      const dist = shuffle(uniqPairs.filter((p) => p !== ans)).slice(0, 3);
      const shown = fillSentence.replace(ans, '＿＿');
      qs.push({
        type: 'fill',
        fillShown: shown,
        options: shuffle([ans, ...dist]).map((p) => ({ label: p, correct: p === ans })),
      });
    }
  }

  // 句子排序
  if (sentences.length >= 2) {
    const pickedSentences = shuffle(sentences).slice(0, Math.min(3, sentences.length));
    qs.push({ type: 'sort', sentences: pickedSentences });
  }

  // 课文寻字：哪个字在课文里出现过
  const inText = allChars[Math.floor(Math.random() * allChars.length)];
  const notIn = Object.keys(WORD_DICT).filter((c) => c !== inText && !allChars.includes(c));
  const dist = shuffle(notIn).slice(0, 3);
  if (dist.length === 3) {
    qs.push({
      type: 'find',
      options: shuffle([inText, ...dist]).map((c) => ({ label: c, correct: c === inText })),
    });
  }

  return qs.length >= 3 ? qs : qs.concat(
    hearN === 0
      ? [{ type: 'find', options: shuffle([inText, ...Object.keys(WORD_DICT).filter((c) => c !== inText).slice(0, 3)]).map((c) => ({ label: c, correct: c === inText })) }]
      : [],
  );
}

interface Props {
  text: string;
  words: string[];
  onFinish: (stars: number, correct: number, total: number) => void;
}

/** 课文练习：题目 100% 来自当前课文 */
export default function LessonPractice({ text, words, onFinish }: Props) {
  const { t } = useI18n();
  const questions = useMemo(() => genQuestions(text, words), [text, words]);
  const [idx, setIdx] = useState(0);
  const [showOK, setShowOK] = useState(false);
  const [wrongFlash, setWrongFlash] = useState(false);
  const [burst, setBurst] = useState<{ x: number; y: number } | null>(null);
  const [sortPicked, setSortPicked] = useState<string[]>([]);
  const firstTryRef = useRef(0);
  const wrongThisQRef = useRef(0);
  const doneRef = useRef(false);

  const q = questions[idx];
  const total = questions.length;

  // 听音指字：进入题目自动朗读一次（保留手动重听）
  useEffect(() => {
    if (q?.type === 'hear' && q.speakText) {
      const timer = window.setTimeout(() => speak(q.speakText!, 'zh', 0.85), 350);
      return () => window.clearTimeout(timer);
    }
  }, [idx, q?.type]);

  // 排序题句子打乱（渲染前固定，避免渲染期随机）
  const shuffledSentences = useMemo(
    () => (q.type === 'sort' && q.sentences ? shuffle(q.sentences) : []),
    [q.type, idx],
  );

  const advance = () => {
    setShowOK(false);
    setSortPicked([]);
    wrongThisQRef.current = 0;
    if (idx + 1 >= total) {
      if (!doneRef.current) {
        doneRef.current = true;
        const got = firstTryRef.current;
        const stars = got >= total * 0.8 ? 3 : got >= total * 0.5 ? 2 : 1;
        onFinish(stars, got, total);
      }
    } else {
      setIdx((i) => i + 1);
    }
  };

  const answer = (correct: boolean, e: MouseEvent) => {
    if (showOK) return;
    if (correct) {
      playSfx('collect');
      if (wrongThisQRef.current === 0) firstTryRef.current += 1;
      setBurst({ x: e.clientX, y: e.clientY });
      window.setTimeout(() => setBurst(null), 800);
      setShowOK(true);
      window.setTimeout(advance, 850);
    } else {
      playSfx('wrong');
      wrongThisQRef.current += 1;
      setWrongFlash(true);
      window.setTimeout(() => setWrongFlash(false), 550);
    }
  };

  /** 排序题：点句子卡片，按课文顺序依次排 */
  const pickSort = (s: string, e: MouseEvent) => {
    if (showOK) return;
    const expect = q.sentences![sortPicked.length];
    if (s === expect) {
      playSfx('collect');
      const next = [...sortPicked, s];
      setSortPicked(next);
      if (next.length === q.sentences!.length) {
        answer(true, e);
      }
    } else {
      playSfx('wrong');
      wrongThisQRef.current += 1;
      setWrongFlash(true);
      window.setTimeout(() => setWrongFlash(false), 550);
    }
  };

  const speakPrompt = () => {
    if (q.type === 'hear' && q.speakText) speak(q.speakText, 'zh', 0.85);
  };

  if (!q) return null;

  return (
    <div className="lesson-practice">
      <div className="question-row">
        <button className="speaker-btn" onClick={speakPrompt} aria-label="speak">
          🔊
        </button>
        <div className="question-text">
          {q.type === 'hear' && t('hearChar')}
          {q.type === 'pinyin' && t('pinyinChar')}
          {q.type === 'fill' && t('fillBlank')}
          {q.type === 'sort' && t('sortSentences')}
          {q.type === 'find' && t('findInText')}
          <span className="question-count">
            {' '}
            {idx + 1}/{total}
          </span>
        </div>
      </div>

      {q.type === 'pinyin' && <div className="practice-big">{q.showChar}</div>}
      {q.type === 'fill' && <div className="practice-fill">{q.fillShown}</div>}
      {q.type === 'sort' && (
        <div className="sort-area">
          <div className="sort-tip">{t('tapInOrder')}</div>
          <div className="sort-done">
            {Array.from({ length: q.sentences!.length }).map((_, i) => (
              <span key={i} className={`sort-slot ${i < sortPicked.length ? 'filled' : ''}`}>
                {i < sortPicked.length ? '✓' : i + 1}
              </span>
            ))}
          </div>
          <div className={`sort-cards ${wrongFlash ? 'shake-once' : ''}`}>
            {shuffledSentences.map((s) => (
              <button
                key={s}
                className={`sort-card ${sortPicked.includes(s) ? 'picked' : ''}`}
                onClick={(e) => pickSort(s, e)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {showOK && <div className="feedback ok">✅ {t('correct')}</div>}
      {burst && <StarBurst x={burst.x} y={burst.y} />}

      {(q.type === 'hear' || q.type === 'pinyin' || q.type === 'fill' || q.type === 'find') && (
        <div className={`quiz-options ${wrongFlash ? 'shake-once' : ''}`}>
          {q.options!.map((o) => (
            <button key={o.label} className="quiz-option" onClick={(e) => answer(o.correct, e)}>
              <span
                className={
                  q.type === 'pinyin'
                    ? 'pinyin-letter'
                    : q.type === 'fill'
                      ? 'fill-word'
                      : q.type === 'hear'
                        ? 'hear-char'
                        : q.type === 'find'
                          ? 'find-char'
                          : ''
                }
              >
                {o.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
