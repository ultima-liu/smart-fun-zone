import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../store';
import { playSfx, speak, startThrust, stopThrust } from '../speech';
import { useI18n } from '../i18n';
import { api, setToken } from '../api';
import { saveChildMap, childMap, pullAll } from '../cloud';
import type { Grade } from '../types';

interface LoginDialogProps {
  onClose: () => void;
  /** 登录成功且过场结束（即将进入首页）时回调，用于触发首页到达动画 */
  onArrived?: () => void;
}

/** 过场小火箭（机头朝上） */
const CutsceneRocket = (
  <svg viewBox="0 0 80 126" width="128" height="202" className="co-rocket-svg" aria-hidden="true">
    <defs>
      <linearGradient id="coShipBody" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff"/><stop offset=".48" stopColor="#ddd8ff"/><stop offset="1" stopColor="#8f7cf5"/></linearGradient>
      <linearGradient id="coShipGlass" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#bffaff"/><stop offset="1" stopColor="#55a9e8"/></linearGradient>
      <linearGradient id="coFlame" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#fffbd1"/><stop offset=".35" stopColor="#ffd65a"/><stop offset="1" stopColor="#ff5d7d" stopOpacity="0"/></linearGradient>
    </defs>
    <path className="co-flame-main" d="M29 98 Q40 125 51 98 L47 86 H33Z" fill="url(#coFlame)"/>
    <path className="co-flame-core" d="M35 98 Q40 116 45 98 L43 89 H37Z" fill="#e8ffff"/>
    <path d="M29 62 L7 91 L30 84Z" fill="#8b79f2" stroke="#d9d0ff" strokeWidth="2"/>
    <path d="M51 62 L73 91 L50 84Z" fill="#8b79f2" stroke="#d9d0ff" strokeWidth="2"/>
    <path d="M40 8 C27 22 22 42 24 72 L27 91 Q40 101 53 91 L56 72 C58 42 53 22 40 8Z" fill="url(#coShipBody)" stroke="#5d4fc4" strokeWidth="3"/>
    <path d="M40 20 C33 27 30 39 30 50 Q40 57 50 50 C50 39 47 27 40 20Z" fill="url(#coShipGlass)" stroke="#433b9e" strokeWidth="2.5"/>
    <circle cx="36" cy="37" r="4" fill="#fff" opacity=".72"/>
    <path d="M31 72 Q40 78 49 72" fill="none" stroke="#fff" strokeWidth="2" opacity=".75"/>
    <circle cx="40" cy="85" r="4" fill="#52f0c0" stroke="#fff" strokeWidth="1.5"/>
  </svg>
);

/** 登录成功过场：seal 提示 → open 舱门开 → fly 飞船驶入消失 → close 舱门关 → 跳转 */
type PassStage = 'seal' | 'open' | 'fly' | 'close';

/** 飞船验证舱：欢迎页内弹出的登录框（可关闭），验证通过播放“开门进舱”过场 */
export default function LoginDialog({ onClose, onArrived }: LoginDialogProps) {
  const { lang } = useI18n();
  const addProfile = useStore((s) => s.addProfile);
  const setActiveChild = useStore((s) => s.setActiveChild);
  const [name, setName] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [passing, setPassing] = useState<PassStage | null>(null);
  const passTimers = useRef<number[]>([]);

  // 过场阶段推进：seal 时一次性排定各阶段；卸载时才清理，避免中途清掉后续计时器
  useEffect(() => {
    if (passing !== 'seal') return;
    const ts: number[] = [];
    const at = (ms: number, s: PassStage) => ts.push(window.setTimeout(() => setPassing(s), ms));
    at(850, 'open');
    at(2200, 'fly');
    at(5000, 'close');
    passTimers.current = ts;
  }, [passing]);

  useEffect(() => () => {
    passTimers.current.forEach((t) => window.clearTimeout(t));
    stopThrust();
  }, []);

  // 每个镜头单独配音效，避免只有登录按钮一声提示、后续画面完全无声。
  useEffect(() => {
    if (!passing) return;
    if (passing === 'seal') playSfx('verify');
    if (passing === 'open') playSfx('door');
    if (passing === 'fly') {
      playSfx('warp');
      startThrust();
    }
    if (passing === 'close') {
      stopThrust();
      playSfx('arrival');
    }
  }, [passing]);

  // close 阶段：舱门合拢（0.45s）+ 白闪收尾后交给 HomePage 收起弹窗。
  // LoginDialog 只会挂在首页；这里不再同时调用 navigate('/')，避免父组件卸载与路由切换竞态导致异常页。
  useEffect(() => {
    if (passing !== 'close') return;
    const t = window.setTimeout(() => {
      if (pendingId) setActiveChild(pendingId);
      onClose();
      onArrived?.();
    }, 1550);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passing]);

  const fail = (msg: string) => {
    setErr(msg);
    setDenied(true);
    playSfx('deny');
    // 失败语音提示（贴近场景）
    const voice = lang === 'zh'
      ? (msg.includes('至少') ? '通行证验证失败，请重新输入' : '通行证或口令不正确，验证失败，请再试一次')
      : 'Access denied. Please try again.';
    speak(voice, lang);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!name.trim() || pass.length < 4) return fail('请输入通行证和至少 4 位口令');
    setBusy(true);
    setErr('');
    setDenied(false);
    const r = await api.childLogin(name.trim(), pass);
    setBusy(false);
    if (!r?.ok || !r.token || !r.childId) {
      fail('通行证或口令不正确，请让家长帮忙查看');
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
    void pullAll(r.childId, localId);
    // 暂不切换孩子 —— 等过场结束再激活，否则欢迎页分支会卸载掉本弹窗
    setPendingId(localId);
    // 成功语音：验证通过、星门已打开
    speak(lang === 'zh' ? '验证通过，星门已打开！' : 'Access granted. The stargate is open!', lang);
    setPassing('seal');
  };

  const clearDenied = () => {
    setDenied(false);
    setErr('');
  };

  if (passing) {
    return createPortal(
      <div className={`pass-cutscene pass-cutscene-v2 stage-${passing}`} role="presentation">
        <div className="co-bg" aria-hidden="true" />
        <div className="co-nebula" aria-hidden="true"><i/><i/><i/></div>
        <div className="co-speed-lines" aria-hidden="true" />
        <div className="co-gate" aria-hidden="true">
          <i className="co-gate-ring r1"/><i className="co-gate-ring r2"/><i className="co-gate-ring r3"/>
          <span className="co-gate-core" />
        </div>
        <div className="co-verify-seal" aria-hidden="true"><i>✓</i><span/><span/><span/></div>
        <div className="co-route" aria-hidden="true"><span>身份核验</span><i/><span>星门同步</span><i/><span>跃迁完成</span></div>
        <div className="co-text">
          {passing === 'seal' && <><small>IDENTITY CONFIRMED</small><b>验证通过</b><span>正在为你校准专属航线</span></>}
          {passing === 'open' && <><small>GATE ONLINE</small><b>星门已开启</b><span>欢迎回来，{name.trim() || '小卷星人'}</span></>}
          {passing === 'fly' && <><small>HYPER JUMP</small><b>跃迁至卷卷星</b><span>抓紧扶手，星光航道已锁定</span></>}
          {passing === 'close' && <><small>ARRIVAL</small><b>抵达卷卷星</b><span>今日的冒险，现在开始</span></>}
        </div>
        <span className="co-rocket" aria-hidden="true">{CutsceneRocket}</span>
        <div className="co-door co-door-l" aria-hidden="true"><i className="co-door-pane" /></div>
        <div className="co-door co-door-r" aria-hidden="true"><i className="co-door-pane" /></div>
        <span className="co-flash" aria-hidden="true" />
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div className="ld-side" role="dialog" aria-label="星门终端验证">
      <div className={`hack-term${denied ? ' is-denied' : ''}`} role="group">
        {/* 终端标题条 */}
        <div className="hack-bar">
          <span className="hack-dots" aria-hidden="true">
            <i className="hack-dot d1" /><i className="hack-dot d2" /><i className="hack-dot d3" />
          </span>
          <span className="hack-bar-title">{denied ? '⚠ 访问被拒绝' : '卷卷星 · 星门终端'}</span>
          <button type="button" className="ld-close" onClick={onClose} aria-label="close">✕</button>
        </div>

        {/* 终端屏 */}
        <div className="hack-screen">
          {denied ? (
            <div className="hack-deny" role="alert">
              <span className="hack-deny-x" aria-hidden="true">✕</span>
              <p className="hack-deny-code">ACCESS&nbsp;DENIED</p>
              <p className="hack-deny-msg">{err}</p>
            </div>
          ) : (
            <>
              <p className="hack-line ok" aria-hidden="true">✓ 星门已连接，正在核对通行证…</p>
              <p className="hack-line dim" aria-hidden="true">▸ 请出示你的通行证与口令</p>
            </>
          )}

          <form className="hack-form" onSubmit={submit}>
            <label className="hack-field">
              <span className="hack-label"><i aria-hidden="true">▸</i> 通行证</span>
              <input className="hack-input" value={name} placeholder="例如：乐乐" autoComplete="username" spellCheck={false}
                onChange={(e) => { setName(e.target.value); clearDenied(); }} />
            </label>
            <label className="hack-field">
              <span className="hack-label"><i aria-hidden="true">▸</i> 口令</span>
              <input className="hack-input" type="password" value={pass} placeholder="* * * * * *" autoComplete="current-password"
                onChange={(e) => { setPass(e.target.value); clearDenied(); }} />
            </label>

            <button type="submit" className="hack-run" disabled={busy}>
              {busy ? <><span className="hack-spin" aria-hidden="true" /> 核对中…</> : <>⟫ 🚀 通过星门</>}
            </button>
            <p className="hack-hint">还没有通行证？请让家长帮忙办理 <b>⟫</b></p>
          </form>
        </div>
      </div>
    </div>,
    document.body,
  );
}
