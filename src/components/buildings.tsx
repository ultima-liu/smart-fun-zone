import { useId } from 'react';

/* =====================================================================
   卷星建筑大贴图（精美 SVG 插画）
   - SchoolBuilding 学校（球面建筑）
   - HqBuilding 总部（球面建筑）
   - SupplyStation 补给站（悬浮建筑）
   - SkyPark 空中乐园（悬浮建筑）
   ===================================================================== */

function G({ id, from, to }: { id: string; from: string; to: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={from} />
      <stop offset="1" stopColor={to} />
    </linearGradient>
  );
}

/** 学校：钟楼教学楼 + 飘旗 + 花坛，暖色温馨 */
export function SchoolBuilding({ size = 96 }: { size?: number }) {
  const u = useId();
  return (
    <svg viewBox="0 0 130 118" width={size} height={(size * 118) / 130} aria-hidden="true">
      <defs>
        <G id={`${u}-wall`} from="#FFF3E0" to="#F4D9B8" />
        <G id={`${u}-roof`} from="#F6A66B" to="#E06B4E" />
        <G id={`${u}-dome`} from="#F6C24B" to="#E09A2F" />
      </defs>
      {/* 花坛/地面 */}
      <ellipse cx="65" cy="110" rx="58" ry="9" fill="#4A3AB0" opacity="0.5" />
      <ellipse cx="65" cy="107" rx="54" ry="8" fill="#6C5CE7" opacity="0.6" />
      {/* 两侧树丛 */}
      <circle cx="16" cy="100" r="12" fill="#7FD0B4" />
      <circle cx="28" cy="103" r="9" fill="#5FB897" />
      <circle cx="114" cy="100" r="12" fill="#7FD0B4" />
      <circle cx="102" cy="103" r="9" fill="#5FB897" />
      {/* 楼体 */}
      <rect x="34" y="52" width="62" height="56" rx="5" fill={`url(#${u}-wall)`} />
      <path d="M30 52 h70 l-8 -14 h-54 z" fill={`url(#${u}-roof)`} />
      <rect x="24" y="52" width="82" height="5" rx="2" fill="#E06B4E" />
      {/* 钟楼 */}
      <rect x="52" y="18" width="26" height="36" fill={`url(#${u}-wall)`} />
      <path d="M48 20 q2 -8 17 -8 q15 0 17 8 z" fill={`url(#${u}-dome)`} />
      <circle cx="65" cy="26" r="7" fill="#fff" stroke="#E09A2F" strokeWidth="2" />
      <path d="M65 21.5 V20 M65 32 V30.5 M60.5 26 h-1.5 M70 26 h1.5" stroke="#E09A2F" strokeWidth="1.6" strokeLinecap="round" />
      {/* 飘旗 */}
      <path d="M65 18 V6" stroke="#8A6B4A" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M65 6 l16 4 -16 4 z" fill="#F2738C" />
      {/* 窗户 */}
      {[40, 58, 76, 94].map((x) => (
        <rect key={x} x={x} y="64" width="10" height="12" rx="2.4" fill="#5FB8D8" stroke="#fff" strokeWidth="1.4" />
      ))}
      {[49, 67].map((x) => (
        <rect key={x} x={x} y="86" width="10" height="12" rx="2.4" fill="#5FB8D8" stroke="#fff" strokeWidth="1.4" />
      ))}
      {/* 门 */}
      <path d="M58 94.5 Q58 88 64.5 88 Q72 88 72 94.5 V106 Q72 108 70 108 H60 Q58 108 58 106 Z" fill="#8A5A3B" />
      <circle cx="69" cy="99" r="1.6" fill="#F6C24B" />
      {/* 高光 */}
      <path d="M40 58 q-4 22 0 40 l6 0 q-4 -20 0 -40 z" fill="#fff" opacity="0.25" />
    </svg>
  );
}

/** 总部：紫金塔楼 + 天线信号 + 光带窗户 */
export function HqBuilding({ size = 96 }: { size?: number }) {
  const u = useId();
  return (
    <svg viewBox="0 0 130 118" width={size} height={(size * 118) / 130} aria-hidden="true">
      <defs>
        <G id={`${u}-tower`} from="#9D8CFF" to="#6C5CE7" />
        <G id={`${u}-dark`} from="#5B48C8" to="#43349E" />
      </defs>
      {/* 底座 */}
      <ellipse cx="65" cy="111" rx="56" ry="8" fill="#43349E" opacity="0.55" />
      <ellipse cx="65" cy="108" rx="50" ry="7" fill="#5B48C8" />
      {/* 两翼 */}
      <rect x="20" y="72" width="26" height="40" rx="4" fill={`url(#${u}-dark)`} />
      <rect x="84" y="72" width="26" height="40" rx="4" fill={`url(#${u}-dark)`} />
      {[26, 92].map((x) => (
        <rect key={x} x={x + 6} y={80} width="8" height="10" rx="2" fill="#F6C24B" opacity="0.9" />
      ))}
      {/* 主塔 */}
      <rect x="48" y="30" width="34" height="80" rx="7" fill={`url(#${u}-tower)`} />
      <rect x="48" y="30" width="34" height="80" rx="7" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
      {/* 穹顶 */}
      <path d="M48 34 q17 -16 34 0 z" fill="#F6C24B" />
      <circle cx="65" cy="26" r="5" fill="#fff" />
      {/* 天线 + 信号波 */}
      <path d="M65 20 V8" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="65" cy="7" r="3.4" fill="#F2738C" stroke="#fff" strokeWidth="1.6" />
      <path d="M58 4 q-8 3 -8 10 M72 4 q8 3 8 10" stroke="#C4B5FD" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.8" />
      {/* 光带窗户（金色横条） */}
      <rect x="54" y="48" width="22" height="6" rx="3" fill="#F6C24B" opacity="0.95" />
      <rect x="54" y="60" width="22" height="6" rx="3" fill="#F6C24B" opacity="0.95" />
      <rect x="54" y="72" width="22" height="6" rx="3" fill="#F6C24B" opacity="0.95" />
      <rect x="54" y="84" width="22" height="6" rx="3" fill="#F6C24B" opacity="0.95" />
      {/* 门 + 徽章 */}
      <path d="M58 100.5 Q58 94 64.5 94 Q72 94 72 100.5 V108 Q72 110 70 110 H60 Q58 110 58 108 Z" fill="#43349E" stroke="#F6C24B" strokeWidth="1.6" />
      <path d="M65 52 l2.2 4.4 4.9 .7 -3.5 3.4 .8 4.8 -4.4 -2.3 -4.4 2.3 .8 -4.8 -3.5 -3.4 4.9 -.7z" fill="#fff" />
    </svg>
  );
}

/** 星核档案库：紫金档案塔 + 书本藏书 + 穹顶星光 */
export function LibraryBuilding({ size = 96 }: { size?: number }) {
  const u = useId();
  return (
    <svg viewBox="0 0 130 118" width={size} height={(size * 118) / 130} aria-hidden="true">
      <defs>
        <G id={`${u}-arch`} from="#B9A6FF" to="#7C6AF0" />
        <G id={`${u}-dark`} from="#5B48C8" to="#43349E" />
      </defs>
      {/* 底座 */}
      <ellipse cx="65" cy="111" rx="56" ry="8" fill="#43349E" opacity="0.55" />
      <ellipse cx="65" cy="108" rx="50" ry="7" fill="#5B48C8" />
      {/* 书柜主体 */}
      <rect x="30" y="40" width="70" height="70" rx="6" fill={`url(#${u}-dark)`} stroke="rgba(255,255,255,0.28)" strokeWidth="2" />
      {/* 藏书格（两排彩色书脊） */}
      {[52, 70, 88].map((y) => (
        <g key={y}>
          {[40, 52, 64, 76, 88].map((x, i) => (
            <rect key={x} x={x} y={y} width="9" height="12" rx="2" fill={['#F6C24B', '#F2738C', '#7FD0C9', '#9EADFF', '#FFD9A0'][i]} opacity="0.92" />
          ))}
        </g>
      ))}
      {/* 拱顶 + 星光 */}
      <path d="M30 40 q35 -26 70 0 z" fill={`url(#${u}-arch)`} stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
      <circle cx="65" cy="22" r="5" fill="#fff" />
      <path d="M56 14 l3 6 -3 6 M74 14 l3 6 -3 6" stroke="#C4B5FD" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.8" />
      {/* 中央门 + 星徽 */}
      <path d="M57 96 Q57 88 65 88 Q73 88 73 96 V108 Q73 110 71 110 H59 Q57 110 57 108 Z" fill="#43349E" stroke="#F6C24B" strokeWidth="1.6" />
      <path d="M65 46 l2.2 4.4 4.9 .7 -3.5 3.4 .8 4.8 -4.4 -2.3 -4.4 2.3 .8 -4.8 -3.5 -3.4 4.9 -.7z" fill="#fff" />
    </svg>
  );
}

/** 补给站：悬浮小岛 + 遮阳棚货摊 + 卷卷豆木箱 + 喷气悬浮 */
export function SupplyStation({ size = 112 }: { size?: number }) {
  const u = useId();
  return (
    <svg viewBox="0 0 150 130" width={size} height={(size * 130) / 150} aria-hidden="true">
      <defs>
        <G id={`${u}-island`} from="#7C6AF0" to="#43349E" />
        <G id={`${u}-grass`} from="#7FD0B4" to="#3FA98C" />
      </defs>
      {/* 悬浮喷气 + 光晕 */}
      <ellipse cx="75" cy="120" rx="34" ry="8" fill="#8B7BF0" opacity="0.35" />
      <g>
        <path d="M52 116 l-7 10 h14 z" fill="#F6C24B" opacity="0.9" />
        <path d="M75 116 l-6 12 h12 z" fill="#F6C24B" opacity="0.9" />
        <path d="M98 116 l-7 10 h14 z" fill="#F6C24B" opacity="0.9" />
      </g>
      {/* 悬浮岛（上绿下紫） */}
      <path d="M24 108 q-6 -20 12 -32 q22 -8 40 -4 q24 4 34 -2 q12 8 8 26 q-2 8 -10 12 q-38 14 -84 0 z" fill={`url(#${u}-island)`} />
      <path d="M26 104 q-4 -18 10 -28 q16 -7 32 -5 q20 4 30 -2 q10 6 8 22 q-2 8 -9 11 q-34 12 -71 2 z" fill={`url(#${u}-grass)`} />
      {/* 货摊遮阳棚（条纹） */}
      <rect x="34" y="44" width="80" height="8" rx="3" fill="#F2738C" />
      <path d="M34 52 h80 v7 q-8 6 -16 0 q-8 6 -16 0 q-8 6 -16 0 q-8 6 -16 0 q-8 6 -16 0 z" fill="#F6C24B" />
      <rect x="42" y="46" width="8" height="26" fill="#fff" opacity="0.55" />
      <rect x="58" y="46" width="8" height="26" fill="#fff" opacity="0.55" />
      <rect x="74" y="46" width="8" height="26" fill="#fff" opacity="0.55" />
      <rect x="90" y="46" width="8" height="26" fill="#fff" opacity="0.55" />
      {/* 柜台 */}
      <rect x="38" y="74" width="72" height="18" rx="4" fill="#8A5A3B" />
      <rect x="38" y="74" width="72" height="6" rx="3" fill="#B58150" />
      {/* 卷卷豆木箱 */}
      <rect x="46" y="64" width="16" height="12" rx="2" fill="#C9865A" stroke="#8A5A3B" strokeWidth="1.6" />
      <circle cx="51" cy="70" r="3.4" fill="#F6C24B" />
      <circle cx="57" cy="70" r="3.4" fill="#F2A65A" />
      <rect x="86" y="64" width="16" height="12" rx="2" fill="#C9865A" stroke="#8A5A3B" strokeWidth="1.6" />
      <circle cx="91" cy="70" r="3.4" fill="#F2A65A" />
      <circle cx="97" cy="70" r="3.4" fill="#F6C24B" />
      {/* 招牌 */}
      <path d="M60 32 V20 M88 32 V20" stroke="#8A6B4A" strokeWidth="2.4" strokeLinecap="round" />
      <rect x="50" y="20" width="48" height="14" rx="7" fill="#43349E" stroke="#C4B5FD" strokeWidth="1.8" />
      <path d="M74 23 l2 4 4.4 .6 -3.2 3 .8 4.4 -4 -2 -4 2 .8 -4.4 -3.2 -3 4.4 -.6z" fill="#F6C24B" />
    </svg>
  );
}

/** 空中乐园：摩天轮 + 彩色吊舱 + 云朵基座 + 气球 */
export function SkyPark({ size = 128 }: { size?: number }) {
  const u = useId();
  const cabins = ['#F2738C', '#F6C24B', '#7FD0B4', '#8FC5E8', '#C4B5FD', '#F2A65A', '#A78BFA', '#5FB8D8'];
  return (
    <svg viewBox="0 0 170 150" width={size} height={(size * 150) / 170} aria-hidden="true">
      <defs>
        <G id={`${u}-wheel`} from="#9D8CFF" to="#6C5CE7" />
        <G id={`${u}-cloud`} from="#FFFFFF" to="#D6D2F2" />
      </defs>
      {/* 气球 */}
      <circle cx="28" cy="24" r="9" fill="#F2738C" opacity="0.9" />
      <path d="M28 33 q2 6 0 10" stroke="#C4B5FD" strokeWidth="1.4" fill="none" />
      <circle cx="142" cy="18" r="8" fill="#F6C24B" opacity="0.9" />
      <path d="M142 26 q-2 6 0 10" stroke="#C4B5FD" strokeWidth="1.4" fill="none" />
      {/* 云朵基座 */}
      <ellipse cx="85" cy="126" rx="60" ry="16" fill={`url(#${u}-cloud)`} opacity="0.95" />
      <ellipse cx="60" cy="132" rx="30" ry="12" fill="#fff" />
      <ellipse cx="110" cy="132" rx="28" ry="11" fill="#fff" />
      {/* 支撑架 */}
      <path d="M85 72 L62 120 M85 72 L108 120 M85 72 L85 120" stroke="#8B7BF0" strokeWidth="6" strokeLinecap="round" />
      {/* 摩天轮 */}
      <circle cx="85" cy="72" r="40" fill="none" stroke={`url(#${u}-wheel)`} strokeWidth="7" />
      <circle cx="85" cy="72" r="40" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.6" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
        const rad = (a * Math.PI) / 180;
        return (
          <line
            key={a}
            x1="85" y1="72"
            x2={85 + Math.cos(rad) * 40} y2={72 + Math.sin(rad) * 40}
            stroke="#8B7BF0" strokeWidth="3" strokeLinecap="round"
          />
        );
      })}
      {/* 吊舱 */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a, i) => {
        const rad = (a * Math.PI) / 180;
        const cx = 85 + Math.cos(rad) * 40;
        const cy = 72 + Math.sin(rad) * 40;
        return (
          <g key={a}>
            <line x1={cx} y1={cy} x2={cx} y2={cy + 8} stroke="#8B7BF0" strokeWidth="2" />
            <rect x={cx - 7} y={cy + 7} width="14" height="12" rx="4" fill={cabins[i]} stroke="#fff" strokeWidth="1.4" />
          </g>
        );
      })}
      {/* 中心轴 + 顶部旗 */}
      <circle cx="85" cy="72" r="6" fill="#F6C24B" stroke="#fff" strokeWidth="2" />
      <path d="M85 32 V20" stroke="#8A6B4A" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M85 20 l13 3.5 -13 3.5 z" fill="#F2738C" />
    </svg>
  );
}

/** 船坞：横向机库棚 + 横停的飞船 + 支撑架 + 坞台（紫金科技风） */
export function ShipyardBuilding({ size = 96 }: { size?: number }) {
  const u = useId();
  return (
    <svg viewBox="0 0 132 96" width={size} height={(size * 96) / 132} aria-hidden="true">
      <defs>
        <G id={`${u}-roof`} from="#4A3AB0" to="#241E52" />
        <G id={`${u}-beam`} from="#8B7BF0" to="#6C5CE7" />
        <G id={`${u}-hull`} from="#DCD3FF" to="#9D8CFF" />
        <G id={`${u}-pad`} from="#2A2355" to="#191540" />
      </defs>
      {/* 地面坞台 */}
      <ellipse cx="66" cy="88" rx="62" ry="8" fill="#4A3AB0" opacity="0.5" />
      <rect x="16" y="76" width="100" height="10" rx="4" fill={`url(#${u}-pad)`} />
      <circle cx="28" cy="81" r="2.6" fill="#F6C24B" opacity="0.8" />
      <circle cx="66" cy="81" r="2.6" fill="#8FC5E8" opacity="0.8" />
      <circle cx="104" cy="81" r="2.6" fill="#F6C24B" opacity="0.8" />
      {/* 机库棚（横顶） */}
      <path d="M10 58 L36 38 L96 38 L108 52 L108 60 L10 60 Z" fill={`url(#${u}-roof)`} stroke="#8B7BF0" strokeWidth="2" />
      <rect x="8" y="58" width="102" height="5" rx="2" fill="#6C5CE7" />
      {/* 支撑柱 */}
      <rect x="18" y="63" width="6" height="16" fill="#8B7BF0" />
      <rect x="108" y="63" width="6" height="16" fill="#8B7BF0" />
      {/* 顶部警示灯 */}
      <circle cx="40" cy="40" r="4" fill="#F6C24B" stroke="#fff" strokeWidth="1.4" />
      <path d="M40 36 V30" stroke="#8A6B4A" strokeWidth="2" strokeLinecap="round" />
      {/* 门楣航道灯 */}
      <circle cx="24" cy="50" r="2.4" fill="#F2738C" />
      <circle cx="92" cy="50" r="2.4" fill="#F2738C" />
      {/* 飞船：横向停放，船头朝右 */}
      <g transform="translate(22 44)">
        {/* 主船身 */}
        <path d="M8 22 L46 16 L78 20 L90 30 L78 40 L46 44 L8 38 Z" fill={`url(#${u}-hull)`} stroke="#7C6AF0" strokeWidth="1.8" strokeLinejoin="round" />
        {/* 船头装饰 */}
        <path d="M90 30 L102 30 L100 27.5 L92 25.5 Z" fill="#7C6AF0" />
        {/* 舷窗 */}
        <circle cx="26" cy="30" r="3" fill="#9ED6F7" stroke="#6B62D6" strokeWidth="1.2" />
        <circle cx="44" cy="30" r="3" fill="#9ED6F7" stroke="#6B62D6" strokeWidth="1.2" />
        <circle cx="62" cy="30" r="3" fill="#9ED6F7" stroke="#6B62D6" strokeWidth="1.2" />
        {/* 尾部鳍 */}
        <path d="M8 22 L2 14 L16 20 Z" fill="#7C6AF0" />
        <path d="M8 38 L2 46 L16 40 Z" fill="#7C6AF0" />
        {/* 尾焰（待发） */}
        <path d="M2 30 q-8 0 -12 0" stroke={`url(#${u}-hull)`} strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.6" />
      </g>
    </svg>
  );
}
