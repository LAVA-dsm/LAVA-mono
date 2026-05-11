# 도메인 모델

이 문서는 구현 언어나 데이터베이스가 정해지기 전의 논리 모델입니다.

## 주요 엔티티

### User

서비스 계정입니다.

| 필드 | 설명 |
| --- | --- |
| id | 사용자 식별자 |
| email | 로그인 및 인증용 이메일 |
| name | 사용자 이름 |
| passwordHash | 비밀번호 해시 |
| emailVerified | 이메일 인증 완료 여부 |
| createdAt | 가입 시각 |
| updatedAt | 수정 시각 |

인증은 이메일/비밀번호만 사용하며 소셜 로그인은 제공하지 않습니다. 비밀번호는 최소 8자 이상, 대소문자 혼합, 숫자 1개 이상, 특수문자 1개 이상을 만족해야 합니다.

### EmailVerification

회원가입 또는 비밀번호 변경에 사용하는 이메일 인증 상태입니다.

| 필드 | 설명 |
| --- | --- |
| id | 인증 요청 식별자 |
| email | 인증 대상 이메일 |
| codeHash | 인증 코드 해시 |
| purpose | signup 또는 password_reset |
| attemptCount | 인증 시도 횟수 |
| blockedUntil | 시도 초과 시 차단 해제 시각 |
| expiresAt | 인증 코드 만료 시각 |
| sentAt | 마지막 발송 시각 |

인증 코드는 발송 후 5분 동안 유효합니다. 인증 시도 5회 초과 시 15분 동안 차단합니다.

### Project

사용자가 생성한 프로젝트입니다.

| 필드 | 설명 |
| --- | --- |
| id | 프로젝트 식별자 |
| name | 프로젝트 이름 |
| type | personal 또는 team |
| leaderUserId | 프로젝트 리더 사용자 ID |
| originalIdea | 사용자가 입력한 원본 아이디어 |
| enhancedIdea | AI가 증강한 아이디어 |
| ideaEnhancementUsed | AI 아이디어 증강 사용 여부 |
| startDate | 프로젝트 시작일 |
| endDate | 프로젝트 종료일 |
| status | active 또는 deleted |
| createdAt | 생성 시각 |
| updatedAt | 수정 시각 |

아이디어 최소 길이 200자는 공백 포함 기준입니다. AI 아이디어 증강 결과는 사용자가 직접 수정할 수 있습니다.

### ProjectMember

프로젝트와 사용자의 관계입니다.

| 필드 | 설명 |
| --- | --- |
| id | 멤버 관계 식별자 |
| projectId | 프로젝트 ID |
| userId | 사용자 ID |
| role | leader 또는 member |
| status | pending, accepted, rejected, left |
| major | 전공 |
| techStacks | 기술 스택 목록 |
| availableTimes | 요일/시간대 형식의 참여 가능 시간 |
| joinedAt | 참여 완료 시각 |

### ProjectInvitation

팀원 이메일 초대를 나타냅니다.

| 필드 | 설명 |
| --- | --- |
| id | 초대 식별자 |
| projectId | 프로젝트 ID |
| email | 초대 대상 이메일 |
| tokenHash | 초대 링크 토큰 해시 |
| status | pending, accepted, rejected, expired |
| sentAt | 발송 시각 |
| expiresAt | 만료 시각 |

초대 이메일은 발송 후 7일 동안 유효합니다. 아직 가입하지 않은 이메일도 초대할 수 있으며, 동일 이메일이 여러 프로젝트에 동시에 초대되는 것도 허용합니다. 단, 같은 프로젝트 안에서는 중복 초대를 보내지 않습니다.

### ProjectDocument

AI 또는 사용자가 관리하는 프로젝트 문서입니다.

| 필드 | 설명 |
| --- | --- |
| id | 문서 식별자 |
| projectId | 프로젝트 ID |
| type | feature_spec 또는 api_spec |
| content | 문서 본문 |
| generatedBy | ai 또는 user |
| createdAt | 생성 시각 |
| updatedAt | 수정 시각 |

AI 결과에 대한 버전 관리는 제공하지 않습니다. 기능 명세서의 2000자 제한은 저장 본문 기준입니다. API 명세서에는 길이 제한을 두지 않습니다.

### AiRequestHistory

AI 수정 요청 이력입니다.

| 필드 | 설명 |
| --- | --- |
| id | 이력 식별자 |
| projectId | 프로젝트 ID |
| targetType | idea, feature_spec, api_spec, schedule |
| requestedByUserId | 요청 사용자 ID |
| prompt | 사용자 요청 |
| resultSummary | 결과 요약 또는 실패 사유 |
| status | success 또는 failed |
| createdAt | 요청 시각 |

### ProjectSchedule

프로젝트 일정 산출물의 컨테이너입니다.

| 필드 | 설명 |
| --- | --- |
| id | 일정 식별자 |
| projectId | 프로젝트 ID |
| generatedBy | ai 또는 user |
| createdAt | 생성 시각 |
| updatedAt | 수정 시각 |

AI 일정 결과에 대한 버전 관리는 제공하지 않습니다.

### ScheduleItem

역할 분담, 작업, 회의 등 일정의 개별 항목입니다.

| 필드 | 설명 |
| --- | --- |
| id | 일정 항목 식별자 |
| scheduleId | 일정 ID |
| title | 일정 항목 제목 |
| type | task, sprint, meeting |
| description | 상세 설명 |
| assigneeUserIds | 담당자 목록 |
| startDate | 시작일 |
| endDate | 종료일 |

일정 항목은 날짜 단위로 관리합니다.

## 핵심 관계

- User 1명은 여러 ProjectMember를 가질 수 있습니다.
- Project 1개는 1명의 leader를 가집니다.
- Project 1개는 여러 ProjectMember를 가질 수 있습니다.
- Project 1개는 여러 ProjectInvitation을 가질 수 있습니다.
- Project 1개는 feature_spec, api_spec 문서를 가질 수 있습니다.
- Project 1개는 ProjectSchedule을 가질 수 있습니다.
- Project 1개는 여러 AiRequestHistory를 가질 수 있습니다.

## 상태 모델

### ProjectMember.status

| 상태 | 의미 |
| --- | --- |
| pending | 초대되었지만 아직 응답하지 않음 |
| accepted | 초대를 수락하고 참여 정보 입력 완료 |
| rejected | 초대를 거부함 |
| left | 참여 후 프로젝트를 나감 |

### ProjectInvitation.status

| 상태 | 의미 |
| --- | --- |
| pending | 초대 발송 후 응답 대기 |
| accepted | 초대 수락 |
| rejected | 초대 거부 |
| expired | 초대 만료 |

### Project.status

| 상태 | 의미 |
| --- | --- |
| active | 정상 프로젝트 |
| deleted | 리더가 삭제한 프로젝트 |

## 권한 기준

- 프로젝트 리더는 프로젝트 삭제, 팀원 초대, 일정 직접 수정, 일정 AI 수정, 프로젝트 나가기를 할 수 있습니다.
- 모든 프로젝트 멤버는 프로젝트 조회, 일정 조회, 문서 조회, 기능 명세서 직접 수정, API 명세서 직접 수정, 문서 AI 수정, 프로젝트 나가기를 할 수 있습니다.
- 리더가 프로젝트를 나가려면 새 리더를 직접 선택해 권한을 위임해야 합니다.
- 프로젝트 삭제 전에는 확인 모달 또는 재인증 같은 추가 확인 절차가 필요합니다.

