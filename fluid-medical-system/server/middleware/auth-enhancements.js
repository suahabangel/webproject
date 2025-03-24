// middleware/auth.js - 보안 강화 버전
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const crypto = require('crypto');
const argon2 = require('argon2');
const rateLimit = require('express-rate-limit');
const redis = require('redis');
const { createClient } = redis;

// Redis 클라이언트 설정 (토큰 블랙리스트 관리 용)
let redisClient;
if (process.env.REDIS_URL) {
  redisClient = createClient({
    url: process.env.REDIS_URL,
    socket: {
      tls: process.env.NODE_ENV === 'production',
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    }
  });
  
  redisClient.on('error', (err) => {
    console.error('Redis 클라이언트 오류:', err);
  });
  
  redisClient.connect().catch(console.error);
}

// JWT 토큰 검증 및 인증
const authenticateToken = async (req, res, next) => {
  try {
    // 헤더에서 토큰 추출
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        message: '인증 토큰이 필요합니다',
        error: 'missing_token'
      });
    }
    
    // 토큰이 블랙리스트에 있는지 확인 (로그아웃된 토큰)
    if (redisClient) {
      const isBlacklisted = await redisClient.get(`bl_${token}`);
      if (isBlacklisted) {
        return res.status(401).json({ 
          message: '만료된 토큰입니다. 다시 로그인해주세요.',
          error: 'expired_token'
        });
      }
    }
    
    // 토큰 검증
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    
    // 사용자 정보를 요청 객체에 추가
    req.user = decoded;
    
    // JWT 토큰 회전 처리 (선택적)
    if (req.shouldRotateToken) {
      const newToken = generateToken({
        id: req.user.id,
        username: req.user.username,
        role: req.user.role
      });
      
      // 응답 헤더에 새 토큰 추가
      res.setHeader('X-New-Token', newToken);
    }
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: '토큰이 만료되었습니다. 다시 로그인해주세요.',
        error: 'token_expired'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ 
        message: '유효하지 않은 토큰입니다.',
        error: 'invalid_token'
      });
    }
    
    console.error('인증 오류:', error);
    return res.status(500).json({ 
      message: '인증 처리 중 오류가 발생했습니다.',
      error: 'auth_error' 
    });
  }
};

// 역할 기반 접근 제어
const checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: '인증이 필요합니다',
        error: 'authentication_required'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: '접근 권한이 없습니다',
        error: 'insufficient_permissions',
        requiredRoles: roles,
        userRole: req.user.role
      });
    }
    
    next();
  };
};

// JWT 토큰 생성
const generateToken = (userData, expiresIn = '1h') => {
  return jwt.sign(
    userData,
    process.env.JWT_SECRET,
    { 
      expiresIn,
      algorithm: 'HS256',
      issuer: 'fluid-medical-system',
      audience: 'fluid-medical-users'
    }
  );
};

// 비밀번호 해싱 (argon2 사용 - bcrypt보다 보안성 높음)
const hashPassword = async (password) => {
  try {
    return await argon2.hash(password, {
      type: argon2.argon2id, // 가장 균형 잡힌 알고리즘
      memoryCost: 2**16, // 메모리 사용량 (64 MiB)
      timeCost: 3, // 반복 횟수
      parallelism: 1, // 병렬 처리 스레드 수
      hashLength: 32, // 결과 해시 길이
      salt: crypto.randomBytes(16) // 랜덤 솔트
    });
  } catch (error) {
    console.error('비밀번호 해싱 오류:', error);
    throw new Error('비밀번호 처리 중 오류가 발생했습니다.');
  }
};

// 비밀번호 검증
const verifyPassword = async (hashedPassword, password) => {
  try {
    return await argon2.verify(hashedPassword, password);
  } catch (error) {
    console.error('비밀번호 검증 오류:', error);
    throw new Error('비밀번호 검증 중 오류가 발생했습니다.');
  }
};

// 토큰 블랙리스트에 추가 (로그아웃)
const blacklistToken = async (token, expiry) => {
  if (!redisClient) return;
  
  try {
    // JWT 디코딩 (검증 없이)
    const decoded = jwt.decode(token);
    
    // 만료 시간 계산
    const expiryTime = decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : expiry || 3600;
    
    // Redis에 토큰 저장 (블랙리스트)
    await redisClient.set(`bl_${token}`, '1', { EX: expiryTime });
    
    return true;
  } catch (error) {
    console.error('토큰 블랙리스트 추가 오류:', error);
    return false;
  }
};

// 로그인 시도 제한
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 5, // 15분 내 최대 5번 시도
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return res.status(429).json({
      message: '너무 많은 로그인 시도가 있었습니다. 15분 후에 다시 시도해주세요.',
      error: 'too_many_login_attempts'
    });
  },
  keyGenerator: (req) => {
    // 사용자 이름 + IP 기반으로 제한
    return `${req.body.username}_${req.ip}`;
  }
});

// 보안 로깅 미들웨어
const securityLogger = (req, res, next) => {
  // 민감한 작업 로깅
  if (req.path.includes('/auth/') || req.path.includes('/admin/')) {
    console.log({
      timestamp: new Date().toISOString(),
      user: req.user ? req.user.id : 'anonymous',
      action: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  }
  next();
};

// 보안 컨텍스트 미들웨어 (요청 메타데이터 추가)
const securityContext = (req, res, next) => {
  // 요청 ID 생성
  req.requestId = crypto.randomBytes(16).toString('hex');
  
  // 요청 시간 기록
  req.requestTime = Date.now();
  
  // 클라이언트 정보
  req.clientInfo = {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    referrer: req.get('Referrer') || '',
    method: req.method,
    path: req.path
  };
  
  next();
};

module.exports = {
  authenticateToken,
  checkRole,
  generateToken,
  hashPassword,
  verifyPassword,
  blacklistToken,
  loginRateLimiter,
  securityLogger,
  securityContext
};
