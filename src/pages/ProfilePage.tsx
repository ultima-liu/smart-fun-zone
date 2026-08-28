import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useStore,
  childTotalStars,
  childRecords,
  streakDays,
  gardenStage,
} from '../store';
import { useI18n } from '../i18n';
import { KidButton, TopBar, Toggle } from '../components/ui';
import { AVATARS, GRADES, gradeLabel, type Grade } from '../types';
import { speak } from '../speech';
import Mascot from '../components/Mascot';
import { IconLock } from '../components/icons';

export default function ProfilePage() {
  const nav = useNavigate();
  const { t, lang } = useI18n();
  const profiles = useStore((s) => s.profiles);
  const records = useStore((s) => s.records);
  const activeChildId = useStore((s) => s.activeChildId);
  const setActiveChild = useStore((s) => s.setActiveChild);
  const addProfile = useStore((s) => s.addProfile);
  const sound = useStore((s) => s.sound);
  const toggleSound = useStore((s) => s.toggleSound);
  const musicOn = useStore((s) => s.musicOn);
  const setMusicOn = useStore((s) => s.setMusicOn);
  const voiceOn = useStore((s) => s.voiceOn);
  const setVoiceOn = useStore((s) => s.setVoiceOn);
  const setLang = useStore((s) => s.setLang);
  const lessonSkipOn = useStore((s) => s.lessonSkipOn);
  const setLessonSkipOn = useStore((s) => s.setLessonSkipOn);
  const charBag = useStore((s) => s.charBag);

  const child = useMemo(() => profiles.find((p) => p.id === activeChildId) ?? null, [profiles, activeChildId]);

  const [creating, setCreating] = useState(false);
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [name, setName] = useState('');
  const [age, setAge] = useState<Grade>('g1');

  const create = () => {
    const id = `c${Date.now()}`;
    addProfile({
      id,
      name: name.trim() || (lang === 'zh' ? '小宝贝' : 'Kid'),
      avatar,
      ageBand: age,
      createdAt: Date.now(),
    });
    setActiveChild(id);
    setCreating(false);
    speak(t('welcome'), lang);
  };

  const mine = child ? childRecords(records, child.id) : [];
  const totalStars = child ? childTotalStars(records, child.id) : 0;
  const streak = child ? streakDays(records, child.id) : 0;
  const gamesDone = new Set(mine.map((r) => r.gameId)).size;
  const garden = child ? gardenStage(totalStars) : null;
  const bag = child ? charBag[child.id] ?? [] : [];

  return (
    <div className="page profile">
      <TopBar title={`👤 ${t('my')}`} />

      {/* 当前孩子大卡 */}
      {child && (
        <section className="profile-hero">
          <span className="profile-hero-avatar">{child.avatar}</span>
          <div className="profile-hero-info">
            <h2>{child.name}</h2>
            <p>
              {gradeLabel(child.ageBand, lang)} · {gamesDone} {t('gamesDone')} · 🔥 {streak}{' '}
              {t('streakLabel')}
            </p>
            <div className="profile-hero-stats">
              <span>⭐ {totalStars}</span>
              <span>🌱 {garden ? t(garden.labelKey) : ''}</span>
            </div>
          </div>
          <Mascot pose="happy" size={84} />
        </section>
      )}

      {/* 档案管理 */}
      <section className="module">
        <h3 className="module-title">{t('profileManage')}</h3>
        <div className="switch-list">
          {profiles.map((p) => (
            <button
              key={p.id}
              className={`switch-item ${p.id === child?.id ? 'current' : ''}`}
              onClick={() => {
                setActiveChild(p.id);
                speak(t('welcome'), lang);
              }}
            >
              <span className="switch-avatar">{p.avatar}</span>
              <span className="switch-name">
                {p.name}
                <small>
                  {gradeLabel(p.ageBand, lang)} · ⭐ {childTotalStars(records, p.id)}
                </small>
              </span>
              {p.id === child?.id && <span className="switch-current">✓</span>}
            </button>
          ))}
          {!creating ? (
            <button className="switch-item add" onClick={() => setCreating(true)}>
              <span className="switch-avatar">➕</span>
              <span className="switch-name">{t('addProfile')}</span>
            </button>
          ) : (
            <div className="create-inline">
              <input
                className="name-input"
                value={name}
                placeholder={t('namePlaceholder')}
                onChange={(e) => setName(e.target.value)}
                maxLength={12}
              />
              <div className="avatar-grid mini">
                {AVATARS.map((a) => (
                  <button
                    key={a}
                    className={`avatar-cell ${avatar === a ? 'selected' : ''}`}
                    onClick={() => setAvatar(a)}
                  >
                    {a}
                  </button>
                ))}
              </div>
              <div className="age-grid mini">
                {GRADES.map((g) => (
                  <button
                    key={g.id}
                    className={`age-cell ${age === g.id ? 'selected' : ''}`}
                    onClick={() => setAge(g.id)}
                  >
                    {g.name[lang]}
                  </button>
                ))}
              </div>
              <div className="create-actions">
                <KidButton color="white" onClick={() => setCreating(false)}>
                  {t('cancel')}
                </KidButton>
                <KidButton color="green" onClick={create}>
                  {t('start')}
                </KidButton>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 家长中心入口 */}
      <section className="module">
        <h3 className="module-title">{t('parentCenter')}</h3>
        <button className="entry-card" onClick={() => nav('/parent')}>
          <span className="entry-icon coral">
            <IconLock size={26} />
          </span>
          <span className="entry-text">
            <b>{t('parentCenter')}</b>
            <small>{t('settings')} · {t('report')}</small>
          </span>
          <span className="entry-arrow">›</span>
        </button>
      </section>

      {/* 字卡袋 */}
      <section className="module">
        <h3 className="module-title">
          🈶 {t('charBag')}（{bag.length}）
        </h3>
        {bag.length === 0 ? (
          <p className="empty-tip small">{t('noData')}</p>
        ) : (
          <div className="char-grid bag">
            {bag.map((c) => (
              <span key={c} className="char-cell seen">
                {c}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* 声音设置 */}
      <section className="module">
        <h3 className="module-title">{t('settings')}</h3>
        <div className="settings-card">
          <div className="setting-row">
            <span>{t('sound')}</span>
            <Toggle on={sound} onClick={toggleSound} label={t('sound')} />
          </div>
          <div className="setting-row">
            <span>🎵 {t('bgm')}</span>
            <Toggle on={musicOn} onClick={() => setMusicOn(!musicOn)} label={t('bgm')} />
          </div>
          <div className="setting-row">
            <span>🗣️ {t('voice')}</span>
            <Toggle on={voiceOn} onClick={() => setVoiceOn(!voiceOn)} label={t('voice')} />
          </div>
          <div className="setting-row">
            <span>⏭️ {t('skipDemo')}</span>
            <Toggle on={lessonSkipOn} onClick={() => setLessonSkipOn(!lessonSkipOn)} label={t('skipDemo')} />
          </div>
          <div className="setting-row">
            <span>{t('language')}</span>
            <div className="lang-toggle small">
              <button className={lang === 'zh' ? 'active' : ''} onClick={() => setLang('zh')}>
                中文
              </button>
              <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>
                English
              </button>
            </div>
          </div>
        </div>
      </section>

      <footer className="about-line">
        {t('about')} · {t('appName')} v0.2 🦖
      </footer>
    </div>
  );
}
