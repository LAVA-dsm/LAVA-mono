# LAVA Tech Stack

이 문서는 LAVA를 빠르게 구현하기 위한 기술 스택 결정 문서입니다.

판단 기준은 운영 안정성이나 장기 유지보수보다 코드 효율, 개발 시간, 팀원이 바로 이해할 수 있는 단순함입니다.

## 결론

| 영역 | 선택 | 이유 |
| --- | --- | --- |
| Monorepo | pnpm workspace | 설정이 가볍고 FE/BE/공유 타입을 한 저장소에서 관리하기 쉽습니다. |
| Frontend | Next.js + TypeScript | Vercel 배포가 가장 단순하고 React 기반 UI 생산성이 높습니다. |
| UI | Tailwind CSS + shadcn/ui + lucide-react | `DESIGN.md`의 카드/버튼/패널 UI를 빠르게 만들 수 있습니다. |
| Form/Validation | React Hook Form + Zod | 폼이 많고 검증 규칙이 명확해서 빠르게 구현할 수 있습니다. |
| Client State | TanStack Query + minimal Zustand | 서버 데이터는 Query, 아주 작은 UI 상태만 Zustand로 관리합니다. |
| Backend | NestJS + TypeScript | 인증, 프로젝트, 문서, 일정 도메인을 모듈로 나누기 쉽고 Swagger 문서화가 빠릅니다. |
| API Style | REST API | 화면 요구사항이 CRUD 중심이라 GraphQL보다 빠릅니다. |
| ORM | Prisma | 스키마 정의, migration, 타입 생성이 빨라 초기 개발에 유리합니다. |
| Database | PostgreSQL | 관계형 도메인에 적합하고 Prisma와 조합이 좋습니다. |
| AI | OpenAI Responses API + `gpt-5-mini` | 문서/일정 생성에 충분하고 비용과 속도 균형이 좋습니다. |
| Email | Nodemailer + SMTP | 기존 요구사항의 SMTP 초대/인증 발송을 가장 단순하게 구현합니다. |
| Auth | JWT HttpOnly Cookie | FE는 Vercel, BE는 EC2로 분리되므로 쿠키 기반 인증이 단순합니다. |
| Deployment | FE Vercel, BE/DB/Reverse Proxy EC2 Docker Compose | 사용자 제약을 만족하면서 배포 구성이 단순합니다. |

## 배포 제약

배포 환경은 아래를 반드시 지킵니다.

- Frontend만 Vercel에 배포합니다.
- Backend, Database, Reverse Proxy, SMTP 설정, AI 연동 서버 코드는 모두 AWS EC2 위에서 동작합니다.
- EC2에서는 Docker Compose로 서비스를 실행합니다.
- FE는 EC2 API 서버의 HTTPS URL을 호출합니다.

## 추천 저장소 구조

```txt
LAVA-mono/
  apps/
    web/                 # Next.js frontend, Vercel deploy
    api/                 # NestJS backend, EC2 deploy
  packages/
    shared/              # Zod schemas, shared TypeScript types, constants
  infra/
    docker/
      docker-compose.yml # api, postgres, caddy
      Caddyfile          # reverse proxy and HTTPS
  docs/
  AGENTS.md
  DESIGN.md
  TECH_STACK.md
```

## 시스템 구성

```mermaid
flowchart LR
  User["User Browser"] --> Vercel["Vercel: Next.js Web"]
  User --> Caddy["EC2 Docker: Caddy Reverse Proxy"]
  Caddy --> API["EC2 Docker: NestJS API"]
  API --> DB["EC2 Docker: PostgreSQL"]
  API --> OpenAI["OpenAI Responses API"]
  API --> SMTP["SMTP Provider"]
```

실제 요청 흐름은 브라우저가 Vercel의 Next.js 앱을 받고, 앱이 EC2의 API 서버를 호출하는 방식입니다. OpenAI API 키, SMTP 계정, DB 접속 정보는 EC2 API 서버 환경변수로만 관리합니다.

## Frontend

### 선택 스택

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- lucide-react
- React Hook Form
- Zod
- TanStack Query
- Zustand
- FullCalendar React

### 구현 방침

- Next.js는 FE 앱으로만 사용합니다. 프로젝트의 핵심 API는 EC2의 NestJS 서버에서 제공합니다.
- App Router를 사용하되, 서버 액션을 핵심 데이터 변경 경로로 쓰지 않습니다.
- API 호출은 `NEXT_PUBLIC_API_BASE_URL`을 기준으로 NestJS REST API를 호출합니다.
- 로그인 상태는 HttpOnly cookie 기반으로 처리하고, 클라이언트에서는 `/auth/me` 응답으로 사용자 상태를 복원합니다.
- 문서 편집기는 MVP에서 완전한 Notion형 에디터를 만들지 않습니다. Markdown textarea + preview 또는 단순 rich text editor로 시작합니다.
- 캘린더는 모든 일정 항목을 프로젝트별 색상으로 표시합니다. 완료 상태와 진행률은 표시하지 않습니다.

### 프론트엔드 폴더 예시

```txt
apps/web/
  app/
    (auth)/
    dashboard/
    projects/
  components/
    layout/
    ui/
    project/
    document/
    calendar/
  lib/
    api-client.ts
    query-client.ts
  stores/
  styles/
```

## Backend

### 선택 스택

- NestJS
- TypeScript
- Prisma
- PostgreSQL
- OpenAI Node SDK
- Nodemailer
- Swagger/OpenAPI
- Zod shared schemas

### 구현 방침

- 도메인별 NestJS module을 만듭니다.
- API는 REST로 설계합니다.
- Prisma schema를 단일 데이터 모델의 기준으로 둡니다.
- FE와 BE에서 함께 쓰는 요청/응답 타입은 `packages/shared`에 둡니다.
- AI 응답은 요구사항에 맞춰 동기 처리합니다.
- AI 요청 이력은 DB에 저장합니다.
- AI 결과 버전 관리는 만들지 않습니다.
- 이메일 인증, 초대, 비밀번호 변경 메일은 Nodemailer로 SMTP 발송합니다.

### 백엔드 모듈 예시

```txt
apps/api/src/
  auth/
  users/
  projects/
  invitations/
  documents/
  schedules/
  ai/
  email/
  prisma/
  common/
```

## Database

### 선택

PostgreSQL을 EC2의 Docker Compose 서비스로 실행합니다.

### 이유

- User, Project, Member, Invitation, Document, Schedule 관계가 명확합니다.
- Prisma와 조합하면 migration과 타입 생성이 빠릅니다.
- MVP에서 별도 관리형 DB를 쓰지 않아도 EC2 안에서 바로 개발과 배포를 시작할 수 있습니다.

### MVP에서 쓰지 않는 것

- Redis: AI 응답이 동기 처리이고 큐가 필요하지 않습니다.
- Elasticsearch: 검색 요구사항이 아직 약합니다.
- S3: 파일 업로드 요구사항이 없습니다.

## AI

### 선택

OpenAI Responses API를 사용하고 기본 모델은 `gpt-5-mini`로 둡니다.

### 이유

- LAVA의 AI 작업은 아이디어 구체화, 기능 명세 생성, API 명세 생성, 일정 생성처럼 잘 정의된 텍스트 생성 작업입니다.
- `gpt-5-mini`는 빠르고 비용 효율적인 모델로 시작하기 좋습니다.
- 품질이 부족한 일부 생성 기능만 환경변수로 더 큰 모델로 교체할 수 있게 둡니다.

### 환경변수

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini
```

### 출력 방식

- 기능 명세서와 API 명세서는 Markdown 문자열로 저장합니다.
- 일정 생성은 JSON 구조로 받은 뒤 DB의 `ScheduleItem`으로 저장합니다.
- API 명세서 생성은 담당자를 배정하지 않습니다.
- 기능 명세서는 저장 본문 기준 2000자 이하로 제한합니다.

## Auth

### 선택

JWT를 HttpOnly cookie로 내려주는 방식으로 구현합니다.

### 이유

- FE와 BE가 다른 배포 환경에 있어도 구현이 단순합니다.
- 클라이언트 코드에 토큰을 직접 저장하지 않아도 됩니다.
- 운영 복잡도를 늘리는 세션 스토어가 필요 없습니다.

### 정책

- 로그인은 이메일/비밀번호만 제공합니다.
- 소셜 로그인은 구현하지 않습니다.
- 비밀번호는 최소 8자, 대소문자 혼합, 숫자 1개 이상, 특수문자 1개 이상입니다.
- 이메일 인증 코드는 5분 동안 유효합니다.
- 인증 시도 5회 초과 시 15분 동안 차단합니다.

## Email

### 선택

Nodemailer + SMTP

### 이유

- 요구사항에 SMTP 발송이 명시되어 있습니다.
- 인증 코드, 초대 메일, 비밀번호 변경 메일을 같은 모듈로 처리할 수 있습니다.
- 별도 외부 메일 SDK에 묶이지 않아 빠르게 교체할 수 있습니다.

### 환경변수

```env
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

## EC2 Deployment

### EC2 서비스

EC2에서는 아래 서비스만 실행합니다.

- `api`: NestJS API 서버
- `postgres`: PostgreSQL
- `caddy`: HTTPS reverse proxy

### Docker Compose 예시

```yaml
services:
  api:
    build:
      context: ../../
      dockerfile: apps/api/Dockerfile
    env_file:
      - .env
    depends_on:
      - postgres

  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: lava
      POSTGRES_USER: lava
      POSTGRES_PASSWORD: lava
    volumes:
      - postgres_data:/var/lib/postgresql/data

  caddy:
    image: caddy:2
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
    depends_on:
      - api

volumes:
  postgres_data:
```

### Vercel 환경변수

```env
NEXT_PUBLIC_API_BASE_URL=https://api.example.com
```

### EC2 API 환경변수

```env
DATABASE_URL=postgresql://lava:lava@postgres:5432/lava
JWT_SECRET=
COOKIE_DOMAIN=
FRONTEND_ORIGIN=https://example.vercel.app
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

## 개발 명령 예시

```bash
pnpm install
pnpm --filter web dev
pnpm --filter api start:dev
pnpm --filter api prisma:migrate
pnpm --filter api prisma:studio
```

## 비채택 스택

| 후보 | 제외 이유 |
| --- | --- |
| Spring Boot | 팀이 Java/Spring에 익숙하지 않으면 초기 개발 속도가 떨어집니다. |
| GraphQL | 요구사항이 CRUD 중심이라 REST가 더 빠릅니다. |
| tRPC | FE와 BE가 분리 배포되고 외부 API 문서화가 필요해 REST + Swagger가 더 단순합니다. |
| MongoDB | 프로젝트/멤버/초대/일정 관계가 뚜렷해 PostgreSQL이 더 자연스럽습니다. |
| Redis/BullMQ | AI 동기 처리 정책이라 큐가 필요하지 않습니다. |
| Kubernetes | 단순 EC2 배포에는 과합니다. |
| AWS RDS | 운영 안정성은 좋아지지만 이번 기준에서는 EC2 단일 Docker 구성이 더 빠릅니다. |
| S3 | 현재 파일 업로드 요구사항이 없습니다. |

## 최소 구현 순서

1. pnpm workspace 구성
2. Next.js web 앱 생성
3. NestJS api 앱 생성
4. Prisma + PostgreSQL 연결
5. Auth와 이메일 인증
6. Project, Member, Invitation CRUD
7. OpenAI Responses API 연동
8. 문서 생성/수정
9. 일정 생성/수정
10. Vercel + EC2 Docker Compose 배포

## 공식 참고 자료

- [Vercel Next.js documentation](https://vercel.com/docs/concepts/next.js/overview)
- [Vercel deployments documentation](https://vercel.com/docs/deployments/deployment-methods)
- [NestJS first steps](https://docs.nestjs.com/first-steps)
- [Prisma PostgreSQL connector](https://docs.prisma.io/docs/v6/orm/overview/databases/postgresql)
- [Docker Compose documentation](https://docs.docker.com/compose/)
- [Caddy Automatic HTTPS documentation](https://caddyserver.com/docs/automatic-https)
- [OpenAI Responses API reference](https://platform.openai.com/docs/api-reference/responses)
- [OpenAI text generation guide](https://platform.openai.com/docs/guides/text)
- [OpenAI models documentation](https://platform.openai.com/docs/models)
