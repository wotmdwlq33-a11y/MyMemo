import type { Note } from './notes';

const seedTime = new Date().toISOString();
const seed = (id: number, title: string, body: string, tags: string[]): Note => ({
  id,
  title,
  body,
  tags,
  createdAt: seedTime,
  updatedAt: seedTime,
  pinned: false,
  archived: false,
});

/** Example notes shown on first run (nothing stored yet). */
export const SEED_DATA: Note[] = [
  seed(1, '시안 작업 가이드', '디자인 시스템을 준수하여 피그마 시안을 작업하는 방법론 정리.', ['디자인', '가이드']),
  seed(2, '읽어야 할 책 리스트', '클린 코드, 리팩터링, 테크니컬 라이팅 실전 가이드.', ['독서', '자기개발']),
  seed(3, '프로젝트 아이디어', 'AI 기반의 개인 메모 관리 시스템 및 일기 자동 생성 서비스.', ['업무', '개발']),
];
