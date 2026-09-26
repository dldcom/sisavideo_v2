import type { SourceType } from './types';
export const sourceLabel = (x: SourceType) => ({official:'공식 기관',editorial:'편집 매체',expert_creator:'전문가·크리에이터',discovery:'발견 출처'}[x]);
export const gradeLabel = (x: string) => ({'1-2':'1~2학년','3-4':'3~4학년','5-6':'5~6학년'} as Record<string,string>)[x] || x;
export const usageLabel = (x: string) => ({concept:'개념 설명',hook:'수업 도입',real_case:'실제 사례',news_case:'뉴스·사회 사례',discussion:'토론 자료',extension:'심화 자료'} as Record<string,string>)[x] || x;
export const formatDuration = (seconds: number | null) => seconds === null ? '시간 미상' : `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
export const timestamp = (seconds: number) => `${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
