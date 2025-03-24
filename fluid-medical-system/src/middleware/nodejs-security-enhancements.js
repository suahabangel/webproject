// 파일: middleware/security.js
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const xss = require('xss-clean');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const csurf = require('csurf');
const cors = require('cors');
const contentSecurityPolicy = require('helmet-csp');
const crypto = require('crypto');

// 보안 미들웨어 설정
const securityMiddleware = (app) => {
  // 1. Helmet 미들웨어 - 기본 HTTP 헤더 보안 설정
  app.use(helmet());

  // 2. Content-Security-Policy 설정 강화
  app.use(
    contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://cdnjs.cloudflare.com"],
        styleSrc: ["'self'", "https://fonts.googleapis.com", "'unsafe-inline'"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    })
  );

  // 3. Rate Limiting - 요청 속도 제한 (브루트 포스 공격 방지)
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15분
    max: 100, // 15분당 IP당 최대 100 요청
    standardHeaders: true,
    legacyHeaders: false,
    message: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해 주세요.',
  });
  app.use('/api/', generalLimiter);

  // 인증 관련 엔드포인트에 대한 강화된 Rate Limiting
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15분
    max: 10, // 15분당 IP당 최대 10 요청
    standardHeaders: true,
    legacyHeaders: false,
    message: '너무 많은 인증 요청이 발생했습니다. 잠시 후 다시 시도해 주세요.',
  });
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);

  // 4. XSS 방지 - Cross-Site Scripting 공격 방지
  app.use(xss());

  // 5. HTTP Parameter Pollution 방지
  app.use(hpp());

  // 6. NoSQL Injection 방지
  app.use(mongoSanitize());

  // 7. CORS 설정 강화 - Cross-Origin Resource Sharing
  const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://yourdomain.com', 'https://admin.yourdomain.com'] 
      : 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400 // 24시간
  };
  app.use(cors(corsOptions));

  // 8. CSRF 보호 - Cross-Site Request Forgery 방지
  const csrfProtection = csurf({ cookie: { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }});
  
  // CSRF 보호가 필요한 라우트에만 적용
  app.use('/api/auth/*', csrfProtection);
  app.use('/api/patients', csrfProtection);
  app.use('/api/prescriptions', csrfProtection);

  // CSRF 토큰 제공 라우트
  app.get('/api/csrf-token', csrfProtection, (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
  });

  // 9. SQL Injection 방지를 위한 쿼리 파라미터 검증 미들웨어
  const sqlInjectionMiddleware = (req, res, next) => {
    const values = Object.values(req.body);
    const sqlInjectionPattern = /(\b(union|select|insert|update|delete|drop|alter|create)\b)/i;
    
    for (const value of values) {
      if (typeof value === 'string' && sqlInjectionPattern.test(value)) {
        return res.status(403).json({ message: '잠재적인 SQL Injection 공격이 감지되었습니다.' });
      }
    }
    next();
  };
  app.use(sqlInjectionMiddleware);

  // 10. JWT 보안 강화 미들웨어 
  const secureJwt = (req, res, next) => {
    const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
    if (token) {
      // JWT 토큰에 대한 추가 검증
      try {
        // 토큰 구조 확인 (header.payload.signature)
        if (token.split('.').length !== 3) {
          return res.status(403).json({ message: '잘못된 형식의 토큰입니다.' });
        }
        
        // JWT 시그니처 알고리즘 확인 (실제 검증은 jwt.verify에서 수행)
        const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64').toString());
        if (header.alg !== 'HS256' && header.alg !== 'RS256') {
          return res.status(403).json({ message: '안전하지 않은 JWT 알고리즘입니다.' });
        }
      } catch (error) {
        return res.status(403).json({ message: '토큰 검증 중 오류가 발생했습니다.' });
      }
    }
    next();
  };
  app.use('/api/', secureJwt);

  return app;
};

// 11. API 보안 헤더 추가 함수 
const addSecurityHeaders = (req, res, next) => {
  // Strict-Transport-Security
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  
  // X-Content-Type-Options - MIME 스니핑 방지
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // X-Frame-Options - 클릭재킹 공격 방지
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  
  // X-XSS-Protection - XSS 공격 방지 (레거시 브라우저)
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Cache-Control - 중요 데이터 캐싱 방지
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  // 난수 nonce 생성 - CSP 인라인 스크립트 보안
  const nonce = crypto.randomBytes(16).toString('base64');
  res.locals.nonce = nonce; // 템플릿에서 사용할 수 있도록 저장
  
  next();
};

// 12. 정규식 기반 입력 검증 미들웨어
const inputValidation = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details.map(detail => detail.message).join(', ') });
    }
    next();
  };
};

// 13. JWT 토큰 회전(Rotation) 기능
const tokenRotationMiddleware = (req, res, next) => {
  const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
  if (token) {
    try {
      // 토큰 디코딩 (검증 없이)
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      
      // 토큰 회전 시간 확인 (발급 후 30분이 지났다면 새 토큰 발급)
      const tokenIssuedAt = payload.iat * 1000; // JWT iat는 초 단위
      const now = Date.now();
      const timeDiff = now - tokenIssuedAt;
      
      // 30분 이상 지났고 만료되지 않았다면 토큰 재발급 플래그 설정
      if (timeDiff > 30 * 60 * 1000 && now < payload.exp * 1000) {
        req.shouldRotateToken = true;
        req.currentUser = payload; // 토큰 재발급용 사용자 정보 저장
      }
    } catch (error) {
      // 토큰 파싱 오류는 무시하고 인증 미들웨어에서 처리하도록 함
      console.error('토큰 회전 처리 중 오류:', error);
    }
  }
  next();
};

// 14. 에러 로깅 및 로그 보안 미들웨어
const secureErrorHandler = (err, req, res, next) => {
  // 민감한 정보 필터링 (에러 로그에서 토큰, 비밀번호 등 제거)
  const sanitizedError = { 
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? '🔒' : err.stack,
    path: req.path,
    method: req.method
  };
  
  // 민감한 헤더 정보 제거
  if (sanitizedError.headers) {
    delete sanitizedError.headers.authorization;
    delete sanitizedError.headers.cookie;
  }
  
  // 오류 로깅 (실제 프로덕션에서는 구조화된 로깅 시스템 사용)
  console.error(JSON.stringify(sanitizedError));
  
  // 클라이언트에게는 최소한의 정보만 제공
  res.status(err.status || 500).json({
    message: process.env.NODE_ENV === 'production' 
      ? '서버 오류가 발생했습니다.' 
      : err.message,
    status: err.status || 500
  });
};

// 15. 메모리 사용량 모니터링 미들웨어 (DoS 방지)
const memoryMonitorMiddleware = (req, res, next) => {
  const memoryUsage = process.memoryUsage();
  const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
  
  // 메모리 사용량이 90%를 초과하면 일시적으로 요청 처리 중단
  if (memoryUsagePercent > 90) {
    return res.status(503).json({ 
      message: '서버가 현재 과부하 상태입니다. 잠시 후 다시 시도해 주세요.' 
    });
  }
  
  // 모니터링용 로깅 (임계값 80% 초과시)
  if (memoryUsagePercent > 80) {
    console.warn(`높은 메모리 사용량 감지: ${memoryUsagePercent.toFixed(2)}%`);
  }
  
  next();
};

module.exports = { 
  securityMiddleware, 
  addSecurityHeaders, 
  inputValidation, 
  tokenRotationMiddleware,
  secureErrorHandler,
  memoryMonitorMiddleware
};
