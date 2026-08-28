import { useEffect, useMemo } from 'react';
import { ENGLISH_DICT } from '../content/englishDict';
import { ENGLISH_IPA } from '../content/englishIpa';
import { speak } from '../speech';
import { useI18n } from '../i18n';
import { KidButton } from './ui';
import Modal from './Modal';

interface WordCardProps {
  word: string;
  /** 课文英文全文（用于找例句） */
  context?: string;
  /** 课文中文翻译（与 text 段落一致，用于例句对照） */
  translation?: string;
  /** 是否还有下一个未学的词 */
  hasNext: boolean;
  /** 打开即算认识（父级标记已学） */
  onLearned: () => void;
  onNext: () => void;
  onClose: () => void;
}

/** 英文单词卡：单词 + 朗读 + 中文意思 + 课文例句（英中对照） */
export default function WordCard({ word, context, translation, hasNext, onLearned, onNext, onClose }: WordCardProps) {
  const { t } = useI18n();
  const meaning = ENGLISH_DICT[word.toLowerCase()] ?? '';
  const ipa = ENGLISH_IPA[word.toLowerCase()] ?? '';

  // 课文例句：找到含该词的句子 + 对应中文译文
  const example = useMemo(() => {
    if (!context) return { en: '', zh: '' };
    const lines = context.split('\n').map((s) => s.trim()).filter(Boolean);
    const transLines = translation ? translation.split('\n').map((s) => s.trim()).filter(Boolean) : [];
    const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    const idx = lines.findIndex((l) => re.test(l));
    if (idx < 0) return { en: '', zh: '' };
    return { en: lines[idx], zh: transLines[idx] ?? '' };
  }, [context, translation, word]);

  useEffect(() => {
    // 打开即听发音并标记已学
    speak(word, 'en', 0.85);
    onLearned();
  }, [word]);

  return (
    <Modal onClose={onClose}>
      <div className="word-card" onClick={(e) => e.stopPropagation()}>
        <div className="word-card-head">
          <span className="word-card-word">{word}</span>
          <button className="char-card-speak" onClick={() => speak(word, 'en', 0.85)} aria-label="speak">
            🔊
          </button>
        </div>

        {ipa && <p className="word-card-ipa">/{ipa}/</p>}

        <p className="word-card-mean">
          <b>{t('mean')}：</b>
          {meaning || t('wordNoDict')}
        </p>

        {example.en && (
          <div className="word-card-example">
            <p className="word-card-caption">{t('example')}</p>
            <p className="word-card-en">{example.en}</p>
            {example.zh && <p className="word-card-zh">{example.zh}</p>}
          </div>
        )}

        <div className="char-card-btns">
          {hasNext && (
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
