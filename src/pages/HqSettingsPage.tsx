import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useStore,
  childTotalStars,
} from '../store';
import { useI18n } from '../i18n';
import { KidButton, Toggle } from '../components/ui';
import { AVATARS, GRADES, gradeLabel, type Grade } from '../types';
import { speak } from '../speech';
import { logout as cloudLogout } from '../api';

/** 总部 · 二级设置页：档案管理 + 系统设置 + 家长/管理员/账号入口 */
export default function HqSettingsPage() {
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
  const langNow = useStore((s) => s.lang);
  const lessonSkipOn = useStore((s) => s.lessonSkipOn);
  const setLessonSkipOn = useStore((s) => s.setLessonSkipOn);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);

  const child = useMemo(() => profiles.find((p) => p.id === activeChildId) ?? null, [profiles, activeChildId]);

  // 登录态守卫
  useEffect(() => {
    const s = useStore.getState();
    const hasSession = !!s.activeChildId || !!localStorage.getItem('sfz_token');
    if (!hasSession) nav('/child-login');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChildId]);

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

  const doLogout = () => {
    cloudLogout();
    setActiveChild(null);
    nav('/');
  };

  return (
    <div className="page hq-page">
      <div className="hq-inner">
        <header className="hq-settings-top">
          <button className="hq-back" onClick={() => nav('/profile')} aria-label={t('back')}>
            ←
          </button>
          <h1>{t('settings')}</h1>
        </header>

        {/* 档案管理 */}
        <section className="hq-profiles">
          <h3 className="hq-section-title">{t('profileManage')}</h3>
          <div className="hq-switch-list">
            {profiles.map((p) => (
              <button
                key={p.id}
                className={`hq-switch-item ${p.id === child?.id ? 'current' : ''}`}
                onClick={() => {
                  setActiveChild(p.id);
                  speak(t('welcome'), lang);
                }}
              >
                <span className="hq-switch-avatar">{p.avatar}</span>
                <span className="hq-switch-name">
                  {p.name}
                  <small>
                    {gradeLabel(p.ageBand, lang)} · ⭐ {childTotalStars(records, p.id)}
                  </small>
                </span>
                {p.id === child?.id && <span className="hq-switch-current">✓</span>}
              </button>
            ))}
            {!creating ? (
              <button className="hq-switch-item add" onClick={() => setCreating(true)}>
                <span className="hq-switch-avatar">➕</span>
                <span className="hq-switch-name">{t('addProfile')}</span>
              </button>
            ) : (
              <div className="hq-create-inline">
                <input
                  className="hq-name-input"
                  value={name}
                  placeholder={t('namePlaceholder')}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={12}
                />
                <div className="hq-avatar-grid">
                  {AVATARS.map((a) => (
                    <button key={a} className={`hq-avatar-cell ${avatar === a ? 'selected' : ''}`} onClick={() => setAvatar(a)}>
                      {a}
                    </button>
                  ))}
                </div>
                <div className="hq-age-grid">
                  {GRADES.map((g) => (
                    <button key={g.id} className={`hq-age-cell ${age === g.id ? 'selected' : ''}`} onClick={() => setAge(g.id)}>
                      {g.name[lang]}
                    </button>
                  ))}
                </div>
                <div className="hq-create-actions">
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

        {/* 设置 */}
        <section className="hq-settings">
          <h3 className="hq-section-title">{t('settings')}</h3>
          <div className="hq-settings-card">
            <div className="hq-setting-row">
              <span>🔊 {t('sound')}</span>
              <Toggle on={sound} onClick={toggleSound} label={t('sound')} />
            </div>
            <div className="hq-setting-row">
              <span>🎵 {t('bgm')}</span>
              <Toggle on={musicOn} onClick={() => setMusicOn(!musicOn)} label={t('bgm')} />
            </div>
            <div className="hq-setting-row">
              <span>🗣️ {t('voice')}</span>
              <Toggle on={voiceOn} onClick={() => setVoiceOn(!voiceOn)} label={t('voice')} />
            </div>
            <div className="hq-setting-row">
              <span>⏭️ {t('skipDemo')}</span>
              <Toggle on={lessonSkipOn} onClick={() => setLessonSkipOn(!lessonSkipOn)} label={t('skipDemo')} />
            </div>
            <div className="hq-setting-row">
              <span>{t('language')}</span>
              <div className="hq-lang-toggle">
                <button className={langNow === 'zh' ? 'active' : ''} onClick={() => setLang('zh')}>
                  中文
                </button>
                <button className={langNow === 'en' ? 'active' : ''} onClick={() => setLang('en')}>
                  English
                </button>
              </div>
            </div>
            <div className="hq-setting-row">
              <span>{lang === 'zh' ? '深色模式' : 'Dark mode'}</span>
              <Toggle on={theme === 'dark'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} label="theme" />
            </div>
          </div>
        </section>

        {/* 账号：家长中心 / 管理员 / 切换账号 / 退出 */}
        <section className="hq-settings">
          <h3 className="hq-section-title">{lang === 'zh' ? '账号与登录' : 'Account'}</h3>
          <div className="hq-account-actions">
            <button className="hq-entry" onClick={() => nav('/parent')}>
              <span className="hq-entry-icon">🔒</span>
              <span className="hq-entry-name">{t('parentCenter')}</span>
            </button>
            <button className="hq-entry" onClick={() => nav('/admin')}>
              <span className="hq-entry-icon">👮</span>
              <span className="hq-entry-name">{lang === 'zh' ? '管理员' : 'Admin'}</span>
            </button>
            <button className="hq-entry" onClick={() => nav('/child-login')}>
              <span className="hq-entry-icon">👶</span>
              <span className="hq-entry-name">{lang === 'zh' ? '切换账号' : 'Switch'}</span>
            </button>
            <button className="hq-entry" onClick={doLogout}>
              <span className="hq-entry-icon">🚪</span>
              <span className="hq-entry-name">{t('logout')}</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
