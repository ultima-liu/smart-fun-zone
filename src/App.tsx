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
import { api, refreshServerHealth } from './api';
import { initAutoSync } from './autosync';
import { useStore } from './store';

/* 路由级代码分割：首屏只加载首页，其余页面按需下载（减少主包体积） */
const LobbyPage = lazy(() => import('./pages/LobbyPage'));
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
const MathCatalogPage = lazy(() => import('./pages/MathCatalogPage'));
const MathTextbookLabPage = lazy(() => import('./pages/MathTextbookLabPage'));
const ChineseTextbookCatalogPage = lazy(() => import('./pages/ChineseTextbookCatalogPage'));
const ChineseTextbookLessonPage = lazy(() => import('./pages/ChineseTextbookLessonPage'));
const EnglishTextbookCatalogPage = lazy(() => import('./pages/EnglishTextbookCatalogPage'));
const EnglishTextbookLessonPage = lazy(() => import('./pages/EnglishTextbookLessonPage'));
const ReviewHubPage = lazy(() => import('./pages/ReviewHubPage'));
const FruitShopPage = lazy(() => import('./pages/FruitShopPage'));
const MathLifeScenePage = lazy(() => import('./pages/MathLifeScenePage'));
const TaskActivityPage = lazy(() => import('./pages/TaskActivityPage'));

/** 显示底部导航的页面（游戏/演示/家长中心保持全屏沉浸） */

/** 按页面类型区分骨架屏：列表页 / 学习页 / 游戏页 */
function RouteSkeleton() {
  const { pathname } = useLocation();
  const kind = pathname.startsWith('/math-course') || pathname.startsWith('/math-practice') || pathname.startsWith('/chinese-course') || pathname.startsWith('/english-course')
    ? 'learn'
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

      {kind === 'learn' && (
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
    if (window.matchMedia('(prefers-reduced-motion: reduce), (pointer: coarse)').matches) return;
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
  useEffect(() => {
    const titleByPath: Record<string, string> = {
      '/': '卷卷星球', '/map': '星卷学校', '/lobby': '空中乐园', '/profile': '卷星总部',
      '/archive': '图鉴档案', '/dock': '星际船坞', '/store': '补给站', '/review': '今日复习',
      '/parent': '家长中心', '/admin': '管理员后台',
    };
    document.title = `${titleByPath[location.pathname] ?? '卷卷星球'} · Smart Fun Zone`;
  }, [location.pathname]);
  // 首页已有卷星场景入口，不重复显示列车；列车仅在主要二级页面承担全局导航。
  const showNav = ['/map', '/lobby', '/profile', '/archive', '/dock'].includes(location.pathname);
  const noChrome = ['/child-login', '/parent'].includes(location.pathname);
  const hasKid = useStore((s) => !!s.activeChildId);

  useEffect(() => {
    // 字体就绪 + 最短展示时间都满足后才揭幕，避免闪烁
    const root = document.documentElement;
    root.classList.add('fonts-loading');
    const splashDelay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1050;
    const minDelay = new Promise((r) => window.setTimeout(r, splashDelay));
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
      <a className="skip-link" href="#main-content">跳到主要内容</a>
      <IconGradientDefs />
      <Splash done={booted} />
      <div className="grain" aria-hidden="true" />
      <CosmosSky />
      <BeanRainHost />
      <div className="app">
        <Suspense fallback={routeFallback}>
          <div key={location.pathname} id="main-content" className="route-view" tabIndex={-1}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/map" element={<WorldMapPage />} />
              <Route path="/subject/math" element={<MathCatalogPage />} />
              <Route path="/textbook/:subject/:grade/:vol" element={<MathCatalogPage />} />
              <Route path="/math-course/:lessonId" element={<MathTextbookLabPage />} />
              <Route path="/math-practice/fruit-shop" element={<FruitShopPage />} />
              <Route path="/math-practice/life-scene" element={<MathLifeScenePage />} />
              <Route path="/subject/chinese" element={<ChineseTextbookCatalogPage />} />
              <Route path="/chinese-course/:lessonId" element={<ChineseTextbookLessonPage />} />
              <Route path="/subject/english" element={<EnglishTextbookCatalogPage />} />
              <Route path="/textbook/english/g3/1" element={<EnglishTextbookCatalogPage />} />
              <Route path="/english-course/:lessonId" element={<EnglishTextbookLessonPage />} />
              <Route path="/review" element={<ReviewHubPage />} />
              <Route path="/task/:taskId" element={<TaskActivityPage />} />
              <Route path="/math-textbook" element={<Navigate to="/subject/math" replace />} />
              <Route path="/math-book" element={<Navigate to="/subject/math" replace />} />
              <Route path="/chinese-textbook" element={<Navigate to="/subject/chinese" replace />} />
              <Route path="/lobby" element={<LobbyPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/profile/settings" element={<HqSettingsPage />} />
              <Route path="/archive" element={<ArchivePage />} />
              <Route path="/dock" element={<DockPage />} />
              <Route path="/store" element={<StorePage />} />
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
  const lang = useStore((s) => s.lang);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
  }, [lang]);
  useEffect(() => {
    // 探测服务端：可用性与 TTS 配置状态（失败静默，离线可用）
    void refreshServerHealth();
    // 家长登录后的自动云端同步（启动拉取 + 学习变化自动推送）
    initAutoSync();
  }, []);
  // 初始化演示数据与新版任务事实；旧学习记录只登记为已完成，不补发奖励。
  useEffect(() => {
    const t = window.setTimeout(() => {
      void import('./checkin').then((m) => {
        m.injectDemoIfRequested();
        void import('./taskSystem').then(({ initializeTaskSystem }) => {
          for (const profile of useStore.getState().profiles) initializeTaskSystem(profile.id);
        });
      });
    }, 900);
    return () => window.clearTimeout(t);
  }, []);
  // 启动拉取全局「卷卷豆与杂货铺」配置（管理员发布 → 全端生效）
  useEffect(() => {
    void api.storeConfig().then((r) => {
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
