import type { MathLifeSceneArtKind } from '../content/mathLifeScenes';

function PicnicMat({ compact = false }: { compact?: boolean }) {
  return <svg className={`mls-mat ${compact ? 'compact' : ''}`} viewBox="0 0 440 230" focusable="false" aria-hidden="true">
    <defs>
      <pattern id={`picnic-check-${compact ? 'small' : 'large'}`} width="48" height="48" patternUnits="userSpaceOnUse">
        <rect width="48" height="48" fill="#fff7dc" />
        <rect width="24" height="24" fill="#e95f58" />
        <rect x="24" y="24" width="24" height="24" fill="#e95f58" />
        <path d="M24 0v48M0 24h48" stroke="#efb0a0" strokeWidth="4" opacity=".72" />
      </pattern>
      <filter id={`picnic-shadow-${compact ? 'small' : 'large'}`} x="-20%" y="-30%" width="150%" height="180%">
        <feDropShadow dx="0" dy="12" stdDeviation="9" floodColor="#416a4b" floodOpacity=".28" />
      </filter>
    </defs>
    <ellipse cx="215" cy="194" rx="176" ry="19" fill="#568c5b" opacity=".22" />
    <path d="M58 48 350 31 389 174 35 194Z" fill={`url(#picnic-check-${compact ? 'small' : 'large'})`} stroke="#fff1cf" strokeWidth="7" strokeLinejoin="round" filter={`url(#picnic-shadow-${compact ? 'small' : 'large'})`} />
    <path d="M58 48 350 31M35 194 389 174" stroke="#b43e3a" strokeWidth="4" opacity=".52" />
    <path d="m41 192-8 20m24-21-5 21m318-36 7 19m-24-17 4 20" stroke="#f7e1b4" strokeWidth="5" strokeLinecap="round" />
    <path d="m350 31 39 143-38-19-25-119Z" fill="#f9e7bd" opacity=".48" />
  </svg>;
}

function Plate({ shape, color }: { shape: 'round' | 'triangle'; color: string }) {
  return <svg className="mls-plate" viewBox="0 0 80 64" aria-hidden="true">
    {shape === 'round'
      ? <><ellipse cx="40" cy="36" rx="31" ry="20" fill={color} /><ellipse cx="40" cy="32" rx="24" ry="14" fill="#fff8df" opacity=".72" /></>
      : <><path d="M40 6 72 55H8Z" fill={color} stroke="#fff1c7" strokeWidth="5" strokeLinejoin="round" /><path d="m40 19 18 29H22Z" fill="#fff8df" opacity=".72" /></>}
  </svg>;
}

function Animal({ emoji, active = false, badge }: { emoji: string; active?: boolean; badge?: string }) {
  return <div className={`mls-animal ${active ? 'active' : ''}`}><span>{emoji}</span>{badge && <b>{badge}</b>}</div>;
}

function Clock830() {
  return <div className="mls-clock"><i className="hour" /><i className="minute" /><b>8:30</b></div>;
}

function Solid({ kind, tilt = false }: { kind: 'ball' | 'cube' | 'cuboid' | 'cylinder'; tilt?: boolean }) {
  return <span className={`mls-solid ${kind} ${tilt ? 'tilt' : ''}`}><i /></span>;
}

function SmallCubes({ count, vertical = false }: { count: number; vertical?: boolean }) {
  return <div className={`mls-small-cubes ${vertical ? 'vertical' : ''}`}>{Array.from({ length: count }, (_, index) => <i key={index} />)}</div>;
}

export default function MathLifeSceneArt({ kind }: { kind: MathLifeSceneArtKind }) {
  switch (kind) {
    case 'picnic-cups':
      return <div className="mls-visual mls-cups"><PicnicMat compact /><div className="mls-cup-row">{Array.from({ length: 4 }, (_, index) => <span key={index}>🥤</span>)}</div></div>;
    case 'picnic-mat':
      return <div className="mls-visual"><PicnicMat /></div>;
    case 'picnic-mat-position':
      return <div className="mls-visual mls-mat-position"><PicnicMat compact /><span className="mls-basket">🧺</span></div>;
    case 'play-group':
      return <div className="mls-visual mls-people-group">{['🐰', '🐼', '🦊'].map((animal, index) => <Animal key={animal} emoji={animal} active={index === 0} />)}</div>;
    case 'plate-pattern':
      return <div className="mls-visual mls-pattern">{(['round', 'triangle', 'round', 'triangle'] as const).map((shape, index) => <Plate key={index} shape={shape} color={shape === 'round' ? '#f2c64f' : '#70a9d7'} />)}<div className="mls-empty-place">?</div></div>;
    case 'quantity-compare':
      return <div className="mls-visual mls-two-patches"><div>{Array.from({ length: 4 }, (_, index) => <span key={index}>🐟</span>)}</div><div>{Array.from({ length: 3 }, (_, index) => <span key={index}>🌼</span>)}</div></div>;
    case 'seat-left':
      return <div className="mls-visual mls-seat-scene"><Animal emoji="🐻" active /><Animal emoji="🐰" /></div>;
    case 'seat-order':
      return <div className="mls-visual mls-queue"><span className="mls-start-basket">🧺</span><Animal emoji="🐼" badge="1" /><Animal emoji="🐰" active badge="2" /><Animal emoji="🦊" badge="3" /></div>;
    case 'reference-direction':
      return <div className="mls-visual mls-seat-scene"><Animal emoji="🐰" active /><span className="mls-basket">🧺</span></div>;
    case 'juice-right':
      return <div className="mls-visual mls-seat-scene"><span className="mls-basket">🧺</span><span className="mls-juice">🧃</span></div>;
    case 'plates-total':
      return <div className="mls-visual mls-plate-set">{Array.from({ length: 3 }, (_, index) => <Plate key={index} shape="round" color="#f0c94f" />)}<Plate shape="round" color="#e76259" /></div>;
    case 'instruction-parts':
      return <div className="mls-visual mls-command-scene"><Animal emoji="🐰" /><div className="mls-command-target"><span className="mls-basket">🧺</span><i /><span className="mls-juice">🧃</span></div></div>;
    case 'departure-time':
      return <div className="mls-visual mls-departure"><Clock830 /><span>🚌</span></div>;
    case 'checklist':
      return <div className="mls-visual"><div className="mls-clipboard"><b>出发检查</b><p><i>✓</i><span>🥤</span></p><p><i>✓</i><span>🥪</span></p><p><i>✓</i><span className="mini-mat" /></p></div></div>;
    case 'cup-bag':
      return <div className="mls-visual"><div className="mls-cup-bag"><span>🥤</span><span>🥤</span><i /></div></div>;
    case 'queue-third':
      return <div className="mls-visual mls-queue animal-start"><Animal emoji="🐰" badge="1" /><Animal emoji="🐼" badge="2" /><Animal emoji="🦊" active badge="3" /></div>;
    case 'queue-five':
      return <div className="mls-visual mls-queue five">{['🐰', '🐼', '🦊', '🐻', '🐸'].map((animal, index) => <Animal key={animal} emoji={animal} badge={`${index + 1}`} />)}</div>;
    case 'queue-reverse':
      return <div className="mls-visual mls-reverse-queue"><div className="mls-start-mark left">从这里数</div><div className="mls-queue five">{['🐰', '🐼', '🦊', '🐻', '🐸'].map((animal) => <Animal key={animal} emoji={animal} />)}</div><div className="mls-start-mark right">从这里数</div></div>;
    case 'rolling-shapes':
      return <div className="mls-visual mls-workbench"><Solid kind="ball" /><Solid kind="cube" /><Solid kind="cuboid" /></div>;
    case 'dice-cube':
      return <div className="mls-visual mls-shape-pair"><span className="mls-die"><i /><i /><i /><i /><i /></span><Solid kind="cube" /></div>;
    case 'can-cylinder':
      return <div className="mls-visual mls-can-study"><span className="mls-can"><i /></span><Solid kind="cylinder" /></div>;
    case 'stable-base-options':
      return <div className="mls-visual mls-workbench"><Solid kind="cuboid" /><Solid kind="ball" /><Solid kind="cylinder" tilt /></div>;
    case 'cylinder-upright':
      return <div className="mls-visual mls-grounded-solid"><Solid kind="cylinder" /><i className="mls-contact-shadow" /></div>;
    case 'shelf-base':
      return <div className="mls-visual"><div className="mls-wobbly-shelf"><i /><i /><span /><span /><b /></div></div>;
    case 'cubes-pair':
      return <div className="mls-visual mls-compose-cubes"><SmallCubes count={2} /><div className="mls-result-cuboid"><Solid kind="cuboid" /></div></div>;
    case 'cube-2x2x2':
      return <div className="mls-visual mls-cube-stack">{Array.from({ length: 8 }, (_, index) => <i key={index} />)}</div>;
    case 'cube-rotation':
      return <div className="mls-visual mls-rotation"><SmallCubes count={2} /><span>↻</span><SmallCubes count={2} vertical /></div>;
    case 'base-shapes':
      return <div className="mls-visual mls-workbench"><Solid kind="cuboid" /><Solid kind="ball" /><Solid kind="cylinder" tilt /></div>;
    case 'cylinder-wheel':
      return <div className="mls-visual mls-rolling-cylinder"><i /><Solid kind="cylinder" tilt /><i /></div>;
    case 'connector-parts':
      return <div className="mls-visual mls-connectors"><span className="socket" /><i /><span className="peg" /></div>;
  }
}
