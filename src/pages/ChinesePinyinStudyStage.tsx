import { useEffect, useState } from 'react';
import { playSfx, speakOnce } from '../speech';
import SpeakChip from '../components/SpeakChip';
import { CHINESE_PINYIN_STUDY } from '../content/chinesePinyinStudy';
import { optionKey } from '../options';

const steps = ['听音辨形', '声调与拼读', '图文识字', '规律验证'];
const blendVoiceExamples: Record<string, string> = {
  bā: '八', mā: '妈', dà: '大', lù: '路', guā: '瓜', huā: '花',
  ju: '居', qu: '区', zi: '资', ci: '雌', zhi: '知', shi: '师',
  yi: '衣', wu: '乌', guāi: '乖', tuǐ: '腿', niǎo: '鸟', qiú: '球',
  ye: '耶', yue: '月', guān: '关', quān: '圈', qiáng: '墙', ying: '英',
};

export default function ChinesePinyinStudyStage({ lessonId, onDone }: { lessonId: string; onDone: () => void }) {
  const pack = CHINESE_PINYIN_STUDY[lessonId];
  const [step, setStep] = useState(0);
  const [lettersSeen, setLettersSeen] = useState<Set<string>>(new Set());
  const [tonesSeen, setTonesSeen] = useState<Set<string>>(new Set());
  const [blendsDone, setBlendsDone] = useState<Set<number>>(new Set());
  const [wordsSeen, setWordsSeen] = useState<Set<string>>(new Set());
  const [answer, setAnswer] = useState<string | null>(null);
  const [ruleSeen, setRuleSeen] = useState(false);

  useEffect(() => {
    if (answer === pack?.check.answer && ruleSeen) onDone();
  }, [answer, ruleSeen, pack, onDone]);

  if (!pack) return <p>本课拼音内容尚未整理。</p>;

  const blendComplete = blendsDone.size === pack.blends.length;
  const canContinue = step === 0
    ? lettersSeen.size === pack.letters.length
    : step === 1
      ? tonesSeen.size === pack.tones.length && blendComplete
      : step === 2
        ? wordsSeen.size === pack.words.length
        : answer === pack.check.answer && ruleSeen;

  const say = (value: string, rate = .78) => {
    speakOnce(value, 'zh', rate);
    playSfx('tap');
  };

  return <div className="ct-pinyin-lab">
    <div className="ct-pinyin-stepper" aria-label="拼音教材学习环节">
      {steps.map((label, index) => <span key={label} className={index === step ? 'active' : index < step ? 'done' : ''}><b>{index < step ? '✓' : index + 1}</b>{label}</span>)}
    </div>

    {step === 0 && <section className="ct-pinyin-panel">
      <div className="ct-pinyin-panel-head"><small>01 · 听音辨形</small><h3>嘴巴怎么动？字母在四线三格哪里？<SpeakChip text="听音辨形。先点字母听声音，再观察口形、字形与占格。全部字母观察过才能继续。" /></h3><p>先点字母听声音，再观察口形、字形与占格。全部字母观察过才能继续。</p></div>
      <div className="ct-pinyin-letter-grid">{pack.letters.map((letter) => <button key={letter.glyph} className={lettersSeen.has(letter.glyph) ? 'seen' : ''} onClick={() => {
        setLettersSeen((value) => new Set(value).add(letter.glyph));
        say(`${letter.glyph}。${letter.cue}`);
      }}><span className="ct-pinyin-lines"><b className={`slot-${letter.slot}`}>{letter.glyph}</b></span><strong>{letter.glyph}</strong><small>{letter.shape}</small><em>{letter.cue}</em><i>{lettersSeen.has(letter.glyph) ? '✓ 已观察' : '点听发音'}</i></button>)}</div>
      <div className="ct-pinyin-tip"><b>先辨形，再拼读</b><span>四线三格仅用于看清字母位置；不是书写批改。</span></div>
    </section>}

    {step === 1 && <section className="ct-pinyin-panel">
      <div className="ct-pinyin-panel-head"><small>02 · 声调与拼读</small><h3>让声音连起来<SpeakChip text="声调与拼读。看调号、听四声的走向；遇到拼读轨道，选出组合后的正确音节。" /></h3><p>看调号、听四声的走向；遇到拼读轨道，选出组合后的正确音节。</p></div>
      <div className="ct-pinyin-tones">{pack.tones.map((tone) => <button key={tone} className={tonesSeen.has(tone) ? 'seen' : ''} onClick={() => {
        setTonesSeen((value) => new Set(value).add(tone));
        // 火山中文 TTS 会把多字母拼音抹调后替换为一个汉字，不能用来示范这四个不同读音。
        say(tone.split(/\s+/).every((syllable) => syllable.length === 1)
          ? tone : '一声平，二声扬，三声拐弯，四声降。', .72);
      }}><b>{tone}</b><small>{tonesSeen.has(tone) ? '✓ 已看调号' : '看调号，听声调走向'}</small></button>)}</div>
      {pack.blends.map((blend, index) => <div className="ct-pinyin-blend" key={index}><div className="ct-pinyin-track">{blend.parts.map((part, partIndex) => <span key={partIndex}>{part}</span>)}<i>→</i><b>?</b></div><p>连起来读，是哪个完整音节？</p><div className="ct-pinyin-choices">{[blend.result, ...blend.distractors].map((choice, choiceIndex) => <button key={choice} data-key={optionKey(choiceIndex)} disabled={blendsDone.has(index)} className={`ct-keyed-option ${blendsDone.has(index) && choice === blend.result ? 'correct' : ''}`} onClick={() => {
        if (choice === blend.result) {
          setBlendsDone((value) => new Set(value).add(index));
          say(`拼读正确。示例读音：${blendVoiceExamples[choice] ?? '请跟老师练习这个音节'}。`); playSfx('correct');
        } else { say('再从左向右连起来读，不要停成几个声音。'); playSfx('wrong'); }
      }}>{choice}</button>)}</div></div>)}
      {!pack.blends.length && <p className="ct-pinyin-empty">本课先学单韵母和声调，暂不要求与声母拼读。</p>}
    </section>}

    {step === 2 && <section className="ct-pinyin-panel">
      <div className="ct-pinyin-panel-head"><small>03 · 图文识字</small><h3>拼出声音，还要知道它说什么<SpeakChip text="图文识字。逐个点读教材里的图文词，注意音节、汉字与意义相互对应。" /></h3><p>逐个点读教材里的图文词，注意音节、汉字与意义相互对应。</p></div>
      <div className="ct-pinyin-word-grid">{pack.words.map((item) => <button key={item.word} className={wordsSeen.has(item.word) ? 'seen' : ''} onClick={() => {
        setWordsSeen((value) => new Set(value).add(item.word));
        // 词语汉字本身提供可靠读音，避免带调拼音被 TTS 误读成别的字。
        say(item.word);
      }}><small>{item.pinyin}</small><b>{item.word}</b><i>{wordsSeen.has(item.word) ? '✓ 已读词' : '点读词语'}</i></button>)}</div>
      {!!pack.recognize?.length && <div className="ct-pinyin-hanzi"><strong>教材认读字</strong><div>{pack.recognize.map((char) => <button key={char} onClick={() => say(char)}>{char}<small>点读</small></button>)}</div></div>}
      <div className="ct-pinyin-reading"><small>本课读一读</small><h4>{pack.readingTitle ?? '发音儿歌'}</h4><div>{pack.readingLines.map((line, index) => <button key={index} onClick={() => say(line, .84)}>{line}<small>🔊</small></button>)}</div></div>
    </section>}

    {step === 3 && <section className="ct-pinyin-panel">
      <div className="ct-pinyin-panel-head"><small>04 · 规律验证</small><h3>今天最要注意的拼音规则<SpeakChip text="规律验证。听一听规则，再用一题验证自己是否真正分清了。" /></h3><p>听一听规则，再用一题验证自己是否真正分清了。</p></div>
      {pack.rule && <div className="ct-pinyin-rule"><span>发现卡</span><h4>{pack.rule.title}</h4><p>{pack.rule.detail}</p><div>{pack.rule.examples.map((example) => <span key={example}>{example}</span>)}</div><button className={ruleSeen ? 'checked' : ''} onClick={() => {
        setRuleSeen(true); say(`${pack.rule!.title}。${pack.rule!.detail}`);
      }}>{ruleSeen ? '✓ 已听懂规则' : '听聪聪解释规则'}</button></div>}
      <div className="ct-pinyin-check"><b>想一想</b><h4>{pack.check.prompt}</h4><div>{pack.check.choices.map((choice, choiceIndex) => <button key={choice} data-key={optionKey(choiceIndex)} className={`ct-keyed-option ${answer === choice ? (choice === pack.check.answer ? 'correct' : 'wrong') : ''}`} onClick={() => {
        setAnswer(choice);
        if (choice === pack.check.answer) { say(pack.check.feedback); playSfx('correct'); }
        else { say('再听一听本课规则，换一个答案试试。'); playSfx('wrong'); }
      }}>{choice}</button>)}</div>{answer === pack.check.answer && <p>{pack.check.feedback}</p>}</div>
    </section>}

    {step < 3 && <button className="ct-pinyin-next" disabled={!canContinue} onClick={() => { setStep((value) => value + 1); playSfx('pop'); }}>完成这一步，继续 {steps[step + 1]} →</button>}
    {step === 3 && <div className={canContinue ? 'ct-pinyin-complete done' : 'ct-pinyin-complete'}>{canContinue ? '✓ 四项拼音教材学习已完成' : '听懂规则并回答正确后才能继续'}</div>}
  </div>;
}
