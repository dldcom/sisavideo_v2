# 창체·범교과 영상 학습지 v2

React + TypeScript + Vite, Cloudflare Pages, Supabase Free, 로컬 Codex로 구성합니다. Supabase는 운영 원본 DB입니다. 방문자는 Supabase를 직접 호출하지 않고 Pages에 배포한 공개 JSON을 읽습니다. 영상 파일과 전체 자막은 저장하지 않습니다.

기준 문서: [구현 계획](https://app.notion.com/p/3de6103085ed8173bb33c8215140dd2e), [Supabase 가이드](https://app.notion.com/p/3e76103085ed81e8a35ee9bc3a74e146).

## 준비

Node.js 22 이상, npm, `yt-dlp`가 필요합니다.

1. `npm install`
2. `.env.example`을 `.env.local`로 복사하고 `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `YOUTUBE_API_KEY`를 입력합니다. 로컬 파일만 사용하며 Git에서 제외됩니다.
3. 최초 DB 구성 시 `SUPABASE_ACCESS_TOKEN`을 `.env.local`에 넣고 `npm run db:migrate`, `npm run db:seed`, `npm run db:teacher-review`를 순서대로 실행합니다. 각 명령은 Supabase Management API에 해당 SQL을 한 번 적용합니다. 토큰에는 `database_migrations_write` 권한이 필요합니다.
4. `npm run export:public`으로 공개 데이터를 생성하고 `npm run dev`로 확인합니다.

방문자는 `topics.json`, 해당 주제의 목록 JSON, 영상별 상세·문제 JSON을 필요한 시점에 받습니다. 주제 화면은 세부주제·학년 필터와 18개씩 페이지 이동을 브라우저에서 처리합니다. 데이터 변경은 다음 내보내기와 배포 이후에 반영됩니다.

## 로컬 수집과 교사 검수

`yt-dlp`가 PATH에 없으면 `.env.local`에 `YT_DLP_PATH=C:\codex\tools\yt-dlp.exe`처럼 절대 경로를 지정합니다. 먼저 Supabase Dashboard에서 `channels`에 YouTube channel ID를 등록하고 `review_status='approved'`, `auto_collect=true`로 설정합니다. 출처 유형은 등급이 아닙니다.
자막 수집 시 로컬 Node.js를 `yt-dlp`의 JavaScript 실행 환경으로 지정합니다. 자막 다운로드 오류는 실패로 알리고, 정상 실행 후 한국어 자막 파일이 없을 때만 자막 없음으로 처리합니다.

1. `node --env-file=.env.local automation/discover.mjs`로 YouTube Data API 후보를 찾습니다.
   개별 영상을 시험할 때는 `node --env-file=.env.local automation/stage-videos.mjs VIDEO_ID ...`로 공개 메타데이터를 가져올 수 있습니다. 새 채널은 `candidate`로 등록하고 자동 수집하지 않습니다.
2. `node --env-file=.env.local automation/prepare.mjs VIDEO_ID`로 임시 자막과 메타데이터를 Codex에 전달합니다.
3. 로컬 Codex가 `automation/CODEX_WORKFLOW.md`에 따라 분석 JSON을 `automation/out/VIDEO_ID.analysis.json`에 작성합니다. 전체 자막은 이 파일에 넣지 않습니다.
4. `node --env-file=.env.local automation/commit.mjs VIDEO_ID automation/out/VIDEO_ID.analysis.json`이 자막을 다시 확인하고 근거가 검증된 문제만 `needs_review`, `published=false`로 저장합니다.
   분석 JSON의 `coverage_review`에는 읽을 수 있는 핵심 학습 내용과 이를 다루는 문제 번호를 연결합니다. 문제 번호는 0부터 시작합니다. 문제화하지 못한 항목은 `omission_reason`을 적습니다. 영상 길이만으로 문제 수를 정하지 않습니다.
   이미 저장된 비공개 영상에 문항을 보강할 때는 `automation/add-questions.mjs`에 추가 문항 JSON 경로를 전달합니다. `--dry-run`으로 자막 근거를 먼저 확인한 뒤 저장합니다. 같은 문항을 다시 실행하면 중복 저장하지 않습니다.
5. `npm run review:report`로 `automation/out/review-report.md`를 생성합니다. 영상 링크와 문제별 시각 링크를 눌러 실제 화면·음성·자막 근거를 확인합니다. 교사는 Supabase Dashboard `questions`에서 문제별 `teacher_review_status`를 `approved` 또는 `rejected`로 정합니다. 영상까지 검수한 뒤 `videos`의 `review_status='approved'`, `reviewed_at` 현재 시각, `published=true`를 설정합니다. DB 트리거가 교사 승인 문제만 공개합니다.
6. `npm run export:public`, `npm run build`를 실행하고 `dist`를 Cloudflare Pages Direct Upload로 배포합니다. 공개 취소 시에도 즉시 다시 내보내고 배포해야 기존 정적 파일이 사라집니다.

Cloudflare Pages에는 Supabase URL이나 키를 설정하지 않습니다. `public/data`와 `dist`는 Git에서 제외되므로 Pages Git 빌드만으로는 공개 데이터가 포함되지 않습니다. 현재는 수동 Direct Upload 배포를 전제로 합니다. 주제 JSON이 커져 파일 크기 제한에 접근하면 내보내기를 분할해야 합니다.

## 검증

`npm test`, `npm run typecheck`, `npm run build`. 실제 영상 9개와 문제 28개는 교사 검수 전 비공개 저장까지 확인했고 [테스트 기록](TEST_RESULTS.md)에 결과와 남은 확인을 적었습니다.
