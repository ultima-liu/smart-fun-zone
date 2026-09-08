import { useMemo, useState } from 'react';
import { pinyin } from 'pinyin-pro';
import { useI18n } from '../i18n';
import { speak, speakSeq, playSfx } from '../speech';
import { KidButton } from './ui';
import CharCard from './CharCard';
import { parseTextBlocks } from '../content/textBlocks';
import type { ContentBlock } from '../content/skills';

interface CheckData {
  q: string;
  options: string[];
  answer: number;
}
interface StepData {
  title?: string;
  text: string;
  example?: string;
  figure?: {
    type: string;
    emoji?: string;
    count?: number;
    emojis?: string[];
    title?: string;
    text?: string;
  };
  check?: CheckData;
}

interface Props {
  text: string;
  words: string[];
  sections?: Partial<StepData>[];
  textWords?: string[];
  showExplain?: boolean;
  showText?: boolean;
  onDone: () => void;
}

function renderChars(sentence: string, wordSet: Set<string>, showAllPy: boolean, onChar: (ch: string) => void) {
  return Array.from(sentence).map((ch, idx) => {
    const isWord = wordSet.has(ch);
    return (
      <ruby
        key={idx}
        className={`cr-char ${isWord ? '' : 'cr-plain'}`}
        onClick={(e) => {
          e.stopPropagation();
          onChar(ch);
        }}
      >
        {ch}
        {(isWord || showAllPy) && <rt className="cr-py">{pinyin(ch, { toneType: 'symbol' })}</rt>}
      </ruby>
    );
  });
}

function Figure({ f }: { f: NonNullable<StepData['figure']> }) {
  if (!f) return null;
  if (f.type === 'count' && f.emoji) {
    return (
      <div className="cr-figure">
        <span className="cr-emoji">{f.emoji.repeat(Math.min(10, f.count ?? 1))}</span>
        {f.title && <b>{f.title}</b>}
      </div>
    );
  }
  if (f.emojis && f.emojis.length > 0) {
    return (
      <div className="cr-figure">
        <span className="cr-emoji">{f.emojis.slice(0, 8).join('')}</span>
        {(f.title || f.text) && (
          <span className="cr-fig-cap">
            {f.title ? <b>{f.title}</b> : null}
            {f.text ? <small>{f.text}</small> : null}
          </span>
        )}
      </div>
    );
  }
  return null;
}

function Check({ c }: { c: CheckData }) {
  const { t } = useI18n();
  const [picked, setPicked] = useState<number | null>(null);
  if (picked !== null) {
    const ok = picked === c.answer;
    return (
      <div className={`cr-check quiz-task ${ok ? 'ok' : 'no'}`}>
        <b>{c.q}</b>
        <span className="cr-check-res">{ok ? t('correct') : t('tryAgain')}</span>
      </div>
    );
  }
  return (
    <div className="cr-check quiz-task">
      <div className="cr-check-head">
        <b>{c.q}</b>
        <button
          className="speaker-btn"
          onClick={(e) => {
            e.stopPropagation();
            speak(`${c.q}。${c.options.map((o, i) => `${i + 1}、${o}`).join('，')}`, 'zh');
          }}
          aria-label="再读一次"
        >
          🔊 {t('replay')}
        </button>
      </div>
      <div className="cr-opts">
        {c.options.map((o, i) => (
          <button
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              setPicked(i);
              playSfx(i === c.answer ? 'correct' : 'wrong');
            }}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

/** 块是否按"诗句"居中显示 */
function centered(kind: ContentBlock['kind']): boolean {
  return kind === 'poem' || kind === 'verse' || kind === 'memo' || kind === 'read' || kind === 'title';
}

/** 语文「看课文/学课文」：按结构化内容块渲染（诗/提示/运用/古诗/儿歌等各块样式） */
export default function ChineseCloseRead({ text, words, sections = [], textWords, showExplain = true, showText = true, onDone }: Props) {
  const { t } = useI18n();
  const wordSet = useMemo(() => new Set(words.join('')), [words]);
  const blocks = useMemo(() => parseTextBlocks(text), [text]);
  const [showAllPy, setShowAllPy] = useState(false);
  const [activeChar, setActiveChar] = useState<string | null>(null);

  const allLines = useMemo(() => blocks.flatMap((b) => b.lines), [blocks]);
  const readAll = () => speakSeq(allLines, 'zh');

  return (
    <div className="cr-card">
      <div className="cr-toolbar">
        <span className="cr-tool-btns">
          <button className={`tool-btn ${showAllPy ? 'on' : ''}`} onClick={() => setShowAllPy((v) => !v)}>
            🔤 {t('pinyinOn')}
          </button>
          <button className="tool-btn" onClick={readAll}>
            🔊 {t('readAll')}
          </button>
        </span>
        <span className="cr-hint">👆 {t('tapParaTip')}</span>
      </div>

      {showText && (
        <div className="cr-anim">
          <div className="cr-page">
            {blocks.map((b, bi) => (
              <div key={bi} className={`cr-block ${b.kind}`}>
                {b.title && b.kind !== 'title' && <div className="cr-block-head">{b.title}</div>}
                {b.kind === 'title' && b.title && <div className="cr-block-title">{b.title}</div>}
                {b.lines.map((line, li) => (
                  <p
                    key={li}
                    className={`cr-line ${centered(b.kind) ? 'center' : ''}`}
                    onClick={() => speak(line, 'zh')}
                  >
                    {renderChars(line, wordSet, showAllPy, (ch) => setActiveChar(ch))}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {showExplain && sections.length > 0 && (
        <div className="cr-explain-list">
          <b>💡 {t('learnText')} · {t('tip')}</b>
          {sections.map((s2, k) => (
            <div key={k} className="cr-explain" onClick={() => s2.text && speak(s2.text, 'zh')}>
              {s2.title && <b>{s2.title}</b>}
              {s2.text && <p>{s2.text}</p>}
              {s2.example && (
                <p
                  className="cr-ex"
                  onClick={(e) => {
                    e.stopPropagation();
                    speak(`例如：${s2.example}`, 'zh');
                  }}
                >
                  ✍️ {s2.example}
                </p>
              )}
              {s2.figure && <Figure f={s2.figure} />}
              {s2.check && <Check c={s2.check} />}
            </div>
          ))}
        </div>
      )}

      <div className="cr-nav">
        <KidButton color="green" onClick={onDone}>
          ✅ {t('readDone')}
        </KidButton>
      </div>

      {activeChar && (
        <CharCard char={activeChar} context={text} textWords={textWords} onClose={() => setActiveChar(null)} />
      )}
    </div>
  );
}
