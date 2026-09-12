import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { KidButton } from '../components/ui';
import PageHero from '../components/PageHero';
import { useI18n } from '../i18n';
import { speak } from '../speech';
import { IconBean } from '../components/icons';
import { SystemPlanet } from '../components/cosmos';
import { KIND_LABEL, shelf, itemById, type ItemKind, type StoreItem } from '../points';
import { TASKS, effTask } from '../tasks';
import WardrobeAvatar from '../components/WardrobeAvatar';
import NpcBuddy from '../components/NpcBuddy';

/** 补给站：任务墙 + 3 类货架（装扮/道具/奖励兑换） + 预览 + 我的装扮 + 流水 */
export default function StorePage() {
  const nav = useNavigate();
  const { lang, t } = useI18n();
  const child = useStore((s) => s.profiles.find((p) => p.id === s.activeChildId));
  const stateNow = useStore();
  const redeemItem = useStore((s) => s.redeemItem);
  const requestReward = useStore((s) => s.requestReward);
  const equipItem = useStore((s) => s.equipItem);
  const unequipItem = useStore((s) => s.unequipItem);
  const [msg, setMsg] = useState('');
  const [preview, setPreview] = useState<StoreItem | null>(null);

  const cid = child?.id;
  const points = cid ? stateNow.points[cid] ?? 0 : 0;
  const owned = cid ? stateNow.ownedItems[cid] ?? [] : [];
  const equipped = cid ? stateNow.equipped[cid] ?? {} : {};
  const log = cid ? stateNow.pointLog[cid] ?? [] : [];
  const requests = cid ? stateNow.rewardRequests[cid] ?? [] : [];

  // 进入补给站欢迎语
  useEffect(() => {
    if (child) speak(t('welcomeStore'), lang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [child?.id]);

  useEffect(() => {
    if (!child) nav('/');
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [child]);

  if (!child) return null;

  const buy = (it: StoreItem): boolean => {
    if (!child) return false;
    const ok = redeemItem(child.id, it.id, it.cost);
    setMsg(ok ? `✅ 已兑换「${it.name}」` : owned.includes(it.id) ? '已拥有该商品' : '卷卷豆不足');
    return ok;
  };

  const askReward = (it: StoreItem) => {
    if (!child) return;
    if (requests.some((x) => x.itemId === it.id && x.status === 'pending')) return setMsg('已有待家长确认的申请');
    const ok = requestReward(child.id, { itemId: it.id, name: it.name, icon: it.icon, kind: it.kind, cost: it.cost });
    setMsg(ok ? `📮 已提交「${it.name}」申请，等家长确认` : '申请失败');
  };

  const renderCard = (it: StoreItem) => {
    const has = owned.includes(it.id);
    const afford = points >= it.cost;
    const isEquip = it.kind === 'outfit';
    const isOn = it.kind === 'outfit' && equipped.outfit === it.id;
    return (
      <div key={it.id} data-kind={it.kind} className={`store-item deck-card ${has ? 'owned' : afford ? '' : 'poor'}`}>
        <div className="store-item-icon">{it.icon}</div>
        <div className="store-item-name">{it.name}</div>
        <div className="store-item-desc">{it.desc}</div>
        {it.kind === 'reward' ? (
          requests.some((x) => x.itemId === it.id && x.status === 'approved') ? (
            <span className="store-owned">已兑换 ✓</span>
          ) : requests.some((x) => x.itemId === it.id && x.status === 'pending') ? (
            <span className="store-pending">⏳ 家长确认中…</span>
          ) : (
            <KidButton color={afford ? 'coral' : 'white'} disabled={!afford} onClick={() => askReward(it)}><IconBean size={16} gradient="gold" /> {it.cost}</KidButton>
          )
        ) : has ? (
          isEquip ? (
            isOn ? (
              <button className="equip-btn on" onClick={() => unequipItem(child.id, it.id)}>装备中 ✓</button>
            ) : (
              <button className="equip-btn" onClick={() => equipItem(child.id, it.id)}>装备</button>
            )
          ) : (
            <span className="store-owned">已拥有 ✓</span>
          )
        ) : (
          <>
            {isEquip && (
              <button className="preview-btn" onClick={() => setPreview(it)}>👁️ 预览</button>
            )}
            <KidButton color={afford ? 'mint' : 'white'} disabled={!afford} onClick={() => (isEquip ? setPreview(it) : buy(it))}><IconBean size={16} gradient="gold" /> {it.cost}</KidButton>
          </>
        )}
      </div>
    );
  };

  const SHELVES: ItemKind[] = ['outfit', 'item', 'reward'];
  const SHELF_ICON: Record<ItemKind, string> = { outfit: '🎨', badge: '🎖️', item: '🛠️', reward: '🎁' };

  return (
    <div className="page store">
      <NpcBuddy npc="铛铛" storyNodeIds={["c3-1"]} />
      <PageHero
        eyebrow={lang === 'zh' ? '补给站 · 兑换好物' : 'Supply · Rewards'}
        title={lang === 'zh' ? '补给站' : 'Supply Station'}
        planet="grocery"
        stats={[
          { icon: <IconBean size={16} gradient="gold" />, value: points, tone: 'gold', label: lang === 'zh' ? '卷卷豆' : 'Beans' },
        ]}
      />

      {/* 余额卡 */}
      <div className="store-balance">
        <span className="store-station" aria-hidden="true"><SystemPlanet kind="grocery" size={38} /></span>
        <div className="store-balance-icon"><IconBean size={26} gradient="gold" /></div>
        <div>
          <div className="store-balance-label">{child.name} 的卷卷豆</div>
          <div className="store-balance-num">{points}</div>
        </div>
        <div className="store-avatar"><WardrobeAvatar outfitId={equipped.outfit} className="wardrobe-avatar--store-mini" /></div>
      </div>

      {msg && <p className="saved-tip">{msg}</p>}

      {/* 任务（自动结算） */}
      <section className="module">
        <h3 className="module-title">✅ 任务（完成自动到账）</h3>
        <div className="task-wall">
          {TASKS.map((raw) => {
            const tk = effTask(raw);
            if (!tk.enabled) return null;
            const daySrc = tk.kind === 'daily' ? `task:${tk.id}:${new Date().toDateString()}` : `task:${tk.id}`;
            const done = log.some((e) => e.id === daySrc && e.amount > 0);
            const cur = Math.min(tk.target, tk.progress(stateNow, child.id));
            const pct = Math.round((cur / tk.target) * 100);
            return (
              <div key={tk.id} className={`task-cell deck-card ${done ? 'done' : ''}`}>
                <span className="task-cell-icon">{tk.icon}</span>
                <div className="task-cell-body">
                  <div className="task-cell-name">{tk.title} {done && <b className="task-done-tag">✓ 已完成</b>}</div>
                  <div className="task-cell-bar"><i style={{ width: `${done ? 100 : pct}%` }} /></div>
                  <div className="task-cell-meta">{done ? '已领取奖励' : `进度 ${cur}/${tk.target}`} · <IconBean size={13} gradient="gold" /> {tk.reward}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4 类货架 */}
      {SHELVES.map((kind) => (
        <section className="module" key={kind}>
          <h3 className="module-title">{SHELF_ICON[kind]} {KIND_LABEL[kind]}</h3>
          <div className="store-grid">
            {shelf(kind, stateNow.storeOverrides).map((it) => renderCard(it))}
          </div>
          {kind === 'outfit' && (
            <p className="empty-tip small">装备的装扮会显示在角色身上，快去“我的”看看效果～</p>
          )}
        </section>
      ))}

      {/* 我的装扮（已兑换，从这里换装） */}
      <section className="module">
        <h3 className="module-title">🎀 我的装扮</h3>
        {owned.length === 0 ? (
          <p className="empty-tip small">还没有装扮，去上面兑换一件吧～</p>
        ) : (
          <>
            <div className="myoutfit-preview">
              <WardrobeAvatar outfitId={equipped.outfit} className="wardrobe-avatar--store-preview" />
            </div>
            <div className="myoutfit-grid">
              {owned.map((id) => {
                const it = itemById(id);
                if (!it) return null;
                const isOutfit = it.kind === 'outfit';
                const on = isOutfit && equipped.outfit === id;
                return (
                  <div key={id} className={`myoutfit ${on ? 'on' : ''}`}>
                    <span className="myoutfit-icon">{it.icon}</span>
                    <span className="myoutfit-name">{it.name}</span>
                    {isOutfit && (
                      on ? (
                        <button className="preview-btn" onClick={() => unequipItem(child.id, id)}>卸下</button>
                      ) : (
                        <button className="equip-btn" onClick={() => equipItem(child.id, id)}>装备</button>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* 卷卷豆流水 */}
      <section className="module">
        <h3 className="module-title">📜 卷卷豆流水</h3>
        {log.length === 0 ? (
          <p className="empty-tip">还没有卷卷豆记录，快去学习/做任务赚卷卷豆吧！</p>
        ) : (
          <div className="store-log">
            {log.slice(0, 40).map((e) => (
              <div key={e.id} className="store-log-row">
                <span className="store-log-reason">{e.reason}</span>
                <span className={`store-log-amt ${e.amount > 0 ? 'plus' : 'minus'}`}>
                  {e.amount > 0 ? `+${e.amount}` : e.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 预览弹层：先试穿后购买 */}
      {preview && (() => {
        const isOutfit = preview.kind === 'outfit';
        const tmpEquipped = { ...equipped };
        if (isOutfit) tmpEquipped.outfit = preview.id;
        const afford = points >= preview.cost;
        return (
          <div className="preview-overlay" onClick={() => setPreview(null)}>
            <div className="preview-card" onClick={(e) => e.stopPropagation()}>
              <button className="preview-close" onClick={() => setPreview(null)}>✕</button>
              <div className="preview-figure">
                <WardrobeAvatar outfitId={tmpEquipped.outfit} className="wardrobe-avatar--store-modal" />
              </div>
              <div className="preview-name">{preview.icon} {preview.name}</div>
              <div className="preview-desc">{preview.desc}</div>
              <div className="preview-actions">
                <KidButton color="white" onClick={() => setPreview(null)}>再看看</KidButton>
                <KidButton color="green" disabled={!afford} onClick={() => { const ok = buy(preview); if (ok) setPreview(null); }}><IconBean size={16} gradient="gold" /> {preview.cost} 兑换</KidButton>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
