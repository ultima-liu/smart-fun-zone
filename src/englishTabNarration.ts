import type { RefObject } from 'react';
import { useLessonTabNarration } from './lessonTabNarration';
import { speakOnce, stopSpeaking } from './speech';
const visible = (element: Element) => !element.closest('[hidden],[aria-hidden="true"]');
const clean = (value: string) => value.replace(/[✓✔🔊🎤💡]/gu,'').replace(/\s+/g,' ').trim();
export function englishNarrationLeaf(root: HTMLElement): HTMLElement | null {
  if(root.querySelector('.en-challenge-done'))return null;
  const leaves=[...root.querySelectorAll<HTMLElement>('[data-lesson-explanation],[role="tabpanel"],[data-english-leaf]')].filter(visible);
  return leaves.find(leaf=>!leaves.some(other=>other!==leaf&&leaf.contains(other)))??root;
}
export function englishNarrationText(leaf: HTMLElement): string {
  if (leaf.dataset.lessonExplanation) return leaf.dataset.lessonExplanation;
  const script=leaf.dataset.englishNarration??leaf.querySelector<HTMLElement>('[data-english-narration]')?.dataset.englishNarration;
  if (leaf.dataset.englishNarrationMode === 'instructions-only') return clean(script ?? '');
  const texts=script?[script]:[...leaf.querySelectorAll('h3,h4,p,strong')].filter(element=>visible(element)&&!element.closest('[role="status"],details,.en-observation,.en-question-hints,.en-project-errors,.en-blend-sounds,.en-audio-player')).map(element=>clean(element.textContent??''));
  const options=[...leaf.querySelectorAll('[data-english-options],.en-phonics-choices,.en-role-choices')].filter(visible).map(group=>[...group.querySelectorAll('button')].filter(visible).map(button=>clean(button.textContent??''))).filter(group=>group.length).map(group=>`答案选项：${group.map((text,index)=>`选项${index+1}，${text}`).join('；')}`);
  const fields=[...leaf.querySelectorAll<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>('input:not([type="checkbox"]),textarea,select')].filter(field=>visible(field)&&!field.closest('.en-audio-player')).map(field=>{const label=field.labels?.[0]?.cloneNode(true) as HTMLElement|undefined;label?.querySelectorAll('input,textarea,select,button').forEach(element=>element.remove());const caption=clean(label?.textContent??field.getAttribute('aria-label')??'');return caption?`填写要求：${caption}${'placeholder' in field && field.placeholder?`，${field.placeholder}`:''}`:'';});
  return [...new Set(texts.filter(Boolean)),...options,...new Set(fields.filter(Boolean))].join('。');
}
let generation=0;
export function stopEnglishNarration(exceptAudio?:HTMLAudioElement){generation++;stopSpeaking();document.querySelectorAll<HTMLAudioElement>('.en-classroom audio,.en-original-modal audio,.en-player audio,.en-recorded-columns audio').forEach(audio=>{if(audio!==exceptAudio)audio.pause();});}
/** One voice and request for a mixed sentence; standalone letters use English names. */
export function playEnglishNarration(text:string,onEnd?:(played:boolean)=>void){
 stopEnglishNarration();const request=generation;
 speakOnce(text,/[\u4e00-\u9fff]/.test(text)?'zh':'en',.85,played=>{if(request===generation)onEnd?.(played);},'english');
}
export function useEnglishTabNarration(rootRef:RefObject<HTMLElement>,scope:string){return useLessonTabNarration(rootRef,scope,englishNarrationLeaf,englishNarrationText,playEnglishNarration,stopEnglishNarration);}
