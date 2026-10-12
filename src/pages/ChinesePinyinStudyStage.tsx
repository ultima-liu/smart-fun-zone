import PinyinToneDemo from '../components/PinyinToneDemo';
import PinyinMouthDemo from '../components/PinyinMouthDemo';
import ChineseTextbookExtras from '../components/ChineseTextbookExtras';
import { CHINESE_TEXTBOOK_EXTRAS } from '../content/chineseTextbookExtras';
import { IconCourseSpeaker } from '../components/icons';
import ScreenLetterWriting from '../components/ScreenLetterWriting';
import PinyinLetterGuide from '../components/PinyinLetterGuide';
import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { playSfx } from '../speech';
import { playChineseReadingAudio, stopChineseReadingAudio } from '../chineseReadingAudio';
import SpeakChip from '../components/SpeakChip';
import { CHINESE_PINYIN_STUDY } from '../content/chinesePinyinStudy';
import { useChinesePracticeState, readChinesePracticeIndex } from '../chinesePracticeState';
import { chineseOptions, recordChineseEvidence } from '../chineseLearning';
import { useStore } from '../store';
import { stopPinyinAudio } from '../pinyinAudio';
import { PinyinListeningPractice } from './ChinesePinyinPractice';
import ActivityDeck from '../components/ClassroomActivities';
import ChineseKnowledgeExtensionStage from './ChineseKnowledgeExtensionStage';
import { optionKey } from '../options';

const steps = ['听音辨形', '声调与拼读', '图文识字', '规律验证', '屏幕书写'];
export default function ChinesePinyinStudyStage({ lessonId, onDone, onCompletionChange, extensionDone, onExtensionDone }: { lessonId: string; onDone: () => void; onCompletionChange?: (done: boolean) => void; extensionDone?: boolean; onExtensionDone?: () => void }) {
  const pack = CHINESE_PINYIN_STUDY[lessonId];
  const childId = useStore((state) => state.activeChildId);
  const [written, setWritten] = useChinesePracticeState(lessonId, 'pinyinScreenWriting', new Set<string>());
  const [writingLetter, setWritingLetter] = useState('');
  const writingTargets = [...new Set(pack?.letters.flatMap(letter => Array.from(letter.glyph)) ?? [])];
  const currentLetter = writingTargets.includes(writingLetter) ? writingLetter : writingTargets[0];
  const [listeningDone, setListeningDone] = useChinesePracticeState(lessonId, 'pinyinListeningDone', false);
  const [audioMessage, setAudioMessage] = useState('');
  const [step, setStep] = useChinesePracticeState(lessonId, 'pinyinStep', 0);
  const [lettersSeen, setLettersSeen] = useChinesePracticeState(lessonId, 'pinyinLetters', new Set<string>());
  const [tonesSeen, setTonesSeen] = useChinesePracticeState(lessonId, 'pinyinTones', new Set<string>());
  const [blendsDone, setBlendsDone] = useChinesePracticeState(lessonId, 'pinyinBlends', new Set<number>());
  const [wordsSeen, setWordsSeen] = useChinesePracticeState(lessonId, 'pinyinWords', new Set<string>());
  const [mouthsSeen, setMouthsSeen] = useChinesePracticeState(lessonId, 'pinyinMouthForms', new Set<string>());
  const [answer, setAnswer] = useChinesePracticeState<string | null>(lessonId, 'pinyinRuleAnswer', null);

  const listeningComplete = listeningDone || readChinesePracticeIndex(childId, lessonId, 'lesson:listenIndex:0') >= 2;
  const completed = [!!pack && pack.letters.every(letter => lettersSeen.has(letter.glyph)), !!pack && pack.tones.every(tone => tonesSeen.has(tone)) && pack.blends.every((_blend, index) => blendsDone.has(index)), !!pack && (pack.mouthForms ? pack.mouthForms.every(vowel => mouthsSeen.has(vowel)) : pack.words.every(word => wordsSeen.has(word.word))), answer === pack?.check.answer && listeningComplete, writingTargets.length > 0 && writingTargets.every(letter => written.has(letter))];
  const complete = !!pack && completed.every(Boolean);
  useEffect(() => { onCompletionChange?.(complete); if (complete) onDone(); }, [complete, onDone, onCompletionChange]);
  useEffect(() => () => { stopPinyinAudio(); stopChineseReadingAudio(); }, []);
  if (!pack) return <p>本课拼音内容尚未整理。</p>;

  const say = (value: string, rate = .78) => {
    void playChineseReadingAudio([value], () => undefined, rate);
    playSfx('tap');
  };

  const labels = steps.map((label, index) => index === 2 && pack.mouthForms ? '口型示范' : label);
  return <div className="ct-pinyin-lab"><ActivityDeck selectedIndex={step} onSelect={setStep} labels={[...labels, ...(onExtensionDone ? ['知识桥'] : []), ...(CHINESE_TEXTBOOK_EXTRAS[lessonId] ? ['教材补充'] : [])]} completed={[...completed, ...(onExtensionDone ? [!!extensionDone] : [])]}>
    <section className="ct-pinyin-panel">
      <div className="ct-pinyin-panel-head"><small>01 · 听音辨形</small><h3>嘴巴怎么动？字母在四线三格哪里？<SpeakChip text="听音辨形。先观察字形、口形提示与占格。声母本音请跟家人或老师练，音节示范使用真人录音。全部字母观察过才能继续。" /></h3><p>先观察字形、口形提示与占格。声母本音请跟家人或老师练，音节示范使用真人录音。全部字母观察过才能继续。</p></div>
      <div className="ct-pinyin-letter-grid" style={{ '--ct-pinyin-letter-count': pack.letters.length } as CSSProperties}>{pack.letters.map((letter) => <button key={letter.glyph} className={lettersSeen.has(letter.glyph) ? 'seen' : ''} onClick={() => {
        setLettersSeen((value) => new Set(value).add(letter.glyph));
        say(letter.cue);
        recordChineseEvidence(childId, { lessonId, taskId: `letter:${letter.glyph}`, skill: 'pinyin', level: 'practiced', source: 'self', context: 'lesson', note: '观察字母和口形提示' });
      }}><PinyinLetterGuide glyph={letter.glyph} /><strong>{letter.glyph}</strong><small>{letter.shape}</small><em>{letter.cue}</em><i>{lettersSeen.has(letter.glyph) ? '✓ 已观察' : '看字形，听口形提示'}</i></button>)}</div>
      <div className="ct-pinyin-tip"><b>先辨形，再拼读</b><span>四线三格仅用于看清字母位置；不是书写批改。</span></div>
    </section>

    <section className="ct-pinyin-panel">
      <div className="ct-pinyin-panel-head"><small>02 · 声调与拼读</small><h3>让声音连起来<SpeakChip text="声调与拼读。看调号、听四声的走向；遇到拼读轨道，选出组合后的正确音节。" /></h3><p>看调号、听四声的走向；遇到拼读轨道，选出组合后的正确音节。</p></div>
      <ActivityDeck className="ct-subtasks" labels={["看声调", ...pack.blends.map((_blend, index) => `拼读 ${index + 1}`)]} completed={[tonesSeen.size === pack.tones.length, ...pack.blends.map((_blend, index) => blendsDone.has(index))]}>
      <div>{lessonId === 'pinyin-a-o-e' ? <PinyinToneDemo onObserve={tone => setTonesSeen(value => new Set(value).add(tone))}/> : <div className="ct-pinyin-tones">{pack.tones.map((tone) => <button key={tone} className={tonesSeen.has(tone) ? 'seen' : ''} onClick={() => {
        setTonesSeen((value) => new Set(value).add(tone));
        const values = tone.split(/\s+/);
        void playChineseReadingAudio(values, () => undefined, .72).then(played => setAudioMessage(played ? '示范已播完。观察并比较声调的变化。' : '示范没有播完，可以重听。'));

      }}><b>{tone}</b><small>{tonesSeen.has(tone) ? '✓ 已看调号' : '看调号，听声调走向'}</small></button>)}</div>}</div>
      {pack.blends.map((blend, index) => <div className="ct-pinyin-blend" key={index}><div className="ct-pinyin-track">{blend.parts.map((part, partIndex) => <span key={partIndex}>{part}</span>)}<i>→</i><b>?</b></div><p>连起来读，是哪个完整音节？</p><div className="ct-pinyin-choices">{chineseOptions([blend.result, ...blend.distractors], `${lessonId}:blend:${index}`).map((choice, choiceIndex) => <button key={choice} aria-label={choice} data-key={optionKey(choiceIndex)} className={`ct-keyed-option ${blendsDone.has(index) && choice === blend.result ? 'correct' : ''}`} onClick={() => {
        if (choice === blend.result) {
          setBlendsDone((value) => new Set(value).add(index));
          void playChineseReadingAudio([choice], () => undefined); playSfx('correct');
          recordChineseEvidence(childId, { lessonId, taskId: `blend:${index}`, skill: 'pinyin', level: 'practiced', source: 'check', context: 'lesson', note: '完成拼写组合选择，尚未检查实际发音' });
        } else { say('再从左向右连起来读，不要停成几个声音。'); playSfx('wrong'); }
      }}>{choice}</button>)}</div></div>)}
      </ActivityDeck><p role="status">{audioMessage}</p>
      {!pack.blends.length && <p className="ct-pinyin-empty">本课先学单韵母和声调，暂不要求与声母拼读。</p>}
    </section>

    <section className="ct-pinyin-panel">
      {pack.mouthForms ? <>
      <div className="ct-pinyin-panel-head"><small>03 · 口型示范</small><h3>看口型，听发音，跟着试一试</h3><p>点卡片，看嘴巴怎样变化，听对应的发音。</p></div>
      <PinyinMouthDemo vowels={pack.mouthForms} observed={mouthsSeen} onObserve={vowel => setMouthsSeen(value => new Set(value).add(vowel))} />
      </> : <>
      <div className="ct-pinyin-panel-head"><small>03 · 图文识字</small><h3>拼出声音，还要知道它说什么<SpeakChip text="图文识字。逐个点读教材里的图文词，注意音节、汉字与意义相互对应。" /></h3><p>逐个点读教材里的图文词，注意音节、汉字与意义相互对应。</p></div>
      <div className="ct-pinyin-word-grid">{pack.words.map((item) => <button key={item.word} className={wordsSeen.has(item.word) ? 'seen' : ''} onClick={() => {
        setWordsSeen((value) => new Set(value).add(item.word));
        // 词语汉字本身提供可靠读音，避免带调拼音被 TTS 误读成别的字。
        say(item.word);
      }}><small>{item.pinyin}</small><b>{item.word}</b><i>{wordsSeen.has(item.word) ? '✓ 已读词' : '点读词语'}</i></button>)}</div>
      {!!pack.recognize?.length && <div className="ct-pinyin-hanzi"><strong>教材认读字</strong><div>{pack.recognize.map((char) => <button key={char} onClick={() => say(char)}>{char}<small>点读</small></button>)}</div></div>}
      <div className="ct-pinyin-reading"><small>本课读一读</small><h4>{pack.readingTitle ?? '发音儿歌'}</h4><div>{pack.readingLines.map((line, index) => <button key={index} onClick={() => say(line, .84)}>{line}<small aria-hidden="true"><IconCourseSpeaker size={20} /></small></button>)}</div></div>
      </>}
    </section>

    <section className="ct-pinyin-panel">
      <div className="ct-pinyin-panel-head"><small>04 · 规律验证</small><h3>今天最要注意的拼音规则</h3><p>听一听规则，再用一题验证自己是否真正分清了。</p></div>
      <ActivityDeck className="ct-subtasks" labels={["规则检查", "听辨练习"]} completed={[answer === pack.check.answer, listeningComplete]}><div className="ct-pinyin-rule-workspace">
      {pack.rule && <div className="ct-pinyin-rule"><span>发现卡</span><h4>{pack.rule.title}</h4><p>{pack.rule.detail}</p><div>{pack.rule.examples.map((example) => <span key={example}>{example}</span>)}</div></div>}
      <div className="ct-pinyin-check"><b>想一想</b><h4>{pack.check.prompt}</h4><div>{chineseOptions(pack.check.choices, `${lessonId}:rule`).map((choice, choiceIndex) => <button key={choice} aria-label={choice} data-key={optionKey(choiceIndex)} className={`ct-keyed-option ${answer === choice ? (choice === pack.check.answer ? 'correct' : 'wrong') : ''}`} onClick={() => {
        setAnswer(choice);
        if (choice === pack.check.answer) { say(pack.check.feedback); playSfx('correct'); }
        else { say('再听一听本课规则，换一个答案试试。'); playSfx('wrong'); }
      }}>{choice}</button>)}</div>{answer === pack.check.answer && <p>{pack.check.feedback}</p>}</div>
      </div><PinyinListeningPractice lessonId={lessonId} onDone={() => setListeningDone(true)} /></ActivityDeck>
    </section>
    <section className="ct-pinyin-panel ct-pinyin-screen-writing" aria-label="拼音屏幕书写"><h3>在四线三格中写拼音字母</h3>
      <nav className="en-screen-letter-tabs" aria-label="选择练写拼音">{writingTargets.map(letter => <button key={letter} type="button" className={currentLetter === letter ? 'active' : ''} onClick={() => setWritingLetter(letter)}>{written.has(letter) ? '✓ ' : ''}{letter}</button>)}</nav>
      {currentLetter && <ScreenLetterWriting key={currentLetter} letter={currentLetter} writingStyle="pinyin" onPass={supported => {
        setWritten(current => new Set(current).add(currentLetter));
        recordChineseEvidence(childId, { lessonId, taskId: `pinyin-writing:${currentLetter}`, skill: 'writing', level: supported ? 'supported' : 'independent', source: 'check', context: 'lesson', note: `屏幕逐笔检查拼音 ${currentLetter} 的笔画、方向和占格` });
      }} />}
    </section>
    {onExtensionDone && <ChineseKnowledgeExtensionStage lessonId={lessonId} onDone={onExtensionDone} />}
  {CHINESE_TEXTBOOK_EXTRAS[lessonId] && <ChineseTextbookExtras lessonId={lessonId}/>}
  </ActivityDeck>
  </div>;
}
