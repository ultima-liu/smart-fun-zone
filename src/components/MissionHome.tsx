import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { localDayKey } from '../dailyCheckin';
import { customTaskDueToday, type CustomTask } from '../points';
import { useStore } from '../store';
import {
  acceptedMissions, claimCourseMailReward, clearLastCompletion, courseMailBuckets, deliveredMission, dismissMission,
  ensureCourseMails, ensureDailyReview, initializeTaskSystem, markMissionSeen, missionById, pauseMission,
  quietVisitors, recentMissionCompletions, startCourseMail, type CourseMailRecord, type Mission,
} from '../taskSystem';
import './mission-home.css';

type LetterView = 'letter' | 'saved' | 'replies' | 'drift';
type Sender = { name: string; source: string; seal: string; destination: string; intro: string };
type InboxEntry = {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  status: string;
  course?: CourseMailRecord;
  mission?: Mission;
  completion?: { completedAt: number; reward: number; legacy?: boolean };
  disabled?: boolean;
};

const EMPTY_CUSTOM_TASKS: ReturnType<typeof useStore.getState>['customTasks'][string] = [];

function readMailIds(childId: string): Set<string> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(`sfz-mail-read-v1:${childId}`) ?? '[]');
    return new Set(Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : []);
  } catch { return new Set(); }
}

const STATUS_LABEL: Record<CourseMailRecord['status'], string> = {
  'not-started': '未开始', unfinished: '未完成', completed: '已完成 · 待领奖',
};

function mailDateLabel(date: string) {
  const [year, month, day] = date.split('-');
  return `${year}年${Number(month)}月${Number(day)}日`;
}

function senderFor(mission?: Mission): Sender {
  if (!mission) return { name: '星环收件站', source: '卷星星环', seal: '✦', destination: '卷星', intro: '今天可以自由探索。' };
  if (mission.id === 'choose-subject') return { name: '阿光校长', source: '星穹学校', seal: '🦉', destination: '学校', intro: '先选一条今天想去的学习航线吧。' };
  if (mission.category === 'review') return { name: '聪聪', source: '复习星站', seal: '🪐', destination: '今日复习', intro: '上次学过的内容，再来试一试吧。' };
  if (mission.category === 'challenge') return { name: '阿光校长', source: '星穹学校', seal: '🦉', destination: '挑战台', intro: '想试试这次知识挑战吗？' };
  if (mission.category === 'exploration') return { name: '兔兔', source: '卷星生活区', seal: '🐰', destination: '委托现场', intro: '我遇到一件事，想请你来帮忙。' };
  if (mission.category === 'event') return { name: '泡泡', source: '卷星活动站', seal: '🫧', destination: '活动现场', intro: '一场特别活动正在等你参加。' };
  if (mission.category === 'parent') return { name: '家人', source: '家庭守护站', seal: '💌', destination: '家庭约定', intro: '家人给你留了一件想一起完成的事。' };
  return { name: '阿光校长', source: '星穹学校', seal: '🦉', destination: '学校', intro: '今天的学习来信已经送到啦。' };
}

function parentTaskMission(task: CustomTask, day: string): Mission {
  return {
    id: `parent:${task.id}:${day}`, category: 'parent', categoryLabel: '家长任务', title: task.text,
    brief: task.judge === 'parent' ? '做完后告诉家人，确认后领取奖励。' : '完成后可以直接领取奖励。',
    actionLabel: '我完成了', icon: '💌', reward: task.points, route: '/', kind: 'core',
  };
}

/** 首页任务先成为星空中的信件，孩子打开后才阅读完整内容。 */
export default function MissionHome({ onReadingChange }: { onReadingChange: (reading: boolean) => void }) {
  const nav = useNavigate();
  const childId = useStore((state) => state.activeChildId)!;
  const taskState = useStore((state) => state.taskStates[childId]);
  const courseSchedule = useStore((state) => state.courseSchedule);
  const customTasks = useStore((state) => state.customTasks[childId] ?? EMPTY_CUSTOM_TASKS);
  const childCompleteTask = useStore((state) => state.childCompleteTask);
  const [view, setView] = useState<LetterView | null>(null);
  const [readIds, setReadIds] = useState(() => readMailIds(childId));
  const [selectedEntryId, setSelectedEntryId] = useState<string>();
  const [resting, setResting] = useState(false);
  const [today, setToday] = useState(() => localDayKey());
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    initializeTaskSystem(childId);
    ensureDailyReview(childId);
    ensureCourseMails(childId);
  }, [childId, courseSchedule, today]);

  useEffect(() => {
    const key = `mission-rest:${childId}:${localDayKey()}`;
    setResting(window.sessionStorage.getItem(key) === '1');
  }, [childId]);

  useEffect(() => {
    const interval = window.setInterval(() => setToday((current) => {
      const next = localDayKey();
      return next === current ? current : next;
    }), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const mission = useMemo(
    () => taskState?.initializedAt ? deliveredMission(childId) : undefined,
    [childId, taskState, customTasks, courseSchedule, today],
  );
  const courseMails = useMemo(() => courseMailBuckets(childId), [childId, taskState, courseSchedule, today]);
  const completed = taskState?.lastCompletion && Date.now() - taskState.lastCompletion.at < 10 * 60_000
    ? taskState.lastCompletion : undefined;
  const day = today;
  const driftMission = !resting && mission?.kind === 'visitor' ? mission : undefined;
  const sender = senderFor(driftMission);
  const isDrifting = Boolean(driftMission && !completed);
  const dueParent = customTasks.filter((task) => customTaskDueToday(task) && !task.doneDays.includes(day));
  const reviewAssignment = taskState?.dailyReview?.day === day ? taskState.dailyReview : undefined;
  const review = reviewAssignment && !taskState?.completed[reviewAssignment.taskId] && taskState?.pausedTaskId !== reviewAssignment.taskId
    ? missionById(childId, reviewAssignment.taskId) : undefined;
  const currentEntries: InboxEntry[] = [
    ...courseMails.current.map((record) => ({ id: `course:${record.mailId}`, icon: record.mission.icon, title: record.mission.title, subtitle: mailDateLabel(record.date), status: STATUS_LABEL[record.status], course: record })),
    ...(review ? [{ id: `mission:${review.id}`, icon: review.icon, title: review.title, subtitle: review.categoryLabel, status: '待完成', mission: review }] : []),
    ...dueParent.map((task) => {
      const pending = task.pendingDays.includes(day);
      const parent = parentTaskMission(task, day);
      return { id: `mission:${parent.id}`, icon: parent.icon, title: parent.title, subtitle: parent.categoryLabel, status: pending ? '等待家人确认' : '待完成', mission: parent, disabled: pending };
    }),
  ];
  const currentMissionIds = new Set(currentEntries.flatMap((entry) => entry.mission ? [entry.mission.id] : []));
  const saved = acceptedMissions(childId).filter((task) => !currentMissionIds.has(task.id));
  const unfinishedEntries: InboxEntry[] = [
    ...courseMails.unfinished.map((record) => ({ id: `course:${record.mailId}`, icon: record.mission.icon, title: record.mission.title, subtitle: mailDateLabel(record.date), status: STATUS_LABEL[record.status], course: record })),
    ...saved.map((task) => ({ id: `mission:${task.id}`, icon: task.icon, title: task.title, subtitle: task.categoryLabel, status: '进行中', mission: task })),
  ];
  const replies = recentMissionCompletions(childId);
  const completedEntries: InboxEntry[] = [
    ...courseMails.completed.map((record) => ({ id: `course:${record.mailId}`, icon: record.mission.icon, title: record.mission.title, subtitle: mailDateLabel(record.date), status: '已完成', course: record })),
    ...replies.map(({ taskId, mission: item, completion }) => ({ id: `reply:${taskId}`, icon: item?.icon ?? '✦', title: item?.title ?? '已完成任务', subtitle: item?.categoryLabel ?? '任务记录', status: '已完成', mission: item, completion })),
  ];
  const entries = view === 'letter' ? currentEntries : view === 'saved' ? unfinishedEntries : completedEntries;
  const entryIds = entries.map((entry) => entry.id).join('|');
  const selectedEntry = entries.find((entry) => entry.id === selectedEntryId) ?? entries[0];
  const pendingEntries = [...currentEntries, ...unfinishedEntries];
  const rewardEntries = pendingEntries.filter((entry) => entry.course?.status === 'completed');
  const unreadEntries = pendingEntries.filter((entry) => !readIds.has(entry.id) && !entry.disabled
    && (entry.course ? !entry.course.startedAt && entry.course.status !== 'completed' : entry.status === '待完成'));
  const continuingEntry = pendingEntries.find((entry) => entry.course?.startedAt && entry.course.status === 'unfinished');
  const mailboxHasNewLetter = unreadEntries.length > 0;
  const mailboxHasLetter = pendingEntries.length > 0;
  const mailboxStatus = rewardEntries.length > 0 ? 'reward' : mailboxHasNewLetter ? 'unread'
    : continuingEntry ? 'continue' : mailboxHasLetter ? 'pending' : completed ? 'reply' : 'empty';
  const mailboxBadge = mailboxStatus === 'reward' ? '奖励待领取' : mailboxStatus === 'unread' ? '新来信'
    : mailboxStatus === 'continue' ? '继续上课' : mailboxStatus === 'pending' ? '待处理' : mailboxStatus === 'reply' ? '新回信' : '';
  const mailboxSummary = mailboxStatus === 'reward' ? `${rewardEntries.length} 份学习奖励等你领取`
    : mailboxStatus === 'unread' ? `${unreadEntries.length} 封来信还没读`
      : mailboxStatus === 'continue' ? continuingEntry!.title
        : mailboxStatus === 'pending' ? `${pendingEntries.length} 项任务等待处理`
          : mailboxStatus === 'reply' ? '看看这次的学习收获' : '今天可以自由探索';

  useEffect(() => {
    onReadingChange(Boolean(view));
    return () => onReadingChange(false);
  }, [view, onReadingChange]);

  // 只记录实际出现在详情区的信件；阅读不会开始课程或改变奖励。
  useEffect(() => {
    if (!view || view === 'drift' || view === 'replies' || !selectedEntry || readIds.has(selectedEntry.id)) return;
    const next = new Set(readIds).add(selectedEntry.id);
    setReadIds(next);
    try { localStorage.setItem(`sfz-mail-read-v1:${childId}`, JSON.stringify([...next])); } catch { /* 本地存储不可用时仍可在当前页面阅读。 */ }
  }, [view, selectedEntry?.id, childId, readIds]);

  const openMailbox = () => {
    const preferred = rewardEntries[0] ?? unreadEntries[0] ?? continuingEntry ?? pendingEntries[0];
    clearLastCompletion(childId);
    setSelectedEntryId(preferred?.id);
    setView(preferred ? currentEntries.some((entry) => entry.id === preferred.id) ? 'letter' : 'saved' : 'replies');
  };

  useEffect(() => {
    if (driftMission) markMissionSeen(childId, driftMission);
  }, [childId, driftMission?.id]);

  useEffect(() => {
    if (!view || view === 'drift') return;
    if (!entries.some((entry) => entry.id === selectedEntryId)) setSelectedEntryId(entries[0]?.id);
  }, [view, selectedEntryId, entryIds]);

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
  }, [view]);

  const openMission = (task: Mission) => {
    setView(null);
    if (task.category === 'parent') {
      childCompleteTask(childId, task.id.split(':')[1]);
      return;
    }
    if (task.scheduleId) startCourseMail(childId, task.scheduleId);
    else pauseMission(childId, task.id);
    nav(task.route);
  };
  const handleClaim = (record: CourseMailRecord) => {
    if (claimCourseMailReward(childId, record.mailId)) {
      setView('replies');
      setSelectedEntryId(`course:${record.mailId}`);
    }
  };

  const renderEntryDetail = (entry: InboxEntry | undefined) => {
    if (!entry) return <div className="inbox-detail-empty"><span>✉</span><strong>这里还没有任务</strong><p>新的任务到达后，会先出现在左侧列表。</p></div>;
    if (entry.course) {
      const record = entry.course;
      return <>
        <small>{mailDateLabel(record.date)} · {entry.status}</small>
        <p className="letter-intro">来自星穹学校</p>
        <h3>{record.mission.title}</h3>
        <p>{record.mission.brief}</p>
        <div className="letter-meta"><span>{record.mission.icon} {record.mission.categoryLabel}</span><span>完成奖励 🪙 {record.reward}</span></div>
        {record.rewardClaimed
          ? <div className="inbox-complete-note">奖励已于 {record.claimedAt ? new Date(record.claimedAt).toLocaleDateString() : '此前'}领取</div>
          : record.status === 'completed'
            ? <button className="letter-primary" onClick={() => handleClaim(record)}>领取 🪙 {record.reward}<span>→</span></button>
            : <button className="letter-primary" onClick={() => openMission(record.mission)}>{record.status === 'not-started' ? '开始上课' : '继续上课'}<span>→</span></button>}
      </>;
    }
    if (entry.completion) return <>
      <small>{entry.completion.legacy ? '以前已经完成' : new Date(entry.completion.completedAt).toLocaleDateString()}</small>
      <p className="letter-intro">星光已经记录</p>
      <h3>{entry.title}</h3>
      <p>这项任务已经完成，可以随时在这里查看记录。</p>
      {!entry.completion.legacy && <div className="letter-reward">本次收获 <strong>🪙 {entry.completion.reward}</strong></div>}
    </>;
    if (entry.mission) {
      const entrySender = senderFor(entry.mission);
      return <>
        <small>{entry.status} · {entry.mission.categoryLabel}</small>
        <p className="letter-intro">{entrySender.intro}</p>
        <h3>{entry.mission.title}</h3>
        <p>{entry.mission.brief}</p>
        <div className="letter-meta"><span>{entry.mission.icon} {entrySender.destination}</span>{entry.mission.reward > 0 && <span>完成可得 🪙 {entry.mission.reward}</span>}</div>
        <button className="letter-primary" disabled={entry.disabled} onClick={() => openMission(entry.mission!)}>{entry.disabled ? '等待家人确认' : entry.mission.actionLabel}<span>{entry.disabled ? '…' : '→'}</span></button>
      </>;
    }
    return null;
  };

  const dialog = view && createPortal(
    <div className="letter-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setView(null); }}>
      <section className={`star-letter${view === 'drift' ? ' drift-message' : ''}`} role="dialog" aria-modal="true" aria-labelledby="star-letter-title">
        <div className="star-letter-sky" aria-hidden="true"><i /><i /><i /></div>
        <header className="star-letter-header">
          <span className="star-letter-mark" aria-hidden="true">{view === 'drift' ? '◇' : '✉'}</span>
          <div><small>{view === 'drift' ? '卷星外部空间' : '星环收件站'}</small><h2 id="star-letter-title">{view === 'drift' ? '拾到一条漂流讯息' : view === 'letter' ? '当前来信' : view === 'saved' ? '未完成' : '已完成'}</h2></div>
          <button ref={closeRef} className="star-letter-close" onClick={() => setView(null)} aria-label={view === 'drift' ? '关闭漂流讯息' : '合上来信'}>{view === 'drift' ? '关闭' : '合上'} <span>×</span></button>
        </header>
        {view !== 'drift' && <nav className="letter-drawers" aria-label="收件站抽屉">
          <button className={view === 'letter' ? 'active' : ''} onClick={() => setView('letter')}><span>✉</span> 当前来信</button>
          <button className={view === 'saved' ? 'active' : ''} onClick={() => setView('saved')}><span>🗂️</span> 未完成{unfinishedEntries.length > 0 && <b>{unfinishedEntries.length}</b>}</button>
          <button className={view === 'replies' ? 'active' : ''} onClick={() => setView('replies')}><span>✨</span> 已完成</button>
        </nav>}
        <div className="star-letter-scroll">
          {view === 'drift' && driftMission && <div className="letter-sheet">
            <aside className="letter-sender">
              <span className="letter-seal" aria-hidden="true">{sender.seal}</span>
              <small>来自{sender.source}</small><strong>{sender.name}</strong>
              <div className="letter-route"><span>出发地</span><b>卷星外部</b><i>··· ✦ ···</i><span>目的地</span><b>{sender.destination}</b></div>
            </aside>
            <article className="letter-message">
              <>
                <small>DRIFT MESSAGE · 漂流讯息</small>
                <p className="letter-intro">{sender.intro}</p>
                <h3>{driftMission.title}</h3><p>{driftMission.brief}</p>
                <div className="letter-meta"><span>{driftMission.icon} {sender.destination}</span>{driftMission.reward > 0 && <span>完成可得 🪙 {driftMission.reward}</span>}</div>
                <button className="letter-primary" onClick={() => openMission(driftMission)}>{driftMission.actionLabel}<span>→</span></button>
                <div className="letter-secondary"><button onClick={() => { dismissMission(childId, driftMission.id); setView(null); }}>放走这条讯息</button><button onClick={() => { quietVisitors(childId); setView(null); nav('/map'); }}>自己探索</button></div>
              </>
            </article>
          </div>}
          {view !== 'drift' && <div className="inbox-split">
            <aside className="inbox-entry-list" aria-label={`${view === 'letter' ? '当前来信' : view === 'saved' ? '未完成' : '已完成'}任务列表`}>
              <div className="inbox-list-head"><small>{view === 'letter' ? '今天需要处理' : view === 'saved' ? '以前尚未完成' : '已经完成归档'}</small><strong>{entries.length} 项任务</strong></div>
              {entries.length === 0 ? <div className="inbox-list-empty">暂无任务</div> : entries.map((entry) => <button type="button" key={entry.id} className={selectedEntry?.id === entry.id ? 'active' : ''} aria-pressed={selectedEntry?.id === entry.id} onClick={() => setSelectedEntryId(entry.id)}><span>{entry.icon}</span><span><b>{entry.title}</b><small>{entry.subtitle}</small></span><em>{entry.status}{unreadEntries.some((unread) => unread.id === entry.id) && <i className="inbox-unread-dot" aria-label="未读" />}</em></button>)}
            </aside>
            <article className="letter-message inbox-entry-detail">{renderEntryDetail(selectedEntry)}</article>
          </div>}
        </div>
      </section>
    </div>,
    document.body,
  );

  return <>
    <section className={`star-mail-area${isDrifting ? ' has-drift' : ''}`} id="station" aria-label="星环收件站" aria-live="polite">
      {isDrifting && <button className="drift-letter" onClick={() => setView('drift')} aria-label={`拾取来自${sender.name}的漂流讯息`}>
        <span className="drift-orbit" aria-hidden="true" /><span className="drift-capsule" aria-hidden="true"><i>{sender.seal}</i></span><strong>漂流讯息</strong><small>轻点拾取</small>
      </button>}
      <button className={`star-mailbox mail-status-${mailboxStatus}${mailboxStatus === 'unread' ? ' has-letter' : ''}${mailboxStatus === 'reward' || mailboxStatus === 'reply' ? ' has-reply' : ''}`} onClick={openMailbox} aria-label={`打开星环收件站${mailboxBadge ? `，${mailboxBadge}` : ''}`}>
        <span className="mailbox-orbit" aria-hidden="true"><i /><i /></span>
        <span className="mailbox-body" aria-hidden="true"><i className="mailbox-window" /><i className="mailbox-slot" /><i className="mailbox-door" /><i className="mailbox-signal" /></span>
        {mailboxStatus === 'unread' && <span className="mail-receive-loop" aria-hidden="true">✉</span>}
        {(mailboxHasNewLetter || rewardEntries.length > 0) && <span className="mail-envelope" aria-hidden="true"><i>{rewardEntries.length > 0 ? '⭐' : '✉'}</i></span>}
        {mailboxBadge && <span className={`new-mail-badge${mailboxStatus === 'reward' || mailboxStatus === 'reply' ? ' is-reply' : ''}`}><i aria-hidden="true" />{mailboxBadge}</span>}
        <span className="mailbox-label"><small>星环收件站{mailboxHasLetter ? ` · ${pendingEntries.length} 项待处理` : ''}</small><strong>{mailboxSummary}</strong></span>
      </button>
    </section>
    {dialog}
  </>;
}
