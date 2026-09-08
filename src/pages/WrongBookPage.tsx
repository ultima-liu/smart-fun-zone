import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { useI18n } from '../i18n';
import { KidButton, TopBar } from '../components/ui';
import { gradeLabel } from '../types';

/** 孩子的错题本：看自己答错的题，并可“再去练一遍” */
export default function WrongBookPage() {
  const nav = useNavigate();
  const { t, lang } = useI18n();
  const child = useStore((s) => s.profiles.find((p) => p.id === s.activeChildId));
  const wrongs = useStore((s) => s.wrongs);
  const removeWrong = useStore((s) => s.removeWrong);

  const list = child ? wrongs[child.id] ?? [] : [];

  return (
    <div className="page wrongs-page">
      <TopBar eyebrow="Wrong Book · 错题本" title={t('wrongBook')} onBack={() => nav('/')} />
      {!child ? (
        <p className="empty-tip">{t('noData')}</p>
      ) : list.length === 0 ? (
        <div className="wrongs-empty">
          <div className="empty-emoji">🎉</div>
          <p className="empty-tip">还没有错题，太棒啦！</p>
          <KidButton color="green" onClick={() => nav('/map')}>
            去学习
          </KidButton>
        </div>
      ) : (
        <div className="wrongs-list">
          <p className="wrongs-note">👋 {child.name}（{gradeLabel(child.ageBand, lang)}），下面是你答错的题，点“再练”就不怕啦！</p>
          {list.map((w) => (
            <div key={w.uid} className="wrong-card">
              <div className="wrong-top">
                <span className="wrong-lesson">📖 {w.lessonName || w.lessonId}</span>
                <button className="plan-del" aria-label="删除" onClick={() => removeWrong(child.id, w.uid)}>
                  ✕
                </button>
              </div>
              <div className="wrong-answer">
                答错的答案：<b>{w.answer || '（这一题没选对哦）'}</b>
              </div>
              <div className="wrong-bottom">
                <span className="wrong-kind">题型：{w.kind}</span>
                <KidButton color="mint" className="small-btn" onClick={() => nav(`/practice/${w.lessonId}`)}>
                  🔁 {t('again')}
                </KidButton>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
