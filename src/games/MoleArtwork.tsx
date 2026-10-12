import { useId } from 'react';
import type { MoleKind } from './whackAMoleEngine';

/** Crisp, original vector characters shared by the game and its shelf cover. */
export default function MoleArtwork({ kind = 'mole', happy = false }: { kind?: MoleKind; happy?: boolean }) {
  const id = useId();
  const rabbit = kind === 'rabbit';
  const gold = kind === 'gold';
  const fur = rabbit ? '#fff8e9' : gold ? '#eeb64e' : '#ac7963';
  return (
    <svg viewBox="0 0 160 170" fill="none" aria-hidden="true" className="wm-character-art">
      <defs>
        <linearGradient id={id} x1="65" y1="40" x2="100" y2="165" gradientUnits="userSpaceOnUse">
          <stop stopColor={rabbit ? '#fffdf7' : gold ? '#ffe6a0' : '#c8967c'} />
          <stop offset="1" stopColor={fur} />
        </linearGradient>
      </defs>
      {rabbit ? <>
        <path d="M48 73C20 15 43-11 59 13L72 70" fill={fur} stroke="#decbb4" strokeWidth="3" />
        <path d="M91 68L104 11C118-14 141 14 116 76" fill={fur} stroke="#decbb4" strokeWidth="3" />
        <path d="M49 58C34 22 45 8 51 22L61 60M104 59L114 21C124 4 126 26 115 60" stroke="#f1b4ab" strokeWidth="9" strokeLinecap="round" />
      </> : <>
        <circle cx="36" cy="66" r="19" fill={fur} /><circle cx="123" cy="66" r="19" fill={fur} />
        <circle cx="36" cy="66" r="11" fill="#eab7a6" /><circle cx="123" cy="66" r="11" fill="#eab7a6" />
      </>}
      <path d="M27 167L24 106C23 67 46 43 80 43C114 43 138 68 136 106L133 167Z" fill={`url(#${id})`} />
      <ellipse cx="80" cy="124" rx="36" ry="33" fill={rabbit ? '#fff' : '#f6ddbb'} />
      <ellipse cx="43" cy="110" rx="12" ry="7" fill="#e9a495" opacity=".8" />
      <ellipse cx="118" cy="110" rx="12" ry="7" fill="#e9a495" opacity=".8" />
      {happy ? <path d="M47 96Q55 85 63 96M97 96Q105 85 113 96" stroke="#49332e" strokeWidth="5" strokeLinecap="round" /> : <>
        <ellipse cx="56" cy="94" rx="5" ry="7" fill="#49332e" /><ellipse cx="104" cy="94" rx="5" ry="7" fill="#49332e" />
        <circle cx="57" cy="92" r="1.8" fill="white" /><circle cx="105" cy="92" r="1.8" fill="white" />
      </>}
      <ellipse cx="80" cy="110" rx={rabbit ? 7 : 12} ry={rabbit ? 5 : 8} fill={rabbit ? '#dd9999' : '#6b443a'} />
      <path d="M69 125Q80 137 91 125" stroke="#704e40" strokeWidth="3" strokeLinecap="round" />
      {!rabbit && <path d="M74 127H86V137Q80 141 74 137Z" fill="#fffcf3" />}
      <ellipse cx="35" cy="153" rx="17" ry="10" fill={fur} /><ellipse cx="126" cy="153" rx="17" ry="10" fill={fur} />
      {gold && <path d="M54 48L49 24L68 33L80 12L93 33L111 24L106 48Z" fill="#ffe084" stroke="#b77c27" strokeWidth="3" strokeLinejoin="round" />}
      {rabbit && <><path d="M94 150L103 128L116 134Z" fill="#ef9757" /><path d="M104 128L104 116M106 127L115 120" stroke="#7a9d63" strokeWidth="4" strokeLinecap="round" /></>}
    </svg>
  );
}
