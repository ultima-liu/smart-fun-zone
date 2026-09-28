/** 数学目录课卡封面：每节课有独立主题、标签、配色与 SVG 构图。 */
export type MathCoverKind = 'campus' | 'count' | 'compare' | 'position' | 'compose' | 'add' | 'subtract' | 'tenframe' | 'shapes' | 'build' | 'bundle' | 'numberline' | 'story' | 'table' | 'review';
export type MathLessonCover = { label: string; kind: MathCoverKind; colors: [string, string, string] };
const C = (label: string, kind: MathCoverKind, colors: [string, string, string]): MathLessonCover => ({ label, kind, colors });

/** 每个 lesson id 都必须在此指定封面，避免回退为统一的单元插画。 */
export const MATH_LESSON_COVERS: Record<string, MathLessonCover> = {
  campus: C('校园数学', 'campus', ['#b9e9fb', '#f7d88b', '#3e9ecc']), playground: C('操场发现', 'campus', ['#c7f0d2', '#f8d176', '#4aaf73']),
  'classroom-discover': C('教室里的位置', 'position', ['#d8e7ff', '#f2bd78', '#597fc9']), 'classroom-games': C('方向游戏', 'position', ['#f7d8ee', '#f7c66d', '#bd5f9d']), 'learning-readiness': C('数学准备', 'campus', ['#e5defc', '#89d6d0', '#7967c9']),
  numbers: C('数一数', 'count', ['#ffe3a9', '#ff9e74', '#d87827']), compare: C('谁多谁少', 'compare', ['#d2edf8', '#facb88', '#4c9fc4']), ordinal: C('排队第几', 'position', ['#e1d9ff', '#f3a6b2', '#8165cf']), compose: C('分一分 合一合', 'compose', ['#ffdec3', '#f4a7b1', '#c76f54']),
  'add-within-5': C('合起来', 'add', ['#d9f0c8', '#f2c65e', '#64a84d']), 'subtract-within-5': C('去掉几个', 'subtract', ['#cbe9fa', '#9ec8f4', '#5488c7']), zero: C('认识 0', 'count', ['#eee7df', '#a9d4c4', '#657a88']), 'unit1-review': C('1～5 整理', 'review', ['#ffe5b0', '#f2b47a', '#bb7834']),
  'six-to-nine': C('6～9 的认识', 'count', ['#d6f4df', '#6fd0b3', '#378b73']), 'compare-order-nine': C('比较与顺序', 'compare', ['#daf0e9', '#90cfe4', '#398e9e']), 'compose-six-nine': C('6～9 分合', 'compose', ['#f9dfae', '#f19e8b', '#c37145']), 'addsub-six-seven': C('6、7 的加减', 'add', ['#cee9dc', '#9cd279', '#4d995a']),
  'solve-total-within-7': C('一共有多少', 'story', ['#d4eafd', '#f8ce86', '#4b93bf']), 'solve-remain-within-7': C('还剩多少', 'subtract', ['#e4daf9', '#bba2e6', '#7760b6']), 'addsub-eight-nine': C('8、9 的加减', 'add', ['#d8f1d2', '#f1cb6c', '#5e9c4f']), 'select-info-eight-nine': C('选择有用信息', 'story', ['#d9ebf8', '#dcabd9', '#6e7fbe']),
  ten: C('认识 10', 'tenframe', ['#d5eefc', '#f0bd63', '#398db9']), 'addsub-ten': C('10 的加减', 'tenframe', ['#d7edff', '#86c6ed', '#317cae']), 'continuous-add-sub': C('连加连减', 'add', ['#fce0ba', '#efad6e', '#be7040']), 'mixed-add-sub': C('加减混合', 'subtract', ['#eadcf9', '#a7cdea', '#6b70b1']), 'unit2-review': C('6～10 整理', 'review', ['#d8f1e3', '#a6d9ad', '#4a9371']),
  'solid-shapes': C('认识立体图形', 'shapes', ['#e7ddfd', '#b7a4ed', '#7460bc']), 'solid-building': C('搭积木', 'build', ['#e0d4fa', '#efad93', '#875eb4']), 'solid-compose': C('拼一拼', 'build', ['#d8e9fd', '#c2a6ee', '#6375b8']),
  'ten-again': C('10 个一', 'bundle', ['#ffe1c8', '#f0a267', '#bd693c']), 'eleven-twenty': C('11～20', 'bundle', ['#ffe4bf', '#dfb262', '#ad7830']), 'order-twenty': C('20 以内顺序', 'numberline', ['#d6f0ee', '#83cfc0', '#398d87']), 'simple-addsub-twenty': C('十几的加减', 'add', ['#ffe1c5', '#e99385', '#b75c58']), 'between-positions': C('两个位置之间', 'numberline', ['#ddecfb', '#9cc4e9', '#4b7eb2']), 'unit4-review': C('11～20 整理', 'review', ['#ffe3cf', '#e5aa87', '#b96d4f']),
  'plus-nine': C('9 加几', 'tenframe', ['#d6edff', '#5eb8e7', '#2676ad']), 'plus-eight-seven-six': C('8、7、6 加几', 'tenframe', ['#d1eff8', '#7ccbc5', '#2d8989']), 'plus-eight-nine-strategies': C('8 加 9', 'add', ['#dce8ff', '#9d9de8', '#5965b6']), 'plus-five-four-three-two': C('小数加大数', 'add', ['#dff1d2', '#e8bf68', '#6d9846']),
  'solve-total': C('求一共有多少', 'story', ['#dceefd', '#f0b77c', '#4c8cb8']), 'find-original': C('求原来有多少', 'story', ['#f8def0', '#dc9cc3', '#ab5e8e']), 'addition-table': C('进位加法表', 'table', ['#d9eeff', '#85b9ed', '#3875ae']), 'unit5-review': C('进位加法整理', 'review', ['#d7ebfb', '#8fc5e8', '#397faf']),
  'review-numbers': C('数与运算', 'review', ['#e7edf7', '#9eb7d5', '#5d7092']), 'review-relations': C('数量关系', 'story', ['#e1edfb', '#a1cbdc', '#50849b']), 'review-shapes': C('图形复习', 'shapes', ['#eae3fb', '#c0adee', '#725eb3']), 'review-application': C('应用提升', 'table', ['#e3edf5', '#8fc8b7', '#508274']),
};

function Motif({ kind, colors, seed }: { kind: MathCoverKind; colors: string[]; seed: number }) {
  const [a, b, c] = colors;
  const balls = (values: string[]) => <g>{values.map((value, index) => <g key={`${value}-${index}`} transform={`translate(${110 + index * 58} ${145 + (index % 2) * 10})`}><circle r="27" fill={[a, b, c][index % 3]} /><text y="9" textAnchor="middle" fontSize="28" fontWeight="900" fill="#fff" fontFamily="system-ui">{value}</text></g>)}</g>;
  switch (kind) {
    case 'campus': return <g><rect x="128" y="105" width="144" height="102" rx="9" fill="#fffaf0" stroke={c} strokeWidth="3" /><polygon points="116,108 200,60 284,108" fill={b} /><rect x="188" y="167" width="26" height="40" rx="4" fill={a} />{[151, 202, 253].map((x) => <rect key={x} x={x} y="126" width="25" height="23" rx="4" fill="#8ed5f4" />)}<circle cx="88" cy="178" r="27" fill={a} /></g>;
    case 'count': return <g>{balls([String((seed % 5) + 1), String((seed % 4) + 6), '●'])}<path d="M93 202h216" stroke="#fff" strokeWidth="7" strokeLinecap="round" opacity=".8" /></g>;
    case 'compare': return <g><path d="M90 188h220" stroke="#fff" strokeWidth="7" strokeLinecap="round" /><path d="M200 109l-52 77h104z" fill={c} opacity=".9" /><path d="M95 132h92M213 132h92" stroke={a} strokeWidth="9" strokeLinecap="round" /><text x="200" y="106" textAnchor="middle" fontSize="48" fontWeight="900" fill="#fff" fontFamily="system-ui">{seed % 2 ? '＜' : '＞'}</text><circle cx="125" cy="118" r="16" fill={b} /><circle cx="275" cy="118" r="16" fill={a} /></g>;
    case 'position': return <g><path d="M72 183h256" stroke="#fff" strokeWidth="9" strokeLinecap="round" />{[105, 165, 225, 285].map((x, index) => <g key={x}><circle cx={x} cy="152" r="24" fill={[a, b, c][index % 3]} /><circle cx={x - 8} cy="149" r="3" fill="#fff" /><circle cx={x + 8} cy="149" r="3" fill="#fff" /></g>)}</g>;
    case 'compose': return <g><circle cx="200" cy="125" r="36" fill={c} /><text x="200" y="136" textAnchor="middle" fontSize="33" fontWeight="900" fill="#fff" fontFamily="system-ui">5</text><path d="M180 160C145 175 125 185 105 205M220 160c35 15 55 25 75 45" stroke="#fff" strokeWidth="7" fill="none" strokeLinecap="round" /><path d="M68 193q37-34 74 0v22H68z" fill={a} /><path d="M258 193q37-34 74 0v22h-74z" fill={b} /></g>;
    case 'add': return <g>{balls(['8', '+', '5'])}<text x="200" y="216" textAnchor="middle" fontSize="22" fontWeight="900" fill="#fff" fontFamily="system-ui">凑一凑，算一算</text></g>;
    case 'subtract': return <g>{balls(['●', '●', '●'])}<path d="M128 202h142" stroke="#fff" strokeWidth="7" strokeLinecap="round" /><path d="m252 184 25 18-25 18" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" /></g>;
    case 'tenframe': return <g transform="translate(104 95)">{Array.from({ length: 10 }, (_, index) => <rect key={index} x={(index % 5) * 40} y={Math.floor(index / 5) * 42} width="34" height="35" rx="7" fill={index < 8 + (seed % 3) ? (index < 8 ? a : b) : '#fff'} stroke="#fff" strokeWidth="3" />)}<text x="82" y="122" textAnchor="middle" fontSize="28" fontWeight="900" fill={c} fontFamily="system-ui">10</text></g>;
    case 'shapes': return <g><circle cx="112" cy="155" r="36" fill={a} /><rect x="166" y="118" width="68" height="68" rx="8" fill={b} /><path d="M276 112l38 22v45l-38 22-38-22v-45z" fill={c} /></g>;
    case 'build': return <g>{[[126, 158, a], [178, 158, b], [230, 158, c], [178, 106, a], [230, 106, b]].map(([x, y, fill], index) => <rect key={index} x={x as number} y={y as number} width="48" height="48" rx="7" fill={fill as string} />)}</g>;
    case 'bundle': return <g>{Array.from({ length: 10 }, (_, index) => <line key={index} x1={135 + index * 12} y1="204" x2={151 + index * 10} y2="92" stroke={a} strokeWidth="9" strokeLinecap="round" />)}<rect x="127" y="140" width="130" height="20" rx="10" fill={c} /><text x="292" y="163" textAnchor="middle" fontSize="43" fontWeight="900" fill="#fff" fontFamily="system-ui">10</text></g>;
    case 'numberline': return <g><path d="M70 168h260" stroke="#fff" strokeWidth="8" strokeLinecap="round" />{[0, 1, 2, 3, 4].map((value) => <g key={value} transform={`translate(${96 + value * 52} 168)`}><path d="M0-15v30" stroke="#fff" strokeWidth="4" /><text y="47" textAnchor="middle" fontSize="20" fontWeight="900" fill="#fff" fontFamily="system-ui">{10 + value * 2}</text></g>)}<circle cx={96 + (seed % 5) * 52} cy="132" r="18" fill={c} /></g>;
    case 'story': return <g><path d="M88 112q0-22 22-22h88q22 0 22 22v52q0 22-22 22h-55l-31 25 7-25h-9q-22 0-22-22z" fill="#fff" opacity=".94" /><text x="154" y="142" textAnchor="middle" fontSize="27" fontWeight="900" fill={c} fontFamily="system-ui">？</text><circle cx="267" cy="130" r="29" fill={a} /><circle cx="310" cy="170" r="23" fill={b} /></g>;
    case 'table': return <g transform="translate(112 89)">{Array.from({ length: 12 }, (_, index) => <rect key={index} x={(index % 4) * 46} y={Math.floor(index / 4) * 42} width="39" height="35" rx="6" fill={index % 3 === seed % 3 ? a : '#fff'} opacity={index % 3 === seed % 3 ? 1 : .86} />)}<path d="M-8 132h200" stroke={c} strokeWidth="6" strokeLinecap="round" /></g>;
    default: return <g><path d="M200 76l16 42 45 1-35 27 12 44-38-25-38 25 12-44-35-27 45-1z" fill={b} stroke="#fff" strokeWidth="4" />{balls(['＋', '＝', '★'])}</g>;
  }
}

const FALLBACK_COVER: MathLessonCover = C('数学探索', 'review', ['#e7edf7', '#9eb7d5', '#5d7092']);

/** 每课短标签：目录页用 HTML 角标渲染（放 SVG 里会被 slice 裁切，还会压住编号徽章） */
export function mathLessonCoverLabel(lessonId: string): string {
  return (MATH_LESSON_COVERS[lessonId] ?? FALLBACK_COVER).label;
}

export default function MathLessonArtwork({ lessonId, seed = 0 }: { lessonId: string; seed?: number }) {
  const cover = MATH_LESSON_COVERS[lessonId] ?? FALLBACK_COVER;
  const [top, mid, accent] = cover.colors;
  const uid = `mla-${lessonId.replace(/[^a-z0-9]/gi, '')}`;
  return <svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" role="presentation" focusable="false">
    <defs><linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1"><stop stopColor={top} /><stop offset="1" stopColor={mid} /></linearGradient></defs>
    <rect width="400" height="260" fill={`url(#${uid}-bg)`} /><circle cx="354" cy="38" r="58" fill="#fff" opacity=".22" /><circle cx="36" cy="243" r="72" fill={accent} opacity=".15" />
    <Motif kind={cover.kind} colors={[top, mid, accent]} seed={seed} />
  </svg>;
}
