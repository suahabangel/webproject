# 유체역학 기반 의료 시스템 실행 가이드

이 문서는 유체역학 기반 의료 시스템을 설정하고 실행하는 방법을 설명합니다.

## 시스템 요구사항

- Node.js v16.x 이상
- MySQL 8.0 이상
- npm 또는 yarn

## 백엔드 설정 및 실행

### 1. 데이터베이스 설정

MySQL에 접속하여 다음과 같이 데이터베이스 사용자와 데이터베이스를 생성합니다:

```sql
CREATE USER 'fluid_medical_user'@'localhost' IDENTIFIED BY 'your_secure_password';
CREATE DATABASE fluid_medical_system;
GRANT ALL PRIVILEGES ON fluid_medical_system.* TO 'fluid_medical_user'@'localhost';
FLUSH PRIVILEGES;
```

### 2. 백엔드 설치 및 실행

1. 백엔드 디렉토리로 이동:
   ```bash
   cd backend
   ```

2. 의존성 패키지 설치:
   ```bash
   npm install
   ```

3. 환경 변수 파일 (.env) 생성:
   ```
   NODE_ENV=development
   PORT=3000

   # 데이터베이스 설정
   DB_HOST=localhost
   DB_USER=fluid_medical_user
   DB_PASSWORD=your_secure_password
   DB_NAME=fluid_medical_system

   # JWT 설정
   JWT_SECRET=your_jwt_secret_key_change_this_in_production
   JWT_EXPIRES_IN=1h

   # 로깅 설정
   LOG_LEVEL=info
   ```

4. 데이터베이스 스키마 및 샘플 데이터 설정:
   ```bash
   npm run setup-db
   ```

5. 백엔드 서버 실행:
   ```bash
   npm run dev
   ```

   개발 모드로 서버가 시작되고 `http://localhost:3000`에서 실행됩니다.

## 프론트엔드 설정 및 실행

### 1. 프론트엔드 설치 및 실행

1. 프론트엔드 디렉토리로 이동:
   ```bash
   cd frontend
   ```

2. 의존성 패키지 설치:
   ```bash
   npm install
   ```

3. 환경 변수 파일 (.env) 생성:
   ```
   REACT_APP_API_URL=http://localhost:3000/api
   ```

4. 개발 서버 시작:
   ```bash
   npm start
   ```

   개발 서버가 시작되고 자동으로 브라우저가 열립니다. 
   기본 주소는 `http://localhost:3000`입니다.

## 기본 계정 정보

시스템에는 다음과 같은 기본 계정이 설정되어 있습니다:

| 사용자명   | 비밀번호    | 역할     | 설명                     |
|------------|-------------|----------|--------------------------|
| admin      | admin123    | Admin    | 관리자 계정              |
| dr.kim     | doctor123   | Doctor   | 의사 계정 (김현우 박사)  |
| dr.park    | doctor123   | Doctor   | 의사 계정 (박지은 박사)  |
| researcher | research123 | Researcher| 연구원 계정 (최준호 연구원)|
| patient1   | patient123  | Patient  | 환자 계정 (이동현)       |

## 시스템 아키텍처

이 시스템은 다음과 같은 주요 구성 요소로 이루어져 있습니다:

1. **프론트엔드**: React 기반의 사용자 인터페이스
2. **백엔드**: Node.js/Express 기반의 API 서버
3. **데이터베이스**: MySQL 데이터베이스
4. **유체역학 시뮬레이션 엔진**: 나비에-스톡스 방정식 구현

## 주요 기능

- **환자 관리**: 환자 등록, 조회, 수정
- **약물 관리**: 약물 정보 조회, 약물 상호작용 확인
- **처방전 관리**: 처방전 작성, 조회, 블록체인 기반 무결성 검증
- **유체역학 시뮬레이션**:
  - 약물 전달 시뮬레이션: 약물의 체내 흐름과 전달 효율성 분석
  - 심혈관 시뮬레이션: 혈류 패턴 분석 및 질환 위험도 평가

## 트러블슈팅

### 데이터베이스 연결 오류

데이터베이스 연결 오류가 발생하면 다음을 확인하세요:

1. MySQL 서비스가 실행 중인지 확인
2. .env 파일의 데이터베이스 설정이 올바른지 확인
3. 데이터베이스 사용자에게 적절한 권한이 부여되었는지 확인

### API 요청 오류

API 요청 오류가 발생하면 다음을 확인하세요:

1. 백엔드 서버가 실행 중인지 확인
2. 프론트엔드의 API URL 설정이 올바른지 확인
3. 인증이 필요한 요청의 경우 유효한 JWT 토큰이 포함되어 있는지 확인

### 시뮬레이션 성능 문제

시뮬레이션 성능 문제가 발생하면 다음을 조정해 보세요:

1. 그리드 해상도 감소 (예: 128x128x128 → 64x64x64)
2. 시간 단계 수 감소
3. 서버 리소스 (CPU/메모리) 확인 및 필요시 증설

## 지원 및 문의

기술 지원 및 문의 사항은 다음 연락처로 문의하세요:

- 이메일: support@fluidmedical.kr
- 전화: 02-123-4567