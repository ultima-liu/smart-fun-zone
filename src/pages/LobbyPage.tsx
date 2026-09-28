import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, childTotalStars, todayPlaySec, streakDays } from '../store';
import { useI18n } from '../i18n';
import { KidButton } from '../components/ui';
import Modal from '../components/Modal';
import { speakAsNpc } from '../speech';
import { npcMeta } from '../content/npc';
import { IconBean } from '../components/icons';
import NpcBuddy from '../components/NpcBuddy';

export default function LobbyPage() {
  const nav = useNavigate();
  const { t, lang } = useI18n();
  const child = useStore((s) => s.profiles.find((p) => p.id === s.activeChildId));
  const records = useStore((s) => s.records);
  const points = useStore((s) => (s.activeChildId ? s.points[s.activeChildId] ?? 0 : 0));
  const dailyLimitMin = useStore((s) => s.dailyLimitMin);
  const bonusMin = useStore((s) => (s.activeChildId ? s.bonusMin[s.activeChildId] : undefined));
  const today = new Date().toDateString();
  const effectiveLimitMin = dailyLimitMin + (bonusMin && bonusMin.day === today ? bonusMin.min : 0);
  const [resting, setResting] = useState(false);

  useEffect(() => {
    if (!child) {
      nav('/');
      return;
    }
    speakAsNpc(t('welcomeLobby'), npcMeta('泡泡'), lang);
  }, [child?.id, lang, nav, t]);

  const todaySec = useMemo(
    () => (child ? todayPlaySec(records, child.id) : 0),
    [records, child],
  );

  useEffect(() => {
    if (child && effectiveLimitMin > 0 && todaySec >= effectiveLimitMin * 60) {
      const timer = window.setTimeout(() => setResting(true), 60);
      return () => window.clearTimeout(timer);
    }
  }, [child, effectiveLimitMin, todaySec]);

  if (!child) return null;

  const totalStars = childTotalStars(records, child.id);
  const streak = streakDays(records, child.id);

  return (
    <div className="page lobby">
      <NpcBuddy npc="泡泡" storyNodeIds={["c2-1","c2-2"]} />
      <header className="park-command-header">
        <div className="park-flight-crest" aria-hidden="true"><i>✦</i><span /><b /></div>
        <div className="park-command-copy">
          <span>{lang === 'zh' ? 'SKY PARK · 云端游乐航站' : 'SKY PARK · PLAY PORT'}</span>
          <h1>{t('lobby')}</h1>
          <p>{lang === 'zh' ? `${child.name}，欢迎回到空中乐园！` : `${child.name}, welcome back to Sky Park!`}</p>
        </div>
        <div className="park-metrics" aria-label={lang === 'zh' ? '我的乐园数据' : 'My park statistics'}>
          <span><i>⭐</i><b>{totalStars}</b><small>{t('totalStars')}</small></span>
          <span><i><IconBean size={15} gradient="gold" /></i><b>{points}</b><small>{t('beans')}</small></span>
          <span><i>🔥</i><b>{streak}</b><small>{t('streakLabel')}</small></span>
        </div>
      </header>

      <section className="sky-park-forecourt" aria-label={lang === 'zh' ? '空中乐园前庭' : 'Sky park forecourt'}>
        <img src="/assets/park/sky-park-hero-v1.png" alt={lang === 'zh' ? '云海中的空中乐园游乐岛' : 'A floating amusement park in the clouds'} />
        <div className="sky-park-shade" aria-hidden="true" />
        <div className="sky-park-copy">
          <span>{lang === 'zh' ? '✦ 云端登机口已开启' : '✦ Sky gate now boarding'}</span>
          <h2>{lang === 'zh' ? '星星与欢笑，都在这里等你！' : 'Stars and laughter are waiting for you!'}</h2>
          <p>{lang === 'zh' ? '这里装着卷星所有的笑声。' : 'The park holds all the laughter of Juan Star.'}</p>
        </div>
        <div className="sky-park-flightline" aria-hidden="true"><i /><span>✦</span><i /><span>◌</span></div>
      </section>

      {effectiveLimitMin > 0 && (
        <div className="lobby-time-note" title="今日可玩时长含奖励加成">
          {lang === 'zh'
            ? `⏱ 今日已玩 ${Math.floor(todaySec / 60)} 分钟 · 剩余 ${Math.max(0, effectiveLimitMin - Math.floor(todaySec / 60))} 分钟`
            : `⏱ ${Math.floor(todaySec / 60)} min played · ${Math.max(0, effectiveLimitMin - Math.floor(todaySec / 60))} min left`}
        </div>
      )}

      {resting && (
        <Modal>
          <div className="modal-panel">
            <div className="modal-emoji">🌳</div>
            <p className="modal-text">{t('rest')}</p>
            <KidButton color="green" onClick={() => setResting(false)}>
              {t('ok')}
            </KidButton>
          </div>
        </Modal>
      )}
    </div>
  );
}
