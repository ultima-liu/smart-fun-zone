import PracticeAgain from '../components/PracticeAgain';
import ChineseListeningChoice from '../components/ChineseListeningChoice';
import { useEffect, useState } from 'react';
import { CHINESE_PINYIN_TRIALS, type PinyinTrial } from '../content/chinesePinyinTrials';
import { useChinesePracticeState, useRepeatableChineseSequence } from '../chinesePracticeState';
import { playPinyinRecording, stopPinyinAudio } from '../pinyinAudio';
import { chineseOptions, recordChineseEvidence } from '../chineseLearning';
import { useStore } from '../store';
import { ObservedPractice } from './ChinesePractice';
import SpeakChip from '../components/SpeakChip';
import Modal from '../components/Modal';
import { stopChineseReadingAudio } from '../chineseReadingAudio';

export function PinyinListeningPractice({ lessonId, onDone, context = 'lesson', variant = 0, customTrials }: { lessonId: string; onDone: () => void; context?: 'lesson' | 'review'; variant?: number; customTrials?: PinyinTrial[] }) {
  const all = CHINESE_PINYIN_TRIALS[lessonId] ?? [];
  const trials = customTrials ?? (context === 'review' ? [all[(variant + 2) % all.length]].filter(Boolean) : all.slice(0, 2));
  const childId = useStore((state) => state.activeChildId);
  const [index, setIndex, complete, restart] = useRepeatableChineseSequence(lessonId, `${context}:listenIndex:${customTrials?.[0].target ?? variant}`, trials.length);
  const [listenRound, setListenRound] = useState(0);
  const [helped, setHelped] = useChinesePracticeState(lessonId, `${context}:listenHelp:${customTrials?.[0].target ?? variant}`, false);
  const [message, setMessage] = useState('');
  const [offline, setOffline] = useState(false);
  const trial = trials[index];
  useEffect(() => { if (complete) onDone(); }, [complete, onDone]);
  if (!trial) return null;
  const next = () => { setOffline(false); setIndex((value) => value + 1); setHelped(false); setMessage(''); if (index + 1 === trials.length) onDone(); };
  const choices = chineseOptions(trial.choices, `${lessonId}:listen:${index}:${variant}`);
  return <section className="ct-pinyin-listening" data-chinese-leaf data-chinese-narration-mode="instructions-only" data-chinese-narration-key={index} data-chinese-narration={`${trial.prompt}。先点击听真人音节录音，听完音节和选项后再选择。`} aria-label="新音节听辨">
    <PracticeAgain complete={complete} onRestart={() => { restart(); setListenRound(value => value + 1); setHelped(false); setMessage(''); }} />
    <ChineseListeningChoice key={`${childId}:${lessonId}:${context}:${variant}:${trial.target}:${index}:${listenRound}`} title={trial.prompt} prompt="先听真人录音，再听选项，选出听到的音节。" progress={`${index + 1} / ${trials.length}`} listenLabel="听真人音节录音" choices={choices} playTarget={() => playPinyinRecording(trial.target)} onChoose={choice => {
      const right = choice === trial.target;
      recordChineseEvidence(childId, { lessonId, taskId: `listen:${trial.target}`, skill: 'pinyin', level: right && !helped ? 'independent' : 'supported', source: 'check', context, note: `听辨${trial.target}；只检查听音选择，未检查发音` });
      if (right) next(); else { setHelped(true); setMessage('再听一次，比较声母、韵母和声调。'); }
    }} />
    <div className="ct-question-hints"><button type="button" onClick={() => { stopChineseReadingAudio(); setOffline(true); }}>我来拼读</button><p role="status">{message}</p></div>
    {offline && <Modal onClose={() => setOffline(false)} controls={<button className="textbook-preview-close" aria-label="关闭拼读练习" onClick={() => setOffline(false)}>×</button>}><section className="ct-offline-check"><h3>读一读这个音节</h3><p>请读出目标音节“{trial.target}”，说完后会自动检查。</p><ObservedPractice showPrompt={false} key={`offline:${index}`} lessonId={lessonId} taskId={`offline-listen:${trial.target}`} stateKey={`offline-listen:${trial.target}:${variant}`} skill="pinyin" context={context} prompt={`读出音节“${trial.target}”，说完后会自动检查。`} criteria={['读出目标音节', '分清字母读音和声调']} onDone={next} /></section></Modal>}
  </section>;
}

export function PinyinProductionPractice({ lessonId, onDone, context = 'lesson', variant = 0 }: { lessonId: string; onDone: () => void; context?: 'lesson' | 'review'; variant?: number }) {
  const trials = CHINESE_PINYIN_TRIALS[lessonId] ?? [];
  const target = trials[(variant + 1) % trials.length]?.target;
  const [message, setMessage] = useState('');
  useEffect(() => () => stopPinyinAudio(), []);
  if (!target) return null;
  return <section className="ct-pinyin-production" data-chinese-leaf data-chinese-narration={`先自己拼读屏幕中的音节，再听真人录音比较。用一个相关的词说一句话。实际练习后记录。`} aria-label="自己拼读新音节"><h3>先自己读，再听录音比较<SpeakChip text="先看这个音节，注意字母和声调，自己试着读。然后再听录音比较，说完后会自动检查。" /></h3><div className="ct-production-compose"><b className="ct-new-syllable">{target}</b><p>先不听示范，自己拼读。再用一个相关的词说一句话。</p><button type="button" onClick={async () => setMessage(await playPinyinRecording(target) ? '示范播完了。请比较自己和录音，再试一次。' : '录音暂时无法播放，可以请家人示范。')}>读过了，再听真人示范</button><p role="status">{message}</p></div><ObservedPractice showPrompt={false} lessonId={lessonId} taskId={`production:${target}`} stateKey={`production:${target}:${variant}`} skill="pinyin" context={context} prompt={`实际读出音节“${target}”，说完后会自动检查。`} criteria={['字母与声调都关注到了', '读出连贯音节', '读音与目标音节及声调基本一致']} onDone={onDone} /></section>;
}
