// server.js에 보안 기능 통합

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const winston = require('winston');
const cookieParser = require('cookie-parser');

// 보안 미들웨어 가져오기
const { 
  securityMiddleware, 
  addSecurityHeaders, 
  tokenRotationMiddleware,
  secureErrorHandler,
  memoryMonitorMiddleware
} = require('./middleware/security');

// 환경 변수 로드
dotenv.config();

// 로거 설정 (보안 강화)
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, ...rest }) => {
      // 민감 정보 필터링
      const sanitizedRest = { ...rest };
      if (sanitizedRest.headers) {
        delete sanitizedRest.headers.authorization;
        delete sanitizedRest.headers.cookie;
      }
      if (sanitizedRest.body && sanitizedRest.body.password) {
        sanitizedRest.body.password = '[REDACTED]';
      }
      return JSON.stringify({ timestamp, level, message, ...sanitizedRest });
    })
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    })
  ]
});

// 개발 환경에서만 콘솔 로깅 추가
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Express 앱 생성
const app = express();

// 쿠키 파서 사용 (CSRF 토큰용)
app.use(cookieParser());

// 요청 로깅 미들웨어 (민감 정보 필터링)
app.use((req, res, next) => {
  const start = Date.now();
  
  // 응답 완료 시 로깅
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };
    
    // 인증된 사용자 정보 (있는 경우)
    if (req.user) {
      logData.userId = req.user.id;
      logData.userRole = req.user.role;
    }
    
    // 상태 코드에 따른 로그 레벨 조정
    if (res.statusCode >= 500) {
      logger.error('서버 오류', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('클라이언트 오류', logData);
    } else {
      logger.info('요청 처리 완료', logData);
    }
  });
  
  next();
});

// 메모리 사용량 모니터링
app.use(memoryMonitorMiddleware);

// 기본 미들웨어
app.use(express.json({ limit: '10kb' })); // 요청 본문 크기 제한
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 보안 헤더 추가
app.use(addSecurityHeaders);

// 토큰 회전 미들웨어
app.use(tokenRotationMiddleware);

// 보안 미들웨어 적용
securityMiddleware(app);

// API 속도 제한 설정 (이미 security.js에서 처리하지만 전역 설정 추가)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 500, // IP당 최대 요청 수
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: '너무 많은 요청이 발생했습니다. 15분 후에 다시 시도해 주세요.' },
  keyGenerator: (req) => {
    // API 키가 있으면 키 기반, 없으면 IP 기반으로 제한
    return req.headers['x-api-key'] || req.ip;
  }
});
app.use(globalLimiter);

// 특정 IP 차단 설정 (선택적)
const blockList = ['123.456.78.9', '98.76.54.32']; // 차단할 IP 목록
app.use((req, res, next) => {
  if (blockList.includes(req.ip)) {
    return res.status(403).json({ message: '접근이 거부되었습니다.' });
  }
  next();
});

// 라우트 등록
const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const drugRoutes = require('./routes/drugs');
const prescriptionRoutes = require('./routes/prescriptions');
const simulationRoutes = require('./routes/simulations');

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/drugs', drugRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/simulations', simulationRoutes);

// 404 처리
app.use((req, res) => {
  res.status(404).json({ message: '요청한 리소스를 찾을 수 없습니다.' });
});

// 에러 핸들링 미들웨어
app.use(secureErrorHandler);

// 예기치 않은 오류 처리
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', { message: err.message, stack: err.stack });
  // 정상적인 종료 프로세스를 진행할 시간을 주고 서버 종료
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', { 
    reason: reason instanceof Error ? { message: reason.message, stack: reason.stack } : reason,
    promise
  });
});

// 서버 시작
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  logger.info(`서버가 포트 ${PORT}에서 실행 중입니다`);
});

// 정상적인 종료 처리
process.on('SIGTERM', () => {
  logger.info('SIGTERM 신호 수신. 서버 종료 중...');
  server.close(() => {
    logger.info('서버가 정상적으로 종료되었습니다.');
    process.exit(0);
  });
});

module.exports = app; // 테스트용
