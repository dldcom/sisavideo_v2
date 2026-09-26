import test from 'node:test';
import assert from 'node:assert/strict';
import { validateQuestion } from '../validate.mjs';
import { parseJson3 } from '../transcripts/ytdlp.mjs';

const captions=[
  {start:12,duration:4,text:'횡단보도에서는 좌우를 살피고 건너요.'},
  {start:28,duration:4,text:'자전거를 탈 때는 안전모를 착용해요.'},
  {start:45,duration:5,text:'지진이 나면 탁자 아래로 몸을 보호해요.'},
];
const cases=[
  ['횡단보도에서는 @@BLANK@@를 살피고 건너요.','좌우',captions[0]],
  ['자전거를 탈 때는 @@BLANK@@를 착용해요.','안전모',captions[1]],
  ['지진이 나면 @@BLANK@@ 아래로 몸을 보호해요.','탁자',captions[2]],
];
for(const [question_text,answer,cue] of cases) test(`자막 근거 검증: ${answer}`,()=>{
  assert.deepEqual(validateQuestion({question_text,answer,evidence_text:cue.text,evidence_start_seconds:cue.start,evidence_end_seconds:cue.start+cue.duration,semantic_validation:{passes:true,reason:'근거 문장만으로 빈칸을 채울 수 있음'}},captions),[]);
});
test('근거 없는 정답은 거부',()=>{
  const q={question_text:'@@BLANK@@를 착용해요.',answer:'안전벨트',evidence_text:captions[1].text,evidence_start_seconds:28,evidence_end_seconds:32,semantic_validation:{passes:true,reason:'확인'}};
  assert.match(validateQuestion(q,captions).join(' '),/정답이 근거 문장에 없습니다/);
});
test('잘못된 타임스탬프는 거부',()=>{
  const q={question_text:'@@BLANK@@를 착용해요.',answer:'안전모',evidence_text:captions[1].text,evidence_start_seconds:40,evidence_end_seconds:44,semantic_validation:{passes:true,reason:'확인'}};
  assert.match(validateQuestion(q,captions).join(' '),/근거 문장이 해당 시간대 자막에 없습니다/);
});
test('json3 파싱',()=>{assert.deepEqual(parseJson3(JSON.stringify({events:[{tStartMs:12000,dDurationMs:4000,segs:[{utf8:'좌우를 '},{utf8:'살펴요'}]}]})),[{start:12,duration:4,text:'좌우를 살펴요'}]);});
