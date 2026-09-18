import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken, logout } from '../api';
import { useStore as useStoreState } from '../store';
import { effectiveCatalog, KIND_LABEL, CATALOG, type ItemKind } from '../points';
import { TASKS, type TaskDef } from '../tasks';
import { IconBean } from '../components/icons';

type Section = 'dashboard' | 'children' | 'parents' | 'content' | 'store';

interface ChildRow {
  id: number;
  name: string;
  avatar: string;
  grade: string;
  has_login: number;
  login_name: string | null;
  parent_nick: string | null;
  parent_login: string | null;
}
interface VersionRow {
  version: number;
  note: string;
  created_at: string;
}
interface LessonRow {
  id: string;
  name: string;
  subject: string;
  grade: string;
  term: string;
}
interface EditedLesson {
  id: string;
  text: string;
  words: string;
  points: string;
  dirty: boolean;
}

const SUBJECT_LABELS: Record<string, string> = { math: '数学', chinese: '语文' };
const GRADE_LABELS: Record<string, string> = {
  g1: '一年级', g2: '二年级', g3: '三年级', g4: '四年级', g5: '五年级', g6: '六年级',
};

function fmtDate(s: string): string {
  try { return new Date(s).toLocaleString(); } catch { return s; }
}

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
  const [edits, setEdits] = useState<Record<string, { name: string; cost: string; icon: string }>>({});
  const [taskEdits, setTaskEdits] = useState<Record<string, string>>({});
  const [newItem, setNewItem] = useState<{ kind: ItemKind; name: string; cost: string; icon: string }>({ kind: 'outfit', name: '', cost: '', icon: '🎁' });
  const storeItems = effectiveCatalog(storeOverrides);
  const saveItem = (id: string) => {
    const e = edits[id];
    if (!e) return;
    patchStoreItem(id, { name: e.name || undefined, cost: Number(e.cost) || undefined, icon: e.icon || undefined });
    setMsg(`已保存商品 ${id}`); pushRemote();
  };
  const toggleOn = (id: string, on: boolean) => { patchStoreItem(id, { on }); pushRemote(); };
  const patchKindItem = () => {
    if (!newItem.name.trim() || !newItem.cost) return setMsg('请填写名称与价格');
    const id = `${newItem.kind === 'outfit' ? 'o' : newItem.kind === 'badge' ? 'b' : newItem.kind === 'item' ? 'i' : 'rw'}-custom-${Date.now()}`;
    patchStoreItem(id, { id, kind: newItem.kind, name: newItem.name.trim(), cost: Number(newItem.cost), icon: newItem.icon || '🎁', on: true });
    setNewItem({ kind: 'outfit', name: '', cost: '', icon: '🎁' });
    setMsg('已新增商品'); pushRemote();
  };
  const saveTask = (id: string) => {
    const v = Number(taskEdits[id]);
    if (Number.isFinite(v) && v > 0) { patchTask(id, { reward: v }); setMsg(`已设置任务 ${id} 分值 ${v}`); pushRemote(); }
  };
  // 发布到服务端（全局唯一权威），所有端启动拉取
  const pushRemote = () => {
    const s = useStoreState.getState();
    void api.saveStoreConfig(s.storeOverrides, s.taskOverrides);
  };

  // 管理员登录（未登录/非 admin 时直接在 /admin 页登录）
  const [lgName, setLgName] = useState('');
  const [lgPw, setLgPw] = useState('');
  const [lgErr, setLgErr] = useState('');

  // 总览
  const [dash, setDash] = useState<{ parents: number; children: number; weekPractice: number; weekWrong: number; weekRead: number; totalStars: number; contentVersion: number; contentNote: string } | null>(null);

  // 孩子检索
  const [kids, setKids] = useState<ChildRow[]>([]);
  const [kidQ, setKidQ] = useState('');
  const [kidSel, setKidSel] = useState<ChildRow | null>(null);
  const [kidResetPw, setKidResetPw] = useState('');
  const kidResetRef = useRef<HTMLInputElement>(null);

  // 家长账号
  const [parents, setParents] = useState<{ id: number; nickname: string; login_name: string; role: string }[]>([]);
  const [pName, setPName] = useState('');
  const [pPw, setPPw] = useState('');
  const [pSel, setPSel] = useState<{ id: number; nickname: string; login_name: string; role: string } | null>(null);
  const [pNewPw, setPNewPw] = useState('');

  // 内容编辑
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [lSubject, setLSubject] = useState('math');
  const [lGrade, setLGrade] = useState('g1');
  const [lSearch, setLSearch] = useState('');
  const [lSel, setLSel] = useState<LessonRow | null>(null);
  const [edit, setEdit] = useState<EditedLesson | null>(null);
  const [versions, setVersions] = useState<VersionRow[]>([]);

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
    setDash(null); setKids([]); setParents([]); setLessons([]); setEdit(null); setVersions([]);
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

  const loadVersions = async () => {
    const r = await api.adminVersions();
    if (r?.ok) setVersions(r.versions);
  };

  const loadLessons = async () => {
    const r = await api.adminLessons({ subject: lSubject, grade: lGrade, search: lSearch.trim() });
    if (r?.ok) { setLessons(r.lessons); setLSel(null); setEdit(null); } else setLessons([]);
  };

  const openLesson = async (row: LessonRow) => {
    setLSel(row);
    const r = await api.adminLesson(row.id);
    if (r?.ok) setEdit({ id: row.id, text: r.lesson.text ?? '', words: (r.lesson.words ?? []).join('、'), points: (r.lesson.points ?? []).join('；'), dirty: false });
    else setEdit(null);
  };

  useEffect(() => { if (authed) void loadDashboard(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [authed]);
  useEffect(() => { if (authed && section === 'children') void loadChildren(); if (authed && section === 'parents') void loadParents(); if (authed && section === 'content') { void loadVersions(); void loadLessons(); } /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [section, authed]);
  useEffect(() => { if (authed && section === 'content') void loadVersions(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [dash]);

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

  const toggleDisable = async (p: { id: number; nickname: string; role: string }) => {
    if (p.nickname === '管理员') return setMsg('不能停用管理员');
    const r = await api.adminParentUpdate(p.id, { disabled: true });
    setMsg(r?.ok ? `⚠️ 已停用「${p.nickname}」` : '操作失败');
    void loadParents();
  };

  const saveLesson = async () => {
    if (!edit) return;
    setBusy(true);
    const r = await api.adminSaveLesson({
      id: edit.id,
      text: edit.text.trim() || undefined,
      words: edit.words.trim() ? edit.words.split(/[、,，\s]+/).filter(Boolean) : undefined,
      points: edit.points.trim() ? edit.points.split(/[；;、\n]+/).map((s) => s.trim()).filter(Boolean) : undefined,
    });
    setBusy(false);
    setMsg(r?.ok ? `已保存第 ${edit.id} 课的修改（未发布）` : '保存失败');
    setEdit((e) => (e ? { ...e, dirty: false } : e));
  };

  const publish = async () => {
    setBusy(true);
    const r = await api.adminPublish();
    setBusy(false);
    setMsg(r?.ok ? `✅ 已发布 v${r.version}：应用 ${r.applied} 课修改` : '发布失败');
    if (r?.ok) void loadVersions();
  };

  const rollback = async (version: number) => {
    if (!window.confirm(`确认回滚到 v${version}？（将内容复制为最新版本，保留历史）`)) return;
    setBusy(true);
    const r = await api.adminRollback(version);
    setBusy(false);
    setMsg(r?.ok ? `✅ 已回滚并发布为 v${r.version}` : '回滚失败');
    if (r?.ok) void loadVersions();
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
            ['content', '✏️ 内容编辑'],
            ['store', '🏪 卷卷豆与补给站'],
          ] as [Section, string][]).map(([k, label]) => (
            <button key={k} type="button" className={`adm-nav-btn ${section === k ? 'active' : ''}`} onClick={() => setSection(k)}>{label}</button>
          ))}
        </nav>
        <button type="button" className="adm-nav-btn adm-quit" onClick={() => { nav('/'); }}>🏠 返回首页</button>
        <button type="button" className="adm-nav-btn adm-logout" onClick={doLogout}>🚪 退出登录</button>
      </aside>

      <main className="adm-main">
        <header className="adm-head">
          <div className="adm-head-title">{section === 'dashboard' ? '数据总览' : section === 'children' ? '孩子账号' : section === 'parents' ? '家长账号' : section === 'content' ? '内容编辑' : '卷卷豆与补给站'}</div>
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
                <div className="adm-info-card">
                  <b>内容包状态</b>
                  <p>当前版本 <b>v{dash.contentVersion}</b> — {dash.contentNote || '（无说明）'}</p>
                  <button type="button" className="kid-btn coral" onClick={() => setSection('content')}>进入内容编辑 →</button>
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
              <div className="adm-tr adm-th"><span>孩子</span><span>年级</span><span>家长</span><span>账号</span><span>操作</span></div>
              {kids.length === 0 && <p className="adm-empty">没有匹配结果</p>}
              {kids.map((k) => (
                <div className="adm-tr" key={k.id}>
                  <span>{k.avatar} {k.name}</span>
                  <span>{GRADE_LABELS[k.grade] ?? k.grade}</span>
                  <span>{k.parent_nick ?? k.parent_login ?? '—'}</span>
                  <span>{k.has_login ? `✅ ${k.login_name ?? ''}` : '未开通'}</span>
                  <span className="adm-ops">
                    <button type="button" className="kid-btn purple small" onClick={() => { setKidSel(k); setKidResetPw(''); window.setTimeout(() => kidResetRef.current?.focus(), 60); }}>开通/重置</button>
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
              <div className="adm-tr adm-th"><span>家长</span><span>登录名</span><span>角色</span><span>操作</span></div>
              {parents.length === 0 && <p className="adm-empty">暂无家长账号</p>}
              {parents.map((p) => (
                <div className="adm-tr" key={p.id}>
                  <span>{p.nickname}</span>
                  <span>{p.login_name || p.nickname}</span>
                  <span>{p.role === 'admin' ? '管理员' : '家长'}</span>
                  <span className="adm-ops">
                    <button type="button" className="kid-btn sky small" onClick={() => { setPSel(p); setPNewPw(''); }}>改密</button>
                    {p.role !== 'admin' && (
                      <button type="button" className="kid-btn coral small" onClick={() => void toggleDisable(p)}>停用</button>
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

        {section === 'content' && (
          <div className="adm-panel">
            <div className="adm-filters">
              <select className="adm-input" value={lSubject} onChange={(e) => setLSubject(e.target.value)}>
                {Object.entries(SUBJECT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select className="adm-input" value={lGrade} onChange={(e) => setLGrade(e.target.value)}>
                {Object.entries(GRADE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input className="adm-input" placeholder="搜索课文/课程名" value={lSearch} onChange={(e) => setLSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void loadLessons()} />
              <button type="button" className="kid-btn green" onClick={() => void loadLessons()}>检索课程</button>
            </div>

            <div className="adm-split">
              <div className="adm-lessons">
                <div className="adm-lessons-title">课程列表（{lessons.length}）</div>
                {lessons.length === 0 && <p className="adm-empty">无匹配课程</p>}
                {lessons.map((l) => (
                  <button key={l.id} type="button" className={`adm-lesson ${lSel?.id === l.id ? 'active' : ''}`} onClick={() => void openLesson(l)}>
                    <span className="adm-lesson-name">{l.name}</span>
                    <span className="adm-lesson-id">{l.id}</span>
                  </button>
                ))}
              </div>

              <div className="adm-editor">
                {!edit && <p className="adm-empty">← 从左侧选择一课进行可视化编辑</p>}
                {edit && (
                  <>
                    <div className="adm-editor-title">编辑：{edit.id}</div>
                    <label className="adm-field">课文正文（text）
                      <textarea className="adm-textarea" rows={6} value={edit.text} onChange={(e) => setEdit({ ...edit, text: e.target.value, dirty: true })} />
                    </label>
                    <label className="adm-field">生字/关键词（用 、 或逗号分隔）
                      <textarea className="adm-textarea" rows={3} value={edit.words} onChange={(e) => setEdit({ ...edit, words: e.target.value, dirty: true })} />
                    </label>
                    <label className="adm-field">知识点要点（用 ；或换行分隔）
                      <textarea className="adm-textarea" rows={4} value={edit.points} onChange={(e) => setEdit({ ...edit, points: e.target.value, dirty: true })} />
                    </label>
                    <div className="adm-editor-btns">
                      <button type="button" className="kid-btn purple" disabled={busy} onClick={() => void saveLesson()}>保存修改（未发布）</button>
                      <button type="button" className="kid-btn green" disabled={busy} onClick={() => void publish()}>🚀 发布为新版本</button>
                    </div>
                  </>
                )}

                <div className="adm-versions">
                  <div className="adm-lessons-title">已发布版本</div>
                  {versions.map((v) => (
                    <div key={v.version} className="adm-version">
                      <div><b>v{v.version}</b> — {v.note || '（无说明）'}</div>
                      <small>{fmtDate(v.created_at)}</small>
                      {v.version !== versions[0]?.version && (
                        <button type="button" className="kid-btn coral xsmall" disabled={busy} onClick={() => void rollback(v.version)}>回滚到此版</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        {section === 'store' && (
          <div className="adm-panel">
            <div className="adm-info-card">
              <b>🏪 卷卷豆与补给站配置（保存后立即生效，孩子端同步读取）</b>
              <p>改价格 / 上下架 / 新增商品 / 配置任务分值。卷卷豆与余额在孩子端各自独立计算。</p>
            </div>

            {/* 新增商品 */}
            <div className="adm-toolbar">
              <select className="adm-input" value={newItem.kind} onChange={(e) => setNewItem({ ...newItem, kind: e.target.value as ItemKind })}>
                {(Object.keys(KIND_LABEL) as ItemKind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
              </select>
              <input className="adm-input" placeholder="商品名" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} />
              <input className="adm-input" placeholder="图标(emoji)" value={newItem.icon} onChange={(e) => setNewItem({ ...newItem, icon: e.target.value })} style={{ width: 90 }} />
              <input className="adm-input" placeholder="价格" inputMode="numeric" value={newItem.cost} onChange={(e) => setNewItem({ ...newItem, cost: e.target.value.replace(/\D/g, '') })} style={{ width: 90 }} />
              <button type="button" className="kid-btn green" onClick={patchKindItem}>+ 新增商品</button>
            </div>

            {/* 商品列表 */}
            {(['outfit', 'badge', 'item', 'reward'] as ItemKind[]).map((kind) => (
              <div key={kind} className="adm-table">
                <div className="adm-tr adm-th"><span>🎨 {KIND_LABEL[kind]}（{storeItems.filter((i) => i.kind === kind).length}）</span><span>价格</span><span>上架</span><span>操作</span></div>
                {storeItems.filter((i) => i.kind === kind).map((it) => {
                  const e = edits[it.id] ?? { name: it.name, cost: String(it.cost), icon: it.icon };
                  return (
                    <div className="adm-tr" key={it.id}>
                      <span>
                        <input className="adm-input" style={{ width: 60 }} value={e.icon} onChange={(ev) => setEdits({ ...edits, [it.id]: { ...e, icon: ev.target.value } })} />
                        <input className="adm-input" value={e.name} onChange={(ev) => setEdits({ ...edits, [it.id]: { ...e, name: ev.target.value } })} />
                        <small style={{ display: 'block', color: 'var(--ink-faint)' }}>{it.id}</small>
                      </span>
                      <span><input className="adm-input" style={{ width: 80 }} inputMode="numeric" value={e.cost} onChange={(ev) => setEdits({ ...edits, [it.id]: { ...e, cost: ev.target.value.replace(/\D/g, '') } })} /></span>
                      <span>
                        <button type="button" className={`kid-btn ${it.on === false ? 'white' : 'mint'} xsmall`} onClick={() => toggleOn(it.id, it.on === false)}>
                          {it.on === false ? '已下架·上架' : '上架中·下架'}
                        </button>
                      </span>
                      <span className="adm-ops">
                        <button type="button" className="kid-btn purple xsmall" onClick={() => saveItem(it.id)}>保存</button>
                        <button type="button" className="kid-btn coral xsmall" onClick={() => { if (window.confirm('确认下架？')) { removeStoreItem(it.id); pushRemote(); } }}>下架</button>
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}

            {/* 任务分值配置 */}
            <div className="adm-table">
              <div className="adm-tr adm-th"><span>任务</span><span>类型</span><span>当前/默认分值</span><span>修改</span></div>
              {TASKS.map((t: TaskDef) => {
                const ov = taskOverrides[t.id];
                const cur = ov?.reward ?? t.reward;
                const enabled = ov?.enabled ?? t.enabled ?? true;
                return (
                  <div className="adm-tr" key={t.id}>
                    <span>{t.icon} {t.title}<small style={{ display: 'block', color: 'var(--ink-faint)' }}>{t.id}</small></span>
                    <span>{t.kind === 'daily' ? '每日' : t.kind === 'weekly' ? '每周' : '里程碑'}</span>
                    <span><IconBean size={15} gradient="gold" /> {cur}</span>
                    <span className="adm-ops">
                      <input className="adm-input" style={{ width: 70 }} inputMode="numeric" placeholder={String(t.reward)} value={taskEdits[t.id] ?? ''} onChange={(e) => setTaskEdits({ ...taskEdits, [t.id]: e.target.value.replace(/\D/g, '') })} />
                      <button type="button" className="kid-btn purple xsmall" onClick={() => saveTask(t.id)}>设分</button>
                      <button type="button" className={`kid-btn ${enabled ? 'white' : 'coral'} xsmall`} onClick={() => { patchTask(t.id, { enabled: !enabled }); pushRemote(); }}>{enabled ? '启用中' : '已停用'}</button>
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="empty-tip small">默认商品目录共 {CATALOG.length} 件 · 实时生效</p>
          </div>
        )}
      </main>
    </div>
  );
}
