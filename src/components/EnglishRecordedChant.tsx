import { ENGLISH_G3_PHONICS_CHANTS } from '../content/englishG3Appendix';
import { getEnglishG3Unit } from '../content/englishGrade3Upper';

export function recordedChantPages(unitId: string, narrow: boolean) {
  const chant = ENGLISH_G3_PHONICS_CHANTS[unitId];
  const unit = getEnglishG3Unit(unitId);
  if (!chant || !unit) return [];
  // The printed appendix repeats the closing alphabet line and both sounds for each example.
  const pages = [{ title: '字母名歌谣', groups: [[...chant.alphabet, chant.alphabet[chant.alphabet.length - 1]]] }];
  const groups = unit.letters.items.map((item, index) => {
    const sound = item.letter === 'J' ? '/ʤ/' : item.sound;
    return [
      item.letter === 'Q' ? 'Q goes with u,' : `${item.letter} is for ${sound}.`,
      `${sound}, ${sound}, ${item.words[0]}.`,
      `${sound}, ${sound}, ${item.words[1]}.`,
      chant.examples[index].split('. ').slice(-1)[0],
    ];
  });
  const size = narrow ? 1 : 2;
  for (let at = 0; at < groups.length; at += size) pages.push({ title: '词中声音歌谣', groups: groups.slice(at, at + size) });
  return pages;
}

/** Text continuations share one original recording; they are not separate song tabs. */
export default function EnglishRecordedChant({ page }: { page: ReturnType<typeof recordedChantPages>[number] }) {
  return <div className="en-recorded-chant" aria-label="教材字母歌谣文字">
    <h4>{page.title}</h4>
    <div>{page.groups.map((lines, group) => <section key={group} lang="en">
      {lines.map((line, index) => <p key={index}>{line}</p>)}
    </section>)}</div>
  </div>;
}
