/** NPC 人形卡通立绘：按 NPC 换发型 / 服饰 / 配饰，圆润童趣 */

const LOOK: Record<string, {
  skin: string; hair: string; hairStyle: 'short' | 'bob' | 'curly';
  cloth: string; accent: string; accentKind: 'glasses' | 'band' | 'apron' | 'cap' | 'none' | 'bow';
}> = {
  阿光: { skin: '#ffdcc2', hair: '#c3cdd8', hairStyle: 'short', cloth: '#3b4a8c', accent: '#24325f', accentKind: 'glasses' },
  泡泡: { skin: '#ffdcc2', hair: '#ffb02e', hairStyle: 'curly', cloth: '#ff8fb0', accent: '#4fdcf5', accentKind: 'band' },
  铛铛: { skin: '#ffdcc2', hair: '#8a5a2e', hairStyle: 'bob', cloth: '#4f9d57', accent: '#fff3e0', accentKind: 'apron' },
  铁砣: { skin: '#ffdcc2', hair: '#5b6472', hairStyle: 'short', cloth: '#4b5563', accent: '#ffd75e', accentKind: 'cap' },
};

interface Props { npc: string; size?: number }

export default function NpcFigure({ npc, size = 96 }: Props) {
  const l = LOOK[npc] ?? LOOK.小卷 ?? {
    skin: '#ffdcc2', hair: '#6b5bd0', hairStyle: 'short', cloth: '#8b7bf0', accent: '#f6c24b', accentKind: 'none',
  };
  return (
    <svg viewBox="0 0 100 120" width={size} height={size * 1.28} className="npc-figure" aria-hidden="true">
      {/* 头发（后层） */}
      {l.hairStyle === 'short' && <path d="M24 42 C22 16, 78 16, 76 42 L76 34 C74 20, 26 20, 24 34 Z" fill={l.hair} />}
      {l.hairStyle === 'bob' && <path d="M20 48 C18 14, 82 14, 80 48 L80 66 C78 58, 70 52, 62 52 C56 52, 50 54, 50 54 C44 52, 38 52, 32 56 C26 60, 22 64, 20 72 Z" fill={l.hair} />}
      {l.hairStyle === 'curly' && (
        <g fill={l.hair}>
          <circle cx="34" cy="26" r="12" /><circle cx="50" cy="20" r="13" /><circle cx="66" cy="27" r="12" />
          <path d="M24 38 C22 22, 78 22, 76 38 L78 50 C74 40, 60 34, 50 34 C40 34, 28 40, 24 50 Z" />
        </g>
      )}
      {/* 身体 */}
      <path d="M24 116 C22 92, 32 78, 50 78 C68 78, 78 92, 76 116 Z" fill={l.cloth} />
      {/* 领口 */}
      <path d="M43 78 L50 86 L57 78 Z" fill="#ffffff" opacity="0.85" />
      {/* 手臂 */}
      <path d="M24 96 C18 100, 18 104, 22 106 C26 108, 28 104, 30 100 Z" fill={l.skin} />
      <path d="M76 96 C82 100, 82 104, 78 106 C74 108, 72 104, 70 100 Z" fill={l.skin} />
      {/* 头 */}
      <circle cx="50" cy="44" r="26" fill={l.skin} />
      {/* 眼睛 */}
      <circle cx="42" cy="44" r="3.4" fill="#2f2a3e" />
      <circle cx="58" cy="44" r="3.4" fill="#2f2a3e" />
      {/* 腮红 */}
      <ellipse cx="34" cy="52" rx="4" ry="2.6" fill="#ff9d9d" opacity="0.5" />
      <ellipse cx="66" cy="52" rx="4" ry="2.6" fill="#ff9d9d" opacity="0.5" />
      {/* 嘴 */}
      <path d="M44 54 Q50 60 56 54" fill="none" stroke="#c65f5f" strokeWidth="2.4" strokeLinecap="round" />
      {/* 配饰 */}
      {l.accentKind === 'glasses' && (
        <g fill="none" stroke="#2f2a3e" strokeWidth="2">
          <circle cx="42" cy="44" r="6.5" /><circle cx="58" cy="44" r="6.5" />
          <line x1="48.5" y1="44" x2="51.5" y2="44" />
        </g>
      )}
      {l.accentKind === 'band' && (
        <path d="M26 34 Q50 22 74 34" fill="none" stroke={l.accent} strokeWidth="5" strokeLinecap="round" />
      )}
      {l.accentKind === 'apron' && (
        <path d="M36 90 L64 90 L68 112 L32 112 Z" fill={l.accent} />
      )}
      {l.accentKind === 'cap' && (
        <g>
          <path d="M24 38 C26 22, 74 22, 76 38 L76 34 C70 16, 30 16, 24 34 Z" fill={l.hair} />
          <path d="M24 38 C20 36, 20 30, 26 30 L36 32 Z" fill={l.hair} />
          <path d="M28 32 L72 32" stroke={l.accent} strokeWidth="4" strokeLinecap="round" opacity="0.8" />
        </g>
      )}
      {l.accentKind === 'bow' && (
        <path d="M50 32 L42 26 L42 38 Z M50 32 L58 26 L58 38 Z" fill={l.accent} />
      )}
    </svg>
  );
}
