import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { playSfx, speak } from '../speech';
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
  <svg viewBox="0 0 26 40" width="74" height="114" className="co-rocket-svg" aria-hidden="true">
    <polygon points="10.5,28 13,38 15.5,28" fill="#F6C24B" />
    <polygon points="12,29 13,34.5 14,29" fill="#FFF3CE" />
    <polygon points="10,17 4,27 9.5,25" fill="#A99BF2" />
    <polygon points="16,17 22,27 16.5,25" fill="#A99BF2" />
    <path d="M13 2 L17 10 Q18.6 15 18.6 21 L18.6 27 A5.6 5.6 0 0 1 13 32.6 A5.6 5.6 0 0 1 7.4 27 L7.4 21 Q7.4 15 9 10 Z" fill="#DCD3FF" stroke="#7C6AF0" strokeWidth="1.6" />
    <circle cx="13" cy="17" r="3.4" fill="#9ED6F7" stroke="#6B62D6" strokeWidth="1.2" />
  </svg>
);

/** 登录成功过场：seal 提示 → open 舱门开 → fly 飞船驶入消失 → close 舱门关 → 跳转 */
type PassStage = 'seal' | 'open' | 'fly' | 'close';

/** 飞船验证舱：欢迎页内弹出的登录框（可关闭），验证通过播放“开门进舱”过场 */
export default function LoginDialog({ onClose, onArrived }: LoginDialogProps) {
  const nav = useNavigate();
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
    at(600, 'open');     // 0.6s 提示后舱门开启（门开 1.4s → 2.0s 全开）
    at(2100, 'fly');     // 门全开后飞船驶入（飞行 2.2s → 4.3s 缩进中央消失）
    at(5200, 'close');   // 飞船消失后关门（提前一点点）
    passTimers.current = ts;
  }, [passing]);

  useEffect(() => () => passTimers.current.forEach((t) => window.clearTimeout(t)), []);

  // close 阶段：舱门合拢（0.45s）+ 白闪收尾后直接进入首页
  useEffect(() => {
    if (passing !== 'close') return;
    const t = window.setTimeout(() => {
      if (pendingId) setActiveChild(pendingId);
      onClose();
      onArrived?.();
      nav('/', { replace: true });
    }, 1800);
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
    playSfx('win');
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
      <div className={`pass-cutscene stage-${passing}`} role="presentation">
        <div className="co-bg" aria-hidden="true" />
        <div className="co-text">
          {passing === 'seal' && <><b>✓ 验证通过</b><span>准备进入卷卷星…</span></>}
          {passing === 'open' && <><b>舱门开启</b><span>欢迎你，{name.trim() || '小卷星人'}！</span></>}
          {passing === 'fly' && <><b>飞船驶入</b><span>正在穿越星门…</span></>}
          {passing === 'close' && <><b>舱门关闭</b><span>航行顺利！</span></>}
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
