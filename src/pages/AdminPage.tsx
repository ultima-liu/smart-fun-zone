import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken, logout } from '../api';
import { useStore as useStoreState } from '../store';
import { effectiveCatalog, KIND_LABEL, CATALOG } from '../points';
import { TASKS, type TaskDef } from '../tasks';
import { IconBean } from '../components/icons';

type Section = 'dashboard' | 'children' | 'parents' | 'store';

interface ChildRow {
  id: number;
  name: string;
  avatar: string;
  grade: string;
  has_login: number;
  disabled: number;
  login_name: string | null;
  parent_nick: string | null;
  parent_login: string | null;
}

const GRADE_LABELS: Record<string, string> = {
  g1: '一年级', g2: '二年级', g3: '三年级', g4: '四年级', g5: '五年级', g6: '六年级',
};

/** 管理员后台：独立 /admin 路由 + 侧边栏。角色=admin 才可访问 */
export default function AdminPage() {
  const nav = useNavigate();
  const role = useMemo(() => { try { return localStorage.getItem('sfz_role') ?? ''; } catch { return ''; } }, []);
  const isAdmin = role === 'admin';

  const [section, setSection] = useState<Section>('dashboard');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  // 卷卷豆与补给站管理
  const storeOverrides = useStoreState((s) => s.storeOverrides);
  const taskOverrides = useStoreState((s) => s.taskOverrides);
  const patchStoreItem = useStoreState((s) => s.patchStoreItem);
  const removeStoreItem = useStoreState((s) => s.removeStoreItem);
  const patchTask = useStoreState((s) => s.patchTask);
  const [edits, setEdits] = useState<Record<string, { name: string; cost: string; icon: string; acqType?: 'purchase' | 'event' }>>({});
  const [taskEdits, setTaskEdits] = useState<Record<string, string>>({});
  const [storeTab, setStoreTab] = useState<'outfit' | 'badge' | 'item' | 'reward' | 'tasks'>('outfit');
  const storeItems = effectiveCatalog(storeOverrides, true);
  const saveItem = async (id: string) => {
    const e = edits[id];
    if (!e) return;
    patchStoreItem(id, { name: e.name || undefined, cost: Number(e.cost) || undefined, icon: e.icon || undefined, acqType: e.acqType });
    if (await pushRemote()) setMsg(`✅ 已保存商品 ${id}`);
  };
  const toggleOn = async (id: string, on: boolean) => {
    patchStoreItem(id, { on });
    if (await pushRemote()) setMsg(on ? `✅ 已上架 ${id}` : `⚠️ 已下架 ${id}`);
  };
  const saveTask = async (id: string) => {
    const v = Number(taskEdits[id]);
    if (Number.isFinite(v) && v > 0) {
      patchTask(id, { reward: v });
      if (await pushRemote()) setMsg(`✅ 已设置任务 ${id} 分值 ${v}`);
    }
  };
  // 发布到服务端（全局唯一权威），所有端启动拉取；失败必须显式提示，避免本地与远端脱节
  const pushRemote = async (): Promise<boolean> => {
    const s = useStoreState.getState();
    const r = await api.saveStoreConfig(s.storeOverrides, s.taskOverrides);
    if (!r?.ok) {
      setMsg('⚠️ 已保存到本机，但同步到服务端失败：请确认管理员仍在登录状态，否则其他设备不会生效');
      return false;
    }
    return true;
  };

  // 管理员登录（未登录/非 admin 时直接在 /admin 页登录）
  const [lgName, setLgName] = useState('');
  const [lgPw, setLgPw] = useState('');
  const [lgErr, setLgErr] = useState('');

  // 总览
  const [dash, setDash] = useState<{ parents: number; children: number; weekPractice: number; weekWrong: number; weekRead: number; totalStars: number } | null>(null);

  // 孩子检索
  const [kids, setKids] = useState<ChildRow[]>([]);
  const [kidQ, setKidQ] = useState('');
  const [kidSel, setKidSel] = useState<ChildRow | null>(null);
  const [kidResetPw, setKidResetPw] = useState('');
  const kidResetRef = useRef<HTMLInputElement>(null);

  // 家长账号
  const [parents, setParents] = useState<{ id: number; nickname: string; login_name: string; role: string; disabled: number }[]>([]);
  const [pName, setPName] = useState('');
  const [pPw, setPPw] = useState('');
  const [pSel, setPSel] = useState<{ id: number; nickname: string; login_name: string; role: string; disabled: number } | null>(null);
  const [pNewPw, setPNewPw] = useState('');

  // 未通过 admin 校验时不加载数据；由渲染分支决定是否显示登录
  const guard = () => authed;
  const [authed, setAuthed] = useState(isAdmin);

  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lgName.trim() || lgPw.length < 4) return setLgErr('请输入管理员账号和至少 4 位密码');
    setBusy(true); setLgErr('');
    const r = await api.parentLogin(lgName.trim(), lgPw);
    setBusy(false);
    if (!r?.ok || !r.token) return setLgErr('账号或密码不正确');
    if (r.role !== 'admin') return setLgErr('该账号不是管理员');
    setToken(r.token);
    try { localStorage.setItem('sfz_role', 'admin'); } catch { /* ignore */ }
    setAuthed(true);
    setMsg('✅ 已登录管理员后台');
    void loadDashboard();
  };

  const doLogout = () => {
    logout();
    setAuthed(false);
    setDash(null); setKids([]); setParents([]);
    setMsg(''); setLgName(''); setLgPw('');
    setSection('dashboard');
  };

  const loadDashboard = async () => {
    if (!guard()) return;
    const d = await api.adminDashboard();
    if (d?.ok) setDash(d);
  };

  const loadChildren = async () => {
    if (!guard()) return;
    const r = await api.adminChildren(kidQ.trim());
    if (r?.ok) setKids(r.children);
  };

  const loadParents = async () => {
    if (!guard()) return;
    const r = await api.listParents();
    if (r?.ok) setParents(r.parents);
  };

  useEffect(() => { if (authed) void loadDashboard(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [authed]);
  useEffect(() => { if (authed && section === 'children') void loadChildren(); if (authed && section === 'parents') void loadParents(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [section, authed]);

  // ---- 操作 ----
  const openChildAccount = async (childId: number) => {
    setBusy(true);
    const r = await api.childAccount(childId, kidResetPw, kids.find((k) => k.id === childId)?.name);
    setBusy(false);
    setMsg(r?.ok ? `✅ 已开通/重置：登录名「${r.loginName}」/ 密码「${kidResetPw}」` : '开通失败（登录名可能被占用）');
    setKidResetPw('');
    void loadChildren();
  };

  const createParent = async () => {
    if (pName.trim().length < 2 || pPw.length < 4) return setMsg('家长名至少 2 字、密码至少 4 位');
    setBusy(true);
    const r = await api.createParent(pName.trim(), pPw);
    setBusy(false);
    setMsg(r?.ok ? `✅ 已创建家长账号：登录名「${r.loginName}」/ 密码「${pPw}」` : '创建失败（登录名可能被占用）');
    setPName(''); setPPw('');
    void loadParents();
  };

  const resetParentPw = async () => {
    if (!pSel) return;
    if (pNewPw.length < 4) return setMsg('密码至少 4 位');
    setBusy(true);
    const r = await api.adminParentUpdate(pSel.id, { password: pNewPw });
    setBusy(false);
    setMsg(r?.ok ? `✅ 已重置「${pSel.nickname}」密码` : '重置失败');
    setPNewPw('');
  };

  const toggleParentDisabled = async (p: { id: number; nickname: string; role: string; disabled: number }) => {
    if (p.role === 'admin') return setMsg('管理员账号不可停用');
    const next = !p.disabled;
    const r = await api.adminParentUpdate(p.id, { disabled: next });
    setMsg(r?.ok ? (next ? `⚠️ 已停用「${p.nickname}」` : `✅ 已启用「${p.nickname}」`) : '操作失败');
    void loadParents();
  };

  const deleteParent = async (p: { id: number; nickname: string; role: string }) => {
    if (p.role === 'admin') return setMsg('管理员账号不可删除');
    if (!window.confirm(`确认删除家长「${p.nickname}」？其家庭、孩子档案与全部学习数据将一并删除，不可恢复！`)) return;
    const r = await api.adminDeleteParent(p.id);
    setMsg(r?.ok ? `🗑️ 已删除「${p.nickname}」` : '删除失败');
    void loadParents();
  };

  const toggleChildDisabled = async (k: ChildRow) => {
    if (!k.has_login) return setMsg('该孩子尚未开通账号');
    const next = !k.disabled;
    const r = await api.adminPatchChild(k.id, { disabled: next });
    setMsg(r?.ok ? (next ? `⚠️ 已停用「${k.name}」的账号` : `✅ 已启用「${k.name}」的账号`) : '操作失败');
    void loadChildren();
  };

  const deleteChild = async (k: ChildRow) => {
    if (!window.confirm(`确认删除孩子「${k.name}」？其全部学习数据将一并删除，不可恢复！`)) return;
    const r = await api.adminDeleteChild(k.id);
    setMsg(r?.ok ? `🗑️ 已删除「${k.name}」` : '删除失败');
    void loadChildren();
  };

  const dashCard = (label: string, value: string | number, icon: string) => (
    <div className="adm-stat" key={label}>
      <div className="adm-stat-ico">{icon}</div>
      <div className="adm-stat-body">
        <div className="adm-stat-val">{value}</div>
        <div className="adm-stat-label">{label}</div>
      </div>
    </div>
  );

  if (!authed) return (
    <div className="page adm-login-page">
      <div className="adm-login-card">
        <div className="adm-login-brand">🪐 卷卷星球</div>
        <div className="adm-login-title">👮 管理员后台登录</div>
        <form className="adm-login-form" onSubmit={doLogin}>
          <label className="lg-field">
            <span className="lg-label">管理员账号</span>
            <input className="lg-input" value={lgName} placeholder="例如：admin" autoComplete="username" onChange={(e) => setLgName(e.target.value)} />
          </label>
          <label className="lg-field">
            <span className="lg-label">密码</span>
            <input className="lg-input" type="password" value={lgPw} placeholder="输入密码" autoComplete="current-password" onChange={(e) => setLgPw(e.target.value)} />
          </label>
          {lgErr && <p className="lg-err">⚠️ {lgErr}</p>}
          <button type="submit" className="lg-submit" disabled={busy}>{busy ? '登录中…' : '进入管理后台'}</button>
          <button type="button" className="lg-admin-link" onClick={() => nav('/child-login')}>← 返回家长/孩子登录</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="adm">
      <aside className="adm-side">
        <div className="adm-brand" onClick={() => nav('/')}>🪐 卷卷星球</div>
        <div className="adm-user">👮 管理员后台</div>
        <nav className="adm-nav">
          {([
            ['dashboard', '📊 数据总览'],
            ['children', '🧒 孩子账号'],
            ['parents', '👩 家长账号'],
            ['store', '📦 物品管理'],
          ] as [Section, string][]).map(([k, label]) => (
            <button key={k} type="button" className={`adm-nav-btn ${section === k ? 'active' : ''}`} onClick={() => setSection(k)}>{label}</button>
          ))}
        </nav>
        <button type="button" className="adm-nav-btn adm-quit" onClick={() => { nav('/'); }}>🏠 返回首页</button>
        <button type="button" className="adm-nav-btn adm-logout" onClick={doLogout}>🚪 退出登录</button>
      </aside>

      <main className="adm-main">
        <header className="adm-head">
          <div className="adm-head-title">{section === 'dashboard' ? '数据总览' : section === 'children' ? '孩子账号' : section === 'parents' ? '家长账号' : '物品管理'}</div>
          {msg && <div className="adm-toast">{msg}</div>}
        </header>

        {section === 'dashboard' && (
          <div className="adm-panel">
            {!dash && <p className="adm-loading">加载中…</p>}
            {dash && (
              <>
                <div className="adm-stats">
                  {dashCard('家长数', dash.parents, '👩')}
                  {dashCard('孩子数', dash.children, '🧒')}
                  {dashCard('近7天学习', dash.weekPractice, '📚')}
                  {dashCard('近7天错题', dash.weekWrong, '📕')}
                  {dashCard('近7天跟读', dash.weekRead, '🎙️')}
                  {dashCard('累计星星', dash.totalStars, '⭐')}
                </div>
              </>
            )}
          </div>
        )}

        {section === 'children' && (
          <div className="adm-panel">
            <div className="adm-toolbar">
              <input className="adm-input" placeholder="搜索孩子/家长名" value={kidQ} onChange={(e) => setKidQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void loadChildren()} />
              <button type="button" className="kid-btn green" onClick={() => void loadChildren()}>检索</button>
            </div>
            <div className="adm-table">
              <div className="adm-tr adm-th adm-tr--kids"><span>孩子</span><span>年级</span><span>家长</span><span>账号</span><span>状态</span><span>操作</span></div>
              {kids.length === 0 && <p className="adm-empty">没有匹配结果</p>}
              {kids.map((k) => (
                <div className="adm-tr adm-tr--kids" key={k.id}>
                  <span>{k.avatar} {k.name}</span>
                  <span>{GRADE_LABELS[k.grade] ?? k.grade}</span>
                  <span>{k.parent_nick ?? k.parent_login ?? '—'}</span>
                  <span>{k.has_login ? `✅ ${k.login_name ?? ''}` : '未开通'}</span>
                  <span>{!k.has_login
                    ? <span className="adm-badge mute">未开通</span>
                    : k.disabled ? <span className="adm-badge off">停用</span> : <span className="adm-badge ok">正常</span>}</span>
                  <span className="adm-ops">
                    <button type="button" className="kid-btn purple small" onClick={() => { setKidSel(k); setKidResetPw(''); window.setTimeout(() => kidResetRef.current?.focus(), 60); }}>开通/重置</button>
                    {!!k.has_login && (
                      <button type="button" className={`kid-btn ${k.disabled ? 'mint' : 'coral'} small`} onClick={() => void toggleChildDisabled(k)}>{k.disabled ? '启用' : '停用'}</button>
                    )}
                    <button type="button" className="kid-btn coral small" onClick={() => void deleteChild(k)}>删除</button>
                  </span>
                </div>
              ))}
            </div>
            {kidSel && (
              <div className="adm-inline">
                <input ref={kidResetRef} className="adm-input" type="password" placeholder={`为「${kidSel.name}」设置密码（≥4位）`} value={kidResetPw} onChange={(e) => setKidResetPw(e.target.value)} />
                <button type="button" className="kid-btn purple" disabled={busy || kidResetPw.length < 4} onClick={() => void openChildAccount(kidSel.id)}>开通/重置</button>
              </div>
            )}
          </div>
        )}

        {section === 'parents' && (
          <div className="adm-panel">
            <div className="adm-toolbar">
              <input className="adm-input" placeholder="家长名（登录名）" value={pName} onChange={(e) => setPName(e.target.value)} />
              <input className="adm-input" type="password" placeholder="初始密码（≥4位）" value={pPw} onChange={(e) => setPPw(e.target.value)} />
              <button type="button" className="kid-btn purple" disabled={busy || pName.trim().length < 2 || pPw.length < 4} onClick={() => void createParent()}>创建家长</button>
            </div>
            <div className="adm-table">
              <div className="adm-tr adm-th adm-tr--parents"><span>家长</span><span>登录名</span><span>角色</span><span>状态</span><span>操作</span></div>
              {parents.length === 0 && <p className="adm-empty">暂无家长账号</p>}
              {parents.map((p) => (
                <div className="adm-tr adm-tr--parents" key={p.id}>
                  <span>{p.nickname}</span>
                  <span>{p.login_name || p.nickname}</span>
                  <span>{p.role === 'admin' ? '管理员' : '家长'}</span>
                  <span>{p.disabled ? <span className="adm-badge off">停用</span> : <span className="adm-badge ok">正常</span>}</span>
                  <span className="adm-ops">
                    <button type="button" className="kid-btn sky small" onClick={() => { setPSel(p); setPNewPw(''); }}>改密</button>
                    {p.role !== 'admin' && (
                      <button type="button" className={`kid-btn ${p.disabled ? 'mint' : 'coral'} small`} onClick={() => void toggleParentDisabled(p)}>{p.disabled ? '启用' : '停用'}</button>
                    )}
                    {p.role !== 'admin' && (
                      <button type="button" className="kid-btn coral small" onClick={() => void deleteParent(p)}>删除</button>
                    )}
                  </span>
                </div>
              ))}
            </div>
            {pSel && (
              <div className="adm-inline">
                <input className="adm-input" type="password" placeholder={`为「${pSel.nickname}」重置密码（≥4位）`} value={pNewPw} onChange={(e) => setPNewPw(e.target.value)} />
                <button type="button" className="kid-btn sky" disabled={busy || pNewPw.length < 4} onClick={() => void resetParentPw()}>确认重置</button>
              </div>
            )}
          </div>
        )}

        {section === 'store' && (
          <div className="adm-panel">
            <div className="adm-info-card">
              <b>📦 物品管理（保存后立即生效，孩子端同步读取）</b>
              <p>改价格 / 上下架 / 配置任务分值。商品不可新增，仅管理现有目录。</p>
            </div>

            {/* 内部页签：按类别查看，页面不再过长 */}
            <div className="adm-tabs" role="tablist" aria-label="物品管理分类">
              {([['outfit', '🎨 装扮'], ['badge', '🎖️ 徽章'], ['item', '🛠️ 游戏道具'], ['reward', '🎁 奖励兑换'], ['tasks', '📊 任务分值']] as const).map(([k, label]) => (
                <button key={k} type="button" role="tab" aria-selected={storeTab === k} className={`adm-tab ${storeTab === k ? 'active' : ''}`} onClick={() => setStoreTab(k)}>{label}</button>
              ))}
            </div>

            {storeTab !== 'tasks' && (
              <div className="adm-table">
                <div className="adm-tr adm-th adm-tr--items"><span>{KIND_LABEL[storeTab]}（{storeItems.filter((i) => i.kind === storeTab).length}）</span><span>价格</span><span>上架</span><span>操作</span></div>
                {storeItems.filter((i) => i.kind === storeTab).map((it) => {
                  const e = edits[it.id] ?? { name: it.name, cost: String(it.cost), icon: it.icon ?? '', acqType: it.acqType ?? 'purchase' };
                  return (
                    <div className="adm-tr adm-tr--items" key={it.id}>
                      <span className="adm-item-main">
                        <span className="adm-item-row">
                          {it.kind === 'outfit' ? (
                            <select
                              className="adm-input adm-input--compact"
                              aria-label="获得状态"
                              title="获得状态"
                              value={e.acqType ?? 'purchase'}
                              onChange={(ev) => setEdits({ ...edits, [it.id]: { ...e, acqType: ev.target.value as 'purchase' | 'event' } })}
                            >
                              <option value="purchase">购买</option>
                              <option value="event">活动</option>
                            </select>
                          ) : (
                            <input className="adm-input adm-input--compact" aria-label="图标" value={e.icon} onChange={(ev) => setEdits({ ...edits, [it.id]: { ...e, icon: ev.target.value } })} />
                          )}
                          <input className="adm-input" aria-label="名称" value={e.name} onChange={(ev) => setEdits({ ...edits, [it.id]: { ...e, name: ev.target.value } })} />
                        </span>
                        <small className="adm-item-id">{it.id}</small>
                      </span>
                      <span><input className="adm-input" style={{ width: 80 }} inputMode="numeric" value={e.cost} onChange={(ev) => setEdits({ ...edits, [it.id]: { ...e, cost: ev.target.value.replace(/\D/g, '') } })} /></span>
                      <span>
                        <button type="button" className={`kid-btn ${it.on === false ? 'mint' : 'white'} xsmall`} onClick={() => toggleOn(it.id, it.on === false)}>
                          {it.on === false ? '上架' : '下架'}
                        </button>
                      </span>
                      <span className="adm-ops">
                        <button type="button" className="kid-btn purple xsmall" onClick={() => void saveItem(it.id)}>保存</button>
                        {storeOverrides[it.id] && (
                          <button type="button" className="kid-btn coral xsmall" onClick={async () => { if (window.confirm('确认删除该商品的修改记录，恢复为默认配置？')) { removeStoreItem(it.id); await pushRemote(); } }}>恢复默认</button>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 任务分值配置：仅在「任务分值」页签显示 */}
            {storeTab === 'tasks' && (
            <div className="adm-table">
              <div className="adm-tr adm-th adm-tr--tasks"><span>任务</span><span>类型</span><span>当前/默认分值</span><span>修改</span></div>
              {TASKS.map((t: TaskDef) => {
                const ov = taskOverrides[t.id];
                const cur = ov?.reward ?? t.reward;
                const enabled = ov?.enabled ?? t.enabled ?? true;
                return (
                  <div className="adm-tr adm-tr--tasks" key={t.id}>
                    <span>{t.icon} {t.title}<small style={{ display: 'block', color: 'var(--ink-faint)' }}>{t.id}</small></span>
                    <span>{t.kind === 'daily' ? '每日' : t.kind === 'weekly' ? '每周' : '里程碑'}</span>
                    <span><IconBean size={15} gradient="gold" /> {cur}</span>
                    <span className="adm-ops">
                      <input className="adm-input" style={{ width: 70 }} inputMode="numeric" placeholder={String(t.reward)} value={taskEdits[t.id] ?? ''} onChange={(e) => setTaskEdits({ ...taskEdits, [t.id]: e.target.value.replace(/\D/g, '') })} />
                      <button type="button" className="kid-btn purple xsmall" onClick={() => void saveTask(t.id)}>设分</button>
                      <button type="button" className={`kid-btn ${enabled ? 'white' : 'coral'} xsmall`} onClick={() => { patchTask(t.id, { enabled: !enabled }); pushRemote(); }}>{enabled ? '启用中' : '已停用'}</button>
                    </span>
                  </div>
                );
              })}
            </div>
            )}
            <p className="empty-tip small">默认商品目录共 {CATALOG.length} 件 · 实时生效</p>
          </div>
        )}
      </main>
    </div>
  );
}
