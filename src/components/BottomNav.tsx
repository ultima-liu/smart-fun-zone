import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { NavLink } from 'react-router-dom';
import { useI18n } from '../i18n';
import { sfx } from '../sfx';

const TABS = [
  { to: '/', key: 'home', end: true },
  { to: '/map', key: 'map', end: false },
  { to: '/lobby', key: 'games', end: false },
  { to: '/profile', key: 'my', end: false },
] as const;

type TabKey = (typeof TABS)[number]['key'];

function DestinationMark({ kind }: { kind: TabKey }) {
  if (kind === 'home') {
    return <g className="train-destination-mark"><circle cx="139" cy="28" r="8" /><path d="m139 21 2 4 4 .6-3 3 .7 4.2-3.7-2-3.7 2 .7-4.2-3-3 4-.6z" /></g>;
  }
  if (kind === 'map') {
    return <g className="train-destination-mark"><path d="M130 22c4-2 7-1 9 1v12c-2-2-5-3-9-1Zm18 0c-4-2-7-1-9 1v12c2-2 5-3 9-1Z" /><path d="M139 23v12" /></g>;
  }
  if (kind === 'games') {
    return <g className="train-destination-mark"><circle cx="139" cy="28" r="8" /><circle cx="139" cy="28" r="2" /><path d="M139 20v16m-8-8h16m-14-6 12 12m0-12-12 12" /></g>;
  }
  return <g className="train-destination-mark"><path d="m139 19 9 4v6c0 6-4 9-9 11-5-2-9-5-9-11v-6Z" /><circle cx="139" cy="27" r="3" /><path d="M134 35c1-4 9-4 10 0" /></g>;
}

/** 分层矢量车体：车身、轮组和灯光可分别运动，不把站名烘焙进图片。 */
function TrainCarArt({ kind }: { kind: TabKey }) {
  const locomotive = kind === 'home';
  const gradientId = `train-body-${kind}`;
  const glassId = `train-glass-${kind}`;

  return (
    <svg className="train-art" viewBox="0 0 170 78" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0.86" y2="1">
          <stop offset="0" className="train-body-stop train-body-stop-top" />
          <stop offset="0.52" className="train-body-stop train-body-stop-middle" />
          <stop offset="1" className="train-body-stop train-body-stop-bottom" />
        </linearGradient>
        <linearGradient id={glassId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="train-glass-stop train-glass-stop-top" />
          <stop offset="1" className="train-glass-stop train-glass-stop-bottom" />
        </linearGradient>
      </defs>

      <ellipse className="train-ground-shadow" cx="88" cy="68" rx="72" ry="5" />
      {locomotive && <path className="train-cowcatcher" d="m5 56 16 2-11 9H1Z" />}
      {locomotive && <path className="train-headlight-beam" d="M4 34-38 23v32L4 43Z" />}

      <g className="train-body-layer">
        {locomotive ? (
          <path className="train-body" fill={`url(#${gradientId})`} d="M5 51V38c0-7 5-11 13-13l6-10c2-4 6-6 11-6h118c8 0 13 5 13 13v32c0 7-5 11-13 11H19C10 65 5 61 5 51Z" />
        ) : (
          <path className="train-body" fill={`url(#${gradientId})`} d="M6 54V23c0-8 6-13 14-13h133c8 0 13 5 13 13v31c0 7-5 11-13 11H19C11 65 6 61 6 54Z" />
        )}
        <path className="train-roof" d="M20 11c4-6 10-8 19-8h105c9 0 15 3 19 8Z" />
        <path className="train-highlight" d="M23 16h126c6 0 9 3 9 8" />
        <path className="train-belt" d="M7 49h158v9H7z" />

        {locomotive && (
          <g className="train-engine-details">
            <path className="train-stack" d="M26 10V2h15v8m-19-8h23" />
            <path className="train-nose" d="M5 34H1v21h8" />
            <circle className="train-headlight-glow" cx="3" cy="39" r="8" />
            <circle className="train-headlight" cx="3" cy="39" r="3.5" />
            <g className="train-steam">
              <circle className="steam-a" cx="34" cy="-2" r="3.5" />
              <circle className="steam-b" cx="28" cy="-7" r="5" />
              <circle className="steam-c" cx="20" cy="-11" r="6.5" />
            </g>
          </g>
        )}

        <g className="train-windows">
          <rect fill={`url(#${glassId})`} x={locomotive ? 31 : 20} y="20" width="21" height="20" rx="5" />
          <rect fill={`url(#${glassId})`} x={locomotive ? 57 : 46} y="20" width="21" height="20" rx="5" />
          <path className="train-window-shine" d={locomotive ? 'M35 23h11M61 23h11' : 'M24 23h11M50 23h11'} />
        </g>
        <path className="train-door" d="M84 18h19c4 0 6 3 6 7v33H78V25c0-4 2-7 6-7Z" />
        <path className="train-door-seam" d="M93.5 20v36" />
        <circle className="train-door-light" cx="105" cy="38" r="1.5" />
        <DestinationMark kind={kind} />
        <g className="train-rivets"><circle cx="18" cy="54" r="1" /><circle cx="119" cy="54" r="1" /><circle cx="156" cy="54" r="1" /></g>
      </g>

      <g className="train-running-gear">
        <path className="train-bogie" d="M27 62h116" />
        <g transform="translate(44 64)"><g className="train-wheel train-wheel-a"><circle r="9" /><circle r="4" /><path d="M0-7v14M-7 0H7M-5-5 5 5M5-5-5 5" /></g></g>
        <g transform="translate(132 64)"><g className="train-wheel train-wheel-b"><circle r="9" /><circle r="4" /><path d="M0-7v14M-7 0H7M-5-5 5 5M5-5-5 5" /></g></g>
        <g className="train-drive-rod"><path d="M44 64h88" /><circle cx="44" cy="64" r="2.3" /><circle cx="132" cy="64" r="2.3" /></g>
      </g>
    </svg>
  );
}

/** 底部星际列车导航（首页 / 学校 / 乐园 / 总部），所有入口直接开放。 */
export default function BottomNav() {
  const { t, lang } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const [journey, setJourney] = useState<{ destination: TabKey | null } | null>(null);
  const movingTo = journey?.destination;
  const navRef = useRef<HTMLElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const motionTimer = useRef<number | null>(null);
  const motionFrame = useRef<number | null>(null);

  useEffect(() => () => {
    if (motionTimer.current !== null) window.clearTimeout(motionTimer.current);
    if (motionFrame.current !== null) window.cancelAnimationFrame(motionFrame.current);
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !navRef.current?.contains(event.target)) setExpanded(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setExpanded(false);
      openerRef.current?.focus({ preventScroll: true });
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [expanded]);

  const startJourney = (key: TabKey | null) => {
    if (motionTimer.current !== null) window.clearTimeout(motionTimer.current);
    if (motionFrame.current !== null) window.cancelAnimationFrame(motionFrame.current);
    sfx.click();
    setJourney(null);
    motionFrame.current = window.requestAnimationFrame(() => {
      setJourney({ destination: key });
      if (key === null) navRef.current?.querySelector<HTMLAnchorElement>('.train-stop')?.focus({ preventScroll: true });
    });
    motionTimer.current = window.setTimeout(() => setJourney(null), 780);
  };

  return (
    <div className="train-nav-viewport">
      <nav ref={navRef} className={`bottom-nav train-nav ${expanded ? 'is-expanded' : 'is-stowed'} ${journey ? 'is-moving' : ''}`} aria-label="main navigation">
        <button
          ref={openerRef}
          type="button"
          className="train-nav-opener"
          aria-label={lang === 'zh' ? '展开火车菜单' : 'Open train menu'}
          aria-expanded={expanded}
          aria-controls="train-navigation-links"
          tabIndex={expanded ? -1 : 0}
          onClick={() => { setExpanded(true); startJourney(null); }}
        />
        <span className="train-nav-scenery" aria-hidden="true"><i /><i /><i /><i /><i /></span>
        <span className="train-track" aria-hidden="true"><i className="train-track-ties" /><i className="train-track-rail rail-top" /><i className="train-track-rail rail-bottom" /></span>
        <span className="train-signal" aria-hidden="true"><i /><b /></span>
        <div id="train-navigation-links" className="train-navigation-links" aria-hidden={!expanded}>
          {TABS.map(({ to, key, end }, index) => (
            <NavLink
              key={key}
              to={to}
              end={end}
              tabIndex={expanded ? 0 : -1}
              onClick={() => startJourney(key)}
              style={{ '--train-index': index } as CSSProperties}
              className={({ isActive }) => `nav-item train-stop train-stop-${key} ${isActive ? 'active' : ''} ${movingTo === key ? 'is-destination' : ''}`}
              aria-label={t(key)}
            >
              {({ isActive }) => (
                <span className="train-vehicle">
                  <TrainCarArt kind={key} />
                  <span className="train-station-plate"><span className="nav-label">{t(key)}</span></span>
                  {isActive && <span className="train-platform" aria-hidden="true" />}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
