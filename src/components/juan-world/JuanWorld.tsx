import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MissionStation } from '../MissionHome';
import { playSfx, speak } from '../../speech';
import {
  IconArchiveCards,
  IconGameConsole,
  IconMagicSchool,
  IconCitadel,
  IconDock,
  IconSupply,
  IconResetView,
} from '../icons';
import { WORLD_PLACES, type WorldPoint, type WorldState } from './places';
import {
  POSTER_ANCHORS,
  POSTER_ASPECT,
  POSTER_SKIN_ANCHORS,
  POSTER_VISIBLE_POINTS,
} from './posterAnchors';
import type { createJuanWorld } from './runtime';
import {
  WORLD_APPEARANCES,
  readAppearance,
  rememberAppearance,
  type WorldAppearance,
} from './appearances';
import './world.css';
const WorldAppearancePicker = lazy(() => import('./WorldAppearancePicker'));

type Props = {
  childId: string;
  theme: 'dark' | 'light';
  lang: 'zh' | 'en';
  quiet: boolean;
  station: MissionStation;
  lootPacks: number;
  onCollect: () => void;
  collectNonce: number;
  welcome: string | null;
  arrival: boolean;
  onWelcomeDone: () => void;
  archiveNotice: string | null;
};
type Controller = ReturnType<typeof createJuanWorld>;
export default function JuanWorld(props: Props) {
  const { lang, station } = props;
  const nav = useNavigate();
  const host = useRef<HTMLDivElement>(null);
  const labels = useRef(new Map<WorldPoint, HTMLButtonElement>());
  const controller = useRef<Controller>();
  const current = useRef(props);
  current.current = props;
  const [appearance, setAppearance] = useState<WorldAppearance>(() =>
    readAppearance(props.childId),
  );
  const appearanceRef = useRef(appearance);
  const skin = WORLD_APPEARANCES.find((item) => item.id === appearance)!;
  useEffect(() => {
    const saved = readAppearance(props.childId);
    appearanceRef.current = saved;
    setAppearance(saved);
  }, [props.childId]);
  const chooseAppearance = (value: WorldAppearance) => {
    appearanceRef.current = value;
    setAppearance(value);
    rememberAppearance(props.childId, value);
    controller.current?.setAppearance(value);
  };
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [hovered, setHovered] = useState<WorldPoint | null>(null);
  const [traveling, setTraveling] = useState(false);
  const [viewed, setViewed] = useState<WorldPoint | 'default'>('default');
  const [deliveryNonce, setDeliveryNonce] = useState(0);
  const state = useRef<WorldState>({
    theme: props.theme,
    quiet: props.quiet,
    hovered: null,
    mailStatus: station.status,
    unreadCount: station.unreadIds.length,
    rewardCount: station.rewardCount,
    deliveryNonce: 0,
    lootReady: props.lootPacks > 0,
    collectNonce: props.collectNonce,
    archiveNotice: !!props.archiveNotice,
    drift: !!station.drift,
  });
  state.current = {
    theme: props.theme,
    quiet: props.quiet,
    hovered,
    mailStatus: station.status,
    unreadCount: station.unreadIds.length,
    rewardCount: station.rewardCount,
    deliveryNonce,
    lootReady: props.lootPacks > 0,
    collectNonce: props.collectNonce,
    archiveNotice: !!props.archiveNotice,
    drift: !!station.drift,
  };
  const activate = useRef<(point: WorldPoint) => void>(() => {});
  activate.current = (point) => {
    if (traveling) return;
    if (point === 'mail' || point === 'reward') {
      playSfx('tap');
      current.current.station.open();
      return;
    }
    if (point === 'loot') {
      current.current.onCollect();
      return;
    }
    if (point === 'drift') {
      current.current.station.drift?.open();
      return;
    }
    const place = WORLD_PLACES.find((item) => item.id === point);
    if (!place) return;
    playSfx('tap');
    speak(place.purpose[current.current.lang], current.current.lang);
    setTraveling(true);
    if (controller.current && !failed) controller.current.focus(point, () => nav(place.route));
    else nav(place.route);
  };
  useEffect(() => {
    setReady(false);
    setFailed(false);
    setTraveling(false);
    setHovered(null);
    setViewed('default');
    let alive = true,
      local: Controller | undefined;
    import('./runtime')
      .then(({ createJuanWorld }) => {
        if (!alive || !host.current) return;
        try {
          local = createJuanWorld(host.current, {
            childId: props.childId,
            appearance: appearanceRef.current,
            getState: () => state.current,
            arrival: current.current.arrival,
            onPoint: (point) => activate.current(point),
            onHover: setHovered,
            onAnchor: (point, x, y, visible) => {
              const label = labels.current.get(point);
              if (label) {
                label.style.left = `${x}px`;
                label.style.top = `${y}px`;
                label.style.visibility = visible ? 'visible' : 'hidden';
                label.tabIndex = visible ? 0 : -1;
              }
            },
            onReady: () => {
              if (alive) setReady(true);
            },
            onFailure: () => {
              if (alive) {
                setFailed(true);
                setReady(false);
                setTraveling(false);
                local?.dispose();
                controller.current = undefined;
              }
            },
          });
          controller.current = local;
        } catch {
          setFailed(true);
        }
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
      local?.dispose();
      controller.current = undefined;
    };
  }, [props.childId]);
  useEffect(() => {
    controller.current?.invalidate();
  }, [
    props.theme,
    props.quiet,
    hovered,
    station.status,
    station.unreadIds.length,
    station.rewardCount,
    station.drift,
    deliveryNonce,
    props.collectNonce,
    props.lootPacks,
    props.archiveNotice,
  ]);
  useEffect(() => {
    if (!failed || !host.current?.parentElement) return;
    const stage = host.current.parentElement;
    const layout = () => {
      const width = stage.clientWidth,
        height = stage.clientHeight;
      const pictureWidth = Math.min(width, height * POSTER_ASPECT),
        pictureHeight = pictureWidth / POSTER_ASPECT;
      labels.current.forEach((label, point) => {
        const anchor = (POSTER_SKIN_ANCHORS[appearance] ?? POSTER_ANCHORS)[point];
        label.style.left = `${(width - pictureWidth) / 2 + anchor[0] * pictureWidth}px`;
        label.style.top = `${Math.min(height - 60, (height - pictureHeight) / 2 + anchor[1] * pictureHeight)}px`;
        const visible = POSTER_VISIBLE_POINTS.has(point);
        label.style.visibility = visible ? 'visible' : 'hidden';
        label.tabIndex = visible ? 0 : -1;
      });
    };
    layout();
    const observer = new ResizeObserver(layout);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [failed, appearance, station.rewardCount, !!station.drift]);
  const inspect = (point: WorldPoint) => {
    if (traveling) return;
    if (failed) {
      activate.current(point);
      return;
    }
    setViewed(point);
    controller.current?.reveal(point);
  };
  const unreadSignature = station.unreadIds.join('|');
  useEffect(() => {
    const key = `sfz-world-delivered-v1:${props.childId}`;
    try {
      const delivered = new Set<string>(JSON.parse(sessionStorage.getItem(key) ?? '[]'));
      if (station.unreadIds.some((id) => !delivered.has(id))) {
        setDeliveryNonce((value) => value + 1);
        station.unreadIds.forEach((id) => delivered.add(id));
        sessionStorage.setItem(key, JSON.stringify([...delivered].slice(-150)));
      }
    } catch {
      /* delivery is presentation only */
    }
  }, [props.childId, unreadSignature]);
  useEffect(() => {
    if (!props.welcome) return;
    const timer = window.setTimeout(
      () => current.current.onWelcomeDone(),
      props.arrival ? 3500 : 2200,
    );
    return () => window.clearTimeout(timer);
  }, [props.welcome, props.arrival]);
  const label = (point: WorldPoint) => ({
    ref: (node: HTMLButtonElement | null) => {
      if (node) labels.current.set(point, node);
      else labels.current.delete(point);
    },
    onClick: () => activate.current(point),
    onMouseEnter: () => setHovered(point),
    onMouseLeave: () => setHovered(null),
    onFocus: () => setHovered(point),
    onBlur: () => setHovered(null),
    disabled: traveling,
  });
  return (
    <section
      className={`juan-world ${ready ? 'world-ready' : ''} ${failed ? 'world-fallback' : ''} ${traveling ? 'world-traveling' : ''}`}
      aria-label={lang === 'zh' ? '卷星探索地图' : 'Explore Juan’s world'}
    >
      <div className="world-atmosphere" aria-hidden="true" />
      <div className="world-intro">
        <span>{lang === 'zh' ? 'JUAN // ORBITAL NETWORK' : 'JUAN // ORBITAL NETWORK'}</span>
        <h1>{lang === 'zh' ? '卷星 · 星际探索' : 'JUAN · EXPLORER'}</h1>
        <p>
          {lang === 'zh'
            ? '探索星球，连接你的宇宙。'
            : 'Explore the planet. Connect your universe.'}
        </p>
      </div>
      <Suspense fallback={null}>
        <WorldAppearancePicker
          appearance={appearance}
          lang={lang}
          onSelect={chooseAppearance}
          disabled={traveling}
        />
      </Suspense>
      <div className="world-stage">
        <div
          className="world-poster"
          style={{ backgroundImage: `url(/assets/juan-world/${skin.poster})` }}
          aria-hidden="true"
        />
        <div className="world-canvas" ref={host} />
        {!ready && !failed && (
          <span className="world-loading" role="status">
            {lang === 'zh' ? '正在点亮卷星…' : 'Lighting up your world…'}
          </span>
        )}
        <div className="world-labels">
          {WORLD_PLACES.map((place) => (
            <button
              key={place.id}
              {...label(place.id)}
              className={`world-place world-point-${place.id} ${hovered === place.id ? 'is-hovered' : ''}`}
              style={{ left: `${place.x}%`, top: `${place.y}%` }}
              aria-label={`${place.name[lang]}：${place.purpose[lang]}`}
            >
              <span>{place.name[lang]}</span>
              <small>{place.scene[lang]}</small>
            </button>
          ))}
          <button
            {...label('mail')}
            className={`world-place world-service world-point-mail status-${station.status}`}
            style={{ left: '72%', top: '73%' }}
            aria-label={`${lang === 'zh' ? '收件站' : 'Mail station'}，${station.badge}，${station.summary}`}
          >
            <span>
              {lang === 'zh' ? '收件站' : 'Mail station'}
              <i>{station.badge}</i>
            </span>
            <small>{station.summary}</small>
          </button>
          {station.rewardCount > 0 && (
            <button
              {...label('reward')}
              className="world-reward"
              style={{ left: '33%', top: '27%' }}
              aria-label={
                lang === 'zh'
                  ? `${station.rewardCount}份课程奖励待领取`
                  : `${station.rewardCount} course rewards ready`
              }
              title={lang === 'zh' ? '领取课程奖励' : 'Collect course rewards'}
            >
              ✦<b>{station.rewardCount}</b>
            </button>
          )}
          {station.drift && (
            <button
              {...label('drift')}
              className="world-place world-drift"
              style={{ left: '86%', top: '61%' }}
            >
              <span>{lang === 'zh' ? '漂流来信' : 'Drifting letter'}</span>
              <small>{station.drift.sender}</small>
            </button>
          )}
        </div>
        {props.welcome && !props.quiet && (
          <div className="world-welcome" role="status">
            <span>✦</span>
            {props.welcome}
          </div>
        )}
        {props.archiveNotice && (
          <div className="world-new-card" role="status">
            <span>✧</span>
            <div>
              <small>{lang === 'zh' ? '新卡牌已入馆' : 'A new card in your archive'}</small>
              <b>{props.archiveNotice}</b>
            </div>
            <button
              onClick={() => activate.current('archive')}
              aria-label={lang === 'zh' ? '查看档案库' : 'View archive'}
            >
              ↗
            </button>
          </div>
        )}
      </div>
      <nav
        className="world-destinations"
        aria-label={lang === 'zh' ? '定位星际设施' : 'Locate destinations'}
      >
        <button
          className={`world-reset ${viewed === 'default' ? 'active' : ''}`}
          disabled={traveling || failed}
          onClick={() => {
            setViewed('default');
            controller.current?.reset();
          }}
          aria-label={lang === 'zh' ? '回到默认视角' : 'Reset view'}
        >
          <IconResetView size={22} />
          <span>{lang === 'zh' ? '默认视角' : 'Reset view'}</span>
        </button>
        {WORLD_PLACES.map((place) => (
          <button
            key={place.id}
            className={viewed === place.id ? 'active' : ''}
            disabled={traveling}
            onClick={() => inspect(place.id)}
            aria-label={`${lang === 'zh' ? '转向' : 'Locate'}${place.name[lang]}`}
          >
            {place.id === 'park' ? (
              <IconGameConsole size={22} />
            ) : place.id === 'school' ? (
              <IconMagicSchool size={22} />
            ) : place.id === 'archive' ? (
              <IconArchiveCards size={22} />
            ) : place.id === 'hq' ? (
              <IconCitadel size={22} />
            ) : place.id === 'dock' ? (
              <IconDock size={22} />
            ) : (
              <IconSupply size={22} />
            )}
            <span>{place.name[lang]}</span>
            <small>↗</small>
          </button>
        ))}
      </nav>
    </section>
  );
}
