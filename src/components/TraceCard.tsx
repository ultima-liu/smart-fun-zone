import { useEffect, useMemo, useRef, useState } from 'react';
import HanziWriter from 'hanzi-writer';
import { pinyin } from 'pinyin-pro';
import { WORD_DICT } from '../content/wordDict';
import { speak, playSfx } from '../speech';
import { useI18n } from '../i18n';
import { KidButton } from './ui';
import Modal from './Modal';
import { extractContextWords } from './CharCard';

interface TraceCardProps {
  char: string;
  /** 当前课文全文：用于提取"课文里的词" */
  context?: string;
  /** 本课分词得到的真词表（构建期 segmentit 生成） */
  textWords?: string[];
  /** 是否还有下一个未描写的字 */
  hasNext: boolean;
  /** 描写完成（父级标记该字已学会） */
  onTraced: () => void;
  /** 去下一个字 */
  onNext: () => void;
  onClose: () => void;
}

/** 认生字·描写卡：左边看笔顺演示，右边孩子描红；描完才算学会 */
export default function TraceCard({ char, context, textWords, hasNext, onTraced, onNext, onClose }: TraceCardProps) {
  const { t } = useI18n();
  const demoRef = useRef<HTMLDivElement>(null);
  const traceRef = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);
  const entry = WORD_DICT[char];
  // 课文里的词：分词真词优先，再补字典可验证的课文组合
  const contextWords = useMemo(() => {
    const list: string[] = [];
    const push = (w: string) => {
      if (w && !list.includes(w)) list.push(w);
    };
    (textWords ?? []).forEach((w) => {
      if (w.includes(char)) push(w);
    });
    extractContextWords(char, context ?? '').forEach(push);
    return list.slice(0, 6);
  }, [char, context, textWords]);
  const py = pinyin(char, { toneType: 'symbol' });

  useEffect(() => {
    const demoEl = demoRef.current;
    const traceEl = traceRef.current;
    if (!demoEl || !traceEl) return;
    let demoWriter: HanziWriter | null = null;
    let traceWriter: HanziWriter | null = null;
    let cancelled = false;

    try {
      // 左：笔顺演示（循环动画）
      demoWriter = HanziWriter.create(demoEl, char, {
        width: 150,
        height: 150,
        padding: 5,
        showOutline: true,
        showCharacter: false,
        strokeAnimationSpeed: 1.4,
        strokeColor: '#64b5f6',
        highlightColor: '#ffb300',
      });
      const loop = () => {
        if (cancelled) return;
        try {
          demoWriter?.animateCharacter({ onComplete: loop });
        } catch {
          /* 已销毁 */
        }
      };
      loop();
    } catch {
      /* 演示加载失败可忽略 */
    }

    try {
      // 右：描写（描红）
      traceWriter = HanziWriter.create(traceEl, char, {
        width: 150,
        height: 150,
        padding: 5,
        showOutline: true,
        showCharacter: false,
        strokeColor: '#9ccc65',
        highlightColor: '#ffb300',
        strokeAnimationSpeed: 0,
      });
      traceWriter.quiz({
        onCorrectStroke: () => playSfx('tap'),
        onComplete: () => {
          setDone(true);
          playSfx('win');
          onTraced();
        },
      });
    } catch {
      // 笔顺数据加载失败：降级为直接标记学会（异步执行，避免级联渲染）
      window.setTimeout(() => {
        if (cancelled) return;
        setDone(true);
        onTraced();
      }, 0);
    }

    return () => {
      cancelled = true;
      try {
        demoWriter?.destroy();
      } catch {
        /* ignore */
      }
      try {
        traceWriter?.destroy();
      } catch {
        /* ignore */
      }
    };
  }, [char]);

  return (
    <Modal onClose={onClose}>
      <div className="trace-card" onClick={(e) => e.stopPropagation()}>
        <div className="trace-head">
          <span className="trace-char">{char}</span>
          <span className="char-card-py">{py}</span>
          <button className="char-card-speak" onClick={() => speak(char, 'zh', 0.8)} aria-label="speak">
            🔊
          </button>
        </div>

        {/* 左：笔顺演示 ｜ 右：孩子描红 */}
        <div className="trace-pair">
          <div className="trace-col">
            <span className="trace-label">👀 {t('strokeDemo')}</span>
            <div className="trace-box" ref={demoRef} />
          </div>
          <div className="trace-col">
            <span className="trace-label">✏️ {t('writeIt')}</span>
            <div className="trace-box" ref={traceRef} />
          </div>
        </div>

        <p className={`trace-tip ${done ? 'done' : ''}`}>
          {done ? `🎉 ${t('traceDone')}` : `✏️ ${t('traceHint')}`}
        </p>

        {entry ? (
          <div className="char-card-info">
            <p>
              <b>{t('mean')}：</b>
              {entry.mean}
            </p>
            <p>
              <b>{t('groupWords')}：</b>
              {entry.words.join(' · ')}
            </p>
          </div>
        ) : (
          contextWords.length === 0 && <p className="char-card-info empty">{t('dictExpanding')}</p>
        )}

        {contextWords.length > 0 && (
          <div className="char-card-info">
            <p>
              <b>{t('lessonWords')}：</b>
              {contextWords.join(' · ')}
            </p>
          </div>
        )}

        <div className="char-card-btns">
          {done && hasNext && (
            <KidButton color="green" onClick={onNext}>
              ▶ {t('nextChar')}
            </KidButton>
          )}
          <KidButton color="white" onClick={onClose}>
            {t('close')}
          </KidButton>
        </div>
      </div>
    </Modal>
  );
}
