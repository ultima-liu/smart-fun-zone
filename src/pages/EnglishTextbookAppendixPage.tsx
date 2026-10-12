import { useNavigate, useSearchParams } from 'react-router-dom';
import BackButton from '../components/BackButton';
import EnglishRecordedMaterials from '../components/EnglishRecordedMaterials';
import { englishLessonRecordings } from '../content/englishG3Audio';
import { ENGLISH_G3_UPPER_UNITS } from '../content/englishGrade3Upper';
import '../english-textbook.css';
import '../english-classroom.css';
import './english-textbook-appendix.css';

/** Appendix recordings belong to the complete unit vocabulary lists and the complete alphabet. */
export default function EnglishTextbookAppendixPage() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const requested = params.get('unit');
  const unit = requested === 'alphabet' || ENGLISH_G3_UPPER_UNITS.some(item => item.id === requested) ? requested! : 'friends';
  return <main className="en-appendix-page page">
    <header><BackButton onClick={() => nav('/subject/english')} aria-label="返回英语目录" /><div><small>PEP · 教材附录</small><h1>单元词汇与完整字母表</h1></div></header>
    <nav aria-label="选择教材附录">{ENGLISH_G3_UPPER_UNITS.map((item, index) => <button type="button" key={item.id} aria-pressed={unit === item.id} onClick={() => setParams({ unit: item.id }, { replace: true })}>Unit {index + 1} 词汇</button>)}<button type="button" aria-pressed={unit === 'alphabet'} onClick={() => setParams({ unit: 'alphabet' }, { replace: true })}>Aa–Zz 字母表</button></nav>
    <EnglishRecordedMaterials key={unit} clips={englishLessonRecordings(`appendix-${unit}`)} />
  </main>;
}
