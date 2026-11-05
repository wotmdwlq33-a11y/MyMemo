# MyMemo

태그와 검색으로 정리하는 개인 메모 앱입니다. 서버 없이 브라우저에서만 동작하며, 메모는 브라우저의 `localStorage`에 저장됩니다.

AI Studio에서 보기: https://ai.studio/apps/9c459aa9-28d7-4bb4-862a-d4198416aae3

## 주요 기능

- 메모 작성 · 수정 · 삭제 (카드를 클릭하면 수정 창이 열립니다)
- 쉼표로 구분한 태그 입력 (앞뒤 공백 제거, 중복 태그 자동 제거)
- 제목 · 본문 · 태그 검색, 사이드바에서 태그별 필터
- 새로고침해도 유지되는 로컬 저장
- 저장 데이터가 손상돼도 앱이 멈추지 않음: 손상된 원본은 `mymemo.notes.corrupt-backup` 키에 백업하고 빈 목록으로 시작합니다

## 기술 스택

React 19 · TypeScript · Vite 6 · Tailwind CSS 4 · motion · lucide-react · Vitest

## 로컬에서 실행하기

**필요 조건:** Node.js 20 이상

```bash
npm install      # 의존성 설치 (CI에서는 npm ci)
npm run dev      # 개발 서버: http://localhost:3000
```

API 키나 환경 변수는 필요하지 않습니다.

## 스크립트

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 실행 (포트 3000) |
| `npm run build` | 프로덕션 빌드 (`dist/`) |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run lint` | TypeScript 타입 검사 (`tsc --noEmit`) |
| `npm test` | Vitest 단위 테스트 실행 |
| `npm run clean` | `dist/` 삭제 |

## 프로젝트 구조

```
src/
  App.tsx            화면과 메모 추가/수정/삭제 로직
  ErrorBoundary.tsx  렌더링 오류 시 안내 화면
  lib/notes.ts       localStorage 읽기/쓰기, 태그 정리 헬퍼
  lib/notes.test.ts  헬퍼 단위 테스트
  main.tsx           진입점
```

## 데이터 저장 방식

메모는 `localStorage`의 `mymemo.notes` 키에 JSON 배열로 저장됩니다. 브라우저나 기기 간에 동기화되지 않으며, 브라우저 사이트 데이터를 지우면 메모도 삭제됩니다.
