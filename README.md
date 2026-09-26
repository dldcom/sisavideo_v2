# 창체·범교과 영상 학습지 v2

React + TypeScript + Vite 프론트엔드, Cloudflare Pages 정적 배포, Supabase Free 운영 DB, 로컬 Codex 수집·분석 작업으로 구성합니다. 영상과 전체 자막은 저장하지 않습니다.

기준 문서: [구현 계획](https://app.notion.com/p/3de6103085ed8173bb33c8215140dd2e), [Supabase 설계 및 구현 가이드](https://app.notion.com/p/3e76103085ed81e8a35ee9bc3a74e146).

## 로컬 실행

Node.js 22 이상, npm, `yt-dlp`가 필요합니다.

1. `npm install`
2. `.env.example`을 `.env.local`로 복사하고 Vite용 Supabase URL과 publishable key를 입력합니다.
3. Supabase SQL Editor 또는 CLI에서 `supabase/migrations/202609260001_initial.sql`을 적용한 뒤 `supabase/seed.sql`을 실행합니다.
4. `npm run dev`

Cloudflare Pages 설정: 빌드 명령 `npm run build`, 출력 폴더 `dist`, `VITE_SUPABASE_URL`과 `VITE_SUPABASE_PUBLISHABLE_KEY` 환경변수를 설정합니다. `_redirects`가 SPA 경로를 처리합니다. secret key는 Pages에 넣지 않습니다.

주제별 공개 영상은 한 번에 18개만 조회하며, 세부주제와 학년 필터는 Supabase 쿼리에 적용합니다. 목록 페이지 이동 때만 다음 묶음을 요청합니다.

## 로컬 수집과 검수

로컬 `.env.local`에 `SUPABASE_SECRET_KEY`, `YOUTUBE_API_KEY`도 설정합니다. 로컬 수집 작업은 위의 `VITE_SUPABASE_URL`을 같은 프로젝트 주소로 사용하므로 URL을 중복 입력할 필요가 없습니다. 이 파일은 Git에서 제외됩니다. `yt-dlp`가 PATH에 없다면 `YT_DLP_PATH=C:\codex\tools\yt-dlp.exe`처럼 실행 파일의 절대 경로를 지정할 수 있습니다. 실행 파일은 Git 저장소 밖에 둡니다. 먼저 Supabase Dashboard의 `channels`에 실제 YouTube channel ID를 등록하고 채널 검토 후 `review_status='approved'`, `auto_collect=true`로 설정합니다. 출처 유형은 순위가 아닙니다.

1. `node --env-file=.env.local automation/discover.mjs` — YouTube Data API에서 등록 채널의 업로드 메타데이터를 받아 `automation/out/candidates.json`에 신규 후보만 기록합니다.
2. `node --env-file=.env.local automation/prepare.mjs VIDEO_ID` — `yt-dlp`가 자막만 임시 수집하고, Codex가 읽을 후보 메타데이터와 타임스탬프 자막을 표준 출력으로 보냅니다. 임시 자막 파일은 종료 전에 지웁니다.
3. 로컬 Codex가 `automation/CODEX_WORKFLOW.md`에 따라 직접 분석하고 `automation/analysis.example.json` 형식의 JSON을 `automation/out/VIDEO_ID.analysis.json`에 작성합니다. 이 파일에는 전체 자막을 넣지 않습니다.
4. `node --env-file=.env.local automation/commit.mjs VIDEO_ID automation/out/VIDEO_ID.analysis.json` — 자막을 다시 임시 수집해 근거를 검증합니다. 통과 문제만 영상과 함께 `needs_review`, `published=false`로 저장합니다.
5. Supabase Dashboard에서 영상·주제·문제·자막 근거와 시각을 교사가 검수합니다. 공개하려면 해당 영상의 `review_status='approved'`, `reviewed_at` 현재 시각, `published=true`를 설정합니다. DB 트리거가 검증 통과 문제만 공개합니다. 마음에 들지 않는 문제는 영상 공개 전에 삭제하거나 `validation_status='auto_failed'`로 바꿉니다.

비공개 후보 및 작업 로그는 RLS로 일반 사용자에게 보이지 않습니다. `youtube_video_id`가 중복 기준입니다. 분석 결과를 저장하는 명령은 공개 상태를 변경하지 않습니다.

## 검증

`npm test`, `npm run typecheck`, `npm run build`. 실제 3~5개 영상 시험 결과는 [테스트 기록](TEST_RESULTS.md)에 별도로 기록합니다.
