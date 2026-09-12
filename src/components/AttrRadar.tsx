/** 四维属性 · 雷达图（SVG）
 *  - 以当前四项属性中的最大值为「最长边」= 外框满刻度（动态）
 *  - 其余属性按 value / max * 外框半径 比例取长；多边形顶点由比例决定
 *  - 图框尺寸固定（size）；四角外圈标注属性名
 */
interface Props {
  values: { wis: number; cou: number; cre: number; tea: number };
  labels: { wis: string; cou: string; cre: string; tea: string };
  size?: number;
}

export default function AttrRadar({ values, labels, size = 128 }: Props) {
  const c = size / 2;
  const R = c - 20; // 外环半径（四角留出放属性名/数值的空间）
  const angle = (i: number) => i * 90; // 0上 / 1右 / 2下 / 3左
  const list = [values.wis, values.cou, values.cre, values.tea];
  const maxVal = Math.max(1, ...list);
  const ratio = (v: number) => v / maxVal;

  const radOf = (i: number) => ((angle(i) - 90) * Math.PI) / 180;
  const px = (i: number, rr: number) => ({
    x: c + Math.cos(radOf(i)) * rr,
    y: c + Math.sin(radOf(i)) * rr,
  });

  // 四角顶点（按比例半径），对应多边形
  const pts = list.map((v, i) => px(i, R * ratio(v)));
  const poly = pts.map((p) => `${p.x},${p.y}`).join(' ');

  // 网格菱形（相对满刻度）
  const ringPoly = (r: number) => [0, 1, 2, 3].map((i) => {
    const p = px(i, R * r);
    return `${p.x},${p.y}`;
  }).join(' ');

  const names = [labels.wis, labels.cou, labels.cre, labels.tea];

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="attr-radar" aria-label="四维属性雷达图">
      {/* 参考网格（25/50/75/100% of max） */}
      {[0.25, 0.5, 0.75, 1].map((r) => (
        <polygon key={r} points={ringPoly(r)} className={`ar-grid${r === 1 ? ' ring-100' : ''}`} />
      ))}
      {/* 轴线 */}
      {[0, 1, 2, 3].map((i) => {
        const a = px(i, R);
        return <line key={i} x1={c} y1={c} x2={a.x} y2={a.y} className="ar-axis" />;
      })}
      {/* 属性多边形 */}
      <polygon points={poly} className="ar-fill" />
      {/* 顶点圆点 */}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} className="ar-dot" />
      ))}
      {/* 四角属性名（顶点外侧、留边不裁剪） */}
      {names.map((n, i) => {
        const lp = px(i, Math.min(R + 12, c - 10));
        return (
          <text
            key={n}
            x={lp.x}
            y={lp.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="ar-label"
          >
            {n}
          </text>
        );
      })}
      {/* 顶点数值（贴顶点外侧，属性名在更外圈，避免重叠） */}
      {list.map((v, i) => {
        const p = px(i, R * ratio(v) + 2);
        return (
          <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" className="ar-val">
            {v}
          </text>
        );
      })}
    </svg>
  );
}
