import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, childRecords, childTotalStars, starsForGame } from '../store';
import { useI18n } from '../i18n';
import { KidButton, TopBar, Toggle } from '../components/ui';
import Modal from '../components/Modal';
import VoiceQualityTip from '../components/VoiceQualityTip';
import { listGames } from '../games';
import { gradeLabel } from '../types';
import { playSfx } from '../speech';
import { IconBean } from '../components/icons';
import { api, isLoggedIn, logout as cloudLogout, setToken, type Plan, type WeeklyReport, type ChildInfo } from '../api';
import { pushAll, pullAll, childMap, saveChildMap } from '../cloud';
import { syncAfterLogin } from '../autosync';

export default function ParentPage() {
  const nav = useNavigate();
  const { t, lang } = useI18n();
  const parentPin = useStore((s) => s.parentPin);
  const sound = useStore((s) => s.sound);
  const toggleSound = useStore((s) => s.toggleSound);
  const musicOn = useStore((s) => s.musicOn);
  const setMusicOn = useStore((s) => s.setMusicOn);
  const voiceOn = useStore((s) => s.voiceOn);
  const setVoiceOn = useStore((s) => s.setVoiceOn);
  const lessonSkipOn = useStore((s) => s.lessonSkipOn);
  const setLessonSkipOn = useStore((s) => s.setLessonSkipOn);
  const dailyLimitMin = useStore((s) => s.dailyLimitMin);
  const setDailyLimit = useStore((s) => s.setDailyLimit);
  const setParentPin = useStore((s) => s.setParentPin);
  const profiles = useStore((s) => s.profiles);
  const records = useStore((s) => s.records);
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
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planTitle, setPlanTitle] = useState('');
  const [accPass, setAccPass] = useState('');
  const [serverChildren, setServerChildren] = useState<ChildInfo[]>([]);
  const [accChildId, setAccChildId] = useState<number | null>(null);
  const [newChildName, setNewChildName] = useState('');
  const [accMsg, setAccMsg] = useState('');
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const activeChildId = useStore((s) => s.activeChildId);
  const wrongs = useStore((s) => s.wrongs);
  const removeWrong = useStore((s) => s.removeWrong);

  // 卷卷豆 · 自定义任务
  const customTasks = useStore((s) => s.customTasks);
  const addCustomTask = useStore((s) => s.addCustomTask);
  const removeCustomTask = useStore((s) => s.removeCustomTask);
  const confirmCustomTask = useStore((s) => s.confirmCustomTask);
  const pointsOf = useStore((s) => s.points);
  const [taskText, setTaskText] = useState('');
  const [taskPts, setTaskPts] = useState('');
  const targetChild = profiles.find((p) => p.id === activeChildId) ?? profiles[0] ?? null;
  const targetPoints = targetChild ? pointsOf[targetChild.id] ?? 0 : 0;
  const tasks = targetChild ? customTasks[targetChild.id] ?? [] : [];
  const addTaskTo = (cid: string) => {
    addCustomTask(cid, taskText.trim(), Number(taskPts || 5));
    setTaskText(''); setTaskPts('');
  };
  const confirmTask = (cid: string, tid: string) => confirmCustomTask(cid, tid);
  const removeTask = (cid: string, tid: string) => removeCustomTask(cid, tid);

  // 卷卷豆 · 奖励兑换审批
  const rewardRequests = useStore((s) => s.rewardRequests);
  const approveReward = useStore((s) => s.approveReward);
  const declineReward = useStore((s) => s.declineReward);
  const [rwMsg, setRwMsg] = useState('');
  const pendingRewards = targetChild ? (rewardRequests[targetChild.id] ?? []).filter((r) => r.status === 'pending') : [];

  const cloudChildId = activeChildId ? childMap()[activeChildId] ?? null : null;

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
          if (syn) setCloudMsg(`登录成功，已双向同步（拉取 ${syn.pulled} / 推送 ${syn.pushed} / 错题 ${syn.wrongs}）`);
        }
      }
    } else {
      setCloudMsg('登录失败（验证码 123456）');
    }
  };

  const cloudSync = async (dir: 'push' | 'pull') => {
    setCloudMsg('');
    if (!activeChildId || !cloudChildId) {
      setCloudMsg('请先登录并选择孩子');
      return;
    }
    const n = dir === 'push' ? await pushAll(cloudChildId, activeChildId) : await pullAll(cloudChildId, activeChildId);
    setCloudMsg(`${dir === 'push' ? '已推送' : '已拉取'} ${n} 条`);
  };

  const loadCloudTab = async () => {
    const me = await api.me();
    if (me?.ok) {
      setServerChildren(me.children);
      setAccChildId((prev) => (prev ?? me.children[0]?.id ?? null));
    }
    if (!cloudChildId) return;
    const [p, r] = await Promise.all([api.plans(cloudChildId), api.weeklyReport(cloudChildId)]);
    if (p?.ok) setPlans(p.plans);
    if (r?.ok) setReport(r);
  };

  const addCloudPlan = async () => {
    if (!cloudChildId || !planTitle.trim()) return;
    await api.addPlan({ childId: cloudChildId, kind: 'custom', title: planTitle.trim() });
    setPlanTitle('');
    void loadCloudTab();
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


  const genSystemPlan = async () => {
    if (!cloudChildId) return;
    const r = await api.systemPlan(cloudChildId);
    setCloudMsg(r?.ok ? `已按年级自动排期 ${r.created} 项` : '自动排期失败');
    void loadCloudTab();
  };

  const toggleCloudPlan = async (id: number, done: boolean) => {
    await api.patchPlan(id, !done);
    void loadCloudTab();
  };

  const tryUnlock = () => {
    if (pin === parentPin) {
      playSfx('correct');
      setUnlocked(true);
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
                <span>🎵 {t('bgm')}</span>
                <Toggle on={musicOn} onClick={() => setMusicOn(!musicOn)} label={t('bgm')} />
              </div>
              <div className="setting-row">
                <span>🗣️ {t('voice')}</span>
                <Toggle on={voiceOn} onClick={() => setVoiceOn(!voiceOn)} label={t('voice')} />
              </div>
              <VoiceQualityTip />
              <div className="setting-row">
                <span>⏭️ {t('skipDemo')}</span>
                <Toggle
                  on={lessonSkipOn}
                  onClick={() => setLessonSkipOn(!lessonSkipOn)}
                  label={t('skipDemo')}
                />
              </div>

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
                <span>⭐ 卷卷豆 · 自定义任务（家长确认后加分）</span>
                {targetChild && (
                  <>
                    <div className="task-add">
                      <input
                        className="pin-input wide"
                        value={taskText}
                        placeholder="如：自己整理书包 / 主动做家务"
                        onChange={(e) => setTaskText(e.target.value)}
                      />
                      <input
                        className="pin-input wide small-num"
                        inputMode="numeric"
                        value={taskPts}
                        placeholder="卷卷豆"
                        onChange={(e) => setTaskPts(e.target.value.replace(/\D/g, ''))}
                      />
                      <KidButton
                        color="mint"
                        disabled={taskText.trim().length < 2 || !taskPts}
                        onClick={() => addTaskTo(targetChild.id)}
                      >
                        + 添加
                      </KidButton>
                    </div>
                    <p className="task-tip">发给：{targetChild.avatar} {targetChild.name} · 当前卷卷豆 {targetPoints}</p>
                    {tasks.length === 0 ? (
                      <p className="task-empty">还没有任务，添加一个试试～</p>
                    ) : (
                      <div className="task-list">
                        {tasks.map((task) => (
                          <div key={task.id} className={`task-row ${task.done ? 'done' : ''}`}>
                            <span className="task-row-text">
                              {task.done ? '✅' : '📋'} {task.text}
                              <small><IconBean size={13} gradient="gold" /> +{task.points}</small>
                            </span>
                            {!task.done ? (
                              <KidButton color="green" className="xsmall" onClick={() => confirmTask(targetChild.id, task.id)}>
                                确认完成
                              </KidButton>
                            ) : (
                              <button className="task-del" onClick={() => removeTask(targetChild.id, task.id)}>✕</button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
                {!targetChild && <p className="task-empty">请先为孩子登录进入应用（无本地孩子档案）</p>}
              </div>

              {/* 卷卷豆 · 奖励兑换审批 */}
              <div className="setting-row col task-panel">
                <span>🎫 卷卷豆 · 兑换申请（孩子已提交）</span>
                {targetChild && (
                  <>
                    {rwMsg && <p className="saved-tip">{rwMsg}</p>}
                    {pendingRewards.length === 0 ? (
                      <p className="task-empty">暂无待审批的兑换申请</p>
                    ) : (
                      <div className="task-list">
                        {pendingRewards.map((r) => (
                          <div key={r.id} className="task-row">
                            <span className="task-row-text">
                              {r.icon} {r.name}
                              <small>需要 {r.cost} 卷卷豆 · 孩子余额 {targetPoints}</small>
                            </span>
                            <KidButton
                              color="green"
                              className="xsmall"
                              onClick={() => {
                                const ok = approveReward(targetChild.id, r.id);
                                setRwMsg(ok ? `✅ 已批准「${r.name}」` : '卷卷豆不足，无法批准');
                              }}
                            >
                              批准
                            </KidButton>
                            <button className="task-del" onClick={() => { declineReward(targetChild.id, r.id); setRwMsg('已拒绝该申请'); }}>✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
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
                      <span className="report-stars">⭐ {childTotalStars(records, p.id)}</span>
                    </div>
                    {mine.length === 0 ? (
                      <p className="empty-tip small">{t('noData')}</p>
                    ) : (
                      <>
                        <div className="report-rows">
                          {games
                            .filter((g) => g.status === 'ready')
                            .map((g) => {
                              const recs = mine.filter((r) => r.gameId === g.id);
                              if (recs.length === 0) return null;
                              const best = starsForGame(records, p.id, g.id);
                              const acc = Math.round(
                                (recs.reduce((s, r) => s + r.correct, 0) /
                                  recs.reduce((s, r) => s + r.total, 0)) *
                                  100,
                              );
                              return (
                                <div key={g.id} className="report-row">
                                  <span className="report-game">
                                    {g.icon} {g.name[lang]}
                                  </span>
                                  <span className="report-metric">⭐{best}</span>
                                  <span className="report-metric">
                                    {t('playCount')} {recs.length}
                                  </span>
                                  <span className="report-metric">{acc}%</span>
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
                      <KidButton color="green" onClick={() => void cloudSync('push')}>立即推送</KidButton>
                      <KidButton color="sky" onClick={() => void cloudSync('pull')}>立即拉取</KidButton>
                      <KidButton color="white" onClick={() => { cloudLogout(); setLogged(false); setPlans([]); setReport(null); setServerChildren([]); }}>退出</KidButton>
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

                  <div className="cloud-card">
                    <b>📋 学习计划</b>
                    <div className="plan-add">
                      <input className="pin-input small" placeholder="例如：每天读一篇课文" value={planTitle} onChange={(e) => setPlanTitle(e.target.value)} />
                      <KidButton color="purple" disabled={!planTitle.trim()} onClick={() => void addCloudPlan()}>布置</KidButton>
                    </div>
                    <div className="cloud-actions">
                      <KidButton color="yellow" onClick={() => void genSystemPlan()}>按年级自动排期</KidButton>
                    </div>
                    {plans.length === 0 ? (
                      <p className="empty-tip small">还没有计划</p>
                    ) : (
                      <div className="plan-list">
                        {plans.map((pl) => (
                          <div key={pl.id} className={`plan-row ${pl.done ? 'done' : ''}`}>
                            <button className="plan-check" onClick={() => void toggleCloudPlan(pl.id, pl.done === 1)}>{pl.done === 1 ? '✅' : '⬜'}</button>
                            <div className="plan-text">
                              <b>{pl.title}</b>
                              {pl.detail && <small>{pl.detail}</small>}
                              {pl.due_date && <small>截止 {pl.due_date}</small>}
                            </div>
                            <button className="plan-del" onClick={() => { void api.removePlan(pl.id); void loadCloudTab(); }}>✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="cloud-card">
                    <b>❌ 错题本（{activeChildId ? (wrongs[activeChildId]?.length ?? 0) : 0}，学习时自动记录并同步）</b>
                    {activeChildId && (wrongs[activeChildId] ?? []).length === 0 && <p className="empty-tip small">还没有错题</p>}
                    {activeChildId && (wrongs[activeChildId] ?? []).map((w) => (
                      <div key={w.uid} className="plan-row">
                        <div className="plan-text">
                          <small>{w.lessonName || w.lessonId} · {w.kind}</small>
                          <b>{w.answer}</b>
                        </div>
                        <button className="plan-del" onClick={() => removeWrong(activeChildId, w.uid)}>✕</button>
                      </div>
                    ))}
                  </div>

                  {report && (
                    <div className="cloud-card">
                      <b>📊 本周学习报告（{report.weekStart} ~ {report.weekEnd}）</b>
                      <div className="report-rows">
                        <div className="report-row"><span className="report-game">练习次数</span><span className="report-metric">{report.summary.practiceCount}</span></div>
                        <div className="report-row"><span className="report-game">错题数</span><span className="report-metric">{report.summary.wrongCount}</span></div>
                        <div className="report-row"><span className="report-game">跟读次数</span><span className="report-metric">{report.summary.readAloudCount}</span></div>
                        <div className="report-row"><span className="report-game">跟读均分</span><span className="report-metric">{report.summary.readAloudAvg}</span></div>
                        <div className="report-row"><span className="report-game">累计星星</span><span className="report-metric">⭐ {report.summary.totalStars}</span></div>
                      </div>
                    </div>
                  )}
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
