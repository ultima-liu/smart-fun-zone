import { useStore } from '../store';
import { useI18n } from '../i18n';
import { gradeLabel } from '../types';
import AvatarFigure from './AvatarFigure';
import type { ReactNode } from 'react';
import { SystemPlanet, type PlanetKind } from './cosmos';

/** 页头统计胶囊 */
export interface HeroStat {
  icon: ReactNode;
  value: number | string;
  tone?: 'gold' | 'coral' | 'mint' | 'teal';
  label?: string;
  /** 可选：让胶囊可点击跳转 */
  onClick?: () => void;
  ariaLabel?: string;
}

/**
 * PageHero · 统一高级页头
 * 发光玻璃卡：孩子虚拟角色 + 页标题 + 年级 + 统计胶囊
 */
export default function PageHero({
  eyebrow,
  title,
  stats = [],
  showAvatar = true,
  planet,
}: {
  eyebrow: string;
  title: string;
  stats?: HeroStat[];
  showAvatar?: boolean;
  planet?: PlanetKind;
}) {
  const { lang } = useI18n();
  const child = useStore((s) => s.profiles.find((p) => p.id === s.activeChildId));
  const equipped = useStore((s) => (s.activeChildId ? s.equipped[s.activeChildId] : undefined));
  const colorway = useStore((s) => (s.activeChildId ? s.avatarColor[s.activeChildId] : undefined));
  const hair = useStore((s) => (s.activeChildId ? s.avatarHair[s.activeChildId] : undefined));
  return (
    <header className="page-hero">
      <div className="ph-glow" aria-hidden="true" />
      {planet && (
        <span className="ph-planet" aria-hidden="true">
          <SystemPlanet kind={planet} size={44} />
        </span>
      )}
      {showAvatar && child && (
        <div className="ph-avatar">
          <AvatarFigure size={88} equipped={equipped} colorway={(colorway as never) ?? 'pink'} hairstyle={(hair as never) ?? 'sporty'} />
        </div>
      )}
      <div className="ph-text">
        <span className="ph-eyebrow">{eyebrow}</span>
        <h1 className="ph-title">{title}</h1>
        {child && (
          <p className="ph-sub">
            {child.avatar} {child.name} · {gradeLabel(child.ageBand, lang)}
          </p>
        )}
      </div>
      {stats.length > 0 && (
        <div className="ph-stats">
          {stats.map((st, i) => {
            const cls = `ph-stat ${st.tone ?? 'teal'}${st.onClick ? ' clickable' : ''}`;
            const inner = (
              <>
                <i>{st.icon}</i>
                <b>{st.value}</b>
                {st.label && <small>{st.label}</small>}
              </>
            );
            return st.onClick ? (
              <button key={i} className={cls} onClick={st.onClick} aria-label={st.ariaLabel ?? st.label}>
                {inner}
              </button>
            ) : (
              <span key={i} className={cls}>{inner}</span>
            );
          })}
        </div>
      )}
      <span className="ph-spark s1" aria-hidden="true">✦</span>
      <span className="ph-spark s2" aria-hidden="true">✧</span>
      <span className="ph-spark s3" aria-hidden="true">✦</span>
    </header>
  );
}
