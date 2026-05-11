# LAVA 문서 시스템

이 디렉터리는 LAVA 프로젝트를 Coding LLM Agent가 빠르게 이해하고 구현에 들어갈 수 있도록 나눈 문서 시스템입니다.

## 문서 지도

| 문서 | 용도 | 먼저 읽는 상황 |
| --- | --- | --- |
| [../DESIGN.md](../DESIGN.md) | UI 디자인 시스템, 화면 패턴, 컴포넌트 기준 | 프론트엔드 구현 및 화면 설계 |
| [../TECH_STACK.md](../TECH_STACK.md) | 기술 스택, 배포 구조, 구현 순서 | 프로젝트 스캐폴딩 및 배포 설계 |
| [00-project-brief.md](./project/00-project-brief.md) | 제품 목적, 타겟, 핵심 가치 요약 | 프로젝트 전체 맥락 파악 |
| [01-user-flows.md](./project/01-user-flows.md) | 사용자 플로우와 화면 흐름 | UX, 라우팅, API 흐름 설계 |
| [02-domain-model.md](./project/02-domain-model.md) | 엔티티, 상태, 관계 정리 | DB, API, 백엔드 모델 설계 |
| [03-functional-requirements.md](./project/03-functional-requirements.md) | 기능별 요구사항, 제약, 예외 | 기능 구현 및 테스트 설계 |
| [04-ai-features.md](./project/04-ai-features.md) | AI 호출 기능의 입력, 출력, 제약 | 프롬프트, AI API, 비동기 처리 설계 |
| [05-sprint-backlog.md](./project/05-sprint-backlog.md) | 스프린트별 작업과 의존성 | 구현 순서 결정 |

## 읽기 전략

- 전체 제품 이해가 필요하면 `00 -> 01 -> 02` 순서로 읽습니다.
- 특정 기능 구현이 목표라면 `03`에서 기능 ID를 찾고, AI 기능이면 `04`를 함께 확인합니다.
- 스프린트 계획이나 작업 분할이 필요하면 `05`를 기준으로 이슈나 작업 단위를 만듭니다.
- 요구사항이 비어 있거나 충돌하면 관련 문서에 `확인 필요` 메모를 남기고 사용자에게 확인합니다.
