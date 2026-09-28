import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, childRecords, bestScoreForGame, gamePlayStats } from '../store';
import { courseTotalStars } from '../activeCourses';
import { useI18n } from '../i18n';
import { KidButton, TopBar, Toggle } from '../components/ui';
import Modal from '../components/Modal';
import VoiceQualityTip from '../components/VoiceQualityTip';
import { listGames } from '../games';
import { gradeLabel } from '../types';
import { playSfx } from '../speech';
import { effectiveCatalog, type CustomTask, type CustomTaskJudge, type CustomTaskRepeat } from '../points';
import { api, isLoggedIn, logout as cloudLogout, setToken, type ChildInfo } from '../api';
import { childMap, saveChildMap } from '../cloud';
import { syncAfterLogin } from '../autosync';

export default function ParentPage() {
  const nav = useNavigate();
  const { t, lang } = useI18n();
  const parentPin = useStore((s) => s.parentPin);
  const sound = useStore((s) => s.sound);
  const toggleSound = useStore((s) => s.toggleSound);
  const voiceOn = useStore((s) => s.voiceOn);
  const setVoiceOn = useStore((s) => s.setVoiceOn);
  const dailyLimitMin = useStore((s) => s.dailyLimitMin);
  const setDailyLimit = useStore((s) => s.setDailyLimit);
  const setParentPin = useStore((s) => s.setParentPin);
  const profiles = useStore((s) => s.profiles);
  const records = useStore((s) => s.records);
  const mastery = useStore((s) => s.mastery);
  const clearAll = useStore((s) => s.clearAll);

  const [unlocked, setUnlocked] = useState(() => {
    try {
      return sessionStorage.getItem('sfz_parent_authed') === '1';
    } catch {
      return false;
    }
  });
  const [pin, setPin] = useState('');
  const [pinErr, setPinErr] = useState(false);
  const [tab, setTab] = useState<'settings' | 'report' | 'cloud'>(() => {
    try {
      return sessionStorage.getItem('sfz_parent_authed') === '1' ? 'cloud' : 'settings';
    } catch {
      return 'settings';
    }
  });
  const [newPin, setNewPin] = useState('');
  const [savedTip, setSavedTip] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmStory, setConfirmStory] = useState(false);
  const resetStory = useStore((s) => s.resetStory);
  // 云端（M0/M1）
  const [cloudPhone, setCloudPhone] = useState('');
  const [cloudCode, setCloudCode] = useState('');
  const [cloudMsg, setCloudMsg] = useState('');
  const [logged, setLogged] = useState(isLoggedIn());
  const [accPass, setAccPass] = useState('');
  const [serverChildren, setServerChildren] = useState<ChildInfo[]>([]);
  const [accChildId, setAccChildId] = useState<number | null>(null);
  const [newChildName, setNewChildName] = useState('');
  const [accMsg, setAccMsg] = useState('');
  const activeChildId = useStore((s) => s.activeChildId);

  // 卷卷豆 · 自定义任务（周期/判定/物品奖励）
  const customTasks = useStore((s) => s.customTasks);
  const addCustomTask = useStore((s) => s.addCustomTask);
  const removeCustomTask = useStore((s) => s.removeCustomTask);
  const confirmCustomTask = useStore((s) => s.confirmCustomTask);
  const storeOverrides = useStore((s) => s.storeOverrides);
  const pointsOf = useStore((s) => s.points);
  const [taskText, setTaskText] = useState('');
  const [taskRepeat, setTaskRepeat] = useState<CustomTaskRepeat>('once');
  const [taskWeekDays, setTaskWeekDays] = useState<number[]>([1]);
  const [taskMonthDays, setTaskMonthDays] = useState('1');
  const [taskDate, setTaskDate] = useState('');
  const [taskJudge, setTaskJudge] = useState<CustomTaskJudge>('parent');
  const [taskPts, setTaskPts] = useState('5');
  const [taskItem, setTaskItem] = useState('');
  const [taskMsg, setTaskMsg] = useState('');
  const targetChild = profiles.find((p) => p.id === activeChildId) ?? profiles[0] ?? null;
  const targetPoints = targetChild ? pointsOf[targetChild.id] ?? 0 : 0;
  const tasks = targetChild ? customTasks[targetChild.id] ?? [] : [];
  const itemOptions = effectiveCatalog(storeOverrides, true);
  const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六'];
  const repeatText = (t: CustomTask): string => {
    switch (t.repeat) {
      case 'once': return '一次性';
      case 'daily': return '每天';
      case 'weekly': return `每周${(t.weekDays ?? []).map((d) => WEEK_LABELS[d]).join('、')}`;
      case 'monthly': return `每月 ${(t.monthDays ?? []).join('、')} 号`;
      case 'dated': return `指定日期 ${t.date ?? ''}`;
    }
  };
  const addTaskTo = (cid: string) => {
    const text = taskText.trim();
    if (text.length < 2) { setTaskMsg('请填写任务描述（至少 2 字）'); return; }
    if (taskRepeat === 'weekly' && taskWeekDays.length === 0) { setTaskMsg('请选择每周执行的日子'); return; }
    if (taskRepeat === 'monthly' && taskMonthDays.split(/[,，]/).some((v) => !(Number(v) >= 1 && Number(v) <= 31))) { setTaskMsg('每月几号请填写 1-31 的数字'); return; }
    if (taskRepeat === 'dated' && !taskDate) { setTaskMsg('请选择指定日期'); return; }
    addCustomTask(cid, {
      text,
      repeat: taskRepeat,
      weekDays: taskRepeat === 'weekly' ? [...taskWeekDays].sort() : undefined,
      monthDays: taskRepeat === 'monthly' ? taskMonthDays.split(/[,，]/).map((v) => Number(v.trim())).filter((v) => v >= 1 && v <= 31) : undefined,
      date: taskRepeat === 'dated' ? taskDate : undefined,
      judge: taskJudge,
      points: Math.max(0, Number(taskPts) || 0),
      itemId: taskItem || undefined,
    });
    setTaskText(''); setTaskItem('');
    setTaskMsg('✅ 已添加任务');
  };
  const removeTask = (cid: string, tid: string) => removeCustomTask(cid, tid);

  const cloudLogin = async () => {
    setCloudMsg('');
    const r = await api.login(cloudPhone, cloudCode);
    if (r?.ok && r.token) {
      setToken(r.token);
      setLogged(true);
      setCloudMsg('登录成功');
      // 把本地孩子同步映射到云端（按名字匹配或新建）
      const me = await api.me();
      if (me?.ok && activeChildId) {
        const profile = profiles.find((p) => p.id === activeChildId);
        if (profile) {
          let cid = me.children.find((c) => c.name === profile.name)?.id;
          if (!cid) {
            const created = await api.addChild({ name: profile.name, avatar: profile.avatar, grade: profile.ageBand });
            cid = created?.id;
          }
          if (cid) {
            const m = childMap();
            m[activeChildId] = cid;
            saveChildMap(m);
          }
          // 登录成功：先拉取云端合并，再推送本地（自动双向一致）
          const syn = await syncAfterLogin(activeChildId);
          if (syn) setCloudMsg(`登录成功，已双向同步（课程拉取 ${syn.pulled} / 推送 ${syn.pushed} / 剧情 ${syn.story} / 错题 ${syn.wrongs}）`);
        }
      }
    } else {
      setCloudMsg('登录失败（验证码 123456）');
    }
  };

  const loadCloudTab = async () => {
    const me = await api.me();
    if (me?.ok) {
      setServerChildren(me.children);
      setAccChildId((prev) => (prev ?? me.children[0]?.id ?? null));
    }
  };

  const createChildAccount = async (makeNew = false) => {
    if (accPass.length < 4) return setAccMsg('请设置至少 4 位密码');
    setAccMsg('');
    let cid = accChildId;
    if ((!cid || makeNew) && newChildName.trim()) {
      const created = await api.addChild({ name: newChildName.trim(), avatar: '🐯', grade: 'g1' });
      if (!created?.id) return setAccMsg('新增孩子失败');
      cid = created.id;
      const me = await api.me();
      if (me?.ok) setServerChildren(me.children);
      setAccChildId(cid);
      setNewChildName('');
    }
    if (!cid) return setAccMsg('请先新增一个孩子（填写名字）');
    const childName = serverChildren.find((c) => c.id === cid)?.name;
    const r = await api.childAccount(cid, accPass, childName);
    setAccMsg(r?.ok ? `✅ 已开通：登录名「${r.loginName}」/ 密码「${accPass}」` : '开通失败（登录名可能被占用）');
    setAccPass('');
  };


  const tryUnlock = () => {
    if (pin === parentPin) {
      playSfx('correct');
      setUnlocked(true);
      // 会话内免密：本次打开应用期间再次进入家长中心不再要求输入 PIN
      try { sessionStorage.setItem('sfz_parent_authed', '1'); } catch { /* ignore */ }
    } else {
      playSfx('wrong');
      setPinErr(true);
      setPin('');
      window.setTimeout(() => setPinErr(false), 800);
    }
  };

  const doClear = () => {
    clearAll();
    nav('/');
  };

  const games = listGames();

  return (
    <div className="page parent">
      <TopBar eyebrow="Parent · 家长中心" title={t('parentCenter')} onBack={() => nav('/')} />

      {!unlocked ? (
        <div className="pin-gate">
          <div className="pin-emoji">🔐</div>
          <p className="pin-label">{t('pin')}</p>
          <input
            className={`pin-input ${pinErr ? 'shake' : ''}`}
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            autoFocus
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && tryUnlock()}
          />
          {pinErr && <p className="pin-err">{t('wrongPin')}</p>}
          <KidButton color="green" onClick={tryUnlock}>
            {t('enter')}
          </KidButton>
          <p className="pin-hint">{t('hintPin')}</p>
        </div>
      ) : (
        <>
          <div className="parent-tabs">
            <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>
              {t('settings')}
            </button>
            <button className={tab === 'report' ? 'active' : ''} onClick={() => setTab('report')}>
              {t('report')}
            </button>
            <button className={tab === 'cloud' ? 'active' : ''} onClick={() => { setTab('cloud'); void loadCloudTab(); }}>
              ☁️ 云端
            </button>
          </div>

          {tab === 'settings' && (
            <div className="parent-settings">
              <div className="setting-row">
                <span>{t('sound')}</span>
                <Toggle on={sound} onClick={toggleSound} label={t('sound')} />
              </div>
              <div className="setting-row">
                <span>🗣️ {t('voice')}</span>
                <Toggle on={voiceOn} onClick={() => setVoiceOn(!voiceOn)} label={t('voice')} />
              </div>
              <VoiceQualityTip />

              <div className="setting-row col">
                <span>{t('dailyLimit')}</span>
                <div className="limit-options">
                  {[0, 15, 30, 60].map((m) => (
                    <button
                      key={m}
                      className={`limit-btn ${dailyLimitMin === m ? 'active' : ''}`}
                      onClick={() => setDailyLimit(m)}
                    >
                      {m === 0 ? t('noLimit') : `${m}${t('minutes')}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* 卷卷豆 · 家长自定义任务 */}
              <div className="setting-row col task-panel">
                <span>⭐ 家长任务 · 自定义（发给 {targetChild ? `${targetChild.avatar ?? '🧒'} ${targetChild.name}` : '孩子'}）</span>
                {targetChild && (
                  <>
                    <div className="task-form">
                      <div className="task-form-row">
                        <input className="pin-input wide" value={taskText} placeholder="任务描述，如：自己整理书包" onChange={(e) => setTaskText(e.target.value)} />
                      </div>
                      <div className="task-form-row">
                        <span className="task-form-label">周期</span>
                        <select className="adm-input" value={taskRepeat} onChange={(e) => setTaskRepeat(e.target.value as CustomTaskRepeat)} aria-label="任务周期">
                          <option value="once">一次性</option>
                          <option value="daily">每天</option>
                          <option value="weekly">每周若干天</option>
                          <option value="monthly">每月若干天</option>
                          <option value="dated">指定日期</option>
                        </select>
                        {taskRepeat === 'weekly' && (
                          <span className="task-chips">
                            {WEEK_LABELS.map((label, idx) => (
                              <button key={idx} type="button" className={`task-chip ${taskWeekDays.includes(idx) ? 'on' : ''}`} onClick={() => setTaskWeekDays(taskWeekDays.includes(idx) ? taskWeekDays.filter((d) => d !== idx) : [...taskWeekDays, idx])}>{label}</button>
                            ))}
                          </span>
                        )}
                        {taskRepeat === 'monthly' && (
                          <input className="adm-input" style={{ width: 120 }} value={taskMonthDays} placeholder="几号，如 1,15" onChange={(e) => setTaskMonthDays(e.target.value.replace(/[^0-9,,]/g, ''))} />
                        )}
                        {taskRepeat === 'dated' && (
                          <input className="adm-input" type="date" value={taskDate} onChange={(e) => setTaskDate(e.target.value)} />
                        )}
                      </div>
                      <div className="task-form-row">
                        <span className="task-form-label">完成判定</span>
                        <select className="adm-input" value={taskJudge} onChange={(e) => setTaskJudge(e.target.value as CustomTaskJudge)} aria-label="完成判定">
                          <option value="auto">系统自动判断（完成后立即发奖励）</option>
                          <option value="parent">家长判断（孩子提交后家长确认）</option>
                        </select>
                      </div>
                      <div className="task-form-row">
                        <span className="task-form-label">奖励</span>
                        <input className="adm-input" style={{ width: 90 }} inputMode="numeric" value={taskPts} placeholder="卷卷豆" onChange={(e) => setTaskPts(e.target.value.replace(/\D/g, ''))} />
                        <select className="adm-input" value={taskItem} onChange={(e) => setTaskItem(e.target.value)} aria-label="奖励物品">
                          <option value="">无物品（仅卷卷豆）</option>
                          {itemOptions.map((it) => (
                            <option key={it.id} value={it.id}>{it.icon} {it.name}{it.cost ? `（原价 ${it.cost}）` : ''}</option>
                          ))}
                        </select>
                      </div>
                      <div className="task-form-row">
                        <KidButton color="mint" disabled={taskText.trim().length < 2} onClick={() => addTaskTo(targetChild.id)}>+ 添加任务</KidButton>
                        {taskMsg && <p className="saved-tip" style={{ margin: 0 }}>{taskMsg}</p>}
                        <p className="task-tip" style={{ margin: 0 }}>当前卷卷豆 {targetPoints} · 发放物品会直接放进孩子的物品/衣柜</p>
                      </div>
                    </div>
                    {tasks.length === 0 ? (
                      <p className="task-empty">还没有任务，添加一个试试～</p>
                    ) : (
                      <div className="task-list">
                        {tasks.map((task) => {
                          const pending = task.pendingDays;
                          const rewardName = task.itemId ? itemOptions.find((it) => it.id === task.itemId)?.name ?? task.itemId : null;
                          return (
                            <div key={task.id} className={`task-row ${task.doneDays.length > 0 && task.repeat === 'once' ? 'done' : ''}`}>
                              <span className="task-row-text">
                                📋 {task.text}
                                <small>{repeatText(task)} · {task.judge === 'auto' ? '系统自动判断' : '家长审核'} · 🫘 {task.points}{rewardName ? ` · 🎁 ${rewardName}` : ''}</small>
                                {pending.length > 0 && <small className="task-pending-tip">待审核：{pending.join('、')}</small>}
                              </span>
                              <span className="adm-ops">
                                {task.judge === 'parent' && pending.map((day) => (
                                  <button key={day} type="button" className="kid-btn green xsmall" onClick={() => confirmCustomTask(targetChild.id, task.id, day)}>确认发放（{day}）</button>
                                ))}
                                <button className="task-del" aria-label="删除任务" onClick={() => removeTask(targetChild.id, task.id)}>✕</button>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
                {!targetChild && <p className="task-empty">请先为孩子登录进入应用（无本地孩子档案）</p>}
              </div>

              <div className="setting-row col">
                <span>{t('changePin')}</span>
                <div className="pin-change">
                  <input
                    className="pin-input small"
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={newPin}
                    placeholder={t('newPin')}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  />
                  <KidButton
                    color="green"
                    disabled={newPin.length !== 4}
                    onClick={() => {
                      setParentPin(newPin);
                      setNewPin('');
                      setSavedTip(true);
                      window.setTimeout(() => setSavedTip(false), 1500);
                    }}
                  >
                    {t('save')}
                  </KidButton>
                </div>
                {savedTip && <p className="saved-tip">{t('saved')}</p>}
              </div>

              <div className="setting-row danger">
                <button className="danger-btn" onClick={() => setConfirmStory(true)}>
                  🔁 重置剧情进度
                </button>
              </div>
              <div className="setting-row danger">
                <button className="danger-btn" onClick={() => setConfirmClear(true)}>
                  {t('clearData')}
                </button>
              </div>
            </div>
          )}

          {tab === 'report' && (
            <div className="parent-report">
              {profiles.length === 0 && <p className="empty-tip">{t('noData')}</p>}
      {profiles.map((p) => {
        const mine = childRecords(records, p.id);
        return (
          <div key={p.id} className="report-child">
            <div className="report-head">
                      <span className="report-avatar">{p.avatar}</span>
                      <b>{p.name}</b>
                      <span className="report-age">{gradeLabel(p.ageBand, lang)}</span>
                      <span className="report-stars">⭐ {courseTotalStars(p.id, mastery, records)}</span>
                    </div>
                    {mine.length === 0 ? (
                      <p className="empty-tip small">{t('noData')}</p>
                    ) : (
                      <>
                        <div className="report-rows">
                          {games
                            .filter((g) => g.status === 'ready')
                            .map((g) => {
                              const stats = gamePlayStats(records, p.id, g.id);
                              if (stats.rounds === 0) return null;
                              const best = bestScoreForGame(records, p.id, g.id);
                              return (
                                <div key={g.id} className="report-row">
                                  <span className="report-game">
                                    {g.icon} {g.name[lang]}
                                  </span>
                                  <span className="report-metric">🏆 {best}</span>
                                  <span className="report-metric">
                                    {t('playCount')} {stats.rounds}
                                  </span>
                                  <span className="report-metric">{Math.round(stats.totalSec / 60)}min</span>
                                </div>
                              );
                            })}
                        </div>
                        <div className="week-chart">
                          <div className="week-label">{t('last7days')}</div>
                          <div className="bars">
                            {Array.from({ length: 7 }).map((_, i) => {
                              const d = new Date();
                              d.setDate(d.getDate() - (6 - i));
                              const dayStart = new Date(d);
                              dayStart.setHours(0, 0, 0, 0);
                              const dayEnd = new Date(d);
                              dayEnd.setHours(23, 59, 59, 999);
                              const n = mine.filter(
                                (r) => r.playedAt >= dayStart.getTime() && r.playedAt <= dayEnd.getTime(),
                              ).length;
                              const max = Math.max(1, ...Array.from({ length: 7 }, (_, j) => {
                                const dd = new Date();
                                dd.setDate(dd.getDate() - (6 - j));
                                const s = new Date(dd); s.setHours(0, 0, 0, 0);
                                const e = new Date(dd); e.setHours(23, 59, 59, 999);
                                return mine.filter((r) => r.playedAt >= s.getTime() && r.playedAt <= e.getTime()).length;
                              }));
                              return (
                                <div key={i} className="bar-col">
                                  <div
                                    className="bar"
                                    style={{ height: `${Math.round((n / max) * 100)}%` }}
                                  />
                                  <span className="bar-day">{`${d.getMonth() + 1}/${d.getDate()}`}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'cloud' && (
            <div className="parent-cloud">
              {!logged ? (
                <div className="cloud-card">
                  <b>家长登录（云端同步 / 管理孩子账号）</b>
                  <input className="pin-input small" placeholder="手机号" value={cloudPhone} inputMode="numeric" onChange={(e) => setCloudPhone(e.target.value.replace(/\D/g, ''))} />
                  <input className="pin-input small" placeholder="验证码（开发态 123456）" value={cloudCode} inputMode="numeric" onChange={(e) => setCloudCode(e.target.value.replace(/\D/g, ''))} />
                  <KidButton color="mint" onClick={() => void cloudLogin()}>登录 / 注册</KidButton>
                </div>
              ) : (
                <>
                  <div className="cloud-card">
                    <b>☁️ 已登录</b>
                    {activeChildId && profiles.find((p) => p.id === activeChildId)?.name
                      ? `当前孩子：${profiles.find((p) => p.id === activeChildId)?.name}`
                      : '未选择本地孩子（云端功能照常可用）'}
                    <div className="cloud-actions">
                      <KidButton color="white" onClick={() => { cloudLogout(); setLogged(false); setServerChildren([]); }}>退出</KidButton>
                    </div>
                    <p className="plan-note">💡 已开启自动同步：学习完成后会自动备份到云端，无需手动操作。</p>
                  </div>

                  <div className="cloud-card">
                    <b>🔑 孩子登录账号（登录名+密码由你创建，孩子在登录页使用）</b>
                  <div className="plan-add">
                    <input className="pin-input small" type="password" placeholder="孩子登录密码（至少 4 位）" value={accPass} onChange={(e) => setAccPass(e.target.value)} />
                  </div>
                  {serverChildren.length > 0 && (
                    <>
                      <div className="cloud-actions">
                        {serverChildren.map((c) => (
                          <button key={c.id} className={`term-tab ${accChildId === c.id ? 'active' : ''}`} style={{ flex: '0 1 auto', padding: '7px 12px', fontSize: 13 }} onClick={() => setAccChildId(c.id)}>
                            {c.avatar} {c.name}
                          </button>
                        ))}
                      </div>
                      <KidButton color="purple" disabled={!accChildId || accPass.length < 4} onClick={() => void createChildAccount()}>为所选孩子开通/重置</KidButton>
                    </>
                  )}
                  <div className="plan-add">
                    <input className="pin-input small" placeholder="新增孩子名字（如：豆豆）" value={newChildName} onChange={(e) => setNewChildName(e.target.value)} />
                    <KidButton color="purple" disabled={!newChildName.trim() || accPass.length < 4} onClick={() => void createChildAccount(true)}>新增孩子并开通</KidButton>
                  </div>
                  {accMsg && <p className="saved-tip">{accMsg}</p>}
                  <p className="plan-note">把「登录名（孩子名字）+ 密码」告诉孩子；孩子点首页「我是孩子，用账号登录」。</p>
</div>

                </>
              )}
              {cloudMsg && <p className="saved-tip">{cloudMsg}</p>}
            </div>
          )}

        </>
      )}

      {confirmStory && (
        <Modal>
          <div className="modal-panel">
            <div className="modal-emoji">📖</div>
            <p className="modal-text">将把「{targetChild?.name ?? '当前孩子'}」的剧情重置回序章起点（已获得的星星与卷星币保留，只是剧情重新解锁）。确定吗？</p>
            <div className="modal-actions">
              <KidButton color="white" onClick={() => setConfirmStory(false)}>
                {t('cancel')}
              </KidButton>
              <KidButton
                color="coral"
                onClick={() => {
                  if (targetChild) resetStory(targetChild.id);
                  setConfirmStory(false);
                  setSavedTip(true);
                  window.setTimeout(() => setSavedTip(false), 1500);
                }}
              >
                🔁 重置剧情
              </KidButton>
            </div>
          </div>
        </Modal>
      )}

      {confirmClear && (
        <Modal>
          <div className="modal-panel">
            <div className="modal-emoji">⚠️</div>
            <p className="modal-text">{t('clearConfirm')}</p>
            <div className="modal-actions">
              <KidButton color="white" onClick={() => setConfirmClear(false)}>
                {t('cancel')}
              </KidButton>
              <KidButton color="coral" onClick={doClear}>
                {t('delete')}
              </KidButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
