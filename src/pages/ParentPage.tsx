import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, childRecords, childTotalStars, starsForGame } from '../store';
import { useI18n } from '../i18n';
import { KidButton, TopBar, Toggle } from '../components/ui';
import Modal from '../components/Modal';
import VoiceQualityTip from '../components/VoiceQualityTip';
import { listGames } from '../games';
import { gradeLabel } from '../types';
import { playSfx } from '../speech';

export default function ParentPage() {
  const nav = useNavigate();
  const { t, lang } = useI18n();
  const parentPin = useStore((s) => s.parentPin);
  const sound = useStore((s) => s.sound);
  const toggleSound = useStore((s) => s.toggleSound);
  const musicOn = useStore((s) => s.musicOn);
  const setMusicOn = useStore((s) => s.setMusicOn);
  const voiceOn = useStore((s) => s.voiceOn);
  const setVoiceOn = useStore((s) => s.setVoiceOn);
  const lessonSkipOn = useStore((s) => s.lessonSkipOn);
  const setLessonSkipOn = useStore((s) => s.setLessonSkipOn);
  const dailyLimitMin = useStore((s) => s.dailyLimitMin);
  const setDailyLimit = useStore((s) => s.setDailyLimit);
  const setParentPin = useStore((s) => s.setParentPin);
  const profiles = useStore((s) => s.profiles);
  const records = useStore((s) => s.records);
  const clearAll = useStore((s) => s.clearAll);

  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [pinErr, setPinErr] = useState(false);
  const [tab, setTab] = useState<'settings' | 'report'>('settings');
  const [newPin, setNewPin] = useState('');
  const [savedTip, setSavedTip] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const tryUnlock = () => {
    if (pin === parentPin) {
      playSfx('correct');
      setUnlocked(true);
    } else {
      playSfx('wrong');
      setPinErr(true);
      setPin('');
      window.setTimeout(() => setPinErr(false), 800);
    }
  };

  const doClear = () => {
    clearAll();
    nav('/');
  };

  const games = listGames();

  return (
    <div className="page parent">
      <TopBar title={`🔒 ${t('parentCenter')}`} onBack={() => nav('/')} />

      {!unlocked ? (
        <div className="pin-gate">
          <div className="pin-emoji">🔐</div>
          <p className="pin-label">{t('pin')}</p>
          <input
            className={`pin-input ${pinErr ? 'shake' : ''}`}
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            autoFocus
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && tryUnlock()}
          />
          {pinErr && <p className="pin-err">{t('wrongPin')}</p>}
          <KidButton color="green" onClick={tryUnlock}>
            {t('enter')}
          </KidButton>
          <p className="pin-hint">{t('hintPin')}</p>
        </div>
      ) : (
        <>
          <div className="parent-tabs">
            <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>
              {t('settings')}
            </button>
            <button className={tab === 'report' ? 'active' : ''} onClick={() => setTab('report')}>
              {t('report')}
            </button>
          </div>

          {tab === 'settings' && (
            <div className="parent-settings">
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
              <VoiceQualityTip />
              <div className="setting-row">
                <span>⏭️ {t('skipDemo')}</span>
                <Toggle
                  on={lessonSkipOn}
                  onClick={() => setLessonSkipOn(!lessonSkipOn)}
                  label={t('skipDemo')}
                />
              </div>

              <div className="setting-row col">
                <span>{t('dailyLimit')}</span>
                <div className="limit-options">
                  {[0, 15, 30, 60].map((m) => (
                    <button
                      key={m}
                      className={`limit-btn ${dailyLimitMin === m ? 'active' : ''}`}
                      onClick={() => setDailyLimit(m)}
                    >
                      {m === 0 ? t('noLimit') : `${m}${t('minutes')}`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="setting-row col">
                <span>{t('changePin')}</span>
                <div className="pin-change">
                  <input
                    className="pin-input small"
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={newPin}
                    placeholder={t('newPin')}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  />
                  <KidButton
                    color="green"
                    disabled={newPin.length !== 4}
                    onClick={() => {
                      setParentPin(newPin);
                      setNewPin('');
                      setSavedTip(true);
                      window.setTimeout(() => setSavedTip(false), 1500);
                    }}
                  >
                    {t('save')}
                  </KidButton>
                </div>
                {savedTip && <p className="saved-tip">{t('saved')}</p>}
              </div>

              <div className="setting-row danger">
                <button className="danger-btn" onClick={() => setConfirmClear(true)}>
                  {t('clearData')}
                </button>
              </div>
            </div>
          )}

          {tab === 'report' && (
            <div className="parent-report">
              {profiles.length === 0 && <p className="empty-tip">{t('noData')}</p>}
              {profiles.map((p) => {
                const mine = childRecords(records, p.id);
                return (
                  <div key={p.id} className="report-child">
                    <div className="report-head">
                      <span className="report-avatar">{p.avatar}</span>
                      <b>{p.name}</b>
                      <span className="report-age">{gradeLabel(p.ageBand, lang)}</span>
                      <span className="report-stars">⭐ {childTotalStars(records, p.id)}</span>
                    </div>
                    {mine.length === 0 ? (
                      <p className="empty-tip small">{t('noData')}</p>
                    ) : (
                      <>
                        <div className="report-rows">
                          {games
                            .filter((g) => g.status === 'ready')
                            .map((g) => {
                              const recs = mine.filter((r) => r.gameId === g.id);
                              if (recs.length === 0) return null;
                              const best = starsForGame(records, p.id, g.id);
                              const acc = Math.round(
                                (recs.reduce((s, r) => s + r.correct, 0) /
                                  recs.reduce((s, r) => s + r.total, 0)) *
                                  100,
                              );
                              return (
                                <div key={g.id} className="report-row">
                                  <span className="report-game">
                                    {g.icon} {g.name[lang]}
                                  </span>
                                  <span className="report-metric">⭐{best}</span>
                                  <span className="report-metric">
                                    {t('playCount')} {recs.length}
                                  </span>
                                  <span className="report-metric">{acc}%</span>
                                </div>
                              );
                            })}
                        </div>
                        <div className="week-chart">
                          <div className="week-label">{t('last7days')}</div>
                          <div className="bars">
                            {Array.from({ length: 7 }).map((_, i) => {
                              const d = new Date();
                              d.setDate(d.getDate() - (6 - i));
                              const dayStart = new Date(d);
                              dayStart.setHours(0, 0, 0, 0);
                              const dayEnd = new Date(d);
                              dayEnd.setHours(23, 59, 59, 999);
                              const n = mine.filter(
                                (r) => r.playedAt >= dayStart.getTime() && r.playedAt <= dayEnd.getTime(),
                              ).length;
                              const max = Math.max(1, ...Array.from({ length: 7 }, (_, j) => {
                                const dd = new Date();
                                dd.setDate(dd.getDate() - (6 - j));
                                const s = new Date(dd); s.setHours(0, 0, 0, 0);
                                const e = new Date(dd); e.setHours(23, 59, 59, 999);
                                return mine.filter((r) => r.playedAt >= s.getTime() && r.playedAt <= e.getTime()).length;
                              }));
                              return (
                                <div key={i} className="bar-col">
                                  <div
                                    className="bar"
                                    style={{ height: `${Math.round((n / max) * 100)}%` }}
                                  />
                                  <span className="bar-day">{`${d.getMonth() + 1}/${d.getDate()}`}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {confirmClear && (
        <Modal>
          <div className="modal-panel">
            <div className="modal-emoji">⚠️</div>
            <p className="modal-text">{t('clearConfirm')}</p>
            <div className="modal-actions">
              <KidButton color="white" onClick={() => setConfirmClear(false)}>
                {t('cancel')}
              </KidButton>
              <KidButton color="coral" onClick={doClear}>
                {t('delete')}
              </KidButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
