import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assessCourse, AssessmentError, parseAssessment, validateAssessment, type CourseAssessmentInput } from './course-assessment.js';

const task: CourseAssessmentInput = { subject:'数学', lessonId:'plus-nine', taskId:'reason', prompt:'说明 9＋3 的方法', criteria:['凑十','剩余部分'], requirement:'answer', answer:'从3拿出1给9凑十，还剩2，所以12。' };
const provider = {baseUrl:'https://test.invalid/v1/',apiKey:'test-key',model:'test-model'};
const result = (verdict='pass', met=true) => JSON.stringify({verdict,feedback:'说清楚了数量关系。',checks:task.criteria.map(()=>({met,feedback:'已核对这条关系。'}))});
test('空回答及缺少原始录音拒绝确认',()=>{
  assert.throws(()=>validateAssessment({...task,answer:''}),AssessmentError);
  assert.throws(()=>validateAssessment({...task,requirement:'audio'}),/实际录音/);
  assert.throws(()=>validateAssessment({...task,requirement:'image'}),/题目或检查标准/);
});
test('限制输入长度、文件类型及参考原声地址',()=>{
  for (const update of [{answer:'a'.repeat(6001)},{image:'https://evil.invalid/img'},{image:'data:image/svg+xml;base64,AAAA'},{audio:{format:'webm',data:'AAAA'}},{audio:{format:'wav',data:'***'}},{criteria:[]},{referenceAudio:'/etc/passwd'},{referenceAudio:'/assets/english-textbook/audio/../../secret.mp3'}]) assert.throws(()=>validateAssessment({...task,...update}),AssessmentError);
});
test('示范是可选参考，不能代替空作答，且必须是有效短文字',()=>{
  assert.throws(()=>validateAssessment({...task,answer:'',exampleAnswer:task.answer}),/先作答/);
  for (const exampleAnswer of ['', '  ', 3, 'a'.repeat(6001)]) {
    assert.throws(()=>validateAssessment({...task,exampleAnswer}),/示范答案无效/);
  }
  assert.equal(validateAssessment({...task,exampleAnswer:task.answer}).exampleAnswer,task.answer);
});
test('服务未配置不会产生通过结果',async()=>{
  await assert.rejects(()=>assessCourse(task,{baseUrl:'',apiKey:'',model:''}),/尚未配置/);
});
test('逐项未达到、未知 verdict 或格式不完整不能确认',()=>{
  assert.equal(parseAssessment(result('pass',false),2).verdict,'retry');
  assert.equal(parseAssessment(result('retry',true),2).verdict,'retry');
  for (const content of [result('completed'), '{}', '通过',result().replace('"checks":','"missing":'),result()]) {
    if (content===result()) assert.throws(()=>parseAssessment(content,3),AssessmentError);
    else assert.throws(()=>parseAssessment(content,2),AssessmentError);
  }
});
test('保留真实回答与逐项标准，通过仅由 AI 有效结果决定',async()=>{
  let sent: any;
  const send: typeof fetch=async(url,init)=>{
    assert.equal(url,'https://test.invalid/v1/chat/completions');
    assert.match(JSON.stringify(init?.headers),/test-key/); sent=JSON.parse(String(init?.body));
    return new Response(JSON.stringify({choices:[{message:{content:result()}}]}),{status:200});
  };
  const assessed=await assessCourse(task,provider,send);
  assert.equal(assessed.verdict,'pass');
  const evidence=JSON.parse(sent.messages[1].content[0].text);
  assert.equal(evidence.answer,task.answer); assert.deepEqual(evidence.criteria,task.criteria);
  assert.match(sent.messages[0].content,/不能把/);
});
test('音频以原始内容提交，不把转写当作原始录音',async()=>{
  const send: typeof fetch=async(_url,init)=>{
    const contents=JSON.parse(String(init?.body)).messages[1].content;
    assert.deepEqual(contents.find((c:any)=>c.type==='input_audio').input_audio,{data:'AAAA',format:'wav'});
    return new Response(JSON.stringify({choices:[{message:{content:result()}}]}));
  };
  await assessCourse({...task,requirement:'audio',audio:{data:'AAAA',format:'wav'}},provider,send);
});
test('参考教材缺失、上游失败和格式错误都保持待确认',async()=>{
  await assert.rejects(()=>assessCourse({...task,referenceAudio:'/assets/english-textbook/audio/missing-fixture.mp3'},provider),/参考录音/);
  await assert.rejects(()=>assessCourse(task,provider,async()=>new Response('error',{status:500})),/暂时无法/);
  await assert.rejects(()=>assessCourse(task,provider,async()=>new Response(JSON.stringify({choices:[{message:{content:'完成了'}}]}))),/有效检查结果/);
  await assert.rejects(()=>assessCourse(task,provider,async()=>{throw new Error('network');}),/未完成/);
});

test('数学理由按核心意思宽松判断，短句不要求逐项展开',async()=>{
  for (const answer of ['数起来方便','十个一变一个十','先凑十好算']) {
    const relaxed={...task,taskId:'reason-expression',answer,criteria:['核心意思接近或一个合理解释即可']};
    const send:typeof fetch=async(_url,init)=>{
      const sent=JSON.parse(String(init?.body));
      assert.match(sent.messages[0].content,/与参考意思差不多/);
      assert.match(sent.messages[0].content,/缺少细节不能单独成为不通过理由/);
      assert.match(sent.messages[0].content,/不评价发音、流利度或语法/);
      assert.doesNotMatch(sent.messages[0].content,/全部标准达到才 pass/);
      const evidence=JSON.parse(sent.messages[1].content[0].text);
      assert.equal(evidence.answer,answer); assert.equal(evidence.criteria.length,1);
      return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({verdict:'pass',feedback:'意思说对了！',checks:[{met:true,feedback:'核心意思合理。'}]})}}]}));
    };
    assert.equal((await assessCourse(relaxed,provider,send)).verdict,'pass');
  }
});
test('宽松的数学理由仍保留明显错误的再试结果',async()=>{
  const relaxed={...task,taskId:'reason-expression',answer:'十根捆好就只剩一根',criteria:['核心数学意思合理']};
  const assessed=await assessCourse(relaxed,provider,async()=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({verdict:'retry',feedback:'捆好后还是十根哦。',checks:[{met:false,feedback:'根数没有减少。'}]})}}]})));
  assert.equal(assessed.verdict,'retry');
});
test('宽松理由政策只用于数学说理由，其他课程检查保留原标准',async()=>{
  for (const update of [{subject:'英语' as const,taskId:'reason-expression'},{subject:'数学' as const,taskId:'another-task'}]) {
    await assessCourse({...task,...update},provider,async(_url,init)=>{
      const sent=JSON.parse(String(init?.body));
      assert.match(sent.messages[0].content,/全部标准达到才 pass/);
      assert.doesNotMatch(sent.messages[0].content,/采用宽松的意思判断/);
      return new Response(JSON.stringify({choices:[{message:{content:result()}}]}));
    });
  }
});

const chineseTask: CourseAssessmentInput = {
  subject:'语文',lessonId:'motherland',taskId:'oral-transfer',requirement:'answer',supported:true,
  prompt:'选择一处祖国景物，说说你看到了什么、想到了什么。',
  criteria:['说出看到的景物','说出自己的想法','围绕题目表达，意思清楚'],
  exampleAnswer:'我看到长江很宽，我想看看江上的船。',answer:'我看到长江很宽，我想看看江上的船。',
};
test('语文表达及复习传递显示的示范，实际照用示范可以通过且不加要求',async()=>{
  for (const taskId of ['oral-transfer','review-oral:motherland:expression']) {
    let calls=0;
    const assessed=await assessCourse({...chineseTask,taskId},provider,async(_url,init)=>{
      calls++;
      const sent=JSON.parse(String(init?.body));
      assert.match(sent.messages[0].content,/与示范相同或意思相近的内容可以通过/);
      assert.match(sent.messages[0].content,/不能把只展示示范当成孩子已作答/);
      assert.match(sent.messages[0].content,/不能再要求更多画面细节/);
      assert.match(sent.messages[0].content,/“用自己的话”只表示表达意思清楚/);
      assert.doesNotMatch(sent.messages[0].content,/题目示范或语音转写当作实际能力证据/);
      const evidence=JSON.parse(sent.messages[1].content[0].text);
      assert.equal(evidence.exampleAnswer,chineseTask.exampleAnswer);
      assert.equal(evidence.answer,chineseTask.answer);
      assert.equal(evidence.usedHelp,true);
      return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({verdict:'pass',feedback:'你说出了看到的景物和自己的想法！',checks:chineseTask.criteria.map(()=>({met:true,feedback:'核心内容清楚。'}))})}}]}));
    });
    assert.equal(calls,1);assert.equal(assessed.verdict,'pass');
  }
  await assert.rejects(()=>assessCourse(chineseTask,{baseUrl:'',apiKey:'',model:''}),/尚未配置/);
});
test('语文表达缺少核心内容仍保留 AI 再试结果，示范不覆盖实际答案',async()=>{
  const answer='我看到长江很宽。';
  const assessed=await assessCourse({...chineseTask,answer},provider,async(_url,init)=>{
    const evidence=JSON.parse(JSON.parse(String(init?.body)).messages[1].content[0].text);
    assert.equal(evidence.answer,answer);assert.equal(evidence.exampleAnswer,chineseTask.exampleAnswer);
    return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({verdict:'retry',feedback:'再说说你想到什么。',checks:[{met:true,feedback:'描述了长江。'},{met:false,feedback:'还没有想法。'},{met:true,feedback:'意思清楚。'}]})}}]}));
  });
  assert.equal(assessed.verdict,'retry');
});
test('示范可通过政策不影响语文真实录音、认字或其他学科',async()=>{
  for (const update of [{requirement:'audio' as const,audio:{data:'AAAA',format:'wav' as const}},{taskId:'recognition:江'},{subject:'英语' as const},{subject:'数学' as const}]) {
    await assessCourse({...chineseTask,...update},provider,async(_url,init)=>{
      const instructions=JSON.parse(String(init?.body)).messages[0].content;
      assert.match(instructions,/全部标准达到才 pass/);
      assert.doesNotMatch(instructions,/与示范相同或意思相近的内容可以通过/);
      return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({verdict:'retry',feedback:'需要实际作答。',checks:chineseTask.criteria.map(()=>({met:false,feedback:'还未核实。'}))})}}]}));
    });
  }
});
