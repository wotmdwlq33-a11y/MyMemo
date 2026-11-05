# MyMemo

태그와 검색으로 정리하는 개인 메모 앱입니다. 서버 없이 브라우저에서만 동작하며, 메모는 브라우저의 `localStorage`에 저장됩니다.

AI Studio에서 보기: https://ai.studio/apps/9c459aa9-28d7-4bb4-862a-d4198416aae3

## 주요 기능

- 메모 작성 · 수정 · 삭제 (카드를 클릭하면 수정 창이 열립니다. 삭제 후 알림의 "실행 취소"로 되돌릴 수 있습니다)
- 쉼표로 구분한 태그 입력 (앞뒤 공백 제거, 중복 태그 자동 제거)
- 제목 · 본문 · 태그 검색 (일치하는 부분 강조 표시)
- 태그 필터: 사이드바나 카드의 태그를 눌러 여러 개를 함께 고를 수 있고(모두 포함하는 메모만 표시), 상단 칩의 ✕로 해제
- 정렬: 최근 수정순 · 최근 작성순 · 제목순 (선택은 저장됨)
- 고정: 고정한 메모는 어떤 정렬에서도 맨 위에 표시
- 보관함: 보관한 메모는 기본 목록에서 숨겨지고 사이드바의 "보관함"에서 볼 수 있음
- 다크 모드: 기본은 시스템 설정(`prefers-color-scheme`)을 따르고, 헤더 버튼으로 시스템 → 라이트 → 다크 순으로 전환
- JSON 내보내기 / 가져오기: 가져올 때 "병합"(새 메모 추가, 같은 메모는 더 최근에 수정된 쪽 유지) 또는 "모두 바꾸기"(확인 후 전체 대체) 선택. 잘못된 항목은 건너뛰고 개수를 알려줍니다
- PWA: 홈 화면에 설치할 수 있고, 한 번 연 뒤에는 오프라인에서도 열립니다 (프로덕션 빌드에서만 서비스 워커 등록)
- 새로고침해도 유지되는 로컬 저장, 저장 실패(용량 초과 등) 시 경고 표시
- 단축키: `/` 검색, `N` 새 메모, 작성 창에서 Ctrl/⌘ + Enter 저장 · Esc 닫기
- 대화 상자 안에서 Tab 포커스가 순환하고, 닫으면 연 버튼으로 포커스가 돌아갑니다
- 저장 데이터가 손상돼도 앱이 멈추지 않음: 손상된 원본은 `mymemo.notes.corrupt-backup` 키에 백업하고 빈 목록으로 시작합니다

## 기술 스택

React 19 · TypeScript · Vite 6 · Tailwind CSS 4 · motion · lucide-react · Vitest · Playwright

## 로컬에서 실행하기

**필요 조건:** Node.js 20 이상

```bash
npm install      # 의존성 설치 (CI에서는 npm ci)
npm run dev      # 개발 서버: http://localhost:3000
```

API 키나 환경 변수는 필요하지 않습니다.

e2e 테스트를 처음 실행할 때는 브라우저가 필요합니다: `npx playwright install chromium`

## 스크립트

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 실행 (포트 3000) |
| `npm run build` | 프로덕션 빌드 (`dist/`) |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run lint` | TypeScript 타입 검사(strict) + ESLint (react-hooks 규칙 포함) |
| `npm test` | Vitest 단위 테스트 실행 |
| `npm run e2e` | Playwright e2e 테스트 (빌드 후 `vite preview` :4173에서 실행) |
| `npm run clean` | `dist/` 삭제 |

## 프로젝트 구조

```
src/
  App.tsx                    화면 상태와 메모 추가/수정/삭제/가져오기 로직
  components/                NoteCard, ImportDialog, Highlight
  ErrorBoundary.tsx          렌더링 오류 시 안내 화면
  lib/notes.ts               localStorage 읽기/쓰기, 메모 검증·태그 정리
  lib/search.ts              필터 · 정렬 · 검색어 강조
  lib/transfer.ts            JSON 내보내기/가져오기 검증과 병합
  lib/theme.ts               테마 설정 저장과 적용
  registerServiceWorker.ts   서비스 워커 등록 (프로덕션 전용)
  main.tsx                   진입점
public/
  manifest.webmanifest, sw.js, icons/   PWA 설정
e2e/                         Playwright 테스트
.github/workflows/ci.yml     lint · test · build · e2e CI
```

## 데이터 저장 방식

메모는 `localStorage`의 `mymemo.notes` 키에 JSON 배열로 저장됩니다. 테마는 `mymemo.theme`, 정렬은 `mymemo.sort` 키를 씁니다. 이전 버전에서 저장한 메모(`createdAt`/`pinned`/`archived` 없음)도 그대로 읽힙니다. 브라우저나 기기 간에 동기화되지 않으며, 브라우저 사이트 데이터를 지우면 메모도 삭제됩니다.

기기를 옮기거나 백업하려면 헤더의 내보내기 버튼으로 `mymemo-YYYY-MM-DD.json` 파일을 받아 두세요. 형식은 다음과 같습니다.

```json
{ "format": "mymemo", "version": 1, "exportedAt": "…", "notes": [ { "id": 1, "title": "…", "body": "…", "tags": [], "createdAt": "…", "updatedAt": "…", "pinned": false, "archived": false } ] }
```

메모 배열만 있는 JSON도 가져올 수 있습니다. `id`(양의 정수)와 `title`(문자열)이 없는 항목은 건너뜁니다.

병합 규칙:
- `id`와 `createdAt`이 모두 같으면 같은 메모로 보고, `updatedAt`이 더 최근인 쪽을 남깁니다.
- `id`만 같고 `createdAt`이 다르면(예: 기기마다 따로 만들어진 샘플 메모) 서로 다른 메모로 보고, 가져온 메모를 새 id로 추가합니다.
- 삭제 기록은 남지 않으므로, 이 기기에서 지운 메모도 파일에 있으면 다시 추가됩니다.
- 고정/보관 변경은 `updatedAt`을 바꾸지 않으므로, 병합 시 내용이 같으면 기존 메모의 고정/보관 상태가 유지됩니다.

서비스 워커 캐시를 바꿔야 할 때(앱 셸이나 아이콘 변경)는 `public/sw.js`의 `CACHE_VERSION`을 올리세요. 해시가 붙은 `/assets/*` 파일은 자동으로 갱신됩니다.
