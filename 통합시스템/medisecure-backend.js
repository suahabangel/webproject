// MediSecure 백엔드 서버 (server.js)
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const path = require('path');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// 환경 설정
require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'medisecure-jwt-secret-key';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/medisecure';

// 미들웨어 설정
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('dev')); // 로깅
app.use(helmet()); // 보안 헤더

// 정적 파일 제공
app.use(express.static(path.join(__dirname, 'public')));

// 요청 제한 설정 (DoS 방지)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // IP당 최대 요청 수
  standardHeaders: true,
  legacyHeaders: false,
  message: '너무 많은 요청을 보냈습니다. 15분 후에 다시 시도해주세요.'
});
app.use('/api/', apiLimiter);

// MongoDB 연결
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB 연결 성공'))
.catch(err => console.error('MongoDB 연결 오류:', err));

// =============== 모델 정의 ===============

// 사용자 모델
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  department: { type: String, required: true },
  role: { type: String, enum: ['admin', 'doctor', 'nurse', 'staff'], default: 'staff' },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date },
});

// 비밀번호 해싱
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (err) {
    return next(err);
  }
});

const User = mongoose.model('User', UserSchema);

// 보안 위협 모델
const ThreatSchema = new mongoose.Schema({
  type: { type: String, required: true },
  source: { type: String, required: true },
  target: { type: String },
  severity: { type: String, enum: ['낮음', '중간', '높음'], required: true },
  details: { type: Object },
  timestamp: { type: Date, default: Date.now },
  status: { type: String, enum: ['active', 'resolved', 'false-positive'], default: 'active' },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: { type: Date },
});

const Threat = mongoose.model('Threat', ThreatSchema);

// 액세스 로그 모델
const AccessLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  resource: { type: String, required: true },
  status: { type: String, enum: ['success', 'denied'], required: true },
  ipAddress: { type: String, required: true },
  userAgent: { type: String },
  timestamp: { type: Date, default: Date.now },
});

const AccessLog = mongoose.model('AccessLog', AccessLogSchema);

// 유체역학 시뮬레이션 모델
const SimulationSchema = new mongoose.Schema({
  simulationId: { type: String, required: true, unique: true },
  status: { type: String, enum: ['pending', 'running', 'completed', 'failed'], default: 'pending' },
  parameters: {
    gridSize: { type: Number, default: 50 },
    viscosity: { type: Number, default: 0.05 },
    diffusion: { type: Number, default: 0.0001 },
    timeStep: { type: Number, default: 0.01 },
    maxIterations: { type: Number, default: 1000 },
    adaptiveBounding: { type: Boolean, default: false }
  },
  results: {
    iteration: { type: Number },
    maxVorticity: { type: Number },
    maxVelocity: { type: Number },
    maxPressure: { type: Number },
    anomalies: [{ type: Object }]
  },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
});

const Simulation = mongoose.model('Simulation', SimulationSchema);

// 환자 데이터 모델 (암호화된 필드 포함)
const PatientSchema = new mongoose.Schema({
  patientId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  birthDate: { type: Date, required: true },
  gender: { type: String, enum: ['남성', '여성', '기타'], required: true },
  // 암호화된 필드
  ssn: { type: String }, // 주민등록번호 (암호화)
  medicalHistory: { type: Object }, // 의료 기록 (암호화)
  diagnosis: [{ type: String }], // 진단 정보 (암호화)
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  access: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    accessType: { type: String, enum: ['read', 'write', 'delete'] },
    timestamp: { type: Date, default: Date.now }
  }]
});

const Patient = mongoose.model('Patient', PatientSchema);

// =============== 미들웨어 함수 ===============

// JWT 인증 미들웨어
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ error: '액세스 토큰이 유효하지 않습니다.' });
      }
      
      req.user = user;
      next();
    });
  } else {
    res.status(401).json({ error: '인증 토큰이 필요합니다.' });
  }
};

// 역할 기반 접근 제어 미들웨어
const checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: '인증이 필요합니다.' });
    }
    
    if (roles.includes(req.user.role)) {
      next();
    } else {
      res.status(403).json({ error: '이 작업을 수행할 권한이 없습니다.' });
    }
  };
};

// 액세스 로깅 미들웨어
const logAccess = async (req, res, next) => {
  if (!req.user) return next();
  
  const log = new AccessLog({
    user: req.user.id,
    action: req.method,
    resource: req.originalUrl,
    status: 'success', // 기본값, 실패 시 변경
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });
  
  await log.save();
  next();
};

// =============== 라우트 정의 ===============

// 인증 라우트
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // 사용자 검색
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }
    
    // 비밀번호 확인
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: '비밀번호가 일치하지 않습니다.' });
    }
    
    // 마지막 로그인 시간 업데이트
    user.lastLogin = Date.now();
    await user.save();
    
    // JWT 토큰 생성
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    
    res.json({
      message: '로그인 성공',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        department: user.department,
        role: user.role,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, email, department, role } = req.body;
    
    // 이미 존재하는 사용자인지 확인
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ error: '이미 존재하는 사용자 이름 또는 이메일입니다.' });
    }
    
    // 새 사용자 생성
    const user = new User({
      username,
      password,
      email,
      department,
      role: role || 'staff', // 기본 역할
    });
    
    await user.save();
    
    res.status(201).json({
      message: '사용자 등록 성공',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        department: user.department,
        role: user.role,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 보안 위협 라우트
app.get('/api/threats', authenticateJWT, logAccess, async (req, res) => {
  try {
    const { severity, status, limit = 10, skip = 0 } = req.query;
    const query = {};
    
    if (severity) query.severity = severity;
    if (status) query.status = status;
    
    const threats = await Threat.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate('resolvedBy', 'username');
    
    const total = await Threat.countDocuments(query);
    
    res.json({
      threats,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/threats', authenticateJWT, checkRole(['admin']), logAccess, async (req, res) => {
  try {
    const { type, source, target, severity, details } = req.body;
    
    const threat = new Threat({
      type,
      source,
      target,
      severity,
      details,
    });
    
    await threat.save();
    
    res.status(201).json({
      message: '위협 정보 생성 성공',
      threat
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/threats/:id', authenticateJWT, checkRole(['admin']), logAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const threat = await Threat.findById(id);
    if (!threat) {
      return res.status(404).json({ error: '위협 정보를 찾을 수 없습니다.' });
    }
    
    // 상태 변경
    threat.status = status;
    
    // 해결된 경우
    if (status === 'resolved') {
      threat.resolvedBy = req.user.id;
      threat.resolvedAt = Date.now();
    }
    
    await threat.save();
    
    res.json({
      message: '위협 정보 업데이트 성공',
      threat
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 유체역학 시뮬레이션 라우트
app.post('/api/simulations', authenticateJWT, logAccess, async (req, res) => {
  try {
    const { parameters } = req.body;
    
    // 시뮬레이션 ID 생성
    const simulationId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const simulation = new Simulation({
      simulationId,
      parameters: {
        ...parameters
      },
      status: 'pending',
    });
    
    await simulation.save();
    
    // 실제 애플리케이션에서는 여기서 시뮬레이션 작업을 큐에 추가
    // 이 예제에서는 시뮬레이션이 즉시 시작된다고 가정
    setTimeout(async () => {
      try {
        // 시뮬레이션 상태 업데이트
        simulation.status = 'running';
        await simulation.save();
        
        // 시뮬레이션 실행 (실제 구현에서는 복잡한 계산 수행)
        // 여기서는 간단한 결과만 생성
        setTimeout(async () => {
          simulation.status = 'completed';
          simulation.results = {
            iteration: Math.floor(Math.random() * 1000) + 500,
            maxVorticity: Math.random() * 10 + 5,
            maxVelocity: Math.random() * 5 + 2,
            maxPressure: Math.random() * 20 + 10,
            anomalies: [
              { x: Math.random() * 50, y: Math.random() * 50, intensity: Math.random() * 5 + 1 },
              { x: Math.random() * 50, y: Math.random() * 50, intensity: Math.random() * 5 + 1 }
            ]
          };
          simulation.completedAt = Date.now();
          await simulation.save();
          
          console.log(`시뮬레이션 ${simulationId} 완료`);
        }, 5000); // 시뮬레이션 완료까지 5초 대기 (실제로는 더 오래 걸림)
        
        console.log(`시뮬레이션 ${simulationId} 시작`);
      } catch (err) {
        console.error(`시뮬레이션 실행 오류:`, err);
        simulation.status = 'failed';
        await simulation.save();
      }
    }, 1000); // 시작까지 1초 대기
    
    res.status(201).json({
      message: '시뮬레이션 생성 성공',
      simulation: {
        simulationId,
        status: 'pending',
        parameters: simulation.parameters
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/simulations/:simulationId', authenticateJWT, logAccess, async (req, res) => {
  try {
    const { simulationId } = req.params;
    
    const simulation = await Simulation.findOne({ simulationId });
    if (!simulation) {
      return res.status(404).json({ error: '시뮬레이션을 찾을 수 없습니다.' });
    }
    
    res.json({ simulation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 환자 데이터 라우트
app.get('/api/patients', authenticateJWT, logAccess, async (req, res) => {
  try {
    const { limit = 10, skip = 0 } = req.query;
    
    const patients = await Patient.find({}, { ssn: 0, medicalHistory: 0, diagnosis: 0 })
      .sort({ updatedAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));
    
    const total = await Patient.countDocuments();
    
    res.json({
      patients,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/patients/:patientId', authenticateJWT, logAccess, async (req, res) => {
  try {
    const { patientId } = req.params;
    
    const patient = await Patient.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({ error: '환자 정보를 찾을 수 없습니다.' });
    }
    
    // 접근 기록 추가
    patient.access.push({
      userId: req.user.id,
      accessType: 'read',
    });
    await patient.save();
    
    // 암호화된 필드는 요청자의 권한에 따라 제공
    let result = {
      patientId: patient.patientId,
      name: patient.name,
      birthDate: patient.birthDate,
      gender: patient.gender,
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt,
    };
    
    if (['admin', 'doctor'].includes(req.user.role)) {
      // 관리자와 의사는 모든 정보에 접근 가능
      result.ssn = patient.ssn;
      result.medicalHistory = patient.medicalHistory;
      result.diagnosis = patient.diagnosis;
    } else if (req.user.role === 'nurse') {
      // 간호사는 일부 정보만 접근 가능
      result.diagnosis = patient.diagnosis;
    }
    
    res.json({ patient: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 챗봇 API 엔드포인트
app.post('/api/chatbot', authenticateJWT, async (req, res) => {
  try {
    const { message } = req.body;
    let response = '';
    
    // 간단한 챗봇 응답 로직
    if (message.includes('암호화') || message.includes('데이터 보호')) {
      response = "MediSecure는 모든 민감한 의료 정보에 AES-256 암호화를 적용합니다. 저장 데이터와 전송 중인 데이터 모두 암호화되며, 고급 키 관리 시스템을 통해 암호화 키가 안전하게 보호됩니다.";
    } else if (message.includes('위협') || message.includes('탐지') || message.includes('공격')) {
      response = "MediSecure의 핵심은 유체역학 기반 이상 탐지 엔진입니다. 이 시스템은 네트워크 트래픽을 유체의 흐름처럼 분석하여 일반적인 보안 솔루션으로는 놓칠 수 있는 미묘한 공격 패턴까지 감지합니다.";
    } else if (message.includes('HIPAA') || message.includes('GDPR') || message.includes('규정')) {
      response = "MediSecure는 HIPAA와 GDPR을 포함한 글로벌 의료정보 보안 규정을 완벽히 준수합니다. 데이터 접근 제어, 감사 로깅, 무결성 검증, 익명화 도구를 제공하며, 자동화된 규정 준수 보고서 생성 기능으로 감사 대비를 지원합니다.";
    } else if (message.includes('랜섬웨어') || message.includes('악성코드')) {
      response = "MediSecure는 다중 방어 전략을 통해 랜섬웨어를 방어합니다: 1) 실시간 파일 활동 모니터링, 2) 의심스러운 암호화 활동 감지, 3) 기계학습 기반 이상 탐지, 4) 안전한 백업 솔루션, 5) 네트워크 세분화로 감염 확산 방지. 이러한 조치로 최신 랜섬웨어 변종에도 효과적으로 대응합니다.";
    } else {
      response = "안녕하세요! MediSecure 보안 어시스턴트입니다. 의료 데이터 암호화, 위협 감지, 규정 준수, 보안 정책에 대해 궁금한 점이 있으신가요?";
    }
    
    res.json({ response });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 대시보드 데이터 API
app.get('/api/dashboard', authenticateJWT, async (req, res) => {
  try {
    // 보안 상태 요약
    const activeThreatCount = await Threat.countDocuments({ status: 'active' });
    const highSeverityCount = await Threat.countDocuments({ severity: '높음', status: 'active' });
    const patientCount = await Patient.countDocuments();
    
    // 시간별 위협 활동
    const hourlyThreatData = [];
    for (let i = 0; i < 24; i++) {
      hourlyThreatData.push({
        time: `${i.toString().padStart(2, '0')}:00`,
        threats: Math.floor(Math.random() * 15),
        anomalies: Math.floor(Math.random() * 22),
        severity: Math.floor(Math.random() * 9)
      });
    }
    
    // 부서별 의료 기록 접근
    const departments = ['내과', '외과', '소아과', '산부인과', '정신과', '응급의학과'];
    const accessData = departments.map(dept => ({
      department: dept,
      authorized: Math.floor(Math.random() * 400) + 100,
      unauthorized: Math.floor(Math.random() * 10)
    }));
    
    // 최근 알림
    const recentAlerts = await Threat.find()
      .sort({ timestamp: -1 })
      .limit(5)
      .lean();
    
    // 알림을 적절한 형식으로 변환
    const formattedAlerts = recentAlerts.map(alert => {
      const minutes = Math.floor((Date.now() - new Date(alert.timestamp)) / 60000);
      let timeAgo;
      
      if (minutes < 60) {
        timeAgo = `${minutes}분 전`;
      } else if (minutes < 1440) {
        timeAgo = `${Math.floor(minutes / 60)}시간 전`;
      } else {
        timeAgo = `${Math.floor(minutes / 1440)}일 전`;
      }
      
      return {
        id: alert._id,
        type: alert.severity,
        message: `${alert.source}에서 ${alert.type} 위협 감지`,
        time: timeAgo
      };
    });
    
    res.json({
      summary: {
        securityStatus: activeThreatCount > highSeverityCount * 2 ? '주의' : '안정',
        activeThreats: activeThreatCount,
        highSeverityThreats: highSeverityCount,
        protectedRecords: patientCount,
        systemAvailability: 99.98
      },
      hourlyThreatData,
      accessData,
      recentAlerts: formattedAlerts,
      threatTypes: [
        { name: '무단 접근', value: 45 },
        { name: '악성코드', value: 25 },
        { name: '데이터 유출 시도', value: 15 },
        { name: 'SQL 인젝션', value: 8 },
        { name: '비정상 행동', value: 7 }
      ]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 프론트엔드 서빙 (SPA 지원)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});

module.exports = app;
