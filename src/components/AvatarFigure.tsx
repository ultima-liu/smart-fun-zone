import type { ReactNode } from 'react';
import { itemById } from '../points';

/** 配色方案：服装/肤色变化（换肤） */
export const PALETTES: Record<string, { body: string; body2: string; belly: string; arm: string; leg: string; leg2: string }> = {
  pink: { body: '#F79BB0', body2: '#E98AA2', belly: '#FFE9EF', arm: '#F79BB0', leg: '#E58A93', leg2: '#D67880' },
  mint: { body: '#8DD6C4', body2: '#6FC3AF', belly: '#E8FAF4', arm: '#8DD6C4', leg: '#6FC3AF', leg2: '#58AC96' },
  sky: { body: '#8FC5E8', body2: '#6FB0DB', belly: '#E9F5FC', arm: '#8FC5E8', leg: '#6FB0DB', leg2: '#5599C4' },
  lavender: { body: '#C3A9E8', body2: '#B191DC', belly: '#F2ECFB', arm: '#C3A9E8', leg: '#B191DC', leg2: '#9A78C4' },
  lemon: { body: '#F7C86B', body2: '#E9B34F', belly: '#FFF3DA', arm: '#F7C86B', leg: '#E9B34F', leg2: '#D49B3A' },
  skin: { body: '#FFD9B8', body2: '#F4C29E', belly: '#FFEFE0', arm: '#FFD9B8', leg: '#E9B89B', leg2: '#D6A184' },
};

// 肤色与发色
const SKIN = '#FFE2C6';
const SKIN_SHADE = '#F4C9A6';
const HAIR = '#6E5540';

/**
 * 虚拟人物 · AvatarFigure（冒险岛式 Q 版）
 * 头占约 1/2 身高、圆润大头、超大椭圆闪亮瞳、小鼻小嘴、带光泽发丝、纤细小身体。
 */
export default function AvatarFigure({
  size = 96,
  equipped,
  mood = 'happy',
  animate = true,
  pose = 'idle',
  colorway = 'pink',
  hairstyle = 'sporty',
}: {
  size?: number;
  equipped?: { outfit?: string; badge?: string };
  mood?: 'happy' | 'play' | 'proud' | 'sleepy';
  animate?: boolean;
  pose?: 'idle' | 'happy' | 'celebrate' | 'pose';
  colorway?: keyof typeof PALETTES;
  hairstyle?: 'sporty' | 'long' | 'bob' | 'ponytail';
}) {
  const outfit = equipped?.outfit ? itemById(equipped.outfit) : undefined;
  const badge = equipped?.badge ? itemById(equipped.badge) : undefined;
  const slots = renderOutfit(outfit?.id);
  const f = face(mood);
  const c = PALETTES[colorway] ?? PALETTES.pink;
  const cls = `avatar-figure ${animate ? 'is-anim' : ''} ${pose === 'celebrate' ? 'is-celebrate' : pose === 'happy' ? 'is-happy' : ''}`;
  const hair = renderHair(hairstyle, f.hairBack);
  const limb = limbs(pose, c);

  return (
    <svg viewBox="0 0 200 232" width={size} height={size * (232 / 200)} role="img" aria-label="avatar figure" className={cls}>
      <defs>
        <linearGradient id="af-hair-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8A6C52" />
          <stop offset="0.55" stopColor={HAIR} />
          <stop offset="1" stopColor="#4A3526" />
        </linearGradient>
        <linearGradient id="af-hair-grad-light" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#A4866A" />
          <stop offset="1" stopColor="#6E5540" />
        </linearGradient>
      </defs>
      {slots?.back}
      {/* 影子 */}
      <ellipse cx="100" cy="225" rx="42" ry="7" fill="#000" opacity="0.1" className="af-shadow" />
      {/* 腿（按姿势） */}
      <g className="af-legs">{limb.legs}</g>
      {/* 身体（纤瘦小） */}
      <g className="af-body">{limb.body}</g>
      {/* 手臂（按姿势） */}
      <g className="af-arms">{limb.arms}</g>
      {/* 头（缩小头身比，更协调） */}
      <g className="af-head-wrap" transform="translate(100 96) scale(0.80) translate(-100 -96)">
        {/* 头（圆润大头） */}
        <g className="af-head">
          {/* 脸 */}
          <path d="M38 96 q0 -66 62 -66 q62 0 62 66 q0 40 -24 52 q-38 18 -76 0 q-24 -12 -24 -52z" fill={SKIN} />
          <path d="M38 96 q0 -66 62 -66 l0 4 q-56 0 -56 62 q0 40 -6 52z" fill={SKIN_SHADE} opacity="0.55" />
          {hair.elements}
        </g>
        {/* 表情 */}
        <g className="af-face">
          {f.eyes}
          {f.nose}
          {f.mouth}
          {f.blush}
        </g>
        {slots?.face}
        {slots?.overlay}
      </g>
      {badge && <g transform="translate(136 150)" className="af-badge">{renderBadge(badge.icon)}</g>}
    </svg>
  );
}

/* ---------- 表情（冒险岛式超大眼） ---------- */
function face(mood: 'happy' | 'play' | 'proud' | 'sleepy') {
  const blush = <g fill="#FFB0A6" opacity="0.7"><ellipse cx="62" cy="106" rx="8" ry="5" /><ellipse cx="138" cy="106" rx="8" ry="5" /></g>;
  if (mood === 'sleepy') {
    return {
      hairBack: null,
      eyes: <g className="af-eyes-blink"><path d="M60 92 q14 -10 28 0 M112 92 q14 -10 28 0" stroke="#5B4632" strokeWidth="4" fill="none" strokeLinecap="round" /></g>,
      nose: <path d="M98 102 l2 4" stroke="#E7A98C" strokeWidth="3" strokeLinecap="round" />,
      mouth: <path d="M92 110 q8 5 16 0" stroke="#C96A5A" strokeWidth="4" fill="none" strokeLinecap="round" />,
      blush,
    };
  }
  const wide = mood === 'proud';
  return {
    hairBack: <path d="M44 66 q-18 20 -14 60 q2 -18 12 -34 q-2 -14 2 -26z M156 66 q18 20 14 60 q-2 -18 -12 -34 q2 -14 -2 -26z" fill={HAIR} />,
    eyes: (
      <g className={mood === 'happy' ? 'af-eyes-happy' : 'af-eyes-blink'}>
        {/* 眼白（大椭圆杏仁） */}
        <ellipse cx="76" cy="94" rx={wide ? 18 : 16} ry={wide ? 15 : 17} fill="#FFF" />
        <ellipse cx="124" cy="94" rx={wide ? 18 : 16} ry={wide ? 15 : 17} fill="#FFF" />
        {/* 瞳（大竖椭圆，深棕）+ 渐变提亮 */}
        <ellipse cx="76" cy="96" rx={wide ? 12 : 11} ry={wide ? 13 : 15} fill="#4A331E" />
        <ellipse cx="124" cy="96" rx={wide ? 12 : 11} ry={wide ? 13 : 15} fill="#4A331E" />
        <ellipse cx="76" cy="92" rx="9" ry="10" fill="#7A4E26" opacity="0.85" />
        <ellipse cx="124" cy="92" rx="9" ry="10" fill="#7A4E26" opacity="0.85" />
        {/* 瞳心亮斑（琥珀，最亮） */}
        <ellipse cx="76" cy="90" rx="6" ry="6.5" fill="#B57A38" />
        <ellipse cx="124" cy="90" rx="6" ry="6.5" fill="#B57A38" />
        {/* 上眼睑（加层次） */}
        <path d="M60 84 q16 -12 32 0 M108 84 q16 -12 32 0" stroke="#3A2A18" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.6" />
        {/* 冒险岛式大上高光 + 小下高光 + 星芒 */}
        <circle cx="70" cy="82" r="5.6" fill="#FFF" />
        <circle cx="118" cy="82" r="5.6" fill="#FFF" />
        <circle cx="82" cy="100" r="2.6" fill="#FFF" opacity="0.95" />
        <circle cx="130" cy="100" r="2.6" fill="#FFF" opacity="0.95" />
        <path d="M58 78 l1.6 3 3 1.6 -3 1.6 -1.6 3 -1.6 -3 -3 -1.6 3 -1.6z" fill="#FFF" opacity="0.9" />
        <path d="M142 78 l1.6 3 3 1.6 -3 1.6 -1.6 3 -1.6 -3 -3 -1.6 3 -1.6z" fill="#FFF" opacity="0.9" />
      </g>
    ),
    nose: <path d="M98 104 l2 4" stroke="#E7A98C" strokeWidth="3" strokeLinecap="round" />,
    mouth: mood === 'happy' ? (
      <path d="M90 108 q10 10 20 0 q-2 4 -10 4 q-8 0 -10 -4z" fill="#C95B4C" stroke="#B4453A" strokeWidth="1.6" />
    ) : (
      <path d="M92 106 q8 9 16 0 q-8 6 -16 0z" fill="#C95B4C" />
    ),
    blush,
  };
}

/* ---------- 装扮插槽（可组合，位置对齐新头部） ---------- */
function renderOutfit(id?: string): { back?: ReactNode; face?: ReactNode; overlay?: ReactNode } | null {
  if (!id) return null;
  const key = id.toLowerCase();
  const slot: { back?: ReactNode; face?: ReactNode; overlay?: ReactNode } = {};
  if (key.includes('crown')) {
    // 金冠：主体 + 宝石 + 底环
    slot.overlay = (
      <g>
        <path d="M60 40 l8 -18 16 14 16 -20 16 20 16 -14 8 18 q-42 18 -80 0z" fill="#F6C24B" stroke="#C9952F" strokeWidth="2" />
        <circle cx="74" cy="36" r="4.4" fill="#EF6A9B" stroke="#FFF" strokeWidth="1.6" />
        <circle cx="100" cy="30" r="4" fill="#5FA8D8" stroke="#FFF" strokeWidth="1.6" />
        <circle cx="126" cy="36" r="4.4" fill="#EF6A9B" stroke="#FFF" strokeWidth="1.6" />
        <rect x="56" y="40" width="88" height="6" rx="3" fill="#E0A92F" />
      </g>
    );
  } else if (key.includes('hat')) {
    // 侦探帽：帽体 + 帽檐 + 帽带扣
    slot.overlay = (
      <g>
        <path d="M52 44 q48 -34 96 0 l-6 10 q-42 -18 -84 0z" fill="#4E6BB0" />
        <path d="M46 54 q54 -14 108 0 l-5 8 q-50 -14 -98 0z" fill="#3B5086" />
        <rect x="90" y="38" width="20" height="12" rx="5" fill="#E0A92F" />
        <circle cx="100" cy="44" r="4" fill="#6B4A34" />
      </g>
    );
  } else if (key.includes('glasses')) {
    slot.face = (
      <g>
        <g fill="none" stroke="#3A2E28" strokeWidth="3.2"><circle cx="76" cy="94" r="17" /><circle cx="124" cy="94" r="17" /><path d="M93 92 h14" /></g>
        <path d="M64 88 q6 -4 11 0" stroke="#FFF" strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.9" />
        <path d="M112 88 q6 -4 11 0" stroke="#FFF" strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.9" />
      </g>
    );
  } else if (key.includes('halo')) {
    slot.back = (
      <g>
        <ellipse cx="100" cy="28" rx="34" ry="9" fill="none" stroke="#FFE082" strokeWidth="6" transform="rotate(-6 100 28)" opacity="0.95" />
        <ellipse cx="100" cy="28" rx="38" ry="12" fill="none" stroke="#FFD54F" strokeWidth="3" transform="rotate(-6 100 28)" opacity="0.4" />
      </g>
    );
  } else if (key.includes('antenna')) {
    // 卷星天线：卷卷呆毛 + 悬空小星环（卷星人标志）
    slot.back = (
      <g>
        <path d="M100 38 C 96 24, 88 16, 92 8 C 95 2, 102 6, 99 12 C 97 16, 101 20, 103 24" fill="none" stroke="#F2A65A" strokeWidth="4.5" strokeLinecap="round" />
        <circle cx="93" cy="6.5" r="4" fill="#F6C24B" stroke="#FFF" strokeWidth="1.6" />
        <ellipse cx="100" cy="40" rx="33" ry="9.5" fill="none" stroke="#9D8CFF" strokeWidth="4.5" transform="rotate(-10 100 40)" opacity="0.95" />
        <path d="M66 34 l1.8 3.8 4 0.5 -3 2.8 0.9 4 -3.7 -2 -3.7 2 0.9 -4 -3 -2.8 4 -0.5z" fill="#F6C24B" opacity="0.95" />
        <path d="M136 30 l1.5 3.2 3.4 0.4 -2.6 2.4 0.8 3.4 -3.2 -1.7 -3.2 1.7 0.8 -3.4 -2.6 -2.4 3.4 -0.4z" fill="#F6C24B" opacity="0.9" />
      </g>
    );
  } else if (key.includes('flower')) {
    slot.overlay = (
      <g transform="translate(150 56)">
        <g fill="#F48FB1"><ellipse rx="4.5" ry="7" /><ellipse rx="4.5" ry="7" transform="rotate(60)" /><ellipse rx="4.5" ry="7" transform="rotate(120)" /></g>
        <circle r="4" fill="#FFE9A8" />
      </g>
    );
  } else if (key.includes('bow')) {
    slot.overlay = (
      <g transform="translate(56 62)">
        <path d="M0 0 L-13 -9 L-13 9z" fill="#E46A8A" /><path d="M0 0 L13 -9 L13 9z" fill="#F79BB0" />
        <circle r="4" fill="#D05A75" />
      </g>
    );
  } else if (key.includes('wings')) {
    slot.back = (
      <g>
        <path d="M52 100 q-26 -14 -30 -40 q26 2 34 26 z" fill="#BDE7FF" />
        <path d="M60 104 q-22 -7 -26 -28 q22 2 28 20 z" fill="#9AD4F0" />
        <path d="M148 100 q26 -14 30 -40 q-26 2 -34 26 z" fill="#BDE7FF" />
        <path d="M140 104 q22 -7 26 -28 q-22 2 -28 20 z" fill="#9AD4F0" />
      </g>
    );
  } else if (key.includes('lantern') || key.includes('staff') || key.includes('wand') || key.includes('balloon')) {
    slot.overlay = (
      <g transform="translate(158 140)">
        <rect x="46" y="-88" width="6" height="90" rx="3" fill="#8A6B4A" />
        <path d="M34 -96 h30 l-4 -12 h-22z" fill="#C9952F" />
        <circle cx="49" cy="-100" r="12" fill="#F6C24B" stroke="#E0A92F" strokeWidth="2" />
        <path d="M49 -106 l-2.5 4 4 2z M49 -94 l2.5 -4 -4 -2z" fill="#FFF3C4" opacity="0.8" />
      </g>
    );
  }
  return Object.keys(slot).length ? slot : null;
}

function renderBadge(icon?: string): ReactNode {
  return (
    <g>
      <circle r="14" fill="#FFD97A" stroke="#E6B45C" strokeWidth="2.4" />
      <circle r="10" fill="#FFF1C9" />
      <text y="4.5" textAnchor="middle" fontSize="13">{icon ?? '⭐'}</text>
    </g>
  );
}

/* ---------- 发型（多个样式） ---------- */
function renderHair(
  style: 'sporty' | 'long' | 'bob' | 'ponytail',
  hairBack: ReactNode | null,
): { elements: ReactNode } {
  // 公共：头壳（完整盖住头顶到发际线）+ 渐变发色
  const cap = (
    <g>
      <path d="M36 90 q-4 -62 64 -62 q68 0 64 62 q-2 16 -10 28 q-2 -34 -20 -46 q-18 -14 -44 -14 q-26 0 -44 14 q-18 12 -20 46 q-8 -12 -10 -28z" fill="url(#af-hair-grad)" />
      <path d="M50 56 q22 -22 50 -22 q28 0 50 22 q-8 -8 -20 -12 q-28 -10 -62 0 q-12 4 -18 12z" fill="url(#af-hair-grad-light)" opacity="0.8" />
      <path d="M64 50 q36 -18 72 0 q-34 -12 -72 0z" fill="#FFF" opacity="0.22" />
    </g>
  );
  // 侧分刘海（完整覆盖额头，弧线连接头壳）
  const bangs = (
    <g fill="url(#af-hair-grad)">
      <path d="M40 84 q2 -24 24 -30 q26 -8 48 4 q14 8 18 22 q2 12 -6 16 q-2 -18 -18 -24 q-20 -8 -42 -2 q-6 -2 -10 2 q-6 8 -6 16 q-8 -2 -8 -4z" />
      <path d="M112 58 q22 -6 32 8 q8 12 4 26 q-6 -16 -20 -18 q-10 -2 -16 -16z" />
    </g>
  );
  const side = (
    <g>
      <path d="M38 90 q-14 10 -12 38 q4 8 12 4 q-4 -24 2 -42z" fill="url(#af-hair-grad)" />
      <path d="M162 90 q14 10 12 38 q-4 8 -12 4 q4 -24 -2 -42z" fill="url(#af-hair-grad)" />
    </g>
  );
  const gleam = <path d="M64 60 q22 -14 44 0" stroke="#FFF" strokeWidth="3" strokeLinecap="round" opacity="0.22" />;

  if (style === 'long') {
    // 长发：两侧长发扬到肩 + 后发蓬松（柔顺弧线）
    return {
      elements: (
        <g>
          {cap}
          <path d="M42 92 q-20 28 -12 72 q8 4 14 -2 q-6 -32 -2 -70z" fill="url(#af-hair-grad)" />
          <path d="M158 92 q20 28 12 72 q-8 4 -14 -2 q6 -32 2 -70z" fill="url(#af-hair-grad)" />
          <path d="M42 92 q-20 28 -12 72 q8 4 14 -2 l2 -20 q-4 -24 -4 -50z" fill="url(#af-hair-grad-light)" opacity="0.6" />
          <path d="M158 92 q20 28 12 72 q-8 4 -14 -2 l-2 -20 q4 -24 4 -50z" fill="#5A4230" opacity="0.5" />
          {hairBack}
          {bangs}
          {gleam}
        </g>
      ),
    };
  }
  if (style === 'bob') {
    // 波波头：齐肩圆润
    return {
      elements: (
        <g>
          {cap}
          <path d="M38 96 q-10 24 2 46 q12 8 22 2 q-10 -22 -8 -42z" fill="url(#af-hair-grad)" />
          <path d="M162 96 q10 24 -2 46 q-12 8 -22 2 q10 -22 8 -42z" fill="url(#af-hair-grad)" />
          <path d="M56 144 q44 14 88 0 q20 -6 18 -40 q-62 12 -124 0 q-2 34 18 40z" fill="url(#af-hair-grad)" opacity="0.3" />
          {bangs}
          {gleam}
        </g>
      ),
    };
  }
  if (style === 'ponytail') {
    // 马尾：后扎高马尾 + 柔顺发圈
    return {
      elements: (
        <g>
          {cap}
          <path d="M132 62 q26 -10 24 18 q-2 18 -16 26 q8 -28 -8 -44z" fill="url(#af-hair-grad)" />
          <path d="M138 108 q-18 12 -10 24 q8 8 20 -4 q8 -14 -10 -20z" fill="url(#af-hair-grad)" />
          <circle cx="136" cy="74" r="6" fill="#4A3526" />
          {hairBack}
          {side}
          {bangs}
          {gleam}
        </g>
      ),
    };
  }
  // sporty 默认
  return { elements: (<g>{cap}{bangs}{gleam}</g>) };
}

/* ---------- 姿势（身体真实摆姿） ---------- */
function limbs(
  pose: 'idle' | 'happy' | 'celebrate' | 'pose',
  c: { body: string; body2: string; belly: string; arm: string; leg: string; leg2: string },
): { legs: ReactNode; body: ReactNode; arms: ReactNode } {
  // 身体轮廓（所有姿势一致，仅手臂/腿变化）
  const body = (
    <g>
      <path d="M82 128 q-10 20 -6 44 q12 8 24 8 q12 0 24 -8 q4 -24 -6 -44 q-16 -8 -36 0z" fill={c.body} />
      <path d="M82 128 q-10 20 -6 44 q0 -22 10 -42 q-3 -2 -4 -2z" fill={c.body2} opacity="0.6" />
      <path d="M96 132 q-8 -2 -12 2 q-2 20 2 30 l14 4 q12 -4 14 -30 q-8 -6 -18 -6z" fill={c.belly} opacity="0.65" />
    </g>
  );

  if (pose === 'happy') {
    // 开心：双手上举欢呼
    return {
      legs: <g><path d="M84 172 q-3 16 0 26 q8 4 12 2 q4 -12 0 -26 z" fill={c.leg} /><path d="M116 172 q3 16 0 26 q-8 4 -12 2 q-4 -12 0 -26 z" fill={c.leg2} /><path d="M84 200 q-2 6 8 6 q8 0 6 -6 z" fill="#FFF" /><path d="M116 200 q2 6 -8 6 q-8 0 -6 -6 z" fill="#FFF" /></g>,
      body,
      arms: (
        <g>
          <path d="M82 138 q-14 -8 -12 -22 q4 -4 8 0 q4 8 8 16z" fill={c.arm} />
          <path d="M118 138 q14 -8 12 -22 q-4 -4 -8 0 q-4 8 -8 16z" fill={c.body2} />
          <circle cx="76" cy="116" r="6" fill={SKIN} />
          <circle cx="124" cy="116" r="6" fill={SKIN} />
        </g>
      ),
    };
  }
  if (pose === 'celebrate') {
    // 庆祝：双臂高举 + 一条腿抬起
    return {
      legs: <g><path d="M84 172 q-3 12 -4 24 q8 4 14 2 q4 -12 0 -26 z" fill={c.leg} /><path d="M118 168 q8 14 8 26 q-8 4 -14 0 q-2 -12 0 -26 z" fill={c.leg2} /><path d="M82 198 q-2 6 8 6 q8 0 6 -6 z" fill="#FFF" /><path d="M120 196 q2 6 -8 6 q-8 0 -6 -6 z" fill="#FFF" /></g>,
      body,
      arms: (
        <g>
          <path d="M82 138 q-18 -4 -20 -20 q6 -4 12 0 q6 6 8 14z" fill={c.arm} />
          <path d="M118 138 q18 -4 20 -20 q-6 -4 -12 0 q-6 6 -8 14z" fill={c.body2} />
          <circle cx="70" cy="114" r="6" fill={SKIN} />
          <circle cx="130" cy="114" r="6" fill={SKIN} />
        </g>
      ),
    };
  }
  if (pose === 'pose') {
    // 摆拍：单手叉腰
    return {
      legs: <g><path d="M84 172 q-3 16 0 26 q8 4 12 2 q4 -12 0 -26 z" fill={c.leg} /><path d="M116 172 q5 16 2 26 q-8 4 -14 2 q-4 -12 0 -26 z" fill={c.leg2} /><path d="M84 200 q-2 6 8 6 q8 0 6 -6 z" fill="#FFF" /><path d="M112 200 q2 6 8 6 q8 0 6 -6 z" fill="#FFF" /></g>,
      body,
      arms: (
        <g>
          <path d="M82 138 q-14 8 -10 24 q6 4 10 0 q2 -12 2 -22z" fill={c.arm} />
          <path d="M118 138 q8 6 6 20 q-12 6 -16 0 q2 -12 4 -20z" fill={c.body2} />
          <circle cx="76" cy="164" r="6" fill={SKIN} />
          <path d="M106 158 q0 8 6 8 q4 0 4 -6 z" fill={SKIN} />
        </g>
      ),
    };
  }
  // idle 默认
  return {
    legs: <g><path d="M84 172 q-3 16 0 26 q8 4 12 2 q4 -12 0 -26 z" fill={c.leg} /><path d="M116 172 q3 16 0 26 q-8 4 -12 2 q-4 -12 0 -26 z" fill={c.leg2} /><path d="M84 200 q-2 6 8 6 q8 0 6 -6 z" fill="#FFF" /><path d="M116 200 q2 6 -8 6 q-8 0 -6 -6 z" fill="#FFF" /></g>,
    body,
    arms: <g><path d="M82 136 q-12 6 -12 18 q0 6 6 6 q4 0 8 -10z" fill={c.arm} /><path d="M118 136 q12 6 12 18 q0 6 -6 6 q-4 0 -8 -10z" fill={c.body2} /><circle cx="78" cy="162" r="6" fill={SKIN} /><circle cx="122" cy="162" r="6" fill={SKIN} /></g>,
  };
}
