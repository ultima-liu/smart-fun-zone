import { PINYIN_LETTER_PATHS } from '../content/writingTemplates';

/** Use the writing templates' coordinates so every letter keeps its own grid position. */
export default function PinyinLetterGuide({ glyph }: { glyph: string }) {
  let offset = 10;
  const letters = Array.from(glyph).map(letter => {
    const width = letter === 'i' || letter === 'l' ? 32 : letter === 'm' || letter === 'w' ? 100 : 80;
    const x = offset + width / 2 - 106;
    offset += width;
    return { letter, x, paths: PINYIN_LETTER_PATHS[letter] ?? [] };
  });
  const width = Math.max(120, offset + 10);
  const centering = (width - offset - 10) / 2;

  return <span className="ct-pinyin-lines">
    <svg viewBox={`0 0 ${width} 200`} role="img" aria-label={`${glyph} 的四线三格范字`}>
      <g className="ct-pinyin-guide-lines">
        {[24, 73, 128, 178].map(y => <line key={y} x1="0" x2={width} y1={y} y2={y} />)}
      </g>
      <g className="ct-pinyin-guide-letters">
        {letters.map(({ letter, x, paths }, index) => <g key={index} data-letter={letter} transform={`translate(${x + centering} 0)`}>
          {paths.map((path, stroke) => <path key={stroke} d={path} />)}
        </g>)}
      </g>
    </svg>
  </span>;
}
