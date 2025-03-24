// utils/fluid-security.js
/**
 * 유체역학 기반 보안 모듈
 * 
 * 유체역학 원리를 활용하여 비정상적인 API 요청 패턴과 
 * 데이터 흐름을 감지하는 보안 시스템
 */

const crypto = require('crypto');
const winston = require('winston');

// 유체역학 보안 로거 설정
const fluidSecurityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'fluid-security' },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/fluid-security-error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/fluid-security.log' 
    })
  ]
});

// 개발 환경에서만 콘솔 로깅 추가
if (process.env.NODE_ENV !== 'production') {
  fluidSecurityLogger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// 레이놀즈 수 계산을 위한 매개변수
const FLUID_SECURITY = {
  // 시스템 매개변수
  viscosity: 2.5,       // 시스템 점성 (낮을수록 더 민감)
  density: 1.0,         // 요청 밀도 (높을수록 더 민감)
  velocity: 1.0,        // 기본 속도
  diameter: 1.0,        // 기본 직경
  reynoldsThreshold: 2300, // 난류 임계값 (이 값 이상이면 이상 활동으로 간주)
  
  // 시간 기반 설정
  timeWindow: 15 * 60 * 1000, // 15분 (밀리초)
  patternTimeWindow: 2 * 60 * 60 * 1000, // 2시간 (밀리초)
  
  // 요청 타입별 가중치
  requestWeights: {
    GET: 1.0,
    POST: 2.0,
    PUT: 1.5,
    DELETE: 3.0
  },
  
  // 엔드포인트별 민감도
  endpointSensitivity: {
    '/api/auth/': 2.5,
    '/api/patients/': 2.0,
    '/api/prescriptions/': 1.8,
    '/api/simulations/': 1.5,
    '/api/drugs/': 1.2
  }
};

// 요청 스토리지 (메모리 기반 - 실제 구현에서는 Redis 사용 권장)
const requestStore = {
  requests: new Map(),
  patterns: new Map()
};

/**
 * 레이놀즈 수 계산 함수
 * Re = (ρ * v * D) / μ
 * ρ: 밀도, v: 속도, D: 직경, μ: 점성
 */
const calculateReynolds = (velocity, diameter, density = FLUID_SECURITY.density, viscosity = FLUID_SECURITY.viscosity) => {
  return (density * velocity * diameter) / viscosity;
};

/**
 * 요청 속도 계산 함수
 * 일정 시간 내의 요청 수를 기반으로 속도 계산
 */
const calculateRequestVelocity = (userId, ipAddress, method, path) => {
  const now = Date.now();
  const timeWindow = FLUID_SECURITY.timeWindow;
  const key = userId ? `user:${userId}` : `ip:${ipAddress}`;
  
  // 요청 스토리지에서 해당 사용자/IP의 요청 히스토리 가져오기
  if (!requestStore.requests.has(key)) {
    requestStore.requests.set(key, []);
  }
  
  const requests = requestStore.requests.get(key);
  
  // 시간 범위 밖의 오래된 요청 제거
  const recentRequests = requests.filter(req => (now - req.timestamp) <= timeWindow);
  
  // 새 요청 추가
  recentRequests.push({
    timestamp: now,
    method,
    path
  });
  
  // 스토리지 업데이트
  requestStore.requests.set(key, recentRequests);
  
  // 메소드 가중치 적용
  const methodWeight = FLUID_SECURITY.requestWeights[method] || 1.0;
  
  // 엔드포인트 민감도 계산
  let endpointSensitivity = 1.0;
  for (const [endpoint, sensitivity] of Object.entries(FLUID_SECURITY.endpointSensitivity)) {
    if (path.startsWith(endpoint)) {
      endpointSensitivity = sensitivity;
      break;
    }
  }
  
  // 시간당 요청 속도 계산 (가중치 및 민감도 적용)
  const requestRate = recentRequests.length * methodWeight * endpointSensitivity;
  
  // 패턴 저장 (시간 경과에 따른 패턴 감지를 위함)
  if (!requestStore.patterns.has(key)) {
    requestStore.patterns.set(key, []);
  }
  
  const patterns = requestStore.patterns.get(key);
  patterns.push({
    timestamp: now,
    velocity: requestRate
  });
  
  // 오래된 패턴 데이터 제거
  const recentPatterns = patterns.filter(p => (now - p.timestamp) <= FLUID_SECURITY.patternTimeWindow);
  requestStore.patterns.set(key, recentPatterns);
  
  return requestRate;
};

/**
 * 와도(Vorticity) 계산 함수
 * 요청 패턴의 회전성을 측정하여 이상 패턴 감지
 */
const calculateVorticity = (userId, ipAddress) => {
  const key = userId ? `user:${userId}` : `ip:${ipAddress}`;
  
  if (!requestStore.patterns.has(key)) {
    return 0;
  }
  
  const patterns = requestStore.patterns.get(key);
  
  // 패턴이 충분하지 않으면 와도가 없다고 판단
  if (patterns.length < 5) {
    return 0;
  }
  
  // 시간에 따른 속도 변화율 계산
  let vorticity = 0;
  for (let i = 1; i < patterns.length; i++) {
    const timeDiff = patterns[i].timestamp - patterns[i-1].timestamp;
    const velocityDiff = patterns[i].velocity - patterns[i-1].velocity;
    
    // 급격한 변화가 있는 경우 와도 증가
    if (timeDiff > 0) {
      vorticity += Math.abs(velocityDiff / timeDiff);
    }
  }
  
  // 패턴 수로 정규화
  return vorticity / patterns.length;
};

/**
 * 유체역학 기반 보안 미들웨어
 * HTTP 요청 패턴을 유체 흐름으로 모델링하여 이상 행동 감지
 */
const fluidSecurityMiddleware = (req, res, next) => {
  const userId = req.user?.id;
  const ipAddress = req.ip;
  const method = req.method;
  const path = req.path;
  
  // 요청 속도(velocity) 계산
  const velocity = calculateRequestVelocity(userId, ipAddress, method, path);
  
  // 기본 직경 (서로 다른 엔드포인트 경로 수에 따라 조정)
  let diameter = FLUID_SECURITY.diameter;
  if (requestStore.requests.has(userId ? `user:${userId}` : `ip:${ipAddress}`)) {
    const uniquePaths = new Set(
      requestStore.requests.get(userId ? `user:${userId}` : `ip:${ipAddress}`)
        .map(req => req.path)
    ).size;
    
    // 여러 다른 경로에 접근하면 직경 증가
    diameter += Math.log10(uniquePaths + 1) * 0.5;
  }
  
  // 레이놀즈 수 계산
  const reynolds = calculateReynolds(velocity, diameter);
  
  // 와도 계산
  const vorticity = calculateVorticity(userId, ipAddress);
  
  // 이상 점수 계산
  const anomalyScore = reynolds / FLUID_SECURITY.reynoldsThreshold + vorticity * 2;
  
  // 보안 메타데이터 추가
  req.fluidSecurity = {
    reynolds,
    velocity,
    diameter,
    vorticity,
    anomalyScore,
    timestamp: Date.now()
  };
  
  // 로깅
  if (anomalyScore > 0.7) {
    fluidSecurityLogger.warn('높은 이상 점수 감지', {
      userId: userId || 'anonymous',
      ipAddress,
      method,
      path,
      reynolds,
      velocity,
      diameter,
      vorticity,
      anomalyScore
    });
  }
  
  // 임계값 초과 시 보안 조치
  if (anomalyScore > 1.0) {
    fluidSecurityLogger.error('비정상 패턴 감지 - 접근 차단', {
      userId: userId || 'anonymous',
      ipAddress,
      method,
      path,
      reynolds,
      velocity,
      diameter,
      vorticity,
      anomalyScore
    });
    
    // 요청 거부
    return res.status(429).json({
      message: '비정상적인 요청 패턴이 감지되었습니다. 잠시 후 다시 시도해 주세요.',
      error: 'fluid_security_violation'
    });
  }
  
  // 보안 조치 헤더 추가
  res.setHeader('X-Fluid-Security', crypto.createHash('sha256')
    .update(`${anomalyScore}:${req.requestId}:${process.env.JWT_SECRET}`)
    .digest('hex').substring(0, 16));
  
  next();
};

/**
 * 유체역학 보안 상태 보고 엔드포인트
 * 현재 시스템의 보안 상태를 반환
 */
const fluidSecurityStatus = (req, res) => {
  // 관리자만 접근 가능
  if (req.user?.role !== 'Admin') {
    return res.status(403).json({
      message: '접근 권한이 없습니다',
      error: 'insufficient_permissions'
    });
  }
  
  const now = Date.now();
  const systemStatus = {
    requestCount: 0,
    uniqueUsers: 0,
    uniqueIPs: 0,
    highAnomalyCount: 0,
    blockedRequests: 0,
    averageReynolds: 0,
    averageVorticity: 0,
    topAnomalies: []
  };
  
  // 사용자별 데이터 수집
  const userKeys = [...requestStore.requests.keys()].filter(k => k.startsWith('user:'));
  systemStatus.uniqueUsers = userKeys.length;
  
  // IP별 데이터 수집
  const ipKeys = [...requestStore.requests.keys()].filter(k => k.startsWith('ip:'));
  systemStatus.uniqueIPs = ipKeys.length;
  
  // 최근 요청 수 계산
  let totalReynolds = 0;
  let reynoldsCount = 0;
  let totalVorticity = 0;
  let vorticityCount = 0;
  const anomalies = [];
  
  [...requestStore.requests.entries()].forEach(([key, requests]) => {
    // 최근 요청만 카운트
    const recentRequests = requests.filter(req => now - req.timestamp <= FLUID_SECURITY.timeWindow);
    systemStatus.requestCount += recentRequests.length;
    
    // 패턴 데이터 분석
    if (requestStore.patterns.has(key)) {
      const patterns = requestStore.patterns.get(key);
      const recentPatterns = patterns.filter(p => now - p.timestamp <= FLUID_SECURITY.patternTimeWindow);
      
      // 최근 패턴만 고려
      if (recentPatterns.length > 0) {
        // 최신 패턴의 속도로 레이놀즈 수 추정
        const latestPattern = recentPatterns[recentPatterns.length - 1];
        
        // 직경 추정
        const uniquePaths = new Set(requests.map(req => req.path)).size;
        const diameter = FLUID_SECURITY.diameter + Math.log10(uniquePaths + 1) * 0.5;
        
        // 레이놀즈 수 계산
        const reynolds = calculateReynolds(latestPattern.velocity, diameter);
        totalReynolds += reynolds;
        reynoldsCount++;
        
        // 와도 계산
        const keyParts = key.split(':');
        const entityType = keyParts[0];
        const entityId = keyParts[1];
        const vorticity = calculateVorticity(
          entityType === 'user' ? entityId : null,
          entityType === 'ip' ? entityId : null
        );
        totalVorticity += vorticity;
        vorticityCount++;
        
        // 이상 점수 계산
        const anomalyScore = reynolds / FLUID_SECURITY.reynoldsThreshold + vorticity * 2;
        
        // 높은 이상 점수 카운트
        if (anomalyScore > 0.7) {
          systemStatus.highAnomalyCount++;
        }
        
        // 차단된 요청 카운트
        if (anomalyScore > 1.0) {
          systemStatus.blockedRequests++;
        }
        
        // 상위 이상 패턴 저장
        anomalies.push({
          entity: key,
          reynolds,
          vorticity,
          anomalyScore,
          lastRequest: latestPattern.timestamp
        });
      }
    }
  });
  
  // 평균 계산
  systemStatus.averageReynolds = reynoldsCount > 0 ? totalReynolds / reynoldsCount : 0;
  systemStatus.averageVorticity = vorticityCount > 0 ? totalVorticity / vorticityCount : 0;
  
  // 상위 이상 패턴
  systemStatus.topAnomalies = anomalies
    .sort((a, b) => b.anomalyScore - a.anomalyScore)
    .slice(0, 10);
  
  return res.status(200).json({
    message: '유체역학 보안 시스템 상태',
    timestamp: new Date().toISOString(),
    status: systemStatus
  });
};

module.exports = {
  fluidSecurityMiddleware,
  fluidSecurityStatus,
  calculateReynolds,
  calculateVorticity
};
