import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { speak, playSfx } from '../speech';
import { useI18n } from '../i18n';
import { StarBurst } from './ui';
import { ENGLISH_DICT } from '../content/englishDict';

type QType = 'hear' | 'wordMean' | 'meanWord' | 'fill' | 'sort' | 'find' | 'translate';

interface Opt {
  label: string;
  correct: boolean;
}

interface Q {
  type: QType;
  speakText?: string;
  showText?: string;
  fillShown?: string;
  options?: Opt[];
  sentences?: string[];
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickMany<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}

/** 从课文生成英语练习：听音选词 / 词义互选 / 填空 / 排序 / 课文寻词 / 句子翻译 */
function genQuestions(text: string, words: string[], translation?: string): Q[] {
  const qs: Q[] = [];
  const wordPool = [...new Set(words.map((w) => w.toLowerCase()).filter(Boolean))];
  const allDict = Object.keys(ENGLISH_DICT);
  const allMean = Object.values(ENGLISH_DICT);
  const lines = text.split('\n').map((s) => s.trim()).filter(Boolean);
  const zhLines = translation ? translation.split('\n').map((s) => s.trim()).filter(Boolean) : [];

  // 释义池：本课单词中词典能查到的
  const withMean = wordPool.filter((w) => ENGLISH_DICT[w]);
  if (withMean.length === 0) return qs;

  const distractorWords = (ans: string, n: number) =>
    pickMany(allDict.filter((w) => w !== ans && !wordPool.includes(w)), n);
  const distractorMeans = (ans: string, n: number) =>
    pickMany(allMean.filter((m) => m !== ans), n);

  // 1) 听音选词（×2）
  for (const ans of pickMany(withMean, 2)) {
    const dist = distractorWords(ans, 3);
    if (dist.length < 3) continue;
    qs.push({
      type: 'hear',
      speakText: ans,
      options: shuffle([ans, ...dist]).map((w) => ({ label: w, correct: w === ans })),
    });
  }

  // 2) 词 → 义
  const w1 = pick(withMean);
  {
    const dist = distractorMeans(ENGLISH_DICT[w1], 3);
    if (dist.length >= 3) {
      qs.push({
        type: 'wordMean',
        showText: w1,
        options: shuffle([ENGLISH_DICT[w1], ...dist]).map((m) => ({
          label: m,
          correct: m === ENGLISH_DICT[w1],
        })),
      });
    }
  }

  // 3) 义 → 词
  const w2 = pick(withMean);
  {
    const dist = distractorWords(w2, 3);
    if (dist.length >= 3) {
      qs.push({
        type: 'meanWord',
        showText: ENGLISH_DICT[w2],
        options: shuffle([w2, ...dist]).map((w) => ({ label: w, correct: w === w2 })),
      });
    }
  }

  // 4) 句子填空：挖掉一个本课单词
  {
    const fillable = lines.find((l) => wordPool.some((w) => w.length >= 3 && l.toLowerCase().includes(w)));
    if (fillable) {
      const ans = wordPool.find((w) => w.length >= 3 && fillable.toLowerCase().includes(w))!;
      const dist = distractorWords(ans, 3);
      if (dist.length >= 3) {
        const shown = fillable.replace(new RegExp(`\\b${ans}\\b`, 'i'), '＿＿');
        qs.push({
          type: 'fill',
          fillShown: shown,
          options: shuffle([ans, ...dist]).map((w) => ({ label: w, correct: w === ans })),
        });
      }
    }
  }

  // 5) 对话排序（2~3 行）
  if (lines.length >= 2) {
    const picked = pickMany(lines, Math.min(3, lines.length));
    if (picked.length >= 2) qs.push({ type: 'sort', sentences: picked });
  }

  // 6) 课文寻词：哪个单词在课文里出现过
  {
    const ans = pick(wordPool);
    const dist = distractorWords(ans, 3);
    if (dist.length >= 3) {
      qs.push({
        type: 'find',
        showText: '',
        options: shuffle([ans, ...dist]).map((w) => ({ label: w, correct: w === ans })),
      });
    }
  }

  // 7) 句子翻译：英文句 → 中文译文
  if (zhLines.length >= 4) {
    const idx = Math.floor(Math.random() * Math.min(lines.length, zhLines.length));
    const en = lines[idx];
    const zh = zhLines[idx];
    const otherZh = pickMany(zhLines.filter((_, i) => i !== idx), 3);
    if (en && zh && otherZh.length >= 3) {
      qs.push({
        type: 'translate',
        showText: en,
        options: shuffle([zh, ...otherZh]).map((m) => ({ label: m, correct: m === zh })),
      });
    }
  }

  return qs;
}

interface Props {
  text: string;
  words: string[];
  translation?: string;
  onFinish: (stars: number, correct: number, total: number) => void;
}

/** 英语课文练习：题目 100% 来自当前课文（词汇/句子/译文） */
export default function LessonPracticeEnglish({ text, words, translation, onFinish }: Props) {
  const { t } = useI18n();
  const questions = useMemo(() => genQuestions(text, words, translation), [text, words, translation]);
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

  // 听音选词：进入题目自动朗读一次
  useEffect(() => {
    if (q?.type === 'hear' && q.speakText) {
      const timer = window.setTimeout(() => speak(q.speakText!, 'en', 0.85), 350);
      return () => window.clearTimeout(timer);
    }
  }, [idx, q?.type]);

  // 排序题句子打乱（渲染前固定）
  const shuffledSentences = useMemo(
    () => (q?.type === 'sort' && q.sentences ? shuffle(q.sentences) : []),
    [q?.type, idx],
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

  const pickSort = (s: string, e: MouseEvent) => {
    if (showOK) return;
    const expect = q!.sentences![sortPicked.length];
    if (s === expect) {
      playSfx('collect');
      const next = [...sortPicked, s];
      setSortPicked(next);
      if (next.length === q!.sentences!.length) answer(true, e);
    } else {
      playSfx('wrong');
      wrongThisQRef.current += 1;
      setWrongFlash(true);
      window.setTimeout(() => setWrongFlash(false), 550);
    }
  };

  if (!q) return null;

  const prompt = () => {
    switch (q.type) {
      case 'hear':
        return t('qHearEn');
      case 'wordMean':
        return t('qWordMean');
      case 'meanWord':
        return t('qMeanWord');
      case 'fill':
        return t('qFillEn');
      case 'sort':
        return t('qSortEn');
      case 'find':
        return t('qFindEn');
      case 'translate':
        return t('qTransEn');
    }
  };

  return (
    <div className="lesson-practice">
      <div className="question-row">
        <button className="speaker-btn" onClick={() => q.speakText && speak(q.speakText, 'en', 0.85)} aria-label="speak">
          🔊
        </button>
        <div className="question-text">
          {prompt()}
          <span className="question-count"> {idx + 1}/{total}</span>
        </div>
      </div>

      {q.type === 'wordMean' && q.showText && <div className="practice-big en">{q.showText}</div>}
      {q.type === 'meanWord' && q.showText && <div className="practice-big">{q.showText}</div>}
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

      {(q.type === 'hear' || q.type === 'wordMean' || q.type === 'meanWord' || q.type === 'fill' || q.type === 'find' || q.type === 'translate') && (
        <div className={`quiz-options ${wrongFlash ? 'shake-once' : ''}`}>
          {q.options!.map((o) => (
            <button key={o.label} className="quiz-option" onClick={(e) => answer(o.correct, e)}>
              <span className="en-word">{o.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
