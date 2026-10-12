import { useEffect, useState } from 'react';
import type { EnglishOriginalRecording } from '../content/englishG3Audio';
import EnglishAudioPlayer from './EnglishAudioPlayer';
import { ENGLISH_G3_WORD_LISTS } from '../content/englishG3WordLists';
import { ENGLISH_G3_SONGS, ENGLISH_G3_FINGER_FAMILY } from '../content/englishG3Appendix';
import { ENGLISH_G3_SOUND_EXERCISES } from '../content/englishG3SoundExercises';
import EnglishTextbookSoundExercise from './EnglishTextbookSoundExercise';
import EnglishRecordedChant, { recordedChantPages } from './EnglishRecordedChant';
import { IconCourseSpeaker, IconMusic, IconSpeakerOn } from './icons';
import { playEnglishNarration, stopEnglishNarration } from '../englishTabNarration';
import './english-recorded-materials.css';

function recordingLabel(clip: EnglishOriginalRecording): string {
  if (clip.slot === 'first-sound') return '听开头的声音';
  if (clip.slot === 'last-sound') return '听结尾的声音';
  if (clip.slot === 'song') return '听歌曲';
  if (clip.slot === 'talk') return '听对话';
  if (clip.slot === 'practice') return '唱唱玩玩';
  if (clip.slot === 'chant') return clip.key.includes('-letters-') ? '字母歌谣' : '听歌谣';
  if (/Fill in the blanks/.test(clip.title)) return '字母填空歌';
  if (/Listen and tick/.test(clip.title)) return '听一听，选一选';
  if (/Read aloud/.test(clip.title)) return '听一听，读一读';
  if (/Read and talk/.test(clip.title)) return '读一读，说一说';
  if (/Listen and chant/.test(clip.title)) return '听歌谣';
  return /Listen and do/.test(clip.title) ? '听听做做' : '听歌谣';
}

/** Each complete recording carries its own reviewed textbook regions, including continuations. */
export default function EnglishRecordedMaterials({ clips }: { clips: readonly EnglishOriginalRecording[] }) {
  useEffect(() => () => stopEnglishNarration(), []);
  return <div className="en-recorded-columns" data-columns={clips.length} data-english-leaf
    data-english-narration-mode="instructions-only" data-english-narration="这里是教材原文和对应录音。各栏都可以直接查看，点击对应的播放器，边听边看；有续页时可以切换文字页。">
    {clips.map(clip => <RecordedMaterial key={clip.key} clip={clip} columns={clips.length}/>)}
  </div>;
}

function RecordedMaterial({ clip, columns }: { clip: EnglishOriginalRecording; columns: number }) {
  const multiple = columns > 1;
  const [frameIndex, setFrameIndex] = useState(0);
  const [originalPage, setOriginalPage] = useState(false);
  const [heard, setHeard] = useState(false);
  const [chantPage, setChantPage] = useState(0);
  const frame = clip.material[Math.min(frameIndex, clip.material.length - 1)];
  const words = clip.slot === 'wordlist' ? ENGLISH_G3_WORD_LISTS[clip.key.replace('-words', '')] : undefined;
  const alphabet = clip.key === 'alphabet';
  const song = clip.key.endsWith('-opening-song') ? ENGLISH_G3_SONGS[clip.key.split('-')[0]] : clip.key === 'families-a-finger-song' ? ENGLISH_G3_FINGER_FAMILY : undefined;
  const soundExercise = ENGLISH_G3_SOUND_EXERCISES[clip.key];
  const chants = clip.key.endsWith('-letters-sounds') ? recordedChantPages(clip.key.split('-')[0], columns === 3) : [];
  const hasFormatted = Boolean(words || alphabet || song || soundExercise || chants.length);
  const formatted = !originalPage && hasFormatted;
  // Keep the illustrated main lesson before the large-print appendix continuations.
  const illustratedLetters = formatted && chants.length > 0 && chantPage === 0;
  const printedPage = formatted && chants.length ? illustratedLetters ? clip.material[0].page : [...new Set(clip.material.filter(item => item.page >= 80).map(item => item.page))].join('–') : frame.page;
  const pageLabel = illustratedLetters ? clip.material[0].label : formatted && chants.length ? chants[chantPage - 1].title : frame.label;
  return <section className="en-recorded-material" data-recording-key={clip.key}>
    <header>
      <h3>{multiple && (clip.slot === 'song' || clip.slot === 'chant' || /chant|sing/.test(clip.title) ? <IconMusic size={20} aria-hidden="true"/> : <IconSpeakerOn size={20} aria-hidden="true"/>)}{illustratedLetters ? pageLabel : multiple ? recordingLabel(clip) : clip.title.replace(/^Unit \d+ /, '')}</h3>
      <span title={pageLabel}>P{printedPage}</span>
    </header>
    <EnglishAudioPlayer key={clip.key} clips={[clip]} label={clip.title} onPlayChange={playing => { if (playing) setHeard(true); }}/>
    {illustratedLetters ? <figure aria-label="教材字母与例词"><img src={clip.material[0].src} alt={`${clip.title} · ${pageLabel} · 教材 P${printedPage}`} draggable={false}/></figure> : formatted && chants.length ? <EnglishRecordedChant page={chants[chantPage - 1]}/> : formatted && soundExercise ? <EnglishTextbookSoundExercise key={clip.key} questions={soundExercise} lastSound={clip.slot === 'last-sound'} heard={heard}/> : formatted && song ? <div className="en-recorded-song" aria-label="歌曲歌词">{song.map((line, index) => <p key={index} lang="en"><small>{index + 1}</small><span className="en-recorded-lyric">{line}</span></p>)}</div> : formatted ? <div className={`en-recorded-word-list${alphabet ? ' en-recorded-alphabet' : ''}`} aria-label={alphabet ? '完整字母表' : '完整单元词汇表'}>
      {words ? words.map(([word, meaning], index) => <button type="button" key={word} data-tab-audio aria-label={`点读 ${word}，${meaning}`} onClick={() => playEnglishNarration(`${word}。${meaning}。`)}><small>{index + 1}</small><b lang="en">{word}</b><span>{meaning}</span><IconCourseSpeaker className="en-card-sound" size={16} aria-hidden="true"/></button>) : Array.from({ length: 26 }, (_, index) => {
        const letter = String.fromCharCode(65 + index);
        return <button type="button" key={letter} data-tab-audio aria-label={`点读字母 ${letter}`} onClick={() => playEnglishNarration(`Letter ${letter}.`)}><b lang="en">{letter} <i>{letter.toLowerCase()}</i></b><IconCourseSpeaker className="en-card-sound" size={16} aria-hidden="true"/></button>;
      })}
    </div> : <figure key={frame.src}><img src={frame.src} alt={`${clip.title} · ${frame.label} · 教材 P${frame.page}`} draggable={false} /></figure>}
    <footer>
      {!multiple && <span>{clip.material.length > 1 ? '录音对应的完整材料' : '边听边看教材原文'}</span>}
      <nav aria-label="切换录音文字页">
        {formatted && chants.length > 0 && <>
          <button type="button" aria-label="字母歌谣上一页" disabled={chantPage === 0} onClick={() => setChantPage(page => page - 1)}>上一页</button>
          <span className="en-chant-page-count" aria-live="polite">{chantPage + 1} / {chants.length + 1}</span>
          <button type="button" aria-label="字母歌谣下一页" disabled={chantPage === chants.length} onClick={() => setChantPage(page => page + 1)}>下一页</button>
        </>}
        {hasFormatted && <button type="button" aria-pressed={originalPage} onClick={() => setOriginalPage(value => !value)}>{originalPage ? '返回完整内容' : '查看原书页'}</button>}
        {!formatted && clip.material.length > 1 && clip.material.map((item, index) => <button type="button" key={item.src} title={`${item.label} · P${item.page}`} aria-pressed={frameIndex === index} onClick={() => setFrameIndex(index)}>{multiple ? `第${index + 1}页` : `${item.label} · P${item.page}`}</button>)}
      </nav>
    </footer>
  </section>;
}
