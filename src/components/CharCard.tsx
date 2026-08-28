import { useEffect, useMemo, useRef } from 'react';
import { pinyin } from 'pinyin-pro';
import HanziWriter from 'hanzi-writer';
import { WORD_DICT } from '../content/wordDict';
import { speak, playSfx } from '../speech';
import { useI18n } from '../i18n';
import { KidButton } from './ui';
import Modal from './Modal';

interface CharCardProps {
  char: string;
  onClose: () => void;
  /** 当前课文全文：用于提取"课文里的词"（字典未覆盖时也能结合语境学字） */
  context?: string;
  /** 本课分词得到的真词表（构建期 segmentit 生成） */
  textWords?: string[];
}

const HAN = /[\u4e00-\u9fff]/;

/** 组合是否为字典里的真词（以任一字词的"组词"包含该组合为准） */
function isDictWord(w: string): boolean {
  return [...w].some((c) => {
    const e = WORD_DICT[c];
    return !!e && e.words.some((x) => x.includes(w));
  });
}

/** 从课文中提取包含该字的真实词语：仅保留字典可验证的（过滤标点与非词组合） */
export function extractContextWords(char: string, text: string): string[] {
  const chars = [...text];
  const real: string[] = [];
  const seen = new Set<string>();
  const push = (w: string) => {
    if (!seen.has(w)) {
      seen.add(w);
      real.push(w);
    }
  };
  chars.forEach((c, i) => {
    if (c !== char) return;
    const prev = i > 0 && HAN.test(chars[i - 1]) ? chars[i - 1] : '';
    const next = i < chars.length - 1 && HAN.test(chars[i + 1]) ? chars[i + 1] : '';
    if (prev && isDictWord(prev + char)) push(prev + char);
    if (next && isDictWord(char + next)) push(char + next);
    if (prev && next && isDictWord(prev + char + next)) push(prev + char + next);
  });
  return real;
}

/** 点字卡片：拼音 + 笔顺动画 + 释义/组词 + 课文里的词 + 朗读 */
export default function CharCard({ char, onClose, context, textWords }: CharCardProps) {
  const { t, lang } = useI18n();
  const strokeRef = useRef<HTMLDivElement>(null);
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
    if (!strokeRef.current) return;
    let writer: HanziWriter | null = null;
    try {
      writer = HanziWriter.create(strokeRef.current, char, {
        width: 96,
        height: 96,
        padding: 4,
        showOutline: true,
        strokeColor: '#5aa866',
      });
      writer.animateCharacter();
    } catch {
      /* 笔顺数据加载失败时静默（仅显示空框） */
    }
    return () => {
      try {
        writer?.destroy();
      } catch {
        /* ignore */
      }
    };
  }, [char]);

  return (
    <Modal onClose={onClose}>
      <div className="char-card" onClick={(e) => e.stopPropagation()}>
        <div className="char-card-head">
          <span className="char-card-big">{char}</span>
          <span className="char-card-py">{py}</span>
          <button className="char-card-speak" onClick={() => speak(char, 'zh', 0.8)} aria-label="speak">
            🔊
          </button>
        </div>

        <div className="char-card-stroke">
          <div ref={strokeRef} className="stroke-box" />
          <div className="stroke-tip">{t('stroke')}</div>
        </div>

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
          contextWords.length === 0 && (
            <p className="char-card-info empty">{t('dictExpanding')}</p>
          )
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
          <KidButton
            color="green"
            onClick={() => {
              playSfx('tap');
              speak(`${char}。${entry?.mean ?? ''}`, 'zh', 0.8);
            }}
          >
            {lang === 'zh' ? '读一读' : 'Read'}
          </KidButton>
          <KidButton color="white" onClick={onClose} className="char-card-close">
            {t('close')}
          </KidButton>
        </div>
      </div>
    </Modal>
  );
}
