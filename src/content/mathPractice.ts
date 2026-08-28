import type { MathFigure, Quiz } from './skills';

/* =====================================================================
   数学「去练习」题目生成器
   依据配图数据程序化生成【自包含】题目（题干含全部信息，无需看图），
   再复用「想一想」概念题（quiz），每课 ≤5 道（3 选 1，确定性输出）。
   ===================================================================== */

function compute(a: number, b: number, op: string): number {
  switch (op) {
    case '+':
      return a + b;
    case '-':
      return a - b;
    case '×':
      return a * b;
    case '÷':
      return b === 0 ? 0 : Math.floor(a / b);
    default:
      return a + b;
  }
}

/** 确定性字符串哈希（避免 Math.random，保证题目稳定且符合 React purity 规则） */
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function makeQuiz(q: string, correct: string, wrongs: string[]): Quiz {
  const options = [...new Set([correct, ...wrongs])];
  for (let i = options.length - 1; i > 0; i--) {
    const j = hashStr(`${q}#${i}`) % (i + 1);
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { q, options, answer: options.indexOf(correct) };
}

function numQ(q: string, res: number): Quiz {
  const span = res >= 20 ? 10 : 1;
  return makeQuiz(q, String(res), [String(res + span), String(Math.max(0, res - span))]);
}

export function genMathPractice(figure: MathFigure | undefined, quiz: Quiz | undefined): Quiz[] {
  const out: Quiz[] = [];

  if (figure) {
    const t = figure.type;

    /* 计算类：加减乘除（凑十=加、破十=减、算式/竖式用显式 op） */
    if (t === 'equation' || t === 'vertical' || t === 'makeTen' || t === 'breakTen') {
      const a = Math.max(0, Math.round(figure.a ?? 0));
      const b = Math.max(0, Math.round(figure.b ?? 0));
      const op = t === 'makeTen' ? '+' : t === 'breakTen' ? '-' : figure.op ?? '+';
      const res = compute(a, b, op);
      if (res >= 0) {
        if (op === '÷') {
          const q = a % (b || 1) === 0 ? `${a} ÷ ${b} = ？` : `${a} ÷ ${b} 的商是几？`;
          out.push(numQ(q, Math.floor(a / (b || 1))));
        } else {
          out.push(numQ(`${a} ${op} ${b} = ？`, res));
          if (op === '+' || op === '×') out.push(numQ(`${b} ${op} ${a} = ？`, res));
          const r1 = compute(a, b + 1, op);
          if (r1 >= 0) out.push(numQ(`${a} ${op} ${b + 1} = ？`, r1));
          const r2 = compute(a + 1, b, op);
          if (r2 >= 0) out.push(numQ(`${a + 1} ${op} ${b} = ？`, r2));
        }
      }
    } else if (t === 'count') {
      const n = Math.max(0, Math.round(figure.count ?? 0));
      const emoji = figure.emoji ?? '●';
      out.push(makeQuiz(`数一数：${emoji.repeat(n)}，一共有几个？`, `${n}`, [`${n + 1}`, `${Math.max(0, n - 1)}`]));
    } else if (t === 'compare') {
      const l = Math.max(0, Math.round(figure.left ?? 0));
      const r = Math.max(0, Math.round(figure.right ?? 0));
      const le = figure.leftEmoji ?? '🔴';
      const re = figure.rightEmoji ?? '🔵';
      if (l === r) {
        out.push(makeQuiz(`${le.repeat(l)} 和 ${re.repeat(r)}，一样多吗？`, '一样多', ['左边多', '右边多']));
      } else {
        out.push(makeQuiz(`${le.repeat(l)} 和 ${re.repeat(r)}，哪边多？`, l > r ? '左边多' : '右边多', ['一样多', l > r ? '右边多' : '左边多']));
      }
    } else if (t === 'fraction') {
      const whole = Math.max(1, Math.round(figure.whole ?? 4));
      const part = Math.min(whole, Math.max(0, Math.round(figure.part ?? 1)));
      if (whole === 100) {
        out.push(makeQuiz('涂色部分是百分之几？', `${part}%`, [`${part + 1}%`, `${100 - part}%`]));
      } else {
        const c = `${part}/${whole}`;
        const cands = [`${whole - part}/${whole}`, `${part + 1}/${whole}`, `${part}/${whole + 1}`, `${whole}/${whole}`];
        const wrongs = [...new Set(cands)].filter((s) => s !== c).slice(0, 2);
        out.push(makeQuiz(`把一个圆平均分成 ${whole} 份，涂了 ${part} 份，涂色部分是几分之几？`, c, wrongs));
      }
    } else if (t === 'numberline') {
      const mark = Math.round(figure.mark ?? 0);
      out.push(makeQuiz(`比 ${mark} 大 1 的数是几？`, `${mark + 1}`, [`${mark - 1}`, `${mark}`]));
    } else if (t === 'clock') {
      const h = Math.round(figure.hour ?? 3);
      const m = Math.round(figure.minute ?? 0);
      if (m === 0) {
        out.push(makeQuiz(`分针指着 12，时针指着 ${h}，是几时？`, `${h} 时`, [`${(h + 1) % 12 || 12} 时`, `${h} 时 30 分`]));
      }
    }
    /* 其余图型（几何/统计/方向/大数…）由概念题（quiz）承载 */
  }

  if (quiz) out.push(quiz);

  const seen = new Set<string>();
  const result: Quiz[] = [];
  for (const q of out) {
    if (seen.has(q.q)) continue;
    seen.add(q.q);
    result.push(q);
  }
  return result.slice(0, 5);
}
