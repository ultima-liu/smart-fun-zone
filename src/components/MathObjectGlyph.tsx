import type { MathVisualObject } from '../content/mathTeaching';

/** 数量演示使用固定 SVG，杯盖、盘子与杯子保持可辨认的轮廓。 */
export default function MathObjectGlyph({ kind, narrow = false }: { kind: MathVisualObject['kind']; narrow?: boolean }) {
  const art = (() => {
    switch (kind) {
      case 'cup': return <><path d="M46 21h5c13 0 13 24 0 24h-6" fill="none" stroke="#3786b5" strokeWidth="5" /><path d="M12 17h35l-3 34q-1 6-7 6H21q-6 0-7-6z" fill="#91d5f2" stroke="#3786b5" strokeWidth="2.5" /><ellipse cx="29.5" cy="17" rx="17.5" ry="5" fill="#eafaff" stroke="#3786b5" strokeWidth="2.5" /><path d="M20 29v17" stroke="#d5f4ff" strokeWidth="4" strokeLinecap="round" /></>;
      case 'lid': return <><path d="M9 38q4-14 23-14t23 14" fill="#ffd880" stroke="#b17c29" strokeWidth="2.5" /><ellipse cx="32" cy="39" rx="25" ry="6" fill="#ffe7a7" stroke="#b17c29" strokeWidth="2.5" /><path d="M29 24v-7h6v7" fill="#d29b42" stroke="#b17c29" strokeWidth="2.5" strokeLinejoin="round" /></>;
      case 'block': return <><path d="M9 20 32 8l23 12-23 12z" fill="#ffc88c" stroke="#a8693b" strokeWidth="2.5" strokeLinejoin="round" /><path d="M9 20v27l23 13V32z" fill="#f2a968" stroke="#a8693b" strokeWidth="2.5" strokeLinejoin="round" /><path d="M32 32v28l23-13V20z" fill="#d78c51" stroke="#a8693b" strokeWidth="2.5" strokeLinejoin="round" /></>;
      case 'flower': return <><path d="M32 34v26m0-10q-17 0-18-12 15 0 18 12m0-3q16-1 18-13-16 2-18 13" fill="#67b56c" stroke="#3e9653" strokeWidth="2.5" />{[0,60,120,180,240,300].map(angle=><ellipse key={angle} cx="32" cy="13" rx="7" ry="11" fill="#fba3bc" stroke="#d35d87" strokeWidth="1.5" transform={`rotate(${angle} 32 24)`} />)}<circle cx="32" cy="24" r="8" fill="#ffd56c" stroke="#c89129" strokeWidth="2" /></>;
      case 'disc': return <><circle cx="32" cy="32" r="24" fill="#80c6ea" stroke="#3b83b6" strokeWidth="3" /><path d="M17 25q4-9 14-10" fill="none" stroke="#c9ebfb" strokeWidth="4" strokeLinecap="round" /></>;
      case 'stick': return <rect x="28" y="4" width="8" height="56" rx="3" fill="#f1b963" stroke="#a67535" strokeWidth="2" />;
      case 'flowerpot': return <><path d="M32 30V13m0 12q-15 0-16-11 13-1 16 11m0-6q14 0 16-12-14 0-16 12" fill="#69b770" stroke="#3b9253" strokeWidth="2.5" /><path d="m15 34 5 24h24l5-24" fill="#edaa7c" stroke="#a36b48" strokeWidth="2.5" /><rect x="12" y="30" width="40" height="9" rx="3" fill="#ffc594" stroke="#a36b48" strokeWidth="2.5" /></>;
      case 'fish': return <><path d="m47 31 13-13v27z" fill="#f3b064" stroke="#a9783a" strokeWidth="2.5" strokeLinejoin="round" /><ellipse cx="28" cy="32" rx="23" ry="16" fill="#8bcce9" stroke="#3f89b1" strokeWidth="2.5" /><path d="m30 16 8-8 4 14m-12 25 9 9 4-13" fill="#67add2" stroke="#3f89b1" strokeWidth="2" /><circle cx="17" cy="28" r="3" fill="#284e65" /><path d="M8 35h6m17-12q9 9 0 18" fill="none" stroke="#3f89b1" strokeWidth="2" /></>;
      case 'plate': return <><ellipse cx="32" cy="34" rx="27" ry="17" fill="#fff8e3" stroke="#bc9850" strokeWidth="2.5" /><ellipse cx="32" cy="34" rx="20" ry="11" fill="#fae3aa" stroke="#d0b16e" strokeWidth="2" /><path d="M17 29q12-9 27-1" fill="none" stroke="#fff9eb" strokeWidth="3" strokeLinecap="round" /></>;
      case 'pencil-case': return <><rect x="5" y="17" width="54" height="33" rx="8" fill="#cca3ed" stroke="#8761b0" strokeWidth="2.5" /><path d="M8 28h47" stroke="#fff1ff" strokeWidth="3" /><path d="M44 25v9" stroke="#76539a" strokeWidth="3" strokeLinecap="round" /><rect x="19" y="34" width="24" height="9" rx="3" fill="#f7e9ff" /></>;
    }
  })();
  return <svg viewBox={kind === 'stick' && narrow ? '24 0 16 64' : '0 0 64 64'} aria-hidden="true" focusable="false" data-math-object={kind}>{art}</svg>;
}

export function MathStickBundle({ count = 10 }: { count?: number }) {
  return <svg viewBox="0 0 64 72" aria-hidden="true" focusable="false" data-math-bundle={count}>
    {Array.from({length:count},(_,index)=><rect key={index} x={9+index*4.6} y="5" width="3.5" height="62" rx="1.5" fill="#f1b963" stroke="#a67535" strokeWidth=".7" />)}
    <path d="M6 32h52v7H6z" fill="#e37979" stroke="#b64e56" strokeWidth="1.5" /><path d="m29 33 7 6m0-6-7 6" stroke="#ffd2ce" strokeWidth="2" />
  </svg>;
}
