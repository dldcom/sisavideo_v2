# 테스트 기록

## 현재 확인

- 기준 Notion 문서 2개를 읽고 스키마와 공개 흐름에 반영했다.
- 기존 `sisavideo` 파일은 읽기만 했으며 변경하지 않았다.
- `automation/tests/validation.test.mjs`에 자막 근거 3건과 실패 사례 2건, json3 파싱 검사를 작성했다.
- 실제 `automation/validate.mjs` 소스를 V8에서 실행해 근거 3건은 통과, 근거에 없는 정답 1건은 거부됨을 확인했다. 이 검사는 Node 테스트 러너와 전체 수집 흐름을 대신하지 않는다.
- 분석 JSON 예시를 같은 검증 모듈에 넣어 분석 필드와 문제 근거 검사 모두 오류 0건을 확인했다.
- 2026-09-26: 번들 Node.js로 `node --test automation/tests/*.test.mjs`를 실행해 6개 테스트 모두 통과했다.
- 2026-09-27: 주제 목록을 18개씩 페이지 처리하도록 바꾼 뒤 타입 검사, 6개 자동 테스트, Vite 프로덕션 빌드가 통과했다.
- 2026-09-27: 공개 데이터를 정적 JSON으로 내보내는 구조로 바꾼 뒤 타입 검사, 7개 자동 테스트, Vite 프로덕션 빌드가 통과했다. 공개 스냅샷 테스트는 비공개 영상과 비공개 문제의 제외를 확인한다. 브라우저 번들에서 Supabase client가 제거됐다.
- 2026-09-26: 사용자가 `npm.cmd install`을 완료했다. Codex 작업 환경에서도 설치된 의존성을 확인하고 타입 검사와 Vite 프로덕션 빌드를 재실행해 모두 통과했다. Node 테스트 6개도 재통과했다.
- 2026-09-26: 공식 `yt-dlp.exe`를 `C:\codex\tools`에 설치하고 공식 SHA-256 체크섬 일치 및 `2026.08.19` 버전 실행을 확인했다. `.env.local`의 `YT_DLP_PATH`로 Node 프로세스에서도 실행을 확인했다.
- `package.json`, `tsconfig.json`, 분석 JSON 예시의 JSON 구문을 확인했고, 상위 교육주제 seed 14개를 확인했다.

## 실제 Supabase·YouTube 시험 (2026-09-27)

- Supabase Management API로 `202609260001_initial.sql`과 `seed.sql`을 순서대로 적용했다. Data API로 34개 교육주제(상위 14개)와 빈 `videos` 테이블을 확인했다.
- YouTube Data API로 영상 3개의 메타데이터를 가져왔다. 채널은 모두 `candidate`, `auto_collect=false`, 출처 유형 `discovery`로 등록했다. 출처 유형은 영상 품질 점수가 아니다.
- `yt-dlp`로 한국어 자막을 확보하고 로컬 Codex가 분석 JSON을 작성했다. `commit.mjs`가 자막을 다시 수집해 근거 문장·시간·정답을 검증한 뒤 다음 영상과 문제만 저장했다.
  - `6caiRNIFWE8` — 횡단보도 안전, 자동 자막, 문제 1개. 일부 자막 오인식이 있으나 핵심 개념 구간은 읽을 수 있어 그 구간만 근거로 사용했다.
  - `geLqFfQUD-0` — 보행자 안전, 자동 자막, 문제 2개.
  - `94e5eoA8KS4` — 온라인 언어 예절·사진 공유 동의, 수동 자막, 문제 2개. 원 제작 대상은 취학 전 아동이므로 초등 활용 적합성을 교사가 검토해야 한다.
- DB 재조회 결과 영상 3개는 모두 `needs_review`, `published=false`; 문제 5개는 모두 `auto_passed`, `published=false`, 근거 문장 있음. 전체 자막과 영상 파일은 DB에 저장하지 않았다.
- 이전에 자막 수집 실패로 분류한 6개 영상은 `yt-dlp`에 Node.js 실행 경로를 지정한 뒤 모두 한국어 자막을 가져왔다. `ko.*` 패턴이 번역 자막까지 요청하여 429가 난 한 영상은 원본 한국어 트랙만 요청해 해결했다. 수집 오류와 자막 부재를 분리하도록 모듈을 수정했다.
- `review:report`가 검수 대기 영상 3개와 문제 5개의 영상·근거 구간 링크를 포함한 로컬 보고서를 생성했다.
- 문제별 `teacher_review_status` migration을 적용했다. 자동 검증만 통과한 문제는 공개되지 않으며, 교사가 문제를 승인하고 영상도 승인해야 공개되도록 DB 트리거와 정적 내보내기 조건을 수정했다.
- 실제 DB의 문제 5개가 모두 `teacher_review_status=needs_review`, `published=false`임을 확인했다. 미검수 문제의 `published=true` 직접 변경 시도도 트리거가 `false`로 유지했다.
- 공개 JSON 내보내기는 교육주제 34개, 영상 0개를 생성했다. `dist/data`에도 비공개 영상 파일이 없다. 자동 테스트 7개, 타입 검사, Vite 빌드가 통과했다.
- 추가 영상 6개의 YouTube 메타데이터와 한국어 자막을 다시 수집했다. 로컬 분석 결과를 `commit.mjs`로 재검증해 영상 6개와 빈칸 문제 10개를 Supabase에 저장했다: `5rvk-_g-AkU` 2개, `DFzHl3hhexs` 1개, `BLxy2jCrd8s` 1개, `0oWKIAxMVqA` 2개, `XruHp6PQZkE` 2개, `rxqOe8g0mec` 2개.
- DB 재조회 결과 총 영상 9개와 문제 15개다. 추가 영상 6개는 모두 `needs_review`, `published=false`; 추가 문제 10개는 모두 `auto_passed`, `teacher_review_status=needs_review`, `published=false`다. 문제의 필수 문항·정답·자막 근거·시작/종료 시각도 모두 존재하며 시간 구간이 유효하다.
- `review:report`를 다시 실행해 영상 9개와 문제 15개의 근거 링크를 `automation/out/review-report.md`에 기록했다. 공개 JSON은 교육주제 34개, 영상 0개로 유지됐다. `BLxy2jCrd8s`와 `0oWKIAxMVqA`의 자동 자막에는 오인식이 많아 실제 발화와 문제 근거 구간을 교사가 특히 확인해야 한다.

## 남은 확인

교사의 영상·문제 검수와 공개 결정은 아직 이뤄지지 않았다. 따라서 승인 후 공개 JSON 생성, Cloudflare Pages 배포, 실제 브라우저 출력과 공개 취소의 운영 시험은 아직 수행하지 않았다. 사용자의 npm 설치 결과는 중간 수준 취약점 2건을 보고했으며, 영향 패키지는 별도로 확인해야 한다.

## 교사 검수 후 확인 절차

1. 교사가 `needs_review` 영상 9개와 문제 15개의 화면 내용, 자막 오류, 출처, 학년 적합성을 확인한다.
2. 교사가 공개할 영상만 `review_status='approved'`, `reviewed_at` 현재 시각, `published=true`로 설정한다.
3. `npm run export:public`, `npm run build`를 실행하고 승인된 영상·문제만 JSON에 포함되는지 확인한다.
4. Pages에 배포하여 주제/세부주제/학년 필터, YouTube 재생, 학생용/교사용 A4 인쇄를 확인한다. 공개를 취소한 뒤 다시 내보내고 배포하여 해당 파일이 사라지는지도 확인한다.

테스트 중 YouTube가 자막을 제공하지 않으면 해당 영상은 문제 생성에서 제외하고 다른 영상을 선택한다.
