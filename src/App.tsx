import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ErrorBoundary from './components/ErrorBoundary';
import BottomNav from './components/BottomNav';

/* 路由级代码分割：首屏只加载首页，其余页面按需下载（减少主包体积） */
const LobbyPage = lazy(() => import('./pages/LobbyPage'));
const GamePage = lazy(() => import('./pages/GamePage'));
const AchievementsPage = lazy(() => import('./pages/AchievementsPage'));
const ParentPage = lazy(() => import('./pages/ParentPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const WorldMapPage = lazy(() => import('./pages/WorldMapPage'));
const SubjectPage = lazy(() => import('./pages/SubjectPage'));
const LessonPage = lazy(() => import('./pages/LessonPage'));
const PracticePage = lazy(() => import('./pages/PracticePage'));

/** 显示底部导航的页面（游戏/演示/家长中心保持全屏沉浸） */
const NAV_PAGES = ['/', '/map', '/subject', '/lobby', '/achievements', '/profile'];

const routeFallback = (
  <div className="page">
    <div className="route-loading">⏳ 加载中…</div>
  </div>
);

function Shell() {
  const location = useLocation();
  const showNav =
    NAV_PAGES.includes(location.pathname) || location.pathname.startsWith('/subject');
  return (
    <>
      <div className="clouds" aria-hidden="true">
        <span className="cloud c1">☁️</span>
        <span className="cloud c2">☁️</span>
        <span className="cloud c3">☁️</span>
        <span className="cloud c4">🌈</span>
      </div>
      <div className="app">
        <Suspense fallback={routeFallback}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/map" element={<WorldMapPage />} />
            <Route path="/subject/:subjectId" element={<SubjectPage />} />
            <Route path="/learn/:skillId" element={<LessonPage />} />
            <Route path="/practice/:skillId" element={<PracticePage />} />
            <Route path="/lobby" element={<LobbyPage />} />
            <Route path="/game/:gameId" element={<GamePage />} />
            <Route path="/achievements" element={<AchievementsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/parent" element={<ParentPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
      {showNav && <BottomNav />}
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <Shell />
      </HashRouter>
    </ErrorBoundary>
  );
}
