# AGENTS

이 문서는 LAVA-mono 저장소에서 작업하는 Coding LLM Agent의 최상위 진입점입니다.

## 현재 저장소 상태

- 현재 단계: 프로젝트 문서 시스템 구축 단계
- 현재 범위: Markdown 문서만 존재
- 코드 작성 상태: 아직 구현 코드 없음

## 프로젝트 한 줄 정의

LAVA는 사용자가 프로젝트 아이디어를 입력하면 AI가 아이디어 구체화, 기능 명세서, API 명세서, 일정표를 생성해 프로젝트 시작을 돕는 서비스입니다.

## 작업 전 읽기 순서

1. [docs/README.md](./docs/README.md): 문서 지도
2. [DESIGN.md](./DESIGN.md): UI 디자인 시스템
3. [TECH_STACK.md](./TECH_STACK.md): 기술 스택과 배포 구조
4. [docs/project/00-project-brief.md](./docs/project/00-project-brief.md): 제품 요약
5. [docs/project/01-user-flows.md](./docs/project/01-user-flows.md): 사용자 흐름
6. [docs/project/02-domain-model.md](./docs/project/02-domain-model.md): 핵심 도메인과 상태
7. [docs/project/03-functional-requirements.md](./docs/project/03-functional-requirements.md): 기능 요구사항
8. [docs/project/04-ai-features.md](./docs/project/04-ai-features.md): AI 기능 요구사항
9. [docs/project/05-sprint-backlog.md](./docs/project/05-sprint-backlog.md): 스프린트 구현 순서

## 구현 에이전트 운영 규칙

- 요구사항이 충돌하면 `03-functional-requirements.md`를 우선 보고, AI 관련 세부사항은 `04-ai-features.md`를 확인한다.
- UI를 구현할 때는 `DESIGN.md`의 앱 셸, 색상, 컴포넌트 기준을 따른다.
- 기술 선택과 배포 구조는 `TECH_STACK.md`를 따른다.
- 인증, 프로젝트, 초대, 문서, 일정은 서로 다른 도메인으로 취급한다.
- 스프린트 순서가 명시된 작업은 `05-sprint-backlog.md`의 의존성을 따른다.
- 코드 구현을 시작하기 전에는 현재 문서와 실제 작업 요청이 일치하는지 확인한다.

## 핵심 제품 판단

서비스의 본체는 아래 2가지입니다.

- 아이디어 구체화: 막연한 입력을 프로젝트 개요, 사용자, 기능, 범위로 정리한다.
- 문서 자동 생성: 기능 명세서, API 명세서, 일정표를 개발 가능한 초안으로 만든다.
