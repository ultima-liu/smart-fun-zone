import { useId } from 'react';
import { CIRCUS_LION_ATLAS } from './circusLionSprites';
/** A modern storybook circus illustration, shared by the game entrance. */
export default function CircusCover() {
  const id = useId();
  return (
    <svg className="cc-cover-art" viewBox="0 0 400 260" fill="none" aria-hidden="true">
      <defs>
        <linearGradient
          id={`${id}-sky`}
          x1="200"
          y1="0"
          x2="200"
          y2="260"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#413957" />
          <stop offset="1" stopColor="#bb728b" />
        </linearGradient>
        <linearGradient
          id={`${id}-curtain`}
          x1="0"
          y1="0"
          x2="80"
          y2="230"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#a64d73" />
          <stop offset="1" stopColor="#653b64" />
        </linearGradient>
        <radialGradient id={`${id}-light`} cx=".5" cy=".3" r=".75">
          <stop stopColor="#fff0bc" stopOpacity=".35" />
          <stop offset="1" stopColor="#fff0bc" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path fill={`url(#${id}-sky)`} d="M0 0h400v260H0z" />
      <path d="M190 6 77 250h249Z" fill={`url(#${id}-light)`} />
      <ellipse cx="206" cy="258" rx="208" ry="53" fill="#dcb393" />
      <ellipse cx="207" cy="246" rx="177" ry="26" fill="#edc6a0" />
      <path
        d="M0 0h76c3 71-7 145-42 186L0 223V0Zm400 0h-76c-3 71 7 145 42 186l34 37V0Z"
        fill={`url(#${id}-curtain)`}
      />
      <path
        d="M17 0c18 108 8 158-12 193M40 0c19 81 13 130-1 164m344-164c-18 108-8 158 12 193M360 0c-19 81-13 130 1 164"
        stroke="#d3939a"
        strokeWidth="2"
        opacity=".4"
      />
      <path
        d="M0 0h400v27c-30 28-68 27-99 2-32 36-68 34-101 3-34 31-70 33-101-3C65 54 32 54 0 27V0Z"
        fill="#9d4f72"
      />
      <path d="M12 24c70 36 123 16 188 18 65-2 118 18 188-18" stroke="#f0c495" strokeWidth="1.5" />
      {[32, 75, 117, 159, 201, 243, 285, 327, 369].map((x, i) => (
        <circle
          key={x}
          cx={x}
          cy={38 + (i < 4 ? i : i > 4 ? 8 - i : 4) * 1.7}
          r="3"
          fill="#ffe4b5"
        />
      ))}
      <g fill="#edd1a5" opacity=".8">
        <path d="m121 89 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Zm104-23 2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Zm110 43 2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" />
        <circle cx="161" cy="77" r="1.5" />
        <circle cx="276" cy="119" r="1.5" />
        <circle cx="95" cy="145" r="1.5" />
        <circle cx="252" cy="88" r="1.5" />
      </g>
      <path d="M307 40v42" stroke="#c6b8a8" strokeWidth="3" strokeDasharray="5 3" />
      <rect x="302" y="35" width="10" height="5" rx="2" fill="#e3ccb0" />
      {Array.from({ length: 28 }, (_, i) => {
        const a = (i * Math.PI * 2) / 28,
          x = 307 + Math.cos(a) * 35,
          y = 157 + Math.sin(a) * 69;
        return (
          <g key={i} transform={`translate(${x} ${y}) rotate(${(a * 180) / Math.PI + 90})`}>
            <path d="M-4 2Q-10-5-1-18q-1 9 6 13Q10 4-4 2Z" fill="#ff893f" />
            <path d="M-2 2q-3-4 2-11Q0-4 3-1L2 2Z" fill="#ffe8a0" />
          </g>
        );
      })}
      <ellipse cx="307" cy="157" rx="35" ry="69" stroke="#883f35" strokeWidth="7" />
      <ellipse cx="307" cy="157" rx="35" ry="69" stroke="#ff973f" strokeWidth="5" />
      <ellipse cx="307" cy="157" rx="35" ry="69" stroke="#ffe4a6" strokeWidth="2" />
      <ellipse cx="199" cy="243" rx="58" ry="9" fill="#a26c6940" />
      <svg x="124" y="146" width="128" height="95" viewBox="29 101 582 432" overflow="hidden">
        <image href={CIRCUS_LION_ATLAS} width="1254" height="1254" />
      </svg>
      <g strokeLinecap="round" strokeLinejoin="round">
        <path d="m181 162-7 14-10 2m24-16 8 13 12 3" stroke="#fff0da" strokeWidth="9" />
        <path d="M158 182h17m24 0h17" stroke="#78608b" strokeWidth="8" />
        <path d="m180 141-23-9-14-18m43 28 23-11 10-18" stroke="#ffc49d" strokeWidth="7" />
        <path d="m177 141-10-7m22 7 9-6" stroke="#df7ba1" strokeWidth="10" />
        <path
          d="M174 137h19l4 28-13-5-14 5 4-28Z"
          fill="#e980a8"
          stroke="#a25781"
          strokeWidth="1.5"
        />
        <path d="m174 137 10 9 9-9" fill="#fff0da" />
        <circle cx="184" cy="152" r="2" fill="#ffe09c" />
        <circle cx="184" cy="159" r="2" fill="#ffe09c" />
        <ellipse
          cx="183"
          cy="123"
          rx="15"
          ry="17"
          fill="#ffcbad"
          stroke="#bf8584"
          strokeWidth="1.5"
        />
        <ellipse cx="171" cy="127" rx="3" ry="2" fill="#f39b9e" />
        <ellipse cx="195" cy="127" rx="3" ry="2" fill="#f39b9e" />
        <path d="M177 121v3m12-3v3" stroke="#514260" strokeWidth="2.5" />
        <circle cx="183" cy="126" r="3" fill="#d96182" />
        <path d="M179 132q4 4 8 0" stroke="#a66e70" strokeWidth="1.5" />
        <path d="M172 109h23v-17h-23z" fill="#586182" />
        <path d="M165 109h36" stroke="#f4cf9a" strokeWidth="4" />
        <path d="M173 100h20" stroke="#f6a5b8" strokeWidth="2.5" />
        <path d="m190 94 1-8 5 6-6 2Z" fill="#f6bd83" />
      </g>
    </svg>
  );
}
