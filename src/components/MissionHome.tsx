import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import type { ActiveSubject } from '../activeCourses';
import { localDayKey } from '../dailyCheckin';
import { customTaskDueToday } from '../points';
import { useStore } from '../store';
import {
  acceptedMissions, clearLastCompletion, deliveredMission, dismissMission,
  ensureDailyReview, initializeTaskSystem, markMissionSeen, pauseMission,
  quietVisitors, recentMissionCompletions, setPreferredSubject, type Mission,
} from '../taskSystem';
import Mascot from './Mascot';
import './mission-home.css';

type ConsoleView = 'current' | 'bag' | 'harvest';
const SUBJECTS: Array<{ id: ActiveSubject; label: string; icon: string }> = [
  { id: 'math', label: '数学', icon: '📐' },
  { id: 'chinese', label: '语文', icon: '📖' },
  { id: 'english', label: '英语', icon: '🔤' },
];
const EMPTY_CUSTOM_TASKS: ReturnType<typeof useStore.getState>['customTasks'][string] = [];

/** 首页只接收一条航行通讯；任务内容在独立的宇宙航行舱内完整呈现。 */
export default function MissionHome() {
  const nav = useNavigate();
  const childId = useStore((state) => state.activeChildId)!;
  const taskState = useStore((state) => state.taskStates[childId]);
  const customTasks = useStore((state) => state.customTasks[childId] ?? EMPTY_CUSTOM_TASKS);
  const childCompleteTask = useStore((state) => state.childCompleteTask);
  const [view, setView] = useState<ConsoleView | null>(null);
  const consoleOpen = view !== null;
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    initializeTaskSystem(childId);
    ensureDailyReview(childId);
  }, [childId]);

  const mission = useMemo(
    () => taskState?.initializedAt ? deliveredMission(childId) : undefined,
    [childId, taskState, customTasks],
  );
  useEffect(() => {
    if (mission) markMissionSeen(childId, mission);
  }, [childId, mission?.id]);

  useEffect(() => {
    if (!view) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const appRoot = document.getElementById('root');
    const wasInert = appRoot?.inert ?? false;
    document.body.style.overflow = 'hidden';
    if (appRoot) appRoot.inert = true;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setView(null); };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      if (appRoot) appRoot.inert = wasInert;
      document.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus();
    };
  }, [consoleOpen]);

  const openMission = (task: Mission) => {
    setView(null);
    if (task.category === 'parent') {
      childCompleteTask(childId, task.id.split(':')[1]);
      return;
    }
    if (task.id !== 'choose-subject') pauseMission(childId, task.id);
    nav(task.route);
  };
  const day = localDayKey();
  const dueParent = customTasks.filter((task) => customTaskDueToday(task) && !task.doneDays.includes(day));
  const bag = acceptedMissions(childId);
  const harvest = recentMissionCompletions(childId);
  const choosingSubject = mission?.id === 'choose-subject';
  const completed = taskState?.lastCompletion && Date.now() - taskState.lastCompletion.at < 10 * 60_000
    ? taskState.lastCompletion : undefined;
  const headline = completed?.title ?? mission?.title ?? '今天可以自由探索啦';
  const bagCount = bag.length + dueParent.length;

  const console = view && createPortal(
    <div className="mission-console-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setView(null); }}>
      <section className="mission-console" role="dialog" aria-modal="true" aria-labelledby="mission-console-title">
        <div className="mission-console-sky" aria-hidden="true"><i /><i /><i /></div>
        <header className="mission-console-header">
          <span className="mission-console-emblem" aria-hidden="true">✦</span>
          <div><small>卷星 · 航行通讯</small><h2 id="mission-console-title">我的航行舱</h2></div>
          <button ref={closeRef} className="mission-console-close" onClick={() => setView(null)} aria-label="关闭航行舱">返回卷星 <span>×</span></button>
        </header>
        <nav className="mission-console-tabs" aria-label="航行舱内容">
          <button className={view === 'current' ? 'active' : ''} onClick={() => setView('current')} aria-current={view === 'current' ? 'page' : undefined}><span>✦</span> 当前航线</button>
          <button className={view === 'bag' ? 'active' : ''} onClick={() => setView('bag')} aria-current={view === 'bag' ? 'page' : undefined}><span>🎒</span> 星际书包{bagCount > 0 && <b>{bagCount}</b>}</button>
          <button className={view === 'harvest' ? 'active' : ''} onClick={() => setView('harvest')} aria-current={view === 'harvest' ? 'page' : undefined}><span>🏅</span> 星光收获</button>
        </nav>
        <div className="mission-console-scroll" key={view}>
          {view === 'current' && <div className="mission-console-current">
            <div className="mission-console-guide" aria-hidden="true"><span className="mission-console-guide-orbit" /><Mascot pose="happy" size={134} /><strong>聪聪的航行邀请</strong></div>
            <div className="mission-console-invite">
              <small>{completed ? '航行成果已送达' : mission?.kind === 'visitor' ? '有朋友发来通讯' : '今天的航行指令'}</small>
              <h3>{headline}</h3>
              {completed ? <><p>这一站完成啦！你的努力已经记在航行记录里。</p><div className="mission-console-reward">✦ 本次获得 🫘 {completed.reward}</div><button className="mission-console-primary" onClick={() => clearLastCompletion(childId)}>看看下一站 <span>→</span></button></>
                : mission ? <><p>{mission.brief}</p><div className="mission-console-reward">{mission.icon} {mission.categoryLabel}{mission.reward > 0 && ` · 完成可得 🫘 ${mission.reward}`}</div>
                  {choosingSubject ? <div className="mission-console-subjects">{SUBJECTS.map((subject) => <button key={subject.id} onClick={() => setPreferredSubject(childId, subject.id)}><span>{subject.icon}</span>{subject.label}<i>→</i></button>)}</div>
                    : <><button className="mission-console-primary" onClick={() => openMission(mission)}>{mission.actionLabel} <span>→</span></button><div className="mission-console-secondary"><button onClick={() => dismissMission(childId, mission.id)}>换一个航线</button><button onClick={() => { quietVisitors(childId); setView(null); nav('/map'); }}>自己逛逛</button></div></>}
                </> : <><p>卷星上的地点都可以直接前往。今天想去哪儿，就从那里出发吧。</p><button className="mission-console-primary" onClick={() => { setView(null); nav('/map'); }}>去自由探索 <span>→</span></button></>}
            </div>
          </div>}
          {view === 'bag' && <div className="mission-console-collection">
            <div className="mission-console-section-head"><span>🎒</span><div><small>暂存的航行</small><h3>星际书包</h3><p>已经开始的事可以从这里继续。</p></div></div>
            {bagCount === 0 ? <div className="mission-console-empty"><span>✧</span><strong>书包现在轻轻的</strong><p>开始过的任务会保存在这里，想继续时再回来。</p></div> : <div className="mission-console-list">
              {bag.map((task) => <button key={task.id} onClick={() => openMission(task)}><span className="mission-console-item-icon">{task.icon}</span><span><b>{task.title}</b><small>{task.categoryLabel} · 继续这段旅程</small></span><em>出发 →</em></button>)}
              {dueParent.map((task) => <button key={task.id} disabled={task.pendingDays.includes(day)} onClick={() => { childCompleteTask(childId, task.id); setView(null); }}><span className="mission-console-item-icon">🤝</span><span><b>{task.text}</b><small>{task.pendingDays.includes(day) ? '等待家长确认' : '家人交给我的事'}</small></span><em>{task.pendingDays.includes(day) ? '等待中' : '完成 →'}</em></button>)}
            </div>}
          </div>}
          {view === 'harvest' && <div className="mission-console-collection">
            <div className="mission-console-section-head"><span>🏅</span><div><small>走过的星路</small><h3>星光收获</h3><p>每次完成的任务，都会在这里留下光点。</p></div></div>
            {harvest.length === 0 ? <div className="mission-console-empty"><span>✧</span><strong>第一颗星光正在等你</strong><p>完成一个任务，这里就会亮起你的收获。</p></div> : <div className="mission-console-harvest">
              {harvest.map(({ taskId, mission: item, completion }) => <article key={taskId}><span className="mission-console-item-icon">{item?.icon ?? '✦'}</span><div><b>{item?.title ?? '已完成任务'}</b><small>{completion.legacy ? '以前已经完成' : `${new Date(completion.completedAt).toLocaleDateString()} · 🫘 ${completion.reward}`}</small></div></article>)}
            </div>}
          </div>}
        </div>
      </section>
    </div>,
    document.body,
  );

  return <>
    <section className="home-mission-orbit" id="station" aria-label="当前任务通讯" aria-live="polite">
      <button className="mission-orbit-open" onClick={() => setView('current')} aria-label={`打开航行舱：${headline}`}>
        <span className="mission-orbit-disc" aria-hidden="true"><Mascot pose="happy" size={53} /></span>
        <span className="mission-orbit-message"><small>{completed ? '航行完成 · 点击查看' : mission?.kind === 'visitor' ? '朋友发来一条通讯' : '收到一条航行指令'}</small><strong>{headline}</strong></span>
      </button>
      {completed ? <button className="mission-orbit-launch" onClick={() => setView('current')}>收获 <span>↗</span></button>
        : mission && !choosingSubject ? <button className="mission-orbit-launch" onClick={() => openMission(mission)}>{mission.actionLabel} <span>↗</span></button>
          : choosingSubject ? <button className="mission-orbit-launch" onClick={() => setView('current')}>选学科 <span>↗</span></button>
            : <button className="mission-orbit-launch" onClick={() => nav('/map')}>去逛逛 <span>↗</span></button>}
      <span className="mission-orbit-trail" aria-hidden="true" />
    </section>
    {console}
  </>;
}
