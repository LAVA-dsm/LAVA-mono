# LAVA Mono

LAVA는 프로젝트 아이디어를 실행 가능한 개발 계획으로 바꾸는 AI 기반 프로젝트 기획 및 협업 도우미입니다.

이 저장소는 현재 구현 코드가 아니라, 이후 Coding LLM Agent와 개발자가 공통으로 참조할 프로젝트 문서 시스템을 먼저 담고 있습니다.

## 빠른 시작

구현이나 설계를 시작하는 에이전트는 아래 순서로 문서를 읽습니다.

1. [AGENTS.md](./AGENTS.md)
2. [docs/README.md](./docs/README.md)
3. [DESIGN.md](./DESIGN.md)
4. [docs/project/00-project-brief.md](./docs/project/00-project-brief.md)
5. [docs/project/03-functional-requirements.md](./docs/project/03-functional-requirements.md)
6. [docs/project/05-sprint-backlog.md](./docs/project/05-sprint-backlog.md)

## 문서 원칙

- 요구사항은 기능 단위로 작게 나누고, 구현 판단에 필요한 제약과 예외를 함께 둡니다.
- 확정된 요구사항은 도메인, 기능, AI, 스프린트 문서에 나누어 기록합니다.
- AI 기능은 일반 CRUD와 구분해서 입력, 출력, 제한, 실패 처리를 따로 관리합니다.
