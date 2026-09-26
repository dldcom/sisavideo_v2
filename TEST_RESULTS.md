# 테스트 기록

## 현재 확인

- 기준 Notion 문서 2개를 읽고 스키마와 공개 흐름에 반영했다.
- 기존 `sisavideo` 파일은 읽기만 했으며 변경하지 않았다.
- `automation/tests/validation.test.mjs`에 자막 근거 3건과 실패 사례 2건, json3 파싱 검사를 작성했다.
- 실제 `automation/validate.mjs` 소스를 V8에서 실행해 근거 3건은 통과, 근거에 없는 정답 1건은 거부됨을 확인했다. 이 검사는 Node 테스트 러너와 전체 수집 흐름을 대신하지 않는다.
- 분석 JSON 예시를 같은 검증 모듈에 넣어 분석 필드와 문제 근거 검사 모두 오류 0건을 확인했다.
- 2026-09-26: 번들 Node.js로 `node --test automation/tests/*.test.mjs`를 실행해 6개 테스트 모두 통과했다.
- `package.json`, `tsconfig.json`, 분석 JSON 예시의 JSON 구문을 확인했고, 상위 교육주제 seed 14개를 확인했다.

## 아직 실행되지 않은 시험

Codex 작업 환경에는 Node.js가 있으나 `npm.cmd`와 `yt-dlp`가 PATH에 없다. 번들 `pnpm`으로 의존성 설치를 시도했지만 npm 레지스트리 접근이 `EACCES`로 거부되어 중단했다. Supabase/YouTube API 자격 증명도 없다. 따라서 타입 검사, 빌드, SQL migration 적용, 실제 영상 3~5개의 API→자막→Codex 분석→비공개 저장→교사 공개→화면 출력 전 구간은 아직 실행하지 못했다.

## 실제 영상 3~5개 점검 절차

1. 서로 다른 출처 유형의 검토된 채널 3~5개에서 공개 자막이 있는 영상을 고른다. 각 영상 ID와 수집 시각을 기록한다.
2. `discover.mjs`가 중복 없이 후보를 기록하는지 확인한다.
3. `prepare.mjs`로 자막을 확보하고 임시 폴더가 삭제됐는지 확인한다.
4. 로컬 Codex 분석 JSON을 만들고 `commit.mjs`를 실행한다. 문제마다 정답이 근거·자막 시간대에 있는지 확인한다.
5. `needs_review`와 `published=false` 상태, RLS 비공개를 확인한다.
6. 교사 검수 후 1개 이상 공개하여 주제/세부주제/학년 필터, YouTube 재생, 학생용/교사용 A4 인쇄를 확인한다.

테스트 중 YouTube가 자막을 제공하지 않으면 해당 영상은 문제 생성에서 제외하고 다른 영상을 선택한다.
