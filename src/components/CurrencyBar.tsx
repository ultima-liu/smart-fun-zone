import { useStore, childTotalStars } from '../store';
import { useI18n } from '../i18n';
import { IconBean, IconStar } from './icons';

export type CurrencyType = 'stars' | 'beans' | 'stardust' | 'cardShard';

interface Props {
  /** 只显示指定货币；缺省显示全部 */
  only?: CurrencyType[];
  /** 紧凑模式（更小、胶囊更少字） */
  compact?: boolean;
}

/** 货币/材料余额条：显示孩子的星星/卷星币/星屑/星尘 */
export default function CurrencyBar({ only, compact }: Props) {
  const { t } = useI18n();
  const childId = useStore((s) => s.activeChildId);
  const records = useStore((s) => s.records);
  const beans = useStore((s) => (s.activeChildId ? s.points[s.activeChildId] ?? 0 : 0));
  const materials = useStore((s) => (s.activeChildId ? s.materials[s.activeChildId] : undefined));

  const stars = childId ? childTotalStars(records, childId) : 0;
  const stardust = materials?.stardust ?? 0;
  const cardShard = materials?.cardShard ?? 0;

  const items: { key: CurrencyType; icon: React.ReactNode; value: number; label: string }[] = [
    { key: 'stars' as CurrencyType, icon: <IconStar size={16} gradient="gold" />, value: stars, label: t('totalStars') },
    { key: 'beans' as CurrencyType, icon: <IconBean size={16} gradient="gold" />, value: beans, label: t('beans') },
    { key: 'stardust' as CurrencyType, icon: <span aria-hidden="true">✨</span>, value: stardust, label: t('stardustLabel') },
    { key: 'cardShard' as CurrencyType, icon: <span aria-hidden="true">💠</span>, value: cardShard, label: t('cardShardLabel') },
  ].filter((i) => !only || only.includes(i.key));

  return (
    <div className={`currency-bar${compact ? ' compact' : ''}`} aria-label="balances">
      {items.map((i) => (
        <span key={i.key} className={`currency-pill c-${i.key}`} title={i.label}>
          <i className="currency-icon">{i.icon}</i>
          <b>{i.value}</b>
          {!compact && <small>{i.label}</small>}
        </span>
      ))}
    </div>
  );
}
