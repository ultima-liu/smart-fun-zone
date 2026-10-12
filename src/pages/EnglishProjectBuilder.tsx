import ClassroomActivities from '../components/EnglishClassroomActivities';
import CourseReplayButton from '../components/CourseReplayButton';
import { useEffect, useState } from 'react';
import { useStore } from '../store';
import {getEnglishG3Unit} from '../content/englishGrade3Upper';
import { speakOnce } from '../speech';
import { readEnglishPractice, recordEnglishEvidence, saveEnglishPractice } from '../englishLearning';
import { ANIMAL_FEATURES, ENGLISH_PROJECT_CHOICES, ENGLISH_PROJECT_DETAILS, emptyEnglishProject, englishProjectSentence, validateEnglishProject, type EnglishProjectDraft } from '../content/englishProjects';
import { EnglishObservation, EnglishPicture } from './EnglishLearningActivities';

const TITLES: Record<string, string> = { friends: '朋友思维导图', families: '我的家庭关系树', animals: '动物图片书', plants: '纸上花园', colours: '颜色翻页书', numbers: '生日邀请卡' };
const GROUP_TITLES: Record<string, string> = { friends: '交朋友', families: '与主角的关系', animals: '按生活环境分组', plants: '人与植物互相帮助', colours: '我的颜色选择' };

export default function EnglishProjectBuilder({ lessonId, unitId, onReady }: { lessonId: string; unitId: string; onReady: (ready: boolean) => void }) {
  const childId = useStore((state) => state.activeChildId);
  const [draft, setDraft] = useState<EnglishProjectDraft>(() => {
    const value = readEnglishPractice(childId, lessonId, 'project', emptyEnglishProject());
    return { name: typeof value.name === 'string' ? value.name : '', age: typeof value.age === 'string' ? value.age : '', time: typeof value.time === 'string' ? value.time : '', greeting: typeof value.greeting === 'string' ? value.greeting : 'Happy birthday!', paper: value.paper === true, presented: value.presented === true, rows: Array.isArray(value.rows) ? value.rows.filter((row) => row && typeof row.item === 'string' && typeof row.detail === 'string') : [] };
  });
  const [pageIndex, setPageIndex] = useState(0);
  const [rowIndex,setRowIndex]=useState(0);
  const [attempted, setAttempted] = useState(false);
  const [saved,setSaved]=useState(()=>draft.presented||readEnglishPractice(childId,lessonId,'project-checked',{signature:''}).signature===JSON.stringify(draft));
  const savedSupport = readEnglishPractice(childId, lessonId, 'project-support', { modelUsed: false, structureHelp: false });
  const [modelUsed, setModelUsed] = useState(savedSupport.modelUsed === true);
  const [structureHelp, setStructureHelp] = useState(savedSupport.structureHelp === true);
  const errors = validateEnglishProject(unitId, draft);
  const valid = errors.length === 0;
  const [unitChecked, setUnitChecked] = useState(() => readEnglishPractice(childId, lessonId, 'project-ai-unit', {done:false}).done);
  const ready = valid && draft.presented && unitChecked;
  useEffect(() => { saveEnglishPractice(childId, lessonId, 'project', draft); }, [childId, draft, lessonId]);
  useEffect(() => { saveEnglishPractice(childId, lessonId, 'project-support', { modelUsed, structureHelp }); }, [childId, lessonId, modelUsed, structureHelp]);
  useEffect(() => { onReady(ready); }, [onReady, ready]);
  const edit = (change: Partial<EnglishProjectDraft>) => { setDraft((current) => ({ ...current, ...change, presented: false })); setSaved(false); setUnitChecked(false); saveEnglishPractice(childId, lessonId, 'project-ai-unit', {done:false}); };
  const add = () => {
    const item = ENGLISH_PROJECT_CHOICES[unitId]?.find((choice) => !draft.rows.some((row) => row.item === choice));
    if (item) {setRowIndex(draft.rows.length); edit({ rows: [...draft.rows, { item, detail: '' }] });}
  };
  const updateRow = (index: number, field: 'item' | 'detail', value: string) => edit({ rows: draft.rows.map((row, i) => i === index ? { ...row, [field]: value } : row) });
  const save = () => {
    setAttempted(true);
    if (!valid) { setStructureHelp(true); return; }
    recordEnglishEvidence(childId, { lessonId, taskId: 'project:structure', skill: 'project', level: structureHelp ? 'supported' : 'independent', source: 'check', context: 'lesson', note: '作品信息与关系通过检查；口语单独记录' });
    saveEnglishPractice(childId,lessonId,'project-checked',{signature:JSON.stringify(draft)});
    setSaved(true);
  };
  const presentation = unitId === 'numbers' ? ['说明收卡对象', '区分年龄和聚会时间', '说出生日祝福'] : ['介绍至少两处作品内容', '说明内容之间的关系或特点', '让同伴理解作品'];
  const selfCheck=getEnglishG3Unit(unitId)?.project.selfCheck??[];
  const currentPage = draft.rows[Math.min(pageIndex, Math.max(0, draft.rows.length - 1))];
  return <ClassroomActivities className="ct-subtasks en-project-tasks" labels={['制作作品','介绍作品','单元表达']} completed={[valid && saved, valid && draft.presented,unitChecked]} advanceThrough={2}><section className="en-project-builder en-real-project en-full-panel" aria-label={TITLES[unitId]}><header><span>MAKE & SHARE</span><h3>{TITLES[unitId]}</h3><label className="en-paper-choice" title="纸上制作后，也在这里填写作品的关键信息"><input type="checkbox" checked={draft.paper} onChange={(event) => edit({ paper: event.target.checked })} />我在纸上制作</label></header><div className="en-project-form">
    {(unitId === 'numbers' || unitId === 'families') && <label className="en-project-name">对象／虚构名字<input maxLength={30} value={draft.name} onChange={(event) => edit({ name: event.target.value })} /></label>}
    {unitId === 'numbers' ? <div className="en-birthday-fields"><label>Age · 年龄<input inputMode="numeric" maxLength={2} value={draft.age} onChange={(event) => edit({ age: event.target.value })} /></label><label>Party time · 聚会时间<input maxLength={15} placeholder="6 p.m." value={draft.time} onChange={(event) => edit({ time: event.target.value })} /></label><label>祝福<select value={draft.greeting} onChange={(event) => edit({ greeting: event.target.value })}><option>Happy birthday!</option><option>Good morning!</option><option>Goodbye!</option></select></label></div> : <>
      <nav className="en-project-row-tabs" aria-label="选择作品内容">{draft.rows.map((row,index)=><button type="button" key={index} className={rowIndex===index?'active':''} onClick={()=>setRowIndex(index)}>{index+1}. {row.item}{row.detail?' ✓':''}</button>)}</nav><div className="en-project-editor">{draft.rows.map((row, index) => <div key={index} className="en-project-row" hidden={index!==Math.min(rowIndex,draft.rows.length-1)}><span>{index + 1}</span><label>内容<select value={row.item} onChange={(event) => updateRow(index, 'item', event.target.value)}>{ENGLISH_PROJECT_CHOICES[unitId].map((item) => <option key={item}>{item}</option>)}</select></label><label>{unitId === 'friends' ? '为什么' : unitId === 'colours' ? '颜色' : '关系／分组'}<select value={row.detail} onChange={(event) => updateRow(index, 'detail', event.target.value)}><option value="">请选择</option>{ENGLISH_PROJECT_DETAILS[unitId].map((detail) => <option key={detail}>{detail}</option>)}</select></label><button type="button" aria-label={`删除第 ${index + 1} 项`} title="删除" onClick={() => edit({ rows: draft.rows.filter((_, i) => i !== index) })}>×</button></div>)}</div><button type="button" disabled={draft.rows.length >= ENGLISH_PROJECT_CHOICES[unitId].length} onClick={add}>添加{unitId === 'animals' || unitId === 'colours' ? '一页' : '内容'}</button>
    </>}
    </div><div className={`en-project-canvas en-project-canvas--${unitId}`} aria-label="我的作品">
      {unitId === 'numbers' ? <div className="en-birthday-card"><EnglishPicture word="seven" /><h4>{draft.greeting}</h4><p>To: {draft.name || '…'}</p><p>Age: {draft.age || '…'} years old</p><p>Party time: {draft.time || '…'}</p></div>
        : unitId === 'animals' || unitId === 'colours' ? <><nav aria-label="作品翻页"><button type="button" aria-label="上一页作品" disabled={pageIndex <= 0} onClick={() => setPageIndex((index) => index - 1)}>←</button><b>{draft.rows.length ? Math.min(pageIndex + 1, draft.rows.length) : 0} / {draft.rows.length}</b><button type="button" aria-label="下一页作品" disabled={pageIndex >= draft.rows.length - 1} onClick={() => setPageIndex((index) => index + 1)}>→</button></nav>{currentPage && <div className="en-project-book-page"><EnglishPicture word={currentPage.item} /><h4>{currentPage.item}</h4>{currentPage.detail && <><p>{englishProjectSentence(unitId, currentPage)}</p>{unitId === 'animals' && <small>{currentPage.detail} · {ANIMAL_FEATURES[currentPage.item]}</small>}{unitId === 'colours' && <span className={`en-project-colour en-project-colour--${currentPage.detail}`} />}</>}</div>}</>
        : <><h4>{GROUP_TITLES[unitId]}{unitId === 'families' && draft.name && ` · ${draft.name}`}</h4><div className="en-project-branches">{(unitId === 'families' || unitId === 'plants' ? ENGLISH_PROJECT_DETAILS[unitId] : ['行动与理由']).map((group) => <div key={group}><b>{group}</b>{draft.rows.filter((row) => unitId === 'friends' || row.detail === group).map((row, index) => <div className="en-project-branch" key={index}><EnglishPicture word={row.item === 'Smile' ? 'smile' : row.item === 'Listen' ? 'listen' : row.item === 'Help' ? 'help' : row.item === 'Share' ? 'share' : row.item} /><span>{row.detail ? englishProjectSentence(unitId, row) : row.item}</span></div>)}</div>)}</div></>}
    </div>
    <footer className="en-project-actions">{attempted && errors.length > 0 && <ul className="en-project-errors" role="status">{errors.map((error) => <li key={error}>{error}</li>)}</ul>}<button type="button" className="ct-primary" onClick={save}>检查并保存作品</button></footer>
</section><section className="en-project-presentation en-full-panel">{(valid && (saved || ready)) ? <><header><h3>把作品介绍给同伴</h3><CourseReplayButton label="听作品短句示范" onClick={() => { setModelUsed(true); speakOnce(unitId === 'numbers' ? `Happy birthday, ${draft.name}! You are ${draft.age} years old.` : draft.rows.map((row) => englishProjectSentence(unitId, row)).join(' '), 'en', 0.85); }}/></header><EnglishObservation prompt={`用英语介绍你的作品。作品信息：${JSON.stringify(draft)}`} lessonId={lessonId} taskId="project:present" skill="project" criteria={presentation} supported={modelUsed} onDone={() => setDraft((current) => ({ ...current, presented: true }))} />{ready && <p role="status">作品和介绍练习已保存。</p>}</> : <><h3>先完成作品，再介绍给同伴</h3><p>把需要的内容填写完整，检查并保存后就可以介绍作品。</p></>}</section><section className="en-project-self-check en-full-panel" data-english-narration={`单元表达。${selfCheck.join('。')}`}><h3>说说这单元学到了什么</h3><p>用本单元的词句介绍作品，说说你学会了什么。</p><EnglishObservation lessonId={lessonId} taskId="project:unit-check" skill="project" prompt={`本单元目标：${selfCheck.join('；')}。请用英语介绍作品，给出相关实际表达。作品材料仅作为检查上下文：${JSON.stringify(draft)}`} criteria={selfCheck.length ? selfCheck : presentation} supported={modelUsed} onDone={() => { setUnitChecked(true); saveEnglishPractice(childId, lessonId, 'project-ai-unit', {done:true}); }} /></section></ClassroomActivities>;
}
