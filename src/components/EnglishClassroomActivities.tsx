import {createContext,useContext,useState,type ComponentProps} from 'react';
import ClassroomActivities from './ClassroomActivities';
export const EnglishClassroomContext=createContext('');
/** Stable lesson/stage/task identities retain nested selections across reloads and route changes. */
export default function EnglishClassroomActivities({activityKey,...props}:ComponentProps<typeof ClassroomActivities>&{activityKey?:string}){
 const scope=useContext(EnglishClassroomContext);
 const key=`${scope}:tab:${activityKey??props.labels.join('|')}`;
 const [selected,setSelected]=useState(()=>{try{return Number(JSON.parse(localStorage.getItem(key)??'0'))||0;}catch{return 0;}});
 return <ClassroomActivities {...props} selectedIndex={props.selectedIndex??selected} onSelect={index=>{setSelected(index);if(scope)try{localStorage.setItem(key,JSON.stringify(index));}catch{/* Session remains usable. */}props.onSelect?.(index);}}/>;
}
