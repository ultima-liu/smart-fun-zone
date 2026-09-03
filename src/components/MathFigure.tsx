import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { MathFigure, ShapeKind } from '../content/skills';
import { playSfx, speakOnce } from '../speech';

/** 会自己"开口说话"的图型：演示动画与语音同步（数数/第几/比多少/算式/人民币） */
const VOICED_TYPES = new Set(['count', 'ordinal', 'compare', 'equation', 'money']);

/** 数学配图：程序化渲染（SVG + emoji），图为主体、文字为图注
    - lang：配音语言（默认中文）
    - voice：是否播放图型自己的配音（看演示时有讲解人声做画外音，配图应静音，避免抢话）
    - onVoiceEnd：图型的"数数语音"播完后回调（用于接着播讲解，避免声音重叠） */
export default function MathFigure({
  figure,
  lang = 'zh',
  onVoiceEnd,
  voice = true,
}: {
  figure: MathFigure;
  lang?: 'zh' | 'en';
  onVoiceEnd?: () => void;
  voice?: boolean;
}) {
  // figure 引用变化时重挂载内部内容，确保动画从头重播（图随讲解变化）
  const [mountKey, setMountKey] = useState(0);
  const prevFig = useRef(figure);
  const voiceEndRef = useRef(onVoiceEnd);
  useEffect(() => {
    voiceEndRef.current = onVoiceEnd;
  });
  useEffect(() => {
    if (prevFig.current !== figure) {
      prevFig.current = figure;
      setMountKey((k) => k + 1);
    }
  }, [figure]);

  // 不发音的图型：动画配图没有自己的语音，立即通知"图演示完毕"，让讲解接着播
  const voiced = VOICED_TYPES.has(figure.type);
  useEffect(() => {
    if (!voiced) voiceEndRef.current?.();
  }, [voiced]);

  let body: ReactNode;
  switch (figure.type) {
    case 'count':
      body = <CountFig figure={figure} lang={lang} voice={voice} onVoiceEnd={() => voiceEndRef.current?.()} />;
      break;
    case 'equation':
      body = <EquationFig figure={figure} lang={lang} voice={voice} onVoiceEnd={() => voiceEndRef.current?.()} />;
      break;
    case 'vertical':
      body = <VerticalFig figure={figure} />;
      break;
    case 'numberline':
      body = <NumberlineFig figure={figure} />;
      break;
    case 'compare':
      body = <CompareFig figure={figure} lang={lang} voice={voice} onVoiceEnd={() => voiceEndRef.current?.()} />;
      break;
    case 'shapes':
      body = <ShapeSvg figure={figure} />;
      break;
    case 'fraction':
      body = <FractionFig figure={figure} />;
      break;
    case 'fractionMultiply':
      body = <FractionMultiplyFig figure={figure} />;
      break;
    case 'makeTen':
      body = <MakeTenFig figure={figure} lang={lang} />;
      break;
    case 'breakTen':
      body = <BreakTenFig figure={figure} lang={lang} />;
      break;
    case 'unroll':
      body = <UnrollFig figure={figure} />;
      break;
    case 'clock':
      body = <ClockFig figure={figure} />;
      break;
    case 'chart':
      body = <ChartFig figure={figure} />;
      break;
    case 'position':
      body = <PositionFig figure={figure} />;
      break;
    case 'direction':
      body = <DirectionFig figure={figure} />;
      break;
    case 'ordinal':
      body = <OrdinalFig figure={figure} lang={lang} voice={voice} onVoiceEnd={() => voiceEndRef.current?.()} />;
      break;
    case 'shapeSet':
      body = <ShapeSetFig figure={figure} />;
      break;
    case 'sort':
      body = <SortFig figure={figure} />;
      break;
    case 'money':
      body = <MoneyFig figure={figure} lang={lang} voice={voice} onVoiceEnd={() => voiceEndRef.current?.()} />;
      break;
    case 'pattern':
      body = <PatternFig figure={figure} />;
      break;
    case 'angle':
      body = <AngleFig figure={figure} />;
      break;
    case 'views':
      body = <ViewsFig />;
      break;
    case 'combo':
      body = <ComboFig figure={figure} />;
      break;
    case 'motion':
      body = <MotionFig figure={figure} />;
      break;
    case 'weight':
      body = <WeightFig figure={figure} />;
      break;
    case 'venn':
      body = <VennFig figure={figure} />;
      break;
    case 'placevalue':
      body = <PlaceValueFig figure={figure} />;
      break;
    case 'linekind':
      body = <LineKindFig figure={figure} />;
      break;
    case 'linepair':
      body = <LinePairFig figure={figure} />;
      break;
    case 'timeline':
      body = <TimelineFig figure={figure} />;
      break;
    case 'match':
      body = <MatchFig figure={figure} />;
      break;
    case 'plant':
      body = <PlantFig figure={figure} />;
      break;
    case 'grid':
      body = <GridFig figure={figure} />;
      break;
    case 'pigeonhole':
      body = <PigeonholeFig figure={figure} />;
      break;
    case 'text':
      body = <TextFig figure={figure} />;
      break;
    case 'scene':
      body = <SceneFig figure={figure} />;
      break;
    default:
      body = null;
  }

  return (
    <div className="mf" key={mountKey}>
      {body}
      {figure.formula && <div className="mf-formula">{figure.formula}</div>}
    </div>
  );
}

/* 数数情境图：自动逐一点数——手指移到哪只小鸟，哪只小鸟就跳起来并"盖"上数字章（1、2、3…），
   同时语音跟着数"1、2、3…"、音效轻响；也可点画面手动数，数完可重播 */
function CountFig({ figure, lang, voice, onVoiceEnd }: { figure: MathFigure; lang: 'zh' | 'en'; voice: boolean; onVoiceEnd?: () => void }) {
  const n = Math.max(0, Math.round(figure.count ?? 0));
  const emoji = figure.emoji ?? '●';
  const [shown, setShown] = useState(0);
  const [run, setRun] = useState(0);
  const timerRef = useRef<number | null>(null);
  const voiceEndRef = useRef(onVoiceEnd);
  useEffect(() => {
    voiceEndRef.current = onVoiceEnd;
  });

  const stopAuto = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  /** 数到一个：轻响一声 + 朗读这个数字；数到最后一个时播完回调 onVoiceEnd（voice=false 时静音） */
  const countVoice = useCallback(
    (i: number) => {
      if (!voice) return;
      playSfx('tap');
      speakOnce(String(i), lang, 1.05, i >= n ? () => voiceEndRef.current?.() : undefined);
    },
    [n, lang, voice],
  );

  // 进场后自动开始点数（每次重播 run 变化也重来；重播时由 replay 先归零再 +1）
  useEffect(() => {
    if (n <= 0) return;
    stopAuto();
    // 数得越多速度越快，但每次间隔不少于 320ms、不多于 1000ms
    const stepMs = Math.max(320, Math.min(1000, Math.round(1900 / Math.sqrt(n))));
    const start = window.setTimeout(() => {
      let i = 0;
      timerRef.current = window.setInterval(() => {
        i += 1;
        setShown(i);
        countVoice(i);
        if (i >= n) stopAuto();
      }, stepMs);
    }, 450);
    return () => {
      window.clearTimeout(start);
      stopAuto();
    };
  }, [n, run, countVoice]);

  const finished = n > 0 && shown >= n;

  const tapCount = () => {
    stopAuto();
    const next = shown >= n ? 1 : shown + 1;
    setShown(next);
    countVoice(next);
  };

  const replay = () => {
    stopAuto();
    setShown(0);
    setRun((r) => r + 1);
  };

  return (
    <div className="mf-count" aria-hidden="true">
      <div className="mf-row mf-count-row mf-tappable" onClick={tapCount} role="button" aria-label="count">
        {Array.from({ length: n }).map((_, i) => {
          const counted = i < shown;
          const current = !finished && i === shown - 1;
          return (
            <span key={i} className={`mf-count-slot${counted ? ' lit' : ''}${current ? ' current' : ''}`}>
              <span className="mf-slot-pointer">{current ? '👆' : ''}</span>
              <span className="mf-item">{emoji}</span>
              <span className="mf-slot-badge">{counted ? i + 1 : ''}</span>
            </span>
          );
        })}
      </div>
      <div className="mf-num" key={shown}>
        {shown}
      </div>
      <button className="mf-play" onClick={replay}>▶ {finished ? '再数一次' : '数一数'}</button>
    </div>
  );
}

/* 算式图解：每个数都是「圆点图 + 数字」；自动演示——左边圆点逐个数亮、右边逐个数亮、
   结果弹出，语音同步读"2、3、2加3等于5"；也可点「?」立刻算出来 */
const OP_WORDS: Record<string, string> = { '+': '加', '-': '减', '×': '乘', '÷': '除以' };

function EquationFig({ figure, lang, voice, onVoiceEnd }: { figure: MathFigure; lang: 'zh' | 'en'; voice: boolean; onVoiceEnd?: () => void }) {
  const a = Math.max(0, Math.round(figure.a ?? 0));
  const b = Math.max(0, Math.round(figure.b ?? 0));
  const op = figure.op ?? '+';
  const result = op === '×' ? a * b : op === '÷' ? (b === 0 ? 0 : Math.floor(a / b)) : op === '-' ? a - b : a + b;
  const showDots = a <= 20 && b <= 20 && a + b <= 24;
  const [litA, setLitA] = useState(0);
  const [litB, setLitB] = useState(0);
  const [solved, setSolved] = useState(false);
  const [run, setRun] = useState(0);
  const timerRef = useRef<number | null>(null);
  const voiceEndRef = useRef(onVoiceEnd);
  useEffect(() => {
    voiceEndRef.current = onVoiceEnd;
  });

  const opWord = OP_WORDS[op] ?? op;
  const resultPhrase = `${a}${opWord}${b}等于${result}`;

  const stop = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const speakResult = useCallback(() => {
    if (!voice) return;
    playSfx('pop');
    speakOnce(resultPhrase, lang, 1.0, () => voiceEndRef.current?.());
  }, [resultPhrase, lang, voice]);

  // 进场自动演示：左边 a 个圆点逐个点亮 → 右边 b 个逐个点亮 → 结果弹出
  // （重播时由 replay 先归零再 +1；voice=false 时只演示不发声）
  useEffect(() => {
    stop();
    const steps = showDots ? a + b : 2;
    const stepMs = showDots ? Math.max(220, Math.min(420, Math.round(1400 / Math.sqrt(Math.max(1, steps))))) : 550;
    let i = 0;
    timerRef.current = window.setInterval(() => {
      i += 1;
      if (showDots) {
        if (i <= a) {
          setLitA(i);
          if (voice && i === a) speakOnce(String(a), lang, 1.0);
        } else if (i <= a + b) {
          setLitB(i - a);
          if (voice && i === a + b) speakOnce(String(b), lang, 1.0);
        }
      } else if (i === 1) {
        setLitA(a);
        if (voice) speakOnce(String(a), lang, 1.0);
      } else {
        setLitB(b);
        if (voice) speakOnce(String(b), lang, 1.0);
      }
      if (i >= steps) {
        stop();
        window.setTimeout(() => {
          setSolved(true);
          speakResult();
        }, showDots ? 260 : 380);
      }
    }, stepMs);
    return stop;
  }, [run, a, b, op, showDots, lang, voice, stop, speakResult]);

  const solveNow = () => {
    stop();
    setLitA(a);
    setLitB(b);
    setSolved(true);
    speakResult();
  };

  const replay = () => {
    stop();
    setLitA(0);
    setLitB(0);
    setSolved(false);
    setRun((r) => r + 1);
  };

  return (
    <div className="mf-equation-wrap" aria-hidden="true">
      <div className="mf-equation">
        <Part n={a} lit={litA} />
        <span className="mf-op">{op}</span>
        <Part n={b} lit={litB} />
        <span className="mf-op">=</span>
        {solved ? (
          <Part n={result} lit={result} result stagger />
        ) : (
          <button className="mf-eq-solve" onClick={solveNow} aria-label="算一算">?</button>
        )}
      </div>
      <div className="mf-play-row">
        <button className="mf-play" onClick={replay}>▶ {solved ? '再看一遍' : '看演示'}</button>
      </div>
    </div>
  );
}

/* 竖式计算：多位数（含小数）加减法，数位对齐（个位/十分位…），进位/退位直观演示 */
function VerticalFig({ figure }: { figure: MathFigure }) {
  const a = figure.a ?? 0;
  const b = figure.b ?? 0;
  const op = figure.op === '-' ? '-' : '+';

  // 小数对齐：按最大小数位放大成整数计算，展示时插回小数点
  const aStr = String(a), bStr = String(b);
  const aFrac = aStr.includes('.') ? aStr.split('.')[1].length : 0;
  const bFrac = bStr.includes('.') ? bStr.split('.')[1].length : 0;
  const fracLen = Math.max(aFrac, bFrac);
  const scale = Math.pow(10, fracLen);
  const aI = Math.round(a * scale);
  const bI = Math.round(b * scale);

  const aIs = String(aI), bIs = String(bI);
  const len = Math.max(aIs.length, bIs.length);

  const placeName = (i: number): string => {
    const exp = i - fracLen;
    if (exp === 0) return '个';
    if (exp > 0) return ['', '十', '百', '千'][exp] ?? '';
    return ['', '十分', '百分', '千分'][-exp] ?? '';
  };

  interface VCol { place: string; a: number; b: number; r: number; carry: number; borrow: boolean; borrowDot: boolean; }
  const rt: VCol[] = [];

  if (op === '+') {
    let carry = 0;
    for (let i = 0; i < len; i++) {
      const ad = i < aIs.length ? +aIs[aIs.length - 1 - i] : 0;
      const bd = i < bIs.length ? +bIs[bIs.length - 1 - i] : 0;
      const sum = ad + bd + carry;
      rt.push({ place: placeName(i), a: ad, b: bd, r: sum % 10, carry, borrow: false, borrowDot: false });
      carry = Math.floor(sum / 10);
    }
    if (carry > 0) rt.push({ place: placeName(len), a: 0, b: 0, r: carry, carry: 0, borrow: false, borrowDot: false });
  } else {
    let borrow = 0;
    for (let i = 0; i < len; i++) {
      const adRaw = i < aIs.length ? +aIs[aIs.length - 1 - i] : 0;
      const bd = i < bIs.length ? +bIs[bIs.length - 1 - i] : 0;
      const ad = adRaw - borrow;
      const borrowThis = ad < bd;
      rt.push({ place: placeName(i), a: adRaw, b: bd, r: ad + (borrowThis ? 10 : 0) - bd, carry: 0, borrow: borrowThis, borrowDot: false });
      borrow = borrowThis ? 1 : 0;
    }
  }

  const cols = rt.slice().reverse();
  for (let j = 0; j < cols.length; j++) {
    cols[j].borrowDot = j + 1 < cols.length && cols[j + 1].borrow;
  }

  // 在「个位」列后插入小数点列
  type Cell = { kind: 'col'; col: VCol } | { kind: 'dot' };
  const cells: Cell[] = [];
  for (const c of cols) {
    cells.push({ kind: 'col', col: c });
    if (fracLen > 0 && c.place === '个') cells.push({ kind: 'dot' });
  }

  const cellW = 42, dotW = 14, leftPad = 34, rightPad = 12;
  const colCells = cells.filter((c) => c.kind === 'col').length;
  const dotCells = cells.filter((c) => c.kind === 'dot').length;
  const W = leftPad + colCells * cellW + dotCells * dotW + rightPad;
  const H = 188;
  const cellX = (j: number) => {
    let x = leftPad;
    for (let k = 0; k < j; k++) x += cells[k].kind === 'col' ? cellW : dotW;
    return x;
  };
  const headerY = 22, carryY = 48, aY = 88, bY = 118, lineY = 136, rY = 170;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true" className="mf-vertical">
      {cells.map((cell, j) => {
        if (cell.kind === 'dot') {
          const x = cellX(j) + dotW / 2;
          return (
            <g key={`dot${j}`}>
              <text x={x} y={aY} textAnchor="middle" fontSize="24" fontWeight="700" fill="#4a3b66">.</text>
              <text x={x} y={bY} textAnchor="middle" fontSize="24" fontWeight="700" fill="#4a3b66">.</text>
              <text x={x} y={rY} textAnchor="middle" fontSize="24" fontWeight="700" fill="#4a3b66">.</text>
            </g>
          );
        }
        const c = cell.col;
        const x = cellX(j) + cellW / 2;
        // 演算顺序：从个位（最右）逐列向左；动画延迟按列序
        const stepDelay = (cols.length - 1 - j) * 0.45;
        const hlW = cellW - 8;
        return (
          <g key={`col${j}`}>
            {/* 当前演算列高亮框（逐列扫过） */}
            <rect className="vf-col-hl" style={{ animationDelay: `${stepDelay}s` }}
              x={cellX(j) + 4} y={carryY - 12} width={hlW} height={lineY - carryY + 12}
              rx={8} fill="none" stroke="#ff6f91" strokeWidth={2.5} />
            <text x={x} y={headerY} textAnchor="middle" fontSize="13" fill="#7c6ba0">{c.place}位</text>
            {c.carry > 0 ? (
              <text className="vf-carry" style={{ animationDelay: `${stepDelay + 0.35}s` }}
                x={x} y={carryY} textAnchor="middle" fontSize="12" fill="#e07b00" fontWeight="bold">{c.carry}</text>
            ) : c.borrowDot ? (
              <circle className="vf-carry" style={{ animationDelay: `${stepDelay + 0.35}s` }}
                cx={x} cy={carryY - 3} r={3} fill="#e07b00" />
            ) : null}
            <text x={x} y={aY} textAnchor="middle" fontSize="24" fontWeight="700" fill="#4a3b66">{c.a}</text>
            <text x={x} y={bY} textAnchor="middle" fontSize="24" fontWeight="700" fill="#4a3b66">{c.b}</text>
            <text className="vf-digit" style={{ animationDelay: `${stepDelay + 0.2}s` }}
              x={x} y={rY} textAnchor="middle" fontSize="24" fontWeight="700" fill="#4a3b66">{c.r}</text>
          </g>
        );
      })}
      <text x={14} y={bY} textAnchor="middle" fontSize="24" fontWeight="bold" fill="#4a3b66">{op}</text>
      <line className="vf-line" style={{ animationDelay: '0.4s' }}
        x1={8} y1={lineY} x2={W - 8} y2={lineY} stroke="#4a3b66" strokeWidth={2.5} strokeLinecap="round" />
    </svg>
  );
}

/* 数轴 */
function NumberlineFig({ figure }: { figure: MathFigure }) {
  const start = Math.round(figure.start ?? 0);
  const end = Math.max(start, Math.round(figure.end ?? 10));
  const mark = Math.round(figure.mark ?? start);
  const W = 320, H = 72, L = 16, R = 16;
  const x = (v: number) => L + ((v - start) / (end - start)) * (W - L - R);
  return (
    <div className="mf-numberline" aria-hidden="true">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto">
        <line x1={L} y1={40} x2={W - R} y2={40} stroke="#4a3b66" strokeWidth={2.5} strokeLinecap="round" />
        <path d={`M${L} ${40} l7 -5 v10 z`} fill="#4a3b66" />
        {Array.from({ length: end - start + 1 }, (_, i) => start + i).map((v, i) => (
          <g key={v}>
            <line className="chart-num-anim" style={{ animationDelay: `${i * 0.06}s` }} x1={x(v)} y1={36} x2={x(v)} y2={44} stroke="#4a3b66" strokeWidth={2} />
            <text className="chart-num-anim" style={{ animationDelay: `${i * 0.06}s` }} x={x(v)} y={60} textAnchor="middle" fontSize="13" fill="#7c6ba0">{v}</text>
          </g>
        ))}
        <circle className="nl-mark" style={{ animationDelay: `${(end - start + 1) * 0.06 + 0.2}s` }} cx={x(mark)} cy={40} r={9} fill="#ff6f91" stroke="#fff" strokeWidth={2} />
      </svg>
    </div>
  );
}

/* 比多少：两堆物品一个对一个拉线配对（动画），多出来的物品跳出来标 ⭐，
   符号和数字最后弹出并语音读出"5大于3"；可重播 */
const REL_WORDS: Record<string, string> = { '>': '大于', '<': '小于', '=': '等于' };

function CompareFig({ figure, lang, voice, onVoiceEnd }: { figure: MathFigure; lang: 'zh' | 'en'; voice: boolean; onVoiceEnd?: () => void }) {
  const l = Math.max(0, Math.round(figure.left ?? 0));
  const r = Math.max(0, Math.round(figure.right ?? 0));
  const le = figure.leftEmoji ?? '🔴';
  const re = figure.rightEmoji ?? '🔵';
  const [run, setRun] = useState(0);
  const voiceEndRef = useRef(onVoiceEnd);
  useEffect(() => {
    voiceEndRef.current = onVoiceEnd;
  });
  const rows = Math.max(1, l, r);
  const W = 252, y0 = 44, dy = 36, H = y0 + (rows - 1) * dy + 46;
  const xL = 46, xR = W - 46;
  const pairN = Math.min(l, r);
  const pairStart = pairN > 0 ? 0.35 + pairN * 0.22 : 0.35;
  const rel = l > r ? '>' : l < r ? '<' : '=';
  const d = (s: number) => ({ ['--d' as string]: `${s}s` }) as CSSProperties;

  // 符号弹出的同一时刻，语音读出结论（重播 run 变化重新计时；voice=false 时静音）
  const voiceAt = pairStart + (Math.max(l, r) - pairN) * 0.24 + 0.55;
  useEffect(() => {
    if (!voice) return;
    const t = window.setTimeout(() => {
      playSfx('pop');
      speakOnce(`${l}${REL_WORDS[rel] ?? rel}${r}`, lang, 1.0, () => voiceEndRef.current?.());
    }, Math.round(voiceAt * 1000));
    return () => window.clearTimeout(t);
  }, [run, voiceAt, l, r, rel, lang, voice]);

  return (
    <div className="mf-compare-wrap" aria-hidden="true">
      <svg key={run} viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
        {/* 左边物品逐入 */}
        {Array.from({ length: l }).map((_, i) => (
          <text key={`l${i}`} className="cp-item" style={d(i * 0.22)} x={xL} y={y0 + i * dy} textAnchor="middle" fontSize="26">{le}</text>
        ))}
        {/* 右边物品逐入 */}
        {Array.from({ length: r }).map((_, i) => (
          <text key={`r${i}`} className="cp-item" style={d(0.12 + i * 0.22)} x={xR} y={y0 + i * dy} textAnchor="middle" fontSize="26">{re}</text>
        ))}
        {/* 一个对一个拉线配对 */}
        {Array.from({ length: pairN }).map((_, i) => (
          <line key={`p${i}`} className="cp-line" style={d(0.35 + i * 0.22)} x1={xL + 15} y1={y0 + i * dy} x2={xR - 15} y2={y0 + i * dy} stroke="#8d7bb8" strokeWidth={2} strokeDasharray="5 4" />
        ))}
        {/* 多出来的物品：金圈 + ⭐ */}
        {l > r && Array.from({ length: l - r }).map((_, k) => {
          const i = r + k;
          return (
            <g key={`exl${i}`}>
              <circle className="cp-extra" style={d(pairStart + 0.2 + k * 0.24)} cx={xL} cy={y0 + i * dy} r={21} fill="none" stroke="#ffb300" strokeWidth={2.5} />
              <text className="cp-star" style={d(pairStart + 0.45 + k * 0.24)} x={xL} y={y0 + i * dy - 24} textAnchor="middle" fontSize="15">⭐</text>
            </g>
          );
        })}
        {r > l && Array.from({ length: r - l }).map((_, k) => {
          const i = l + k;
          return (
            <g key={`exr${i}`}>
              <circle className="cp-extra" style={d(pairStart + 0.2 + k * 0.24)} cx={xR} cy={y0 + i * dy} r={21} fill="none" stroke="#ffb300" strokeWidth={2.5} />
              <text className="cp-star" style={d(pairStart + 0.45 + k * 0.24)} x={xR} y={y0 + i * dy - 24} textAnchor="middle" fontSize="15">⭐</text>
            </g>
          );
        })}
        {/* 结论：符号与数字 */}
        <text className="cp-symbol" style={d(pairStart + (Math.max(l, r) - pairN) * 0.24 + 0.5)} x={W / 2} y={y0 + ((rows - 1) * dy) / 2 + 12} textAnchor="middle" fontSize="46" fontWeight="bold" fill="#ff6f91">{rel}</text>
        <text className="chart-num-anim" style={{ animationDelay: `${pairStart + 0.9}s` }} x={xL} y={H - 10} textAnchor="middle" fontSize="16" fontWeight="bold" fill="#4a3b66">{l}</text>
        <text className="chart-num-anim" style={{ animationDelay: `${pairStart + 1.05}s` }} x={xR} y={H - 10} textAnchor="middle" fontSize="16" fontWeight="bold" fill="#4a3b66">{r}</text>
      </svg>
      <button className="mf-play" onClick={() => setRun((x) => x + 1)}>▶ 再比一次</button>
    </div>
  );
}

/* 分数：圆饼等分 */
function FractionFig({ figure }: { figure: MathFigure }) {
  const whole = Math.max(1, Math.round(figure.whole ?? 4));
  const part = Math.min(whole, Math.max(0, Math.round(figure.part ?? 1)));

  /* 百分数（100 等份）：用 10×10 网格，每格 1%，涂色部分一目了然 */
  if (whole === 100) {
    const cell = 12, pad = 6;
    const size = cell * 10 + pad * 2 + 16;
    return (
      <svg viewBox={`0 0 ${size} ${size + 14}`} width={size} height={size + 14} aria-hidden="true">
        {Array.from({ length: 100 }).map((_, i) => {
          const x = pad + (i % 10) * cell;
          const y = pad + Math.floor(i / 10) * cell;
          return (
            <rect key={i} x={x} y={y} width={cell - 1.5} height={cell - 1.5} rx={1.5}
              fill={i < part ? '#ff6f91' : '#fff'} stroke="#d8d2e6" strokeWidth={0.5} />
          );
        })}
        <text x={size / 2} y={size + 12} textAnchor="middle" fontSize="14" fontWeight="bold" fill="#4a3b66">
          {part}%
        </text>
      </svg>
    );
  }

  /* 分数：圆饼等分，分割线用虚线（辅助线，非实体边界）；扇区逐个出现（涂色部分最后点亮） */
  const R = 56, C = 70;
  return (
    <svg viewBox="0 0 140 140" width={132} height={132} aria-hidden="true">
      {Array.from({ length: whole }, (_, i) => {
        const a0 = (i / whole) * Math.PI * 2 - Math.PI / 2;
        const a1 = ((i + 1) / whole) * Math.PI * 2 - Math.PI / 2;
        const x0 = C + R * Math.cos(a0), y0 = C + R * Math.sin(a0);
        const x1 = C + R * Math.cos(a1), y1 = C + R * Math.sin(a1);
        return (
          <path key={i} className="frac-sector" style={{ animationDelay: `${i * 0.15}s` }}
            d={`M${C} ${C} L${x0} ${y0} A${R} ${R} 0 0 1 ${x1} ${y1} Z`}
            fill={i < part ? '#ff6f91' : '#fff'}
            stroke="#4a3b66" strokeWidth={1.5} strokeDasharray="4 3" />
        );
      })}
      <text className="chart-num-anim" style={{ animationDelay: `${whole * 0.15 + 0.3}s` }}
        x={C} y={C + 6} textAnchor="middle" fontSize="22" fontWeight="bold" fill="#4a3b66">{part}/{whole}</text>
    </svg>
  );
}

/* 分数乘分数：a/b × c/d —— 网格重叠阴影（横向分 b 份涂 a 份，纵向分 d 份涂 c 份，重叠即答案）
   动画顺序：网格逐格出现 → 横向（第一个分数）→ 纵向（第二个分数）→ 重叠高亮 → 答案 */
function FractionMultiplyFig({ figure }: { figure: MathFigure }) {
  const fa = Math.max(0, Math.round(figure.fa ?? 1));
  const fb = Math.max(1, Math.round(figure.fb ?? 2));
  const fc = Math.max(0, Math.round(figure.fc ?? 1));
  const fd = Math.max(1, Math.round(figure.fd ?? 2));
  const cell = 26, pad = 8;
  const W = fb * cell, H = fd * cell;
  const gridDelay = 0.15;
  return (
    <svg viewBox={`0 0 ${W + pad * 2} ${H + pad * 2 + 22}`} width={W + pad * 2} height={H + pad * 2 + 22} aria-hidden="true">
      <g transform={`translate(${pad} ${pad})`}>
        {Array.from({ length: fb * fd }).map((_, i) => {
          const x = (i % fb) * cell, y = Math.floor(i / fb) * cell;
          return <rect key={i} className="fm-grid-cell" style={{ animationDelay: `${gridDelay + i * 0.03}s` }}
            x={x} y={y} width={cell - 1.5} height={cell - 1.5} fill="#fff" stroke="#d8d2e6" strokeWidth={0.6} />;
        })}
        {/* 第一个分数：横向涂 fa 列（蓝）——先出现 */}
        <rect className="fm-horiz" style={{ animationDelay: '0.7s' }}
          x={0} y={0} width={fa * cell} height={H} fill="#64b5f6" opacity={0.4} />
        {/* 第二个分数：纵向涂 fc 行（红）——后出现 */}
        <rect className="fm-vert" style={{ animationDelay: '1.2s' }}
          x={0} y={0} width={W} height={fc * cell} fill="#ff6f91" opacity={0.4} />
        {/* 重叠区域（紫）= 答案——最后高亮 */}
        <rect className="fm-overlap" style={{ animationDelay: '1.7s' }}
          x={0} y={0} width={fa * cell} height={fc * cell} fill="#ba68c8" opacity={0.6} />
        {/* 分割虚线 */}
        <line x1={fa * cell} y1={0} x2={fa * cell} y2={H} stroke="#4a3b66" strokeWidth={1.5} strokeDasharray="4 3" />
        <line x1={0} y1={fc * cell} x2={W} y2={fc * cell} stroke="#4a3b66" strokeWidth={1.5} strokeDasharray="4 3" />
      </g>
      <text className="chart-num-anim" style={{ animationDelay: '1.9s' }} x={(W + pad * 2) / 2} y={H + pad * 2 + 16} textAnchor="middle" fontSize="14" fontWeight="bold" fill="#4a3b66">
        {fa}/{fb} × {fc}/{fd} = {fa * fc}/{fb * fd}
      </text>
    </svg>
  );
}

/* 凑十法：a + b，先凑成 10，再加剩下的（分步演示，点演示时语音读结果） */
function MakeTenFig({ figure, lang }: { figure: MathFigure; lang: 'zh' | 'en' }) {
  const a = Math.max(1, Math.round(figure.a ?? 9));
  const b = Math.max(1, Math.round(figure.b ?? 4));
  const take = Math.max(0, 10 - a);
  const rest = Math.max(0, b - take);
  const result = 10 + rest;
  const R = 7, gap = 20, x0 = 20, y1 = 28, y2 = 92;
  const maxCount = Math.max(a + b, 10 + rest);
  const W = x0 * 2 + (maxCount - 1) * gap;
  const [step, setStep] = useState(0);
  const dot = (x: number, y: number, color: string, key: string, idx: number) => (
    <circle key={key} className="mt-dot" style={{ animationDelay: `${idx * 0.07}s` }} cx={x} cy={y} r={R} fill={color} stroke="#fff" strokeWidth={1.5} />
  );
  const row1 = [...Array.from({ length: a }, (_, i) => dot(x0 + i * gap, y1, '#ff6f91', `a${i}`, i)),
    ...Array.from({ length: b }, (_, i) => dot(x0 + (a + i) * gap, y1, '#64b5f6', `b${i}`, a + i))];
  const row2 = [...Array.from({ length: 10 }, (_, i) => dot(x0 + i * gap, y2, '#ff6f91', `t${i}`, i)),
    ...Array.from({ length: rest }, (_, i) => dot(x0 + (10 + i) * gap, y2, '#64b5f6', `r${i}`, 10 + i))];
  return (
    <div className="mf-makeTen" aria-hidden="true">
      <svg viewBox={`0 0 ${W} ${y2 + R + 34}`} width={W} height={y2 + R + 34}>
        <g opacity={step >= 1 ? 0.35 : 1}>
          {row1}
        </g>
        {step >= 1 && (
          <g>
            {row2}
            <rect x={x0 - R - 4} y={y2 - R - 4} width={9 * gap + R * 2 + 8} height={R * 2 + 8} rx={10} fill="none" stroke="#4a3b66" strokeWidth={1.5} strokeDasharray="5 3" />
          </g>
        )}
        <text x={W / 2} y={y1 + R + 16} textAnchor="middle" fontSize="14" fontWeight="bold" fill="#4a3b66">{a} + {b}</text>
        {step >= 1 && (
          <text className="chart-num-anim" x={W / 2} y={y2 + R + 26} textAnchor="middle" fontSize="14" fontWeight="bold" fill="#4a3b66">10 + {rest} = {result}</text>
        )}
      </svg>
      {step === 0 ? (
        <button className="mf-play" onClick={() => { setStep(1); playSfx('pop'); speakOnce(`凑成10，${10}加${rest}等于${result}`, lang); }}>
          ▶ 凑十演示
        </button>
      ) : (
        <button className="mf-play" onClick={() => setStep(0)}>⟲ 重来</button>
      )}
    </div>
  );
}

/* 破十法：a - b，把 a 拆成 10 + 个位，先 10 - b，再加个位（分步演示，点演示时语音读结果） */
function BreakTenFig({ figure, lang }: { figure: MathFigure; lang: 'zh' | 'en' }) {
  const a = Math.max(10, Math.round(figure.a ?? 13));
  const b = Math.max(1, Math.min(10, Math.round(figure.b ?? 9)));
  const ones = Math.max(0, a - 10);
  const left = 10 - b;
  const result = left + ones;
  const R = 7, gap = 20, x0 = 20, y1 = 28, y2 = 92;
  const maxCount = Math.max(10 + ones, left + ones);
  const W = x0 * 2 + (maxCount - 1) * gap;
  const [step, setStep] = useState(0);
  const dot = (x: number, y: number, color: string, key: string, idx: number, crossed = false) => (
    <g key={key}>
      <circle className="mt-dot" style={{ animationDelay: `${idx * 0.07}s` }} cx={x} cy={y} r={R} fill={color} stroke="#fff" strokeWidth={1.5} />
      {crossed && <path d={`M${x - 4} ${y - 4} L${x + 4} ${y + 4} M${x + 4} ${y - 4} L${x - 4} ${y + 4}`} stroke="#9e9e9e" strokeWidth={2} strokeLinecap="round" />}
    </g>
  );
  // 行1：10 个点，前 b 个灰×（拿走），后 left 个红（保留）；个位蓝
  const row1 = [
    ...Array.from({ length: b }, (_, i) => dot(x0 + i * gap, y1, '#cfc7e2', `x${i}`, i, true)),
    ...Array.from({ length: left }, (_, i) => dot(x0 + (b + i) * gap, y1, '#ff6f91', `k${i}`, b + i)),
    ...Array.from({ length: ones }, (_, i) => dot(x0 + (10 + i) * gap, y1, '#64b5f6', `o${i}`, 10 + i)),
  ];
  // 行2：left 红 + ones 蓝
  const row2 = [
    ...Array.from({ length: left }, (_, i) => dot(x0 + i * gap, y2, '#ff6f91', `r${i}`, i)),
    ...Array.from({ length: ones }, (_, i) => dot(x0 + (left + i) * gap, y2, '#64b5f6', `q${i}`, left + i)),
  ];
  return (
    <div className="mf-makeTen" aria-hidden="true">
      <svg viewBox={`0 0 ${W} ${y2 + R + 34}`} width={W} height={y2 + R + 34}>
        <g opacity={step >= 1 ? 0.35 : 1}>
          {row1}
          <rect x={x0 - R - 4} y={y1 - R - 4} width={9 * gap + R * 2 + 8} height={R * 2 + 8} rx={10} fill="none" stroke="#4a3b66" strokeWidth={1.5} strokeDasharray="5 3" />
        </g>
        {step >= 1 && <g>{row2}</g>}
        <text x={W / 2} y={y1 + R + 16} textAnchor="middle" fontSize="14" fontWeight="bold" fill="#4a3b66">
          {step === 0 ? `${a} = 10 + ${ones}，拿走 ${b}` : `${a} − ${b}`}
        </text>
        {step >= 1 && (
          <text className="chart-num-anim" x={W / 2} y={y2 + R + 26} textAnchor="middle" fontSize="14" fontWeight="bold" fill="#4a3b66">{left} + {ones} = {result}</text>
        )}
      </svg>
      {step === 0 ? (
        <button className="mf-play" onClick={() => { setStep(1); playSfx('pop'); speakOnce(`破十，${left}加${ones}等于${result}`, lang); }}>
          ▶ 破十演示
        </button>
      ) : (
        <button className="mf-play" onClick={() => setStep(0)}>⟲ 重来</button>
      )}
    </div>
  );
}

/* 圆周展开：圆滚动 → 拉直成线段，直观理解 C = πd（约 3 个直径 + 0.14 个直径） */
function UnrollFig({ figure }: { figure: MathFigure }) {
  const r = Math.max(1, Math.round(figure.r ?? 3));
  const R = 32, C = 60, cy = 70;
  const seg = 54; // 一个直径的像素长度
  const x0 = 140;
  const tail = seg * 0.14;
  const W = Math.round(x0 + 3 * seg + tail + 16);
  // 圆从原位置"滚"到展开起点：水平位移 + 自转 540°
  const rollDx = x0 - (C + R) - 10;
  return (
    <svg viewBox={`0 0 ${W} 140`} width={W} height={140} aria-hidden="true">
      {/* 左侧圆：直径 d 高亮，先原地演示再滚向展开位置 */}
      <g className="unroll-circle" style={{ ['--roll-dx' as string]: `${rollDx}px` } as CSSProperties}>
        <circle cx={C} cy={cy} r={R} fill="#fff" stroke="#4a3b66" strokeWidth={2.5} />
        <line x1={C - R} y1={cy} x2={C + R} y2={cy} stroke="#ef5350" strokeWidth={2.5} />
        <circle cx={C} cy={cy} r={2.5} fill="#4a3b66" />
        <text x={C} y={cy - R - 6} textAnchor="middle" fontSize="13" fontWeight="bold" fill="#4a3b66">直径 d={2 * r}</text>
      </g>
      {/* 展开箭头（脉动提示方向） */}
      <line className="unroll-arrow" x1={C + R + 8} y1={cy} x2={x0 - 8} y2={cy} stroke="#7c6ba0" strokeWidth={2} />
      <path className="unroll-arrow" d={`M${x0 - 8} ${cy} L${x0 - 16} ${cy - 5} M${x0 - 8} ${cy} L${x0 - 16} ${cy + 5}`} stroke="#7c6ba0" strokeWidth={2} strokeLinecap="round" />
      <text x={(C + R + 8 + x0 - 8) / 2} y={cy - 10} textAnchor="middle" fontSize="12" fill="#7c6ba0">展开</text>
      {/* 展开后的线段：3 个直径段 + 0.14 个直径段，逐段生长 */}
      {Array.from({ length: 3 }).map((_, i) => (
        <rect className="unroll-seg" style={{ animationDelay: `${0.7 + i * 0.35}s` }}
          key={i} x={x0 + i * seg} y={cy - 6} width={seg} height={12} fill="#ff6f91" fillOpacity={0.35} stroke="#ef5350" strokeWidth={2} />
      ))}
      <rect className="unroll-seg" style={{ animationDelay: '1.85s' }}
        x={x0 + 3 * seg} y={cy - 6} width={tail} height={12} fill="#64b5f6" fillOpacity={0.4} stroke="#4a3b66" strokeWidth={1.5} />
      <text className="chart-num-anim" style={{ animationDelay: '1.1s' }} x={x0 + seg / 2} y={cy + 26} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#ef5350">d</text>
      <text className="chart-num-anim" style={{ animationDelay: '1.45s' }} x={x0 + seg * 1.5} y={cy + 26} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#ef5350">d</text>
      <text className="chart-num-anim" style={{ animationDelay: '1.8s' }} x={x0 + seg * 2.5} y={cy + 26} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#ef5350">d</text>
      <text className="chart-num-anim" style={{ animationDelay: '2.1s' }} x={x0 + seg * 3 + tail / 2} y={cy + 26} textAnchor="middle" fontSize="11" fill="#4a3b66">0.14d</text>
      <text className="chart-num-anim" style={{ animationDelay: '2.2s' }} x={x0 + seg * 1.5} y={cy - 26} textAnchor="middle" fontSize="14" fontWeight="bold" fill="#4a3b66">C = πd（拉直后）</text>
    </svg>
  );
}

/* 钟表：表盘淡入，刻度逐现，时针分针从 12 点扫到目标时刻 */
function ClockFig({ figure }: { figure: MathFigure }) {
  const hour = Math.round(figure.hour ?? 3);
  const minute = Math.round(figure.minute ?? 0);
  const C = 70, R = 58;
  // 指针从 12 点（0°）顺时针扫到目标角度
  const haDeg = ((hour % 12) + minute / 60) / 12 * 360;
  const maDeg = minute / 60 * 360;
  const handStyle = (deg: number) => ({ ['--hand-rot' as string]: `${deg}deg` }) as CSSProperties;
  return (
    <svg viewBox="0 0 140 140" width={130} height={130} aria-hidden="true">
      <circle className="clock-face" cx={C} cy={C} r={R} fill="#fff" stroke="#4a3b66" strokeWidth={3} />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        return <circle key={i} className="clock-tick" style={{ animationDelay: `${0.1 + i * 0.05}s` }}
          cx={C + (R - 10) * Math.cos(a)} cy={C + (R - 10) * Math.sin(a)} r={2.5} fill="#7c6ba0" />;
      })}
      <line className="hand-sweep" style={{ ...handStyle(haDeg), animationDelay: '0.5s' }}
        x1={C} y1={C} x2={C} y2={C - 26} stroke="#4a3b66" strokeWidth={4} strokeLinecap="round" />
      <line className="hand-sweep" style={{ ...handStyle(maDeg), animationDelay: '0.9s' }}
        x1={C} y1={C} x2={C} y2={C - 40} stroke="#ff6f91" strokeWidth={3} strokeLinecap="round" />
      <circle cx={C} cy={C} r={3} fill="#4a3b66" />
      <text x={C} y={C - R + 16} textAnchor="middle" fontSize="14" fontWeight="bold" fill="#4a3b66">
        {String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')}
      </text>
    </svg>
  );
}

/* 统计图：柱状 / 折线 / 扇形饼图（逐根/逐点/逐扇区动画演示，可重播） */
function ChartFig({ figure }: { figure: MathFigure }) {
  const [run, setRun] = useState(0);
  const data = (figure.data ?? [3, 5, 2, 6]).map((n) => Math.max(0, Math.round(n)));
  const max = Math.max(1, ...data);
  const W = 260, H = 140, base = H - 20;
  const bw = (W - 24) / data.length;

  let svg: ReactNode;

  if (figure.chartKind === 'pie') {
    const total = Math.max(1, data.reduce((s, n) => s + n, 0));
    const C = 70, R = 56;
    const COLORS = ['#ff6f91', '#64b5f6', '#ffb74d', '#81c784', '#ba68c8', '#4dd0e1'];
    const sectors = data.reduce<{ start: number; end: number; n: number }[]>((arr, n) => {
      const start = arr.length === 0 ? 0 : arr[arr.length - 1].end;
      arr.push({ start, end: start + n / total, n });
      return arr;
    }, []);
    svg = (
      <svg key={run} viewBox="0 0 200 150" width="200" height="150" aria-hidden="true">
        {sectors.map((s, i) => {
          const a0 = -Math.PI / 2 + s.start * Math.PI * 2;
          const a1 = -Math.PI / 2 + s.end * Math.PI * 2;
          const x0 = C + R * Math.cos(a0), y0 = C + R * Math.sin(a0);
          const x1 = C + R * Math.cos(a1), y1 = C + R * Math.sin(a1);
          const large = s.end - s.start > 0.5 ? 1 : 0;
          return (
            <path key={i} className="chart-sector-anim" style={{ animationDelay: `${i * 0.5}s` }}
              d={`M${C} ${C} L${x0} ${y0} A${R} ${R} 0 ${large} 1 ${x1} ${y1} Z`}
              fill={COLORS[i % COLORS.length]} stroke="#fff" strokeWidth={2} strokeDasharray="5 3" />
          );
        })}
        {sectors.map((s, i) => (
          <text key={i} className="chart-num-anim" style={{ animationDelay: `${i * 0.5 + 0.35}s` }}
            x={150} y={30 + i * 18} fontSize="12" fill="#4a3b66">
            {s.n}%
          </text>
        ))}
      </svg>
    );
  } else if (figure.chartKind === 'line') {
    const pts = data.map((n, i) => ({ x: 14 + i * bw + bw / 2, y: base - (n / max) * (base - 16) }));
    svg = (
      <svg key={run} viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" aria-hidden="true">
        <line x1={12} y1={base} x2={W - 6} y2={base} stroke="#4a3b66" strokeWidth={2} />
        <polyline pathLength={1} className="chart-line-anim"
          points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none" stroke="#ff6f91" strokeWidth={3} strokeLinejoin="round" />
        {pts.map((p, i) => {
          const delay = (i / Math.max(1, pts.length - 1)) * 2.2;
          return (
            <g key={i}>
              <circle className="chart-point-anim" style={{ animationDelay: `${delay}s` }}
                cx={p.x} cy={p.y} r={4} fill="#ff6f91" />
              <text className="chart-num-anim" style={{ animationDelay: `${delay}s` }}
                x={p.x} y={base + 13} textAnchor="middle" fontSize="12" fill="#7c6ba0">{data[i]}</text>
            </g>
          );
        })}
      </svg>
    );
  } else {
    svg = (
      <svg key={run} viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" aria-hidden="true">
        <line x1={12} y1={base} x2={W - 6} y2={base} stroke="#4a3b66" strokeWidth={2} />
        {data.map((n, i) => {
          const h = (n / max) * (base - 16);
          const x = 14 + i * bw;
          const delay = i * 0.35;
          return (
            <g key={i}>
              <rect className="chart-bar-anim" style={{ animationDelay: `${delay}s` }}
                x={x} y={base - h} width={bw - 12} height={h} rx={4} fill="#64b5f6" />
              <text className="chart-num-anim" style={{ animationDelay: `${delay + 0.3}s` }}
                x={x + (bw - 12) / 2} y={base + 13} textAnchor="middle" fontSize="12" fill="#7c6ba0">{n}</text>
            </g>
          );
        })}
      </svg>
    );
  }

  return (
    <div className="mf-chart-wrap">
      {svg}
      <button className="mf-play" onClick={() => setRun((r) => r + 1)} aria-label="replay chart">
        ▶ 再播一次
      </button>
    </div>
  );
}

function Part({ n, lit, result = false, stagger = false }: { n: number; lit?: number; result?: boolean; stagger?: boolean }) {
  const showDots = n <= 20;
  const litCount = lit ?? n;
  return (
    <div className="mf-part">
      {showDots ? (
        <div className="mf-dots">
          {Array.from({ length: n }).map((_, i) => (
            <span
              key={i}
              className={`dot${i < litCount ? ' on' : ''}`}
              style={stagger && i < litCount ? { animationDelay: `${0.06 + i * 0.06}s` } : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="mf-big" key={litCount > 0 ? 'lit' : 'dim'}>{n}</div>
      )}
      <span className={result ? 'mf-k mf-result-k' : 'mf-k'}>{n}</span>
    </div>
  );
}

function ShapeSvg({ figure }: { figure: MathFigure }) {
  const shape = figure.shape ?? 'circle';
  const common = { fill: '#ffb74d', stroke: '#4a3b66', strokeWidth: 2.5 };
  const label = { fill: '#4a3b66', fontSize: 14, fontWeight: 700 as const };

  if (shape === 'circle') {
    const r = figure.r ?? 3;
    const R = 50, C = 75;
    const circ = Math.round(2 * Math.PI * R);
    const strokeAnim = { strokeDasharray: circ, strokeDashoffset: circ, ['--dash-len' as string]: `${circ}` } as CSSProperties;

    /* 周长：强调"线"——圆周用粗红线高亮，内部空心（描边生长动画） */
    if (figure.emphasis === 'line') {
      return (
        <svg viewBox="0 0 150 150" width={150} height={150} aria-hidden="true">
          <circle cx={C} cy={C} r={R} fill="#fff" stroke="#ef5350" strokeWidth={5} className="draw-stroke" style={strokeAnim} />
          <circle className="nl-mark" style={{ animationDelay: '1.3s' }} cx={C} cy={C} r={3} fill="#4a3b66" />
          <line className="chart-num-anim" style={{ animationDelay: '1.4s' }} x1={C} y1={C} x2={C + R} y2={C} stroke="#7c6ba0" strokeWidth={2} strokeDasharray="5 4" />
          <text className="chart-num-anim" style={{ animationDelay: '1.5s' }} x={C + R / 2} y={C - 8} textAnchor="middle" fill="#7c6ba0" fontSize="14" fontWeight="bold">r={r}</text>
          <text className="chart-num-anim" style={{ animationDelay: '1.6s' }} x={C} y={C + R + 20} textAnchor="middle" fontSize="13" fill="#ef5350" fontWeight="bold">周长 C</text>
        </svg>
      );
    }

    /* 面积：强调"面/范围"——圆内部涂色填充（填充渐现 + 描边） */
    if (figure.emphasis === 'area') {
      return (
        <svg viewBox="0 0 150 150" width={150} height={150} aria-hidden="true">
          <circle cx={C} cy={C} r={R} fill="#ffb74d" fillOpacity={0.55} stroke="#4a3b66" strokeWidth={2.5}
            className="area-draw" style={{ ...strokeAnim, ['--fill-op' as string]: '0.55' } as CSSProperties} />
          <circle className="nl-mark" style={{ animationDelay: '1.3s' }} cx={C} cy={C} r={3} fill="#4a3b66" />
          <line className="chart-num-anim" style={{ animationDelay: '1.4s' }} x1={C} y1={C} x2={C + R} y2={C} stroke="#7c6ba0" strokeWidth={2} strokeDasharray="5 4" />
          <text className="chart-num-anim" style={{ animationDelay: '1.5s' }} x={C + R / 2} y={C - 8} textAnchor="middle" fill="#7c6ba0" fontSize="14" fontWeight="bold">r={r}</text>
          <text className="chart-num-anim" style={{ animationDelay: '1.6s' }} x={C} y={C + R + 20} textAnchor="middle" fontSize="13" fill="#e07b00" fontWeight="bold">面积 S</text>
        </svg>
      );
    }

    /* 圆的认识：圆心 O、半径 r、直径 d（圆周描边生长） */
    return (
      <svg viewBox="0 0 150 150" width={150} height={150} aria-hidden="true">
        <circle cx={C} cy={C} r={R} {...common} className="draw-stroke" style={strokeAnim} />
        <circle className="nl-mark" style={{ animationDelay: '1.2s' }} cx={C} cy={C} r={3} fill="#4a3b66" />
        <text className="chart-num-anim" style={{ animationDelay: '1.3s' }} x={C} y={C - R - 8} textAnchor="middle" fontSize="15" fontWeight="bold" fill="#4a3b66">O</text>
        <line className="chart-num-anim" style={{ animationDelay: '1.4s' }} x1={C} y1={C} x2={C + R} y2={C} stroke="#ef5350" strokeWidth={2} strokeDasharray="5 4" />
        <text className="chart-num-anim" style={{ animationDelay: '1.5s' }} x={C + R / 2} y={C - 8} textAnchor="middle" fill="#ef5350" fontSize="14" fontWeight="bold">r={r}</text>
        <line className="chart-num-anim" style={{ animationDelay: '1.6s' }} x1={C - R} y1={C + 6} x2={C + R} y2={C + 6} stroke="#4a3b66" strokeWidth={1.8} strokeDasharray="4 4" />
        <text className="chart-num-anim" style={{ animationDelay: '1.7s' }} x={C} y={C + 26} textAnchor="middle" fontSize="13" fill="#7c6ba0">d={r * 2}</text>
      </svg>
    );
  }

  if (shape === 'square') {
    const w = figure.w ?? 6;
    const S = 84;
    return (
      <svg viewBox="0 0 150 150" width={150} height={150} aria-hidden="true">
        <rect className="chart-num-anim" x={(150 - S) / 2} y={(150 - S) / 2} width={S} height={S} rx={4} {...common} />
        <text className="chart-num-anim" style={{ animationDelay: '0.3s' }} x={75} y={(150 - S) / 2 - 8} textAnchor="middle" {...label}>边长 {w}</text>
      </svg>
    );
  }

  if (shape === 'rectangle') {
    const w = figure.w ?? 6, h = figure.h ?? 4;
    const W = 116, H = 72;
    return (
      <svg viewBox="0 0 150 150" width={150} height={150} aria-hidden="true">
        <rect className="chart-num-anim" x={(150 - W) / 2} y={(150 - H) / 2} width={W} height={H} rx={4} {...common} />
        <text className="chart-num-anim" style={{ animationDelay: '0.3s' }} x={75} y={(150 - H) / 2 - 8} textAnchor="middle" {...label}>长 {w}</text>
        <text className="chart-num-anim" style={{ animationDelay: '0.45s' }} x={75} y={(150 + H) / 2 + 18} textAnchor="middle" {...label}>宽 {h}</text>
      </svg>
    );
  }

  if (shape === 'parallelogram') {
    const w = figure.w ?? 6, h = figure.h ?? 4;
    const x = 30, y = 46, W = 92, H = 56, dx = 18;
    return (
      <svg viewBox="0 0 150 150" width={150} height={150} aria-hidden="true">
        <polygon className="chart-num-anim" points={`${x + dx},${y} ${x + W + dx},${y} ${x + W},${y + H} ${x},${y + H}`} {...common} />
        {/* 虚线高（辅助线） */}
        <line className="chart-num-anim" style={{ animationDelay: '0.4s' }} x1={x + W / 2} y1={y} x2={x + W / 2} y2={y + H} stroke="#ef5350" strokeWidth={1.8} strokeDasharray="5 4" />
        <text className="chart-num-anim" style={{ animationDelay: '0.3s' }} x={75} y={y - 8} textAnchor="middle" {...label}>底 {w}</text>
        <text className="chart-num-anim" style={{ animationDelay: '0.6s' }} x={x + W / 2 + 4} y={(y + y + H) / 2} {...label}>高 {h}</text>
      </svg>
    );
  }

  if (shape === 'trapezoid') {
    const a = figure.ta ?? 4, b = figure.tb ?? 6, h = figure.h ?? 4;
    const top = 50, bottom = 100, H = 74;
    const y = 70, topY = y - H / 2, botY = y + H / 2;
    return (
      <svg viewBox="0 0 150 150" width={150} height={150} aria-hidden="true">
        <polygon className="chart-num-anim" points={`${75 - top / 2},${topY} ${75 + top / 2},${topY} ${75 + bottom / 2},${botY} ${75 - bottom / 2},${botY}`} {...common} />
        {/* 虚线高（辅助线） */}
        <line className="chart-num-anim" style={{ animationDelay: '0.4s' }} x1={75} y1={topY} x2={75} y2={botY} stroke="#ef5350" strokeWidth={1.8} strokeDasharray="5 4" />
        <text className="chart-num-anim" style={{ animationDelay: '0.3s' }} x={75} y={topY - 8} textAnchor="middle" {...label}>上底 {a}</text>
        <text className="chart-num-anim" style={{ animationDelay: '0.5s' }} x={75} y={botY + 20} textAnchor="middle" {...label}>下底 {b}</text>
        <text className="chart-num-anim" style={{ animationDelay: '0.6s' }} x={81} y={y} {...label}>高 {h}</text>
      </svg>
    );
  }

  if (shape === 'cylinder') {
    const r = figure.r ?? 3, h = figure.h ?? 5;
    const C = 75, RX = 44, RY = 14, H = 74;
    return (
      <svg viewBox="0 0 150 150" width={150} height={150} aria-hidden="true">
        <path className="chart-num-anim" d={`M${C - RX} ${C - H / 2} L${C - RX} ${C + H / 2} A${RX} ${RY} 0 0 0 ${C + RX} ${C + H / 2} L${C + RX} ${C - H / 2}`} fill="#ffb74d" fillOpacity={0.5} stroke="#4a3b66" strokeWidth={2.5} />
        <ellipse className="chart-num-anim" style={{ animationDelay: '0.3s' }} cx={C} cy={C - H / 2} rx={RX} ry={RY} fill="#ffb74d" stroke="#4a3b66" strokeWidth={2.5} />
        <text className="chart-num-anim" style={{ animationDelay: '0.5s' }} x={C} y={C + H / 2 + 22} textAnchor="middle" {...label}>底面 r={r}</text>
        <text className="chart-num-anim" style={{ animationDelay: '0.6s' }} x={C + RX + 6} y={C} {...label}>高 {h}</text>
      </svg>
    );
  }

  if (shape === 'cone') {
    const r = figure.r ?? 3, h = figure.h ?? 5;
    const C = 75, RX = 40, RY = 13, H = 78, apexY = C - H / 2 - 26;
    return (
      <svg viewBox="0 0 150 150" width={150} height={150} aria-hidden="true">
        <path className="chart-num-anim" d={`M${C} ${apexY} L${C - RX} ${C + H / 2} A${RX} ${RY} 0 0 0 ${C + RX} ${C + H / 2} Z`} fill="#ffb74d" fillOpacity={0.55} stroke="#4a3b66" strokeWidth={2.5} />
        <ellipse className="chart-num-anim" style={{ animationDelay: '0.3s' }} cx={C} cy={C + H / 2} rx={RX} ry={RY} fill="#ffb74d" fillOpacity={0.4} stroke="#4a3b66" strokeWidth={2.5} strokeDasharray="5 3" />
        <text className="chart-num-anim" style={{ animationDelay: '0.5s' }} x={C} y={C + H / 2 + 24} textAnchor="middle" {...label}>底面 r={r}</text>
        <text className="chart-num-anim" style={{ animationDelay: '0.6s' }} x={C + RX + 6} y={apexY + 20} {...label}>高 {h}</text>
      </svg>
    );
  }

  if (shape === 'cuboid') {
    const w = figure.w ?? 6, h = figure.h ?? 4, d = figure.d ?? 3;
    const x = 30, y = 44, W = 92, H = 58;
    const dx = 24, dy = 16;
    return (
      <svg viewBox="0 0 150 150" width={150} height={150} aria-hidden="true">
        {/* 顶面 */}
        <polygon className="chart-num-anim" points={`${x},${y} ${x + dx},${y - dy} ${x + W + dx},${y - dy} ${x + W},${y}`} fill="#ffe0b2" stroke="#4a3b66" strokeWidth={2} />
        {/* 右侧面 */}
        <polygon className="chart-num-anim" style={{ animationDelay: '0.2s' }} points={`${x + W},${y} ${x + W + dx},${y - dy} ${x + W + dx},${y + H - dy} ${x + W},${y + H}`} fill="#ffcc80" stroke="#4a3b66" strokeWidth={2} />
        {/* 前面 */}
        <rect className="chart-num-anim" style={{ animationDelay: '0.35s' }} x={x} y={y} width={W} height={H} fill="#ffb74d" stroke="#4a3b66" strokeWidth={2.5} />
        {/* 隐藏边（虚线） */}
        <line className="chart-num-anim" style={{ animationDelay: '0.5s' }} x1={x} y1={y} x2={x + dx} y2={y - dy} stroke="#4a3b66" strokeWidth={1.5} strokeDasharray="4 3" />
        <line className="chart-num-anim" style={{ animationDelay: '0.55s' }} x1={x} y1={y + H} x2={x + dx} y2={y + H - dy} stroke="#4a3b66" strokeWidth={1.5} strokeDasharray="4 3" />
        <text className="chart-num-anim" style={{ animationDelay: '0.7s' }} x={x + W / 2} y={y + H + 18} textAnchor="middle" {...label}>长 {w}</text>
        <text className="chart-num-anim" style={{ animationDelay: '0.8s' }} x={x + W + dx / 2 + 4} y={y + H / 2} {...label}>宽 {d}</text>
        <text className="chart-num-anim" style={{ animationDelay: '0.9s' }} x={x - 4} y={y - 2} textAnchor="end" {...label}>高 {h}</text>
      </svg>
    );
  }

  if (shape === 'cube') {
    const w = figure.w ?? 4;
    const x = 42, y = 46, S = 66, dx = 22, dy = 14;
    return (
      <svg viewBox="0 0 150 150" width={150} height={150} aria-hidden="true">
        <polygon className="chart-num-anim" points={`${x},${y} ${x + dx},${y - dy} ${x + S + dx},${y - dy} ${x + S},${y}`} fill="#ffe0b2" stroke="#4a3b66" strokeWidth={2} />
        <polygon className="chart-num-anim" style={{ animationDelay: '0.2s' }} points={`${x + S},${y} ${x + S + dx},${y - dy} ${x + S + dx},${y + S - dy} ${x + S},${y + S}`} fill="#ffcc80" stroke="#4a3b66" strokeWidth={2} />
        <rect className="chart-num-anim" style={{ animationDelay: '0.35s' }} x={x} y={y} width={S} height={S} fill="#ffb74d" stroke="#4a3b66" strokeWidth={2.5} />
        <line className="chart-num-anim" style={{ animationDelay: '0.5s' }} x1={x} y1={y} x2={x + dx} y2={y - dy} stroke="#4a3b66" strokeWidth={1.5} strokeDasharray="4 3" />
        <line className="chart-num-anim" style={{ animationDelay: '0.55s' }} x1={x} y1={y + S} x2={x + dx} y2={y + S - dy} stroke="#4a3b66" strokeWidth={1.5} strokeDasharray="4 3" />
        <text className="chart-num-anim" style={{ animationDelay: '0.7s' }} x={75} y={y + S + 18} textAnchor="middle" {...label}>正方体 · 棱长 {w}</text>
      </svg>
    );
  }

  if (shape === 'sphere') {
    const r = figure.r ?? 3;
    return (
      <svg viewBox="0 0 150 150" width={150} height={150} aria-hidden="true">
        <circle className="chart-num-anim" cx={75} cy={70} r={44} fill="#ffb74d" fillOpacity={0.55} stroke="#4a3b66" strokeWidth={2.5} />
        <ellipse className="chart-num-anim" style={{ animationDelay: '0.3s' }} cx={75} cy={70} rx={30} ry={44} fill="none" stroke="#4a3b66" strokeWidth={1.2} strokeDasharray="4 3" opacity={0.7} />
        <ellipse className="chart-num-anim" style={{ animationDelay: '0.45s' }} cx={75} cy={70} rx={44} ry={16} fill="none" stroke="#4a3b66" strokeWidth={1.2} strokeDasharray="4 3" opacity={0.7} />
        <text className="chart-num-anim" style={{ animationDelay: '0.6s' }} x={75} y={132} textAnchor="middle" {...label}>球 · 半径 {r}</text>
      </svg>
    );
  }

  // 等腰三角形（虚线高）
  const b = figure.w ?? 6, h = figure.h ?? 5;
  const B = 100, H = 78;
  const baseY = 75 + H / 2, apexY = 75 - H / 2;
  return (
    <svg viewBox="0 0 150 150" width={150} height={150} aria-hidden="true">
      <polygon className="chart-num-anim" points={`${75 - B / 2},${baseY} ${75 + B / 2},${baseY} 75,${apexY}`} {...common} />
      <line className="chart-num-anim" style={{ animationDelay: '0.4s' }} x1={75} y1={apexY} x2={75} y2={baseY} stroke="#ef5350" strokeWidth={1.8} strokeDasharray="5 4" />
      <text className="chart-num-anim" style={{ animationDelay: '0.3s' }} x={75} y={baseY + 20} textAnchor="middle" {...label}>底 {b}</text>
      <text className="chart-num-anim" style={{ animationDelay: '0.6s' }} x={81} y={(apexY + baseY) / 2} {...label}>高 {h}</text>
    </svg>
  );
}

/* =====================================================================
   新增图型（v2.3）：位置 / 方位 / 第几 / 图形集合 / 分类 / 人民币 / 规律 /
   角 / 观察物体 / 搭配 / 图形运动 / 天平 / 集合 / 大数 / 线 / 优化 / 对阵 /
   植树 / 网格 / 鸽巢 / 抽象文本
   ===================================================================== */

function MiniShape({ kind }: { kind: ShapeKind }) {
  const s = 64, stroke = '#4a3b66', fill = '#ffb74d', fill2 = '#ffe0b2';
  const sw = 2.5;
  switch (kind) {
    case 'circle':
      return <svg viewBox="0 0 64 64" width={s} height={s} aria-hidden="true"><circle cx={32} cy={32} r={26} fill={fill} stroke={stroke} strokeWidth={sw} /></svg>;
    case 'square':
      return <svg viewBox="0 0 64 64" width={s} height={s} aria-hidden="true"><rect x={12} y={12} width={40} height={40} rx={2} fill={fill} stroke={stroke} strokeWidth={sw} /></svg>;
    case 'rectangle':
      return <svg viewBox="0 0 64 64" width={s} height={s} aria-hidden="true"><rect x={6} y={18} width={52} height={28} rx={2} fill={fill} stroke={stroke} strokeWidth={sw} /></svg>;
    case 'triangle':
      return <svg viewBox="0 0 64 64" width={s} height={s} aria-hidden="true"><polygon points="32,10 56,54 8,54" fill={fill} stroke={stroke} strokeWidth={sw} /></svg>;
    case 'parallelogram':
      return <svg viewBox="0 0 64 64" width={s} height={s} aria-hidden="true"><polygon points="20,14 54,14 44,50 10,50" fill={fill} stroke={stroke} strokeWidth={sw} /></svg>;
    case 'cylinder':
      return (
        <svg viewBox="0 0 64 64" width={s} height={s} aria-hidden="true">
          <ellipse cx={32} cy={16} rx={20} ry={7} fill={fill} stroke={stroke} strokeWidth={sw} />
          <path d="M12 16 L12 48 A20 7 0 0 0 52 48 L52 16" fill={fill} fillOpacity={0.5} stroke={stroke} strokeWidth={sw} />
        </svg>
      );
    case 'cone':
      return <svg viewBox="0 0 64 64" width={s} height={s} aria-hidden="true"><path d="M32 10 L14 48 A18 6 0 0 0 50 48 Z" fill={fill} stroke={stroke} strokeWidth={sw} /></svg>;
    case 'cuboid':
    case 'cube':
      return (
        <svg viewBox="0 0 64 64" width={s} height={s} aria-hidden="true">
          <polygon points="16,18 28,10 56,10 44,18" fill={fill2} stroke={stroke} strokeWidth={sw} />
          <polygon points="44,18 56,10 56,42 44,50" fill={fill} stroke={stroke} strokeWidth={sw} />
          <rect x={16} y={18} width={28} height={32} fill={fill} fillOpacity={0.85} stroke={stroke} strokeWidth={sw} />
        </svg>
      );
    case 'sphere':
      return (
        <svg viewBox="0 0 64 64" width={s} height={s} aria-hidden="true">
          <circle cx={32} cy={34} r={24} fill={fill} fillOpacity={0.55} stroke={stroke} strokeWidth={sw} />
          <ellipse cx={32} cy={34} rx={16} ry={24} fill="none" stroke={stroke} strokeWidth={1.2} strokeDasharray="3 2" opacity={0.7} />
        </svg>
      );
    default:
      return <svg viewBox="0 0 64 64" width={s} height={s} aria-hidden="true"><circle cx={32} cy={32} r={26} fill={fill} stroke={stroke} strokeWidth={sw} /></svg>;
  }
}

function PositionFig({ figure }: { figure: MathFigure }) {
  const dir = figure.dir ?? '上';
  // 场景图：以树为参照物，四周物体对应位置（小鸟在上、小兔在下、苹果在左右）
  const items = [
    { key: '上', emoji: '🐦', x: 100, y: 32, ly: 58 },
    { key: '下', emoji: '🐰', x: 100, y: 160, ly: 186 },
    { key: '左', emoji: '🍎', x: 38, y: 98, ly: 124 },
    { key: '右', emoji: '🍏', x: 162, y: 98, ly: 124 },
  ];
  return (
    <svg viewBox="0 0 200 195" width="200" height="195" aria-hidden="true">
      <text x={100} y={128} textAnchor="middle" fontSize="50">🌳</text>
      {items.map((it) => {
        const on = it.key === dir;
        return (
          <g key={it.key} opacity={on ? 1 : 0.5}>
            {on && <circle className="pos-ring" cx={it.x} cy={it.y - 6} r={24} fill="#fff3cd" stroke="#ffb300" strokeWidth={2} />}
            <text className={on ? 'pos-active' : ''} x={it.x} y={it.y} textAnchor="middle" fontSize="28">{it.emoji}</text>
            <text x={it.x} y={it.ly} textAnchor="middle" fontSize="14" fontWeight="bold" fill={on ? '#e07b00' : '#7c6ba0'}>{it.key}</text>
          </g>
        );
      })}
    </svg>
  );
}

function DirectionFig({ figure }: { figure: MathFigure }) {
  const dir = figure.dir ?? '北';
  const C = 100, R = 70;
  const DIRS: { key: string; deg: number }[] = [
    { key: '北', deg: -90 }, { key: '东北', deg: -45 }, { key: '东', deg: 0 },
    { key: '东南', deg: 45 }, { key: '南', deg: 90 }, { key: '西南', deg: 135 },
    { key: '西', deg: 180 }, { key: '西北', deg: -135 },
  ];
  const pt = (deg: number) => ({ x: C + R * Math.cos((deg * Math.PI) / 180), y: C + R * Math.sin((deg * Math.PI) / 180) });
  const target = DIRS.find((d) => d.key === dir) ?? DIRS[0];
  return (
    <svg viewBox="0 0 200 200" width="200" height="200" aria-hidden="true">
      <circle cx={C} cy={C} r={R} fill="#fff" stroke="#4a3b66" strokeWidth={2} />
      <line x1={C} y1={C - R} x2={C} y2={C + R} stroke="#e0d9ee" strokeWidth={1.5} />
      <line x1={C - R} y1={C} x2={C + R} y2={C} stroke="#e0d9ee" strokeWidth={1.5} />
      {DIRS.map((d) => {
        const p = pt(d.deg);
        const isActive = d.key === dir;
        return <text key={d.key} className={isActive ? 'chart-num-anim dir-active' : ''} style={isActive ? { animationDelay: '0.75s' } : undefined} x={p.x} y={p.y + 5} textAnchor="middle" fontSize={isActive ? 17 : 13} fontWeight="bold" fill={isActive ? '#ff6f91' : '#7c6ba0'}>{d.key}</text>;
      })}
      {/* 指针从正东（0°）扫到目标方位 */}
      <g className="dir-needle" style={{ ['--dir-rot' as string]: `${target.deg}deg` } as CSSProperties}>
        <line x1={C} y1={C} x2={C + R} y2={C} stroke="#ff6f91" strokeWidth={4} strokeLinecap="round" />
        <circle cx={C + R} cy={C} r={6} fill="#ff6f91" stroke="#fff" strokeWidth={2} />
      </g>
      <circle cx={C} cy={C} r={4} fill="#4a3b66" />
      <text x={C} y={C - 12} textAnchor="middle" fontSize="18">🧭</text>
    </svg>
  );
}

function OrdinalFig({ figure, lang, voice, onVoiceEnd }: { figure: MathFigure; lang: 'zh' | 'en'; voice: boolean; onVoiceEnd?: () => void }) {
  const n = Math.max(1, Math.round(figure.count ?? 5));
  const mark = Math.min(n, Math.max(1, Math.round(figure.mark ?? 1)));
  const emoji = figure.emoji ?? '🐰';
  const [shown, setShown] = useState(0);
  const [run, setRun] = useState(0);
  const timerRef = useRef<number | null>(null);
  const voiceEndRef = useRef(onVoiceEnd);
  useEffect(() => {
    voiceEndRef.current = onVoiceEnd;
  });

  const stopAuto = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  /** 数到一个位置：轻响 + 读数字；数到目标后播"第 X 个"并回调 onVoiceEnd（voice=false 时静音） */
  const countVoice = useCallback(
    (i: number) => {
      if (!voice) return;
      playSfx('tap');
      if (i >= mark) {
        speakOnce(`第 ${mark} 个`, lang, 1.0, () => voiceEndRef.current?.());
      } else {
        speakOnce(String(i), lang, 1.05);
      }
    },
    [mark, lang, voice],
  );

  // 自动从队伍前面开始数，数到「第 mark 个」停住并戴皇冠（重播时由按钮先归零再 +1）
  useEffect(() => {
    stopAuto();
    const stepMs = Math.max(320, Math.min(1000, Math.round(1900 / Math.sqrt(n))));
    const start = window.setTimeout(() => {
      let i = 0;
      timerRef.current = window.setInterval(() => {
        i += 1;
        setShown(i);
        countVoice(i);
        if (i >= mark) stopAuto();
      }, stepMs);
    }, 450);
    return () => {
      window.clearTimeout(start);
      stopAuto();
    };
  }, [n, mark, run, countVoice]);

  const finished = shown >= mark;

  return (
    <div className="mf-count" aria-hidden="true">
      <div className="mf-row mf-count-row mf-tappable" role="button" aria-label="ordinal" onClick={() => { stopAuto(); const next = shown >= mark ? 1 : shown + 1; setShown(next); countVoice(next); }}>
        {Array.from({ length: n }).map((_, i) => {
          const counted = i < shown;
          const current = !finished && i === shown - 1;
          const marked = finished && i === mark - 1;
          return (
            <span key={i} className={`mf-count-slot${counted ? ' lit' : ''}${current ? ' current' : ''}${marked ? ' marked' : ''}`}>
              <span className="mf-slot-pointer">{marked ? '👑' : current ? '👆' : ''}</span>
              <span className="mf-item">{emoji}</span>
              <span className="mf-slot-badge">{counted ? i + 1 : ''}</span>
            </span>
          );
        })}
      </div>
      <div className="mf-num" key={shown}>
        {finished ? `第 ${mark} 个` : shown}
      </div>
      <button className="mf-play" onClick={() => { stopAuto(); setShown(0); setRun((x) => x + 1); }}>
        ▶ {finished ? '再数一遍' : '从前面数'}
      </button>
    </div>
  );
}

function ShapeSetFig({ figure }: { figure: MathFigure }) {
  const shapes = figure.shapes ?? ['circle', 'square', 'triangle', 'rectangle'];
  return (
    <div className="mf-shapeSet" aria-hidden="true">
      {shapes.map((s, i) => (
        <span key={s} className="shape-item" style={{ animationDelay: `${i * 0.14}s` }}>
          <MiniShape kind={s} />
        </span>
      ))}
    </div>
  );
}

function SortFig({ figure }: { figure: MathFigure }) {
  const groups = figure.groups ?? [];
  const [run, setRun] = useState(0);
  return (
    <div className="mf-sort" aria-hidden="true">
      {groups.map((g, gi) => (
        <div className="mf-sort-group" key={g.label}>
          <div className="mf-row">
            {Array.from({ length: g.n }).map((_, i) => (
              <span key={`${run}-${i}`} className="mf-item sort-item" style={{ animationDelay: `${gi * 0.3 + i * 0.25}s` }}>
                {g.emoji}
              </span>
            ))}
          </div>
          <span className="mf-k sort-count" style={{ animationDelay: `${gi * 0.3 + g.n * 0.25 + 0.2}s` }}>
            {g.label} · {g.n} 个
          </span>
        </div>
      ))}
      <button className="mf-play" onClick={() => setRun((r) => r + 1)}>▶ 再分一次</button>
    </div>
  );
}

function MoneyFig({ figure, lang, voice, onVoiceEnd }: { figure: MathFigure; lang: 'zh' | 'en'; voice: boolean; onVoiceEnd?: () => void }) {
  const coins = figure.coins ?? [];
  const total = coins.reduce((s, c) => s + c.v * c.n, 0);
  const [run, setRun] = useState(0);
  const [shown, setShown] = useState(0);
  const shownRef = useRef(0);
  const voiceEndRef = useRef(onVoiceEnd);
  useEffect(() => {
    voiceEndRef.current = onVoiceEnd;
  });
  // 硬币一枚一枚落下，总额跟着数上去（重播时由按钮先归零再 +1）
  useEffect(() => {
    let cancelled = false;
    shownRef.current = 0;
    const tick = () => {
      if (cancelled) return;
      const cur = shownRef.current;
      if (cur >= total) return;
      playSfx('pop');
      const next = Math.min(total, cur + Math.max(1, Math.round(total / 10)));
      shownRef.current = next;
      setShown(next);
      window.setTimeout(tick, 260);
    };
    tick();
    return () => {
      cancelled = true;
    };
  }, [run, total]);
  // 数到总额时朗读"一共 X 元"，播完回调 onVoiceEnd（voice=false 时静音）
  useEffect(() => {
    if (voice && shown >= total && total > 0) {
      speakOnce(`一共 ${total} 元`, lang, 1.0, () => voiceEndRef.current?.());
    }
  }, [shown, total, lang, voice]);
  let idx = -1;
  return (
    <div className="mf-money" aria-hidden="true">
      <div className="mf-row">
        {coins.flatMap((c) =>
          Array.from({ length: c.n }).map((_, i) => {
            idx += 1;
            return (
              <span key={`${run}-${c.v}-${i}`} className="mf-coin coin-drop" style={{ animationDelay: `${0.15 + idx * 0.22}s` }}>
                {c.v >= 10 ? '💴' : '🪙'}
                <b>¥{c.v}</b>
              </span>
            );
          }),
        )}
      </div>
      <div className="mf-num" key={shown}>一共 ¥{shown} 元</div>
      <button className="mf-play" onClick={() => { setShown(0); setRun((r) => r + 1); }}>▶ 再数一遍</button>
    </div>
  );
}

function PatternFig({ figure }: { figure: MathFigure }) {
  const seq = figure.seq ?? [];
  const ans = figure.answer ?? '?';
  const [reveal, setReveal] = useState(false);
  const [run, setRun] = useState(0);
  return (
    <div className="mf-pattern" aria-hidden="true">
      <div className="mf-row">
        {seq.map((s, i) => (
          <span key={`${run}-${i}`} className="mf-item pattern-item" style={{ animationDelay: `${0.15 + i * 0.3}s` }}>
            {s}
          </span>
        ))}
        <button key={`q-${run}-${reveal}`} className="mf-item mf-pattern-q" onClick={() => setReveal(true)} style={{ animationDelay: `${0.15 + seq.length * 0.3}s` }}>
          {reveal ? ans : '?'}
        </button>
      </div>
      <div className="mf-num" key={reveal ? `a-${run}` : `h-${run}`}>
        {reveal ? `下一个是 ${ans}` : '点「?」看答案'}
      </div>
      <button className="mf-play" onClick={() => { setReveal(false); setRun((r) => r + 1); }}>
        ▶ {reveal ? '再找一次' : '看规律'}
      </button>
    </div>
  );
}

/* 角：一条边固定，另一条边从水平线张开（动画演示角度大小） */
function AngleFig({ figure }: { figure: MathFigure }) {
  const right = figure.rightAngle === true;
  const deg = right ? 90 : Math.max(5, Math.round(figure.angleDeg ?? 45));
  const V = { x: 50, y: 110 };
  const L = 110;
  const a2 = (deg * Math.PI) / 180;
  const end = { x: V.x + L * Math.cos(a2), y: V.y - L * Math.sin(a2) };
  const arcR = 34;
  const armStyle = { ['--angle-rot' as string]: `${deg}deg`, ['--angle-ox' as string]: `${V.x}px`, ['--angle-oy' as string]: `${V.y}px` } as CSSProperties;
  return (
    <svg viewBox="0 0 200 150" width="200" height="150" aria-hidden="true">
      <line x1={V.x} y1={V.y} x2={V.x + L} y2={V.y} stroke="#4a3b66" strokeWidth={3} strokeLinecap="round" />
      {/* 移动边：以顶点为轴从水平线张开 */}
      <g className="angle-arm" style={armStyle}>
        <line x1={V.x} y1={V.y} x2={V.x + L} y2={V.y} stroke="#ff6f91" strokeWidth={3} strokeLinecap="round" />
      </g>
      {right ? (
        <path className="chart-num-anim" style={{ animationDelay: '0.9s' }} d={`M${V.x + 16} ${V.y} L${V.x + 16} ${V.y - 16} L${V.x} ${V.y - 16}`} fill="none" stroke="#4a3b66" strokeWidth={2} />
      ) : (
        <path className="chart-num-anim" style={{ animationDelay: '0.9s' }} d={`M${V.x + arcR} ${V.y} A${arcR} ${arcR} 0 0 0 ${V.x + arcR * Math.cos(a2)} ${V.y - arcR * Math.sin(a2)}`} fill="none" stroke="#ff6f91" strokeWidth={2.5} strokeDasharray="4 3" />
      )}
      <text className="chart-num-anim" style={{ animationDelay: '1.1s' }} x={end.x + 4} y={end.y - 4} fontSize="14" fontWeight="bold" fill="#ff6f91">{right ? '直角 90°' : `${deg}°`}</text>
      <circle className="nl-mark" style={{ animationDelay: '1.2s' }} cx={V.x} cy={V.y} r={3} fill="#4a3b66" />
    </svg>
  );
}

function ViewsFig() {
  const grid = (filled: boolean[][], base: number) => (
    <div className="mf-view-grid" style={{ gridTemplateColumns: `repeat(${filled[0].length}, 20px)` }}>
      {filled.flat().map((f, i) => (
        <span key={i} className={`${f ? 'mf-view-cell on' : 'mf-view-cell'} view-cell-pop`} style={{ animationDelay: `${base + i * 0.08}s` }} />
      ))}
    </div>
  );
  return (
    <div className="mf-views" aria-hidden="true">
      <div className="mf-view-row">
        <div className="mf-col"><span className="mf-k">正面</span>{grid([[false, true], [true, true]], 0)}</div>
        <div className="mf-col"><span className="mf-k">上面</span>{grid([[true, true]], 0.3)}</div>
        <div className="mf-col"><span className="mf-k">侧面</span>{grid([[true], [true]], 0.5)}</div>
      </div>
      <div className="mf-num">从不同方向看，形状不同</div>
    </div>
  );
}

function ComboFig({ figure }: { figure: MathFigure }) {
  const rows = Math.max(1, Math.round(figure.rows ?? 2));
  const cols = Math.max(1, Math.round(figure.cols ?? 3));
  const rl = figure.rowLabel ?? '甲', cl = figure.colLabel ?? '乙';
  const total = rows * cols;
  const cell = 26, gap = 6;
  const W = cols * cell + (cols - 1) * gap;
  const H = rows * cell + (rows - 1) * gap;
  return (
    <div className="mf-combo" aria-hidden="true">
      <div className="mf-k">{rl} {rows} × {cl} {cols} = {total} 种</div>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
        {Array.from({ length: total }).map((_, i) => {
          const x = (i % cols) * (cell + gap);
          const y = Math.floor(i / cols) * (cell + gap);
          return <rect key={i} className="combo-cell" style={{ animationDelay: `${i * 0.07}s` }} x={x} y={y} width={cell} height={cell} rx={4} fill="#ffb74d" stroke="#4a3b66" strokeWidth={1.5} />;
        })}
      </svg>
    </div>
  );
}

/* 图形运动：平移滑过 / 旋转 / 镜像翻转（带动画演示运动过程） */
function MotionFig({ figure }: { figure: MathFigure }) {
  const kind = figure.motionKind ?? 'slide';
  const shape = figure.shape ?? 'triangle';
  if (kind === 'flip') {
    return (
      <div className="mf-motion" aria-hidden="true">
        <div className="mf-motion-row">
          <div className="motion-flip"><MiniShape kind={shape} /></div>
          <div className="mf-motion-axis">对称轴</div>
          <div className="mf-flip-mirror motion-ghost" style={{ animationDelay: '1s' }}><MiniShape kind={shape} /></div>
        </div>
        <div className="mf-num">沿对称轴对折，两边完全重合</div>
      </div>
    );
  }
  if (kind === 'turn') {
    return (
      <div className="mf-motion" aria-hidden="true">
        <div className="mf-motion-row">
          <div className="motion-turn"><MiniShape kind={shape} /></div>
          <span className="mf-op">↻</span>
          <div className="motion-ghost" style={{ animationDelay: '1s' }}><MiniShape kind={shape} /></div>
        </div>
        <div className="mf-num">绕一点旋转，形状大小不变</div>
      </div>
    );
  }
  return (
    <div className="mf-motion" aria-hidden="true">
      <div className="mf-motion-row">
        <div className="motion-slide"><MiniShape kind={shape} /></div>
        <span className="mf-op">→</span>
        <div className="motion-ghost" style={{ animationDelay: '1s' }}><MiniShape kind={shape} /></div>
      </div>
      <div className="mf-num">平移后，形状大小方向都不变</div>
    </div>
  );
}

function WeightFig({ figure }: { figure: MathFigure }) {
  const left = Math.round(figure.left ?? 1);
  const right = Math.round(figure.right ?? 1);
  const le = figure.leftEmoji ?? '🍎';
  const re = figure.rightEmoji ?? '🧱';
  const unit = figure.unit ?? '';
  const balanced = left === right;
  return (
    <div className="mf-weight" aria-hidden="true">
      <div className={`mf-balance ${balanced ? '' : 'tilt'}`}>⚖️</div>
      <div className="mf-pan-row">
        <div className="mf-col">
          <span className="mf-item weight-drop">{le}</span>
          <span className="mf-k chart-num-anim" style={{ animationDelay: '0.5s' }}>{left}{unit}</span>
        </div>
        <span className="mf-vs chart-num-anim" style={{ animationDelay: '0.8s' }}>{balanced ? '=' : left > right ? '>' : '<'}</span>
        <div className="mf-col">
          <span className="mf-item weight-drop" style={{ animationDelay: '0.25s' }}>{re}</span>
          <span className="mf-k chart-num-anim" style={{ animationDelay: '0.7s' }}>{right}{unit}</span>
        </div>
      </div>
    </div>
  );
}

function VennFig({ figure }: { figure: MathFigure }) {
  const A = Math.round(figure.vA ?? 4);
  const B = Math.round(figure.vB ?? 3);
  const AB = Math.round(figure.vAB ?? 2);
  const la = figure.labelA ?? 'A', lb = figure.labelB ?? 'B';
  return (
    <svg viewBox="0 0 240 150" width="240" height="150" aria-hidden="true">
      <circle className="venn-in" cx={95} cy={75} r={55} fill="#64b5f6" fillOpacity={0.35} stroke="#4a3b66" strokeWidth={2} />
      <circle className="venn-in" style={{ animationDelay: '0.25s' }} cx={145} cy={75} r={55} fill="#ff6f91" fillOpacity={0.35} stroke="#4a3b66" strokeWidth={2} />
      <text className="chart-num-anim" style={{ animationDelay: '0.5s' }} x={60} y={70} textAnchor="middle" fontSize="14" fill="#4a3b66">{la} {A - AB}</text>
      <text className="chart-num-anim" style={{ animationDelay: '0.7s' }} x={120} y={80} textAnchor="middle" fontSize="16" fontWeight="bold" fill="#4a3b66">{AB}</text>
      <text className="chart-num-anim" style={{ animationDelay: '0.9s' }} x={182} y={70} textAnchor="middle" fontSize="14" fill="#4a3b66">{lb} {B - AB}</text>
      <text className="chart-num-anim" style={{ animationDelay: '1.1s' }} x={120} y={136} textAnchor="middle" fontSize="13" fill="#7c6ba0">总数 = {A} + {B} − {AB} = {A + B - AB}</text>
    </svg>
  );
}

function PlaceValueFig({ figure }: { figure: MathFigure }) {
  const num = figure.number ?? '360050';
  const name = figure.name;
  const units = ['亿', '千万', '百万', '十万', '万', '千', '百', '十', '个'];
  const digits = num.replace(/[^\d]/g, '').split('');
  const offset = units.length - digits.length;
  return (
    <div className="mf-placevalue" aria-hidden="true">
      <div className="mf-pv-row">
        {units.map((u, i) => {
          const d = i >= offset ? digits[i - offset] : '';
          return (
            <div className="mf-pv-col" key={u}>
              <span className={`mf-pv-digit ${d ? 'lit' : ''}`} style={{ animationDelay: `${(i - offset) * 0.15}s` }}>{d}</span>
              <span className="mf-pv-unit">{u}</span>
            </div>
          );
        })}
      </div>
      {name && <div className="mf-num">读作：{name}</div>}
    </div>
  );
}

function LineKindFig({ figure }: { figure: MathFigure }) {
  const hl = figure.lineKind ?? 'segment';
  return (
    <svg viewBox="0 0 240 130" width="240" height="130" aria-hidden="true">
      <line className="chart-num-anim" x1={70} y1={22} x2={200} y2={22} stroke="#4a3b66" strokeWidth={3} strokeLinecap="round" />
      <circle className="nl-mark" cx={70} cy={22} r={4} fill="#ff6f91" />
      <circle className="nl-mark" style={{ animationDelay: '0.4s' }} cx={200} cy={22} r={4} fill="#ff6f91" />
      <text className="chart-num-anim" x={10} y={26} fontSize="14" fontWeight="bold" fill={hl === 'segment' ? '#ff6f91' : '#7c6ba0'}>线段</text>
      <line className="chart-num-anim" style={{ animationDelay: '0.6s' }} x1={70} y1={62} x2={190} y2={62} stroke="#4a3b66" strokeWidth={3} strokeLinecap="round" />
      <circle className="nl-mark" style={{ animationDelay: '0.6s' }} cx={70} cy={62} r={4} fill="#ff6f91" />
      <path className="chart-num-anim" style={{ animationDelay: '0.6s' }} d="M190 62 l-8 -5 v10 z" fill="#4a3b66" />
      <text className="chart-num-anim" style={{ animationDelay: '0.6s' }} x={10} y={66} fontSize="14" fontWeight="bold" fill={hl === 'ray' ? '#ff6f91' : '#7c6ba0'}>射线</text>
      <line className="chart-num-anim" style={{ animationDelay: '1.2s' }} x1={70} y1={102} x2={200} y2={102} stroke="#4a3b66" strokeWidth={3} strokeLinecap="round" />
      <path className="chart-num-anim" style={{ animationDelay: '1.2s' }} d="M70 102 l8 -5 v10 z" fill="#4a3b66" />
      <path className="chart-num-anim" style={{ animationDelay: '1.2s' }} d="M200 102 l-8 -5 v10 z" fill="#4a3b66" />
      <text className="chart-num-anim" style={{ animationDelay: '1.2s' }} x={10} y={106} fontSize="14" fontWeight="bold" fill={hl === 'line' ? '#ff6f91' : '#7c6ba0'}>直线</text>
    </svg>
  );
}

function LinePairFig({ figure }: { figure: MathFigure }) {
  const hl = figure.pairKind ?? 'parallel';
  return (
    <svg viewBox="0 0 240 150" width="240" height="150" aria-hidden="true">
      <text className="chart-num-anim" x={10} y={20} fontSize="14" fontWeight="bold" fill={hl === 'parallel' ? '#ff6f91' : '#7c6ba0'}>平行</text>
      <line className="chart-num-anim" style={{ animationDelay: '0.2s' }} x1={70} y1={16} x2={210} y2={16} stroke="#4a3b66" strokeWidth={2.5} />
      <line className="chart-num-anim" style={{ animationDelay: '0.35s' }} x1={70} y1={36} x2={210} y2={36} stroke="#4a3b66" strokeWidth={2.5} />
      <text className="chart-num-anim" style={{ animationDelay: '0.7s' }} x={10} y={100} fontSize="14" fontWeight="bold" fill={hl === 'perpendicular' ? '#ff6f91' : '#7c6ba0'}>垂直</text>
      <line className="chart-num-anim" style={{ animationDelay: '0.9s' }} x1={70} y1={70} x2={210} y2={70} stroke="#4a3b66" strokeWidth={2.5} />
      <line className="chart-num-anim" style={{ animationDelay: '1.05s' }} x1={140} y1={130} x2={140} y2={30} stroke="#ff6f91" strokeWidth={2.5} />
      <rect className="nl-mark" style={{ animationDelay: '1.2s' }} x={132} y={62} width={16} height={16} fill="none" stroke="#4a3b66" strokeWidth={1.5} />
    </svg>
  );
}

function TimelineFig({ figure }: { figure: MathFigure }) {
  const tasks = figure.tasks ?? [];
  const maxEnd = Math.max(1, ...tasks.map((t) => t.start + t.len));
  const W = 260, L = 12, R = 12;
  const H = 20 + tasks.length * 26;
  const x = (v: number) => L + (v / maxEnd) * (W - L - R);
  const COLORS = ['#ff6f91', '#64b5f6', '#ffb74d', '#81c784', '#ba68c8'];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" aria-hidden="true">
      {tasks.map((t, i) => {
        const y = 20 + i * 26;
        return (
          <g key={i}>
            <text className="chart-num-anim" style={{ animationDelay: `${i * 0.3}s` }} x={4} y={y + 11} fontSize="12" fill="#7c6ba0">{t.name}</text>
            <rect className="tl-bar" style={{ animationDelay: `${i * 0.3}s` }}
              x={x(t.start)} y={y} width={x(t.start + t.len) - x(t.start)} height={14} rx={3} fill={COLORS[i % COLORS.length]} />
            <text className="chart-num-anim" style={{ animationDelay: `${i * 0.3 + 0.4}s` }} x={x(t.start + t.len) + 4} y={y + 11} fontSize="11" fill="#4a3b66">{t.start + t.len}</text>
          </g>
        );
      })}
      <text x={W - R} y={H - 8} textAnchor="end" fontSize="11" fill="#4a3b66">共 {maxEnd} 分钟</text>
    </svg>
  );
}

function MatchFig({ figure }: { figure: MathFigure }) {
  const matches = figure.matches ?? [];
  return (
    <div className="mf-match" aria-hidden="true">
      {matches.map((m, i) => (
        <div className="mf-match-row chart-num-anim" key={i} style={{ animationDelay: `${i * 0.25}s` }}>
          <span className="mf-match-a">{m.a}</span>
          <span className="mf-op">vs</span>
          <span className="mf-match-b">{m.b}</span>
          <span className="mf-win">{m.win === 'a' ? '甲胜' : m.win === 'b' ? '乙胜' : ''}</span>
        </div>
      ))}
    </div>
  );
}

function PlantFig({ figure }: { figure: MathFigure }) {
  const L = Math.max(1, Math.round(figure.length ?? 100));
  const d = Math.max(1, Math.round(figure.interval ?? 5));
  const n = Math.floor(L / d) + 1;
  const W = 320, H = 70, P = 12;
  const x = (i: number) => P + (i / (n - 1)) * (W - P * 2);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" aria-hidden="true">
      <line x1={P} y1={40} x2={W - P} y2={40} stroke="#4a3b66" strokeWidth={2} />
      {Array.from({ length: n }).map((_, i) => (
        <g key={i}>
          <text className="plant-tree" style={{ animationDelay: `${i * 0.2}s` }} x={x(i)} y={36} textAnchor="middle" fontSize="13">🌳</text>
        </g>
      ))}
      <line className="chart-num-anim" style={{ animationDelay: `${n * 0.2}s` }} x1={x(0)} y1={48} x2={x(1)} y2={48} stroke="#7c6ba0" strokeWidth={1.5} />
      <text className="chart-num-anim" style={{ animationDelay: `${n * 0.2 + 0.3}s` }} x={(x(0) + x(1)) / 2} y={60} textAnchor="middle" fontSize="10" fill="#7c6ba0">间隔 {d} 米</text>
      <text className="chart-num-anim" style={{ animationDelay: `${n * 0.2 + 0.4}s` }} x={W - P} y={66} textAnchor="end" fontSize="12" fontWeight="bold" fill="#4a3b66">共 {n} 棵</text>
    </svg>
  );
}

function GridFig({ figure }: { figure: MathFigure }) {
  const kind = figure.gridKind ?? 'coord';
  if (kind === 'multiples') {
    const n = Math.max(1, Math.round(figure.n ?? 30));
    const of = Math.max(1, Math.round(figure.of ?? 2));
    const cell = 22, cols = 10, pad = 6;
    const rows = Math.ceil(n / cols);
    const W = cols * cell + pad * 2, H = rows * cell + pad * 2;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true">
        {Array.from({ length: n }).map((_, i) => {
          const v = i + 1;
          const cx = pad + (i % cols) * cell;
          const cy = pad + Math.floor(i / cols) * cell;
          const hit = v % of === 0;
          return (
            <g key={i} className="grid-cell-pop" style={{ animationDelay: `${i * 0.02}s` }}>
              <rect x={cx} y={cy} width={cell - 2} height={cell - 2} rx={3} fill={hit ? '#ff6f91' : '#fff'} stroke="#d8d2e6" strokeWidth={0.8} />
              <text x={cx + (cell - 2) / 2} y={cy + (cell - 2) / 2 + 4} textAnchor="middle" fontSize="11" fill={hit ? '#fff' : '#7c6ba0'}>{v}</text>
            </g>
          );
        })}
      </svg>
    );
  }
  if (kind === 'factors') {
    const n = Math.max(1, Math.round(figure.n ?? 12));
    let fa = Math.max(1, Math.round(figure.factorA ?? 1));
    let fb = Math.max(1, Math.round(figure.factorB ?? n));
    if (fa * fb !== n) { fa = 1; fb = n; }
    const cell = 22, pad = 6;
    const W = fb * cell + pad * 2, H = fa * cell + pad * 2 + 20;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true">
        {Array.from({ length: n }).map((_, i) => {
          const cx = pad + (i % fb) * cell + (cell - 2) / 2;
          const cy = pad + Math.floor(i / fb) * cell + (cell - 2) / 2;
          return <circle key={i} className="grid-cell-pop" style={{ animationDelay: `${i * 0.04}s` }} cx={cx} cy={cy} r={7} fill="#ff6f91" />;
        })}
        <text className="chart-num-anim" style={{ animationDelay: `${n * 0.04 + 0.2}s` }} x={W / 2} y={H - 4} textAnchor="middle" fontSize="13" fontWeight="bold" fill="#4a3b66">{fa} × {fb} = {n}</text>
      </svg>
    );
  }
  const cols = Math.max(1, Math.round(figure.cols ?? 6));
  const rows = Math.max(1, Math.round(figure.rows ?? 5));
  const cx = Math.min(cols, Math.max(1, Math.round(figure.cx ?? 3)));
  const cy = Math.min(rows, Math.max(1, Math.round(figure.cy ?? 2)));
  const cell = 26, pad = 6;
  const W = cols * cell + pad * 2, H = rows * cell + pad * 2;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true">
      {Array.from({ length: rows }).map((_, ri) =>
        Array.from({ length: cols }).map((_, ci) => {
          const x = pad + ci * cell, y = pad + ri * cell;
          const hit = ci === cx - 1 && ri === cy - 1;
          return <rect key={`${ri}-${ci}`} className="grid-cell-pop" style={{ animationDelay: `${(ri * cols + ci) * 0.03}s` }} x={x} y={y} width={cell - 2} height={cell - 2} rx={3} fill={hit ? '#ff6f91' : '#fff'} stroke="#d8d2e6" strokeWidth={0.8} />;
        })
      )}
      <text className="chart-num-anim" style={{ animationDelay: `${rows * cols * 0.03 + 0.3}s` }} x={pad + (cx - 1) * cell + (cell - 2) / 2} y={pad + (cy - 1) * cell + (cell - 2) / 2 + 4} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#fff">({cx},{cy})</text>
    </svg>
  );
}

function PigeonholeFig({ figure }: { figure: MathFigure }) {
  const p = Math.max(1, Math.round(figure.pigeons ?? 4));
  const h = Math.max(1, Math.round(figure.holes ?? 3));
  const base = Math.floor(p / h);
  const extra = p % h;
  let birdIndex = 0;
  return (
    <div className="mf-pigeonhole" aria-hidden="true">
      <div className="mf-hole-row">
        {Array.from({ length: h }).map((_, i) => {
          const count = base + (i < extra ? 1 : 0);
          return (
            <div className={`mf-hole ${i < extra ? 'full' : ''}`} key={i}>
              <span className="mf-k">{count}</span>
              <span className="mf-hole-birds">{Array.from({ length: count }).map((_, j) => {
                const delay = birdIndex * 0.3;
                birdIndex += 1;
                return <span key={j} className="ph-bird" style={{ animationDelay: `${delay}s` }}>🐦</span>;
              })}</span>
            </div>
          );
        })}
      </div>
      <div className="mf-num">{p} 只鸽子进 {h} 个巢，至少一个巢有 {base + (extra > 0 ? 1 : 0)} 只</div>
    </div>
  );
}

function TextFig({ figure }: { figure: MathFigure }) {
  const emoji = figure.emoji ?? '✨';
  const title = figure.title ?? '';
  const text = figure.text ?? '';
  return (
    <div className="mf-text" aria-hidden="true">
      <div className="mf-text-emoji chart-num-anim">{emoji}</div>
      {title && <div className="mf-text-title chart-num-anim" style={{ animationDelay: '0.25s' }}>{title}</div>}
      {text && <div className="mf-text-body chart-num-anim" style={{ animationDelay: '0.45s' }}>{text}</div>}
    </div>
  );
}

/* 语文场景插画：一组情境 emoji 逐个小跳出现（配图随讲解变化） */
function SceneFig({ figure }: { figure: MathFigure }) {
  const emojis = figure.emojis && figure.emojis.length > 0 ? figure.emojis : ['📖'];
  const title = figure.title ?? '';
  const text = figure.text ?? '';
  const rows = emojis.length <= 4 ? 1 : emojis.length <= 8 ? 2 : 3;
  return (
    <div className="mf-scene" aria-hidden="true">
      <div className={`mf-scene-stage rows-${rows}`}>
        {emojis.map((e, i) => (
          <span key={i} className="mf-scene-emoji" style={{ animationDelay: `${0.15 + i * 0.22}s` }}>{e}</span>
        ))}
      </div>
      {title && <div className="mf-scene-title">{title}</div>}
      {text && <div className="mf-scene-body">{text}</div>}
    </div>
  );
}
