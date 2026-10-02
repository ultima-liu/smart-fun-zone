import { useId } from 'react';

/** Ten distinct silhouettes, sharing the Juan fleet's cockpit and star insignia. */
const HULLS = [
  'M160 64 Q192 90 190 146 L182 184 H138 L130 146 Q128 90 160 64Z',
  'M160 48 Q197 78 196 142 L184 192 H136 L124 142 Q123 78 160 48Z',
  'M160 40 L194 89 L202 156 L184 200 H136 L118 156 L126 89Z',
  'M160 35 Q204 73 202 128 L217 173 L189 199 H131 L103 173 L118 128 Q116 73 160 35Z',
  'M160 30 L199 84 L212 149 L194 206 H126 L108 149 L121 84Z',
  'M160 27 L207 81 L215 154 L199 207 H121 L105 154 L113 81Z',
  'M160 24 L200 63 L226 143 L203 211 H117 L94 143 L120 63Z',
  'M160 20 L184 63 L207 102 L214 172 L191 213 H129 L106 172 L113 102 L136 63Z',
  'M160 19 L208 64 L234 139 L211 209 L160 221 L109 209 L86 139 L112 64Z',
  'M160 14 L207 57 L227 101 L238 163 L210 215 L160 228 L110 215 L82 163 L93 101 L113 57Z',
];
const COLORS = [
  '#91b9cf',
  '#70d2de',
  '#70a9ff',
  '#a594fa',
  '#6ce2cf',
  '#b394fc',
  '#7aceff',
  '#67f0ef',
  '#cfb0ff',
  '#ffe29a',
];
const WINGS = [
  'M134 135 L112 172 L114 187 L138 176Z',
  'M126 115 L91 171 L100 196 L137 177Z',
  'M125 103 L75 165 L91 198 L136 177Z',
  'M123 94 L57 157 L77 196 L133 177Z',
  'M120 94 L39 162 L58 203 L133 179Z',
  'M113 84 L35 139 L43 207 L126 184Z',
  'M117 65 L24 149 L41 207 L124 185Z',
  'M132 73 L38 113 L19 187 L125 176Z',
  'M118 66 L28 108 L15 194 L111 184Z',
  'M115 56 L24 94 L8 174 L37 212 L111 184Z',
];

export default function DockShip({
  level,
  label,
  className = '',
}: {
  level: number;
  label?: string;
  className?: string;
}) {
  const id = useId().replace(/:/g, '');
  const rank = Math.min(10, Math.max(1, level));
  const accent = COLORS[rank - 1];
  return (
    <svg
      className={`sd-ship-art ${className}`}
      viewBox="0 0 320 280"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <linearGradient id={`${id}-hull`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#f4f9ff" />
          <stop offset=".42" stopColor={accent} />
          <stop offset="1" stopColor="#3a437b" />
        </linearGradient>
        <linearGradient id={`${id}-wing`} x2="0.8" y2="1">
          <stop stopColor={accent} />
          <stop offset="1" stopColor="#25335f" />
        </linearGradient>
        <linearGradient id={`${id}-glass`} x2=".7" y2="1">
          <stop stopColor="#dbffff" />
          <stop offset=".35" stopColor="#50dbef" />
          <stop offset="1" stopColor="#155485" />
        </linearGradient>
        <linearGradient id={`${id}-flame`} x2="0" y2="1">
          <stop stopColor="#ecffff" />
          <stop offset=".4" stopColor={accent} />
          <stop offset="1" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      {rank >= 7 && (
        <g fill="none" stroke={accent}>
          <ellipse
            cx="160"
            cy="141"
            rx={rank === 10 ? 146 : 128}
            ry="48"
            strokeWidth={rank >= 9 ? 5 : 3}
            opacity=".6"
          />
          <ellipse cx="160" cy="141" rx="118" ry="39" strokeDasharray="8 12" opacity=".5" />
        </g>
      )}
      <g className="sd-ship-flames" fill={`url(#${id}-flame)`}>
        <path d="M143 190 Q134 235 160 269 Q186 235 177 190Z" />
        {rank >= 4 && (
          <>
            <path d="M66 182 Q62 222 80 245 Q98 221 94 182Z" />
            <path d="M226 182 Q222 222 240 245 Q258 221 254 182Z" />
          </>
        )}
      </g>
      <g stroke="#26365d" strokeWidth="2" strokeLinejoin="round">
        <path d={WINGS[rank - 1]} fill={`url(#${id}-wing)`} />
        <path
          d={WINGS[rank - 1]}
          transform="translate(320 0) scale(-1 1)"
          fill={`url(#${id}-wing)`}
        />
        {rank >= 4 && (
          <g fill={`url(#${id}-hull)`}>
            <rect
              x="66"
              y={rank >= 8 ? 104 : 138}
              width="28"
              height={rank >= 8 ? 99 : 65}
              rx="13"
            />
            <rect
              x="226"
              y={rank >= 8 ? 104 : 138}
              width="28"
              height={rank >= 8 ? 99 : 65}
              rx="13"
            />
            <path d="M69 183H91M229 183H251" stroke={accent} strokeWidth="6" />
          </g>
        )}
        {rank >= 6 && (
          <g fill={accent}>
            <path d="M115 102 L94 56 L97 134Z" />
            <path d="M205 102 L226 56 L223 134Z" />
          </g>
        )}
        <path d={HULLS[rank - 1]} fill={`url(#${id}-hull)`} />
        <path d="M160 48V194" stroke="#fff" strokeOpacity=".3" />
        <path
          d={
            rank <= 2
              ? 'M144 99 Q160 85 176 99 L178 123 Q160 135 142 123Z'
              : 'M140 90 Q160 70 180 90 L188 121 Q160 140 132 121Z'
          }
          fill={`url(#${id}-glass)`}
          stroke="#e0faff"
          strokeWidth="3"
        />
        <path d="M146 100L155 93" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
        <path d="M143 184H177L182 203H138Z" fill="#27355a" />
        <path d="M146 194H174" stroke={accent} strokeWidth="5" />
        {rank >= 3 && (
          <g stroke={accent} strokeWidth="4">
            <path d="M120 156L99 169M200 156L221 169" />
            {rank >= 5 && <path d="M58 157L73 169M262 157L247 169" />}
          </g>
        )}
      </g>
      <path
        d="M160 143L164 152L174 153L166 160L168 170L160 165L152 170L154 160L146 153L156 152Z"
        fill={rank >= 5 ? '#ffe6a1' : '#f4fbff'}
      />
      {rank >= 8 && (
        <g fill={accent}>
          <circle cx="36" cy="141" r="5" />
          <circle cx="284" cy="141" r="5" />
          <path d="M136 179L129 196M184 179L191 196" stroke={accent} strokeWidth="3" />
        </g>
      )}
      {rank === 9 && (
        <g fill="#d8bfff">
          <path d="M47 73L53 48L59 73L53 82Z" />
          <path d="M261 73L267 48L273 73L267 82Z" />
        </g>
      )}
      {rank === 10 && (
        <g fill="#ffe29a" stroke="#9b7138" strokeWidth="1.5">
          <path d="M131 40L125 15L146 25L160 4L174 25L195 15L189 40Z" />
          <path d="M29 88L40 62L51 88L40 102Z" />
          <path d="M269 88L280 62L291 88L280 102Z" />
        </g>
      )}
    </svg>
  );
}
