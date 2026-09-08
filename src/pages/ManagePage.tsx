import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { KidButton, TopBar } from '../components/ui';
import { api, isLoggedIn, type ChildInfo } from '../api';

/** 管理页：家长（本家庭孩子管理+学习入口） / 管理员（另加家长账号管理） */
export default function ManagePage() {
  const nav = useNavigate();
  const addProfile = useStore((s) => s.addProfile);
  const setActiveChild = useStore((s) => s.setActiveChild);
  const [children, setChildren] = useState<ChildInfo[]>([]);
  const [pw, setPw] = useState('');
  const pwRef = useRef<HTMLInputElement>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  // 管理员区
  const role = (() => { try { return localStorage.getItem('sfz_role') ?? ''; } catch { return ''; } })();
  const isAdmin = role === 'admin';
  const [cName, setCName] = useState('');
  const [pName, setPName] = useState('');
  const [pPw, setPPw] = useState('');
  const [parents, setParents] = useState<{ id: number; nickname: string; login_name: string }[]>([]);

  const reload = async (preferId?: number | null) => {
    const me = await api.me();
    if (me?.ok) {
      setChildren(me.children);
      setSel(preferId !== undefined ? preferId : (v) => v ?? me.children[0]?.id ?? null);
    }
    if (isAdmin) {
      const lp = await api.listParents();
      if (lp?.ok) setParents(lp.parents);
    }
  };
  useEffect(() => { void reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  useEffect(() => { if (!isLoggedIn()) nav('/child-login'); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const openAccount = async (childId: number) => {
    if (pw.length < 4) return setMsg('请设置至少 4 位密码');
    const name = children.find((c) => c.id === childId)?.name;
    const r = await api.childAccount(childId, pw, name);
    setMsg(r?.ok ? `✅ 已开通：登录名「${r.loginName}」/ 密码「${pw}」` : '开通失败（登录名可能被占用）');
    setPw('');
  };

  const enterAsChild = async (childId: number) => {
    const info = children.find((c) => c.id === childId);
    if (!info) return;
    const s = useStore.getState();
    const existing = s.profiles.find((p) => p.name === info.name);
    const localId = existing ? existing.id : `c${Date.now()}`;
    if (!existing) {
      addProfile({
        id: localId,
        name: info.name,
        avatar: info.avatar,
        ageBand: (info.grade as never) ?? 'g1',
        createdAt: Date.now(),
      });
    }
    const { childMap, saveChildMap } = await import('../cloud');
    const m = { ...childMap() } as Record<string, number>;
    m[localId] = childId;
    saveChildMap(m);
    setActiveChild(localId);
    nav('/lobby');
  };

  const createParent = async () => {
    if (pName.trim().length < 2 || pPw.length < 4) return setMsg('家长名至少 2 字、密码至少 4 位');
    const r = await api.createParent(pName.trim(), pPw);
    setMsg(r?.ok ? `✅ 已创建家长账号：登录名「${r.loginName}」/ 密码「${pPw}」` : '创建失败（登录名可能被占用）');
    setPName(''); setPPw('');
    if (isAdmin) { const lp = await api.listParents(); if (lp?.ok) setParents(lp.parents); }
  };

  return (
    <div className="page manage">
      <TopBar eyebrow="Manage · 管理" title={`${isAdmin ? '管理员' : '家长'}管理`} onBack={() => nav('/')} />
      <div className="parent-cloud">
        <div className="cloud-card">
          <b>👧 孩子学习账号</b>
          {children.length === 0 && <p className="empty-tip small">还没有孩子，先在下方新增一个孩子档案：</p>}
          {children.length > 0 && (
            <>
              <div className="cloud-actions">
                {children.map((c) => (
                  <button key={c.id} className={`term-tab ${sel === c.id ? 'active' : ''}`} style={{ flex: '0 1 auto', padding: '7px 12px', fontSize: 13 }} onClick={() => setSel(c.id)}>
                    {c.avatar} {c.name}
                  </button>
                ))}
              </div>
              <div className="plan-add">
                <input ref={pwRef} className="pin-input small" type="password" placeholder="开通/重置密码（≥4位）" value={pw} onChange={(e) => setPw(e.target.value)} />
                <KidButton color="purple" disabled={!sel || pw.length < 4} onClick={() => sel && void openAccount(sel)}>开通/重置</KidButton>
              </div>
              <KidButton color="green" disabled={!sel} onClick={() => sel && void enterAsChild(sel)}>▶ 以所选孩子进入学习</KidButton>
              <p className="plan-note">孩子也可在登录页「我是孩子」输入登录名+密码登录本设备。</p>
            </>
          )}
          <div className="plan-add">
            <input className="pin-input small" placeholder="新增孩子（如：豆豆）" value={cName} onChange={(e) => setCName(e.target.value)} />
            <KidButton color="purple" disabled={!cName.trim()} onClick={() => void createChild()}>新增孩子</KidButton>
          </div>
        </div>

        {isAdmin && (
          <div className="cloud-card">
            <b>👩 家长账号管理（管理员）</b>
            <div className="plan-add">
              <input className="pin-input small" placeholder="家长名（登录名）" value={pName} onChange={(e) => setPName(e.target.value)} />
            </div>
            <div className="plan-add">
              <input className="pin-input small" type="password" placeholder="初始密码（≥4位）" value={pPw} onChange={(e) => setPPw(e.target.value)} />
              <KidButton color="purple" disabled={pName.trim().length < 2 || pPw.length < 4} onClick={() => void createParent()}>创建家长</KidButton>
            </div>
            {parents.length > 0 && (
              <div className="plan-list">
                {parents.filter((x) => x.nickname !== '管理员').map((x) => (
                  <div key={x.id} className="plan-row">
                    <div className="plan-text"><b>{x.nickname}</b><small>登录名：{x.login_name || x.nickname}</small></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {msg && <p className="saved-tip">{msg}</p>}
      </div>
    </div>
  );

  // 新增孩子（无子账号时的第一步）
  async function createChild() {
    if (cName.trim().length < 2) return setMsg('请填写孩子名字');
    const created = await api.addChild({ name: cName.trim(), avatar: '🐯', grade: 'g1' });
    if (created?.id) {
      setCName('');
      setSel(created.id);
      setMsg(`✅ 已新增「${cName.trim()}」：请设置登录密码，再点“开通/重置”`);
      await reload(created.id);
      window.setTimeout(() => {
        pwRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        pwRef.current?.focus();
      }, 250);
    } else setMsg('创建失败');
  }
}
