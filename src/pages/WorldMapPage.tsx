import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, goldSkillCount, skillState } from '../store';
import { useI18n } from '../i18n';
import { TopBar } from '../components/ui';
import { SUBJECTS } from '../types';
import { skillsBySubjectOnly } from '../content/skills';
import { speak, startMusic, stopMusic } from '../speech';
import { IconStar } from '../components/icons';

export default function WorldMapPage() {
  const nav = useNavigate();
  const { t, lang } = useI18n();
  const child = useStore((s) => s.profiles.find((p) => p.id === s.activeChildId));
  const mastery = useStore((s) => s.mastery);
  const records = useStore((s) => s.records);

  useEffect(() => {
    if (!child) {
      nav('/');
      return;
    }
    startMusic('lobby');
    speak(t('worldMap'), lang);
    return () => stopMusic();
  }, [child?.id, lang, nav, t]);

  if (!child) return null;

  const goldCount = goldSkillCount(mastery, child.id);
  const starTotal = records
    .filter((r) => r.childId === child.id)
    .reduce((sum, r) => sum + r.stars, 0);

  return (
    <div className="page map-page">
      <TopBar
        title={
          <span>
            🗺️ {t('worldMap')} · {child.avatar} {child.name}
          </span>
        }
        onBack={() => nav('/')}
      />

      <div className="map-stats">
        <div className="stat-chip">
          <IconStar size={18} style={{ color: '#FFB300' }} />
          <b>{goldCount}</b> {t('mastered')}
        </div>
        <div className="stat-chip today">
          <span className="stat-icon">⭐</span>
          <b>{starTotal}</b>
        </div>
      </div>

      {/* 学科入口：点击进入学科，再选年级、看课程 */}
      <div className="subject-grid">
        {SUBJECTS.map((sub) => {
          const list = skillsBySubjectOnly(sub.id);
          const gold = list.filter((s) => skillState(mastery, child.id, s.id).gold).length;
          return (
            <button
              key={sub.id}
              className="subject-card"
              onClick={() => {
                speak(sub.name[lang], lang);
                nav(`/subject/${sub.id}`);
              }}
            >
              <span className="subject-cover" style={{ background: sub.color }}>
                <span className="subject-emoji">{sub.icon}</span>
              </span>
              <span className="subject-name">{sub.name[lang]}</span>
              <span className="subject-meta">
                {list.length} {t('skills')} · ⭐ {gold}
              </span>
            </button>
          );
        })}
      </div>

      {/* 自由乐园 */}
      <button className="free-park-card" onClick={() => nav('/lobby')}>
        <span className="free-park-icon">🎡</span>
        <span className="free-park-text">
          <b>{t('freePark')}</b>
          <small>{t('lobby')} · 12 {t('games')}</small>
        </span>
        <span className="entry-arrow">›</span>
      </button>
    </div>
  );
}
