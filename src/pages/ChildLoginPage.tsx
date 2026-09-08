import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { api, setToken } from '../api';
import { saveChildMap, childMap, pullAll } from '../cloud';
import type { Grade } from '../types';

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

function Field({ label, ...rest }: FieldProps) {
  return (
    <label className="lg-field">
      <span className="lg-label">{label}</span>
      <input className="lg-input" {...rest} />
    </label>
  );
}

/** 孩子登录页（无家长中心 / 只保留孩子登录） */
export default function ChildLoginPage() {
  const nav = useNavigate();
  const addProfile = useStore((s) => s.addProfile);
  const setActiveChild = useStore((s) => s.setActiveChild);
  const [name, setName] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!name.trim() || pass.length < 4) return setErr('请输入登录名和至少 4 位密码');
    setBusy(true);
    setErr('');
    const r = await api.childLogin(name.trim(), pass);
    setBusy(false);
    if (!r?.ok || !r.token || !r.childId) {
      setErr('账号或密码不正确，请让家长帮忙查看');
      return;
    }
    setToken(r.token);
    const s = useStore.getState();
    const existing = s.profiles.find((p) => p.name === (r.name ?? name.trim()));
    const localId = existing ? existing.id : `c${Date.now()}`;
    if (!existing) {
      addProfile({ id: localId, name: r.name ?? name.trim(), avatar: r.avatar ?? '🐯', ageBand: (r.grade as Grade) ?? 'g1', createdAt: Date.now() });
    }
    const m = { ...childMap() } as Record<string, number>;
    m[localId] = r.childId;
    saveChildMap(m);
    setActiveChild(localId);
    void pullAll(r.childId, localId);
    nav('/lobby');
  };

  return (
    <div className="page child-login">
      <div className="lg-wrap">
        <button type="button" className="lg-back" onClick={() => nav('/')} aria-label="back">
          ‹ 返回
        </button>
        <div className="lg-brand">🪐 卷卷星球</div>
        <form className="lg-card" onSubmit={submit}>
          <Field label="登录名" value={name} placeholder="例如：乐乐" autoComplete="username" onChange={(e) => setName(e.target.value)} />
          <Field label="密码" type="password" value={pass} placeholder="输入你的密码" autoComplete="current-password" onChange={(e) => setPass(e.target.value)} />
          {err && <p className="lg-err">⚠️ {err}</p>}
          <button type="submit" className="lg-submit" disabled={busy}>
            {busy ? '登录中…' : '🚀 登陆卷星'}
          </button>
          <p className="lg-hint">还没有账号？请联系家长开通。</p>
        </form>
      </div>
    </div>
  );
}
