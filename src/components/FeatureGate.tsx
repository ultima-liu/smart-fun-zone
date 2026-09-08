import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { useI18n } from '../i18n';
import { EMPTY, isFeatureOpen, type FeatureKey } from '../features';

interface Props {
  feature: FeatureKey;
  children: ReactNode;
}

const FEATURE_NAME: Record<FeatureKey, string> = {
  school: '星环学校',
  park: '空中乐园',
  store: '补给站',
  hq: '卷星总部',
};

/** 新手剧情门禁：功能未解锁时显示"先去完成剧情"锁定页，不放行页面内容 */
export default function FeatureGate({ feature, children }: Props) {
  const nav = useNavigate();
  const { lang } = useI18n();
  const child = useStore((s) => s.profiles.find((p) => p.id === s.activeChildId));
  const doneList = useStore((s) => (s.activeChildId ? s.storyDone[s.activeChildId] ?? EMPTY : EMPTY));

  const unlocked = !!child && isFeatureOpen(feature, doneList);
  if (unlocked) return <>{children}</>;

  const zh = lang !== 'en';
  return (
    <div className="page feature-lock">
      <div className="fl-card">
        <span className="fl-icon" aria-hidden="true">🔒</span>
        <h2>{zh ? `「${FEATURE_NAME[feature]}」还未开启` : `${FEATURE_NAME[feature]} is locked`}</h2>
        <p>{zh ? '完成对应的剧情任务后，这里就会为你解锁！先回首页和小卷看看吧。' : 'Finish the story quest first, then this place will open for you!'}</p>
        <button className="kid-btn fl-go" onClick={() => nav('/')}>
          {zh ? '📖 回首页看剧情' : '📖 Back to Home'}
        </button>
      </div>
    </div>
  );
}
