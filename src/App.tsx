import { lazy, Suspense, useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ErrorBoundary from './components/ErrorBoundary';
import { IconGradientDefs } from './components/icons';
import BottomNav from './components/BottomNav';
import StudyBuddy from './components/StudyBuddy';
import { CosmosSky } from './components/cosmos';
import BeanRainHost from './components/BeanRain';
import { stopSpeaking } from './speech';
import { refreshServerHealth } from './api';
import { initAutoSync } from './autosync';
import { useStore } from './store';
import FeatureGate from './components/FeatureGate';

/* 路由级代码分割：首屏只加载首页，其余页面按需下载（减少主包体积） */
const LobbyPage = lazy(() => import('./pages/LobbyPage'));
const GamePage = lazy(() => import('./pages/GamePage'));
const ParentPage = lazy(() => import('./pages/ParentPage'));
const WrongBookPage = lazy(() => import('./pages/WrongBookPage'));
const ChildLoginPage = lazy(() => import('./pages/ChildLoginPage'));
const ManagePage = lazy(() => import('./pages/ManagePage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const HqSettingsPage = lazy(() => import('./pages/HqSettingsPage'));
const ArchivePage = lazy(() => import('./pages/ArchivePage'));
const DockPage = lazy(() => import('./pages/DockPage'));
const StorePage = lazy(() => import('./pages/StorePage'));
const WorldMapPage = lazy(() => import('./pages/WorldMapPage'));
const SubjectPage = lazy(() => import('./pages/SubjectPage'));
const LessonPage = lazy(() => import('./pages/LessonPage'));
const PracticePage = lazy(() => import('./pages/PracticePage'));
const MathCatalogPage = lazy(() => import('./pages/MathCatalogPage'));
const MathTextbookLabPage = lazy(() => import('./pages/MathTextbookLabPage'));
const ChineseTextbookCatalogPage = lazy(() => import('./pages/ChineseTextbookCatalogPage'));
const ChineseTextbookLessonPage = lazy(() => import('./pages/ChineseTextbookLessonPage'));
const EnglishTextbookCatalogPage = lazy(() => import('./pages/EnglishTextbookCatalogPage'));
const EnglishTextbookLessonPage = lazy(() => import('./pages/EnglishTextbookLessonPage'));
const ReviewHubPage = lazy(() => import('./pages/ReviewHubPage'));

/** 显示底部导航的页面（游戏/演示/家长中心保持全屏沉浸） */

/** 按页面类型区分骨架屏：列表页 / 学习页 / 游戏页 */
function RouteSkeleton() {
  const { pathname } = useLocation();
  const kind = pathname.startsWith('/learn') || pathname.startsWith('/practice') || pathname.startsWith('/math-course') || pathname.startsWith('/chinese-course') || pathname.startsWith('/english-course')
    ? 'learn'
    : pathname.startsWith('/game')
      ? 'game'
      : pathname.startsWith('/subject') || pathname.startsWith('/map') || pathname.startsWith('/lobby')
        ? 'list'
        : 'admin';
  return (
    <div className={`page skeleton sk-kind-${kind}`} aria-hidden="true">
      <div className="sk-head">
        <div className="sk-block sk-eyebrow" />
        <div className="sk-block sk-title" />
        <div className="sk-block sk-rule" />
      </div>

      {kind === 'list' && (
        <div className="sk-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div className="sk-card" key={i}>
              <div className="sk-block sk-cover" />
              <div className="sk-block sk-line" />
              <div className="sk-block sk-line short" />
            </div>
          ))}
        </div>
      )}

      {(kind === 'learn' || kind === 'game') && (
        <div className="sk-learn">
          <div className="sk-block sk-hero" />
          <div className="sk-block sk-stage" />
          <div className="sk-tabs">
            {Array.from({ length: 4 }).map((_, i) => (
              <div className="sk-block sk-tab" key={i} />
            ))}
          </div>
          <div className="sk-block sk-body" />
          <div className="sk-block sk-body short" />
          <div className="sk-cta"><div className="sk-block sk-btn" /></div>
        </div>
      )}

      {kind === 'admin' && (
        <div className="sk-admin">
          <div className="sk-block sk-line w40" />
          <div className="sk-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <div className="sk-card" key={i}>
                <div className="sk-block sk-num" />
                <div className="sk-block sk-line" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const routeFallback = <RouteSkeleton />;

/** 开场 splash：品牌淡入 + 回弹后撤场 */
function Splash({ done }: { done: boolean }) {
  return (
    <div className={`boot-splash ${done ? 'exit' : ''}`} aria-hidden="true">
      <div className="boot-logo">🪐</div>
      <div className="boot-name">卷卷星球</div>
      <div className="boot-bar"><i /></div>
    </div>
  );
}

/** 滚动触发的卡片 reveal：进入视口才入场。随路由变化重新观察。 */
function useScrollReveal(pathname: string) {
  useEffect(() => {
    let io: IntersectionObserver | null = null;
    let raf = 0;
    let timer = 0;
    const sel =
      '.subject-card, .game-card, .cat-entry, .entry-card, .profile-card, ' +
      '.char-card, .word-card, .trace-card, .task-card, .plan-row, ' +
      '.stat-card, .badge-cell, .module > :not(.module-title), .lesson-row > *';
    const observe = () => {
      // 延迟到路由 DOM 渲染完再观察
      timer = window.setTimeout(() => {
        raf = requestAnimationFrame(() => {
          const els = Array.from(document.querySelectorAll<HTMLElement>(sel));
          if (!('IntersectionObserver' in window) || els.length === 0) return;
          io = new IntersectionObserver(
            (entries) => {
              for (const e of entries) {
                if (e.isIntersecting) {
                  e.target.classList.add('in-view');
                  io!.unobserve(e.target);
                }
              }
            },
            { rootMargin: '0px 0px -60px 0px', threshold: 0.12 },
          );
          els.forEach((el) => el.classList.add('reveal'));
          els.forEach((el) => io!.observe(el));
        });
      }, 40);
    };
    observe();
    // 延迟路由懒加载：稍后再观察一次，兜底 late-mounted 内容
    const late = window.setTimeout(observe, 260);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(late);
      cancelAnimationFrame(raf);
      io?.disconnect();
    };
  }, [pathname]);
}

/** 滚动视差：把 scrollY 写到 .route-view 的 CSS 变量，供 hero/卡片做淡出上移动画 */
function useParallax(pathname: string) {
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = document.querySelector<HTMLElement>('.route-view');
        if (el) el.style.setProperty('--scroll', String(window.scrollY));
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [pathname]);
}

/** 3D 倾斜：对学科/游戏/入口卡做指针追踪俯仰偏航（带光泽），松开回弹 */
function useCardTilt() {
  useEffect(() => {
    const sel = '.subject-card, .game-card, .cat-entry';
    const onMove = (e: PointerEvent) => {
      const el = (e.target as HTMLElement)?.closest?.(sel) as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      const ry = (px - 0.5) * 10; // 偏航
      const rx = (0.5 - py) * 8;  // 俯仰
      el.style.setProperty('--rx', `${rx.toFixed(2)}deg`);
      el.style.setProperty('--ry', `${ry.toFixed(2)}deg`);
      el.style.setProperty('--gx', `${(px * 100).toFixed(1)}%`);
      el.style.setProperty('--gy', `${(py * 100).toFixed(1)}%`);
    };
    const onLeave = (e: PointerEvent) => {
      const el = (e.target as HTMLElement)?.closest?.(sel) as HTMLElement | null;
      if (!el) return;
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
    };
    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave, { passive: true });
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
    };
  }, []);
}

function Shell() {
  const location = useLocation();

  // 路由切换时停止正在朗读
  useEffect(() => {
    stopSpeaking();
  }, [location.pathname]);
  const [booted, setBooted] = useState(false);
  useScrollReveal(location.pathname);
  useParallax(location.pathname);
  useCardTilt();
  // 底部导航只在主玩法页显示（首页/学习/游戏/我的）；登录/学习内页隐藏
  const showNav = ['/', '/map', '/lobby', '/profile', '/archive', '/dock'].includes(location.pathname);
  const noChrome = ['/child-login', '/parent'].includes(location.pathname);
  const hasKid = useStore((s) => !!s.activeChildId);

  // 新手剧情未全部完成时不再锁定页面滚动：引导期间也允许自由滚动浏览（原 story-lock-scroll 已移除）

  useEffect(() => {
    // 字体就绪 + 最短展示时间都满足后才揭幕，避免闪烁
    const root = document.documentElement;
    root.classList.add('fonts-loading');
    const minDelay = new Promise((r) => window.setTimeout(r, 1050));
    const fontsReady =
      typeof document !== 'undefined' && document.fonts?.ready
        ? document.fonts.ready.then(() => undefined)
        : Promise.resolve();
    let alive = true;
    Promise.all([minDelay, fontsReady]).then(() => {
      if (!alive) return;
      setBooted(true);
      root.classList.remove('fonts-loading');
      root.classList.add('fonts-ready');
    });
    return () => {
      alive = false;
    };
  }, []);
  // 路由变化时滚动到顶部并重放入场
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname]);

  return (
    <>
      <IconGradientDefs />
      <Splash done={booted} />
      <div className="grain" aria-hidden="true" />
      <CosmosSky />
      <BeanRainHost />
      <div className="app">
        <Suspense fallback={routeFallback}>
          <div key={location.pathname} className="route-view">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/map" element={<FeatureGate feature="school"><WorldMapPage /></FeatureGate>} />
              <Route path="/subject/math" element={<FeatureGate feature="school"><MathCatalogPage /></FeatureGate>} />
              <Route path="/textbook/:subject/:grade/:vol" element={<FeatureGate feature="school"><MathCatalogPage /></FeatureGate>} />
              <Route path="/math-course/:lessonId" element={<FeatureGate feature="school"><MathTextbookLabPage /></FeatureGate>} />
              <Route path="/subject/chinese" element={<FeatureGate feature="school"><ChineseTextbookCatalogPage /></FeatureGate>} />
              <Route path="/chinese-course/:lessonId" element={<FeatureGate feature="school"><ChineseTextbookLessonPage /></FeatureGate>} />
              <Route path="/subject/english" element={<FeatureGate feature="school"><EnglishTextbookCatalogPage /></FeatureGate>} />
              <Route path="/textbook/english/g3/1" element={<FeatureGate feature="school"><EnglishTextbookCatalogPage /></FeatureGate>} />
              <Route path="/english-course/:lessonId" element={<FeatureGate feature="school"><EnglishTextbookLessonPage /></FeatureGate>} />
              <Route path="/review" element={<FeatureGate feature="school"><ReviewHubPage /></FeatureGate>} />
              <Route path="/subject/:subjectId" element={<FeatureGate feature="school"><SubjectPage /></FeatureGate>} />
              <Route path="/learn/:skillId" element={<FeatureGate feature="school"><LessonPage /></FeatureGate>} />
              <Route path="/practice/:skillId" element={<FeatureGate feature="school"><PracticePage /></FeatureGate>} />
              <Route path="/math-textbook" element={<Navigate to="/subject/math" replace />} />
              <Route path="/math-book" element={<Navigate to="/subject/math" replace />} />
              <Route path="/chinese-textbook" element={<Navigate to="/subject/chinese" replace />} />
              <Route path="/lobby" element={<FeatureGate feature="park"><LobbyPage /></FeatureGate>} />
              <Route path="/game/:gameId" element={<FeatureGate feature="park"><GamePage /></FeatureGate>} />
              <Route path="/profile" element={<FeatureGate feature="hq"><ProfilePage /></FeatureGate>} />
              <Route path="/profile/settings" element={<FeatureGate feature="hq"><HqSettingsPage /></FeatureGate>} />
              <Route path="/archive" element={<ArchivePage />} />
              <Route path="/dock" element={<DockPage />} />
              <Route path="/store" element={<FeatureGate feature="store"><StorePage /></FeatureGate>} />
              <Route path="/parent" element={<ParentPage />} />
              <Route path="/wrongs" element={<WrongBookPage />} />
              <Route path="/child-login" element={<ChildLoginPage />} />
              <Route path="/manage" element={<ManagePage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Suspense>
        {showNav && hasKid && booted && !noChrome && <BottomNav />}
      </div>
      {hasKid && !noChrome && <StudyBuddy />}
    </>
  );
}

export default function App() {
  // 应用主题（深/浅）到根元素
  const theme = useStore((s) => s.theme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    // 探测服务端：可用性与 TTS 配置状态（失败静默，离线可用）
    void refreshServerHealth();
    // 家长登录后的自动云端同步（启动拉取 + 学习变化自动推送）
    initAutoSync();
  }, []);
  // 安装学习任务自动结算；每日签到改为由孩子在总部主动领取。
  useEffect(() => {
    const t = window.setTimeout(() => {
      void import('./checkin').then((m) => {
        m.injectDemoIfRequested();
        m.installTaskWatcher();
      });
    }, 900);
    return () => window.clearTimeout(t);
  }, []);
  // 启动拉取全局「卷卷豆与杂货铺」配置（管理员发布 → 全端生效）
  useEffect(() => {
    void import('./api').then(async ({ api }) => {
      const r = await api.storeConfig();
      if (r?.ok) useStore.getState().applyRemoteConfig(r.storeOverrides, r.taskOverrides);
    });
  }, []);
  return (
    <ErrorBoundary>
      <HashRouter>
        <Shell />
      </HashRouter>
    </ErrorBoundary>
  );
}
