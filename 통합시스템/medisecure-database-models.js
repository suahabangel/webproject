// MediSecure 데이터베이스 모델 정의 (models.js)
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// =============== 사용자 모델 ===============
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  department: { type: String, required: true },
  role: { type: String, enum: ['admin', 'doctor', 'nurse', 'staff'], default: 'staff' },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date },
  personalInfo: {
    name: { type: String },
    phoneNumber: { type: String },
    emergencyContact: { type: String }
  },
  isActive: { type: Boolean, default: true },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date }
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

// 비밀번호 검증 메소드
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// 계정 잠금 상태 확인
UserSchema.methods.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

const User = mongoose.model('User', UserSchema);

// =============== 보안 위협 모델 ===============
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
  threatCategory: { type: String, enum: ['무단 접근', '악성코드', '데이터 유출 시도', 'SQL 인젝션', '비정상 행동'] },
  affectedSystems: [{ type: String }],
  mitigationSteps: [{ 
    action: { type: String },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now },
    successful: { type: Boolean, default: true },
    notes: { type: String }
  }]
});

const Threat = mongoose.model('Threat', ThreatSchema);

// =============== 액세스 로그 모델 ===============
const AccessLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  resource: { type: String, required: true },
  status: { type: String, enum: ['success', 'denied'], required: true },
  ipAddress: { type: String, required: true },
  userAgent: { type: String },
  timestamp: { type: Date, default: Date.now },
  details: { type: Object },
  sessionId: { type: String },
  duration: { type: Number }, // 밀리초 단위
  dataSensitivity: { type: String, enum: ['낮음', '중간', '높음'] },
  isAnomalous: { type: Boolean, default: false },
  anomalyScore: { type: Number, min: 0, max: 1 }
});

const AccessLog = mongoose.model('AccessLog', AccessLogSchema);

// =============== 유체역학 시뮬레이션 모델 ===============
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
  completedAt: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  targetSystem: { type: String },
  description: { type: String },
  tags: [{ type: String }],
  trafficSource: { type: String },
  relatedThreats: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Threat' }]
});

const Simulation = mongoose.model('Simulation', SimulationSchema);

// =============== 환자 데이터 모델 ===============
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
  }],
  contactInfo: {
    phoneNumber: { type: String },
    address: { type: String },
    emergencyContact: { type: String }
  },
  insuranceInfo: {
    provider: { type: String },
    policyNumber: { type: String },
    groupNumber: { type: String }
  },
  vitalSigns: [{
    date: { type: Date, default: Date.now },
    temperature: { type: Number },
    bloodPressure: {
      systolic: { type: Number },
      diastolic: { type: Number }
    },
    heartRate: { type: Number },
    respiratoryRate: { type: Number }
  }],
  allergies: [{ type: String }],
  medications: [{
    name: { type: String },
    dosage: { type: String },
    frequency: { type: String },
    startDate: { type: Date },
    endDate: { type: Date },
    prescribedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }]
});

const Patient = mongoose.model('Patient', PatientSchema);

// =============== 새로운 모델: 부서 ===============
const DepartmentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  head: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  securityLevel: { type: Number, min: 1, max: 5, default: 1 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  accessControls: {
    allowedDepartments: [{ type: String }],
    restrictedResources: [{ type: String }]
  },
  location: {
    building: { type: String },
    floor: { type: Number },
    roomNumbers: [{ type: String }]
  }
});

const Department = mongoose.model('Department', DepartmentSchema);

// =============== 새로운 모델: 보안 정책 ===============
const SecurityPolicySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  policyType: { type: String, enum: ['access', 'data', 'password', 'network', 'audit'], required: true },
  status: { type: String, enum: ['active', 'draft', 'archived'], default: 'active' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  effectiveFrom: { type: Date },
  effectiveTo: { type: Date },
  targetGroups: [{
    type: { type: String, enum: ['role', 'department', 'all'] },
    value: { type: String }
  }],
  rules: [{
    ruleType: { type: String, required: true },
    parameters: { type: Object },
    priority: { type: Number, default: 1 },
    actions: [{ type: String }]
  }],
  complianceStandards: [{ type: String }],
  version: { type: String, default: '1.0' },
  previousVersions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SecurityPolicy' }]
});

const SecurityPolicy = mongoose.model('SecurityPolicy', SecurityPolicySchema);

// =============== 새로운 모델: 의료 장비 ===============
const MedicalDeviceSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  deviceType: { type: String, required: true },
  manufacturer: { type: String },
  model: { type: String },
  serialNumber: { type: String },
  firmwareVersion: { type: String },
  lastPatchDate: { type: Date },
  purchaseDate: { type: Date },
  warrantyExpiryDate: { type: Date },
  location: {
    department: { type: String },
    building: { type: String },
    floor: { type: Number },
    room: { type: String }
  },
  networkInfo: {
    macAddress: { type: String },
    ipAddress: { type: String },
    connectionType: { type: String, enum: ['wired', 'wireless', 'bluetooth', 'isolated'] },
    lastConnected: { type: Date }
  },
  securityInfo: {
    securityLevel: { type: String, enum: ['낮음', '중간', '높음'], default: '중간' },
    encryptionSupport: { type: Boolean, default: false },
    knownVulnerabilities: [{ type: String }],
    patchStatus: { type: String, enum: ['up-to-date', 'outdated', 'unsupported'] },
    lastSecurityAssessment: { type: Date }
  },
  maintenanceHistory: [{
    date: { type: Date },
    type: { type: String, enum: ['firmware-update', 'hardware-repair', 'security-patch', 'calibration', 'inspection'] },
    performedBy: { type: String },
    notes: { type: String }
  }],
  status: { type: String, enum: ['active', 'maintenance', 'decommissioned'], default: 'active' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const MedicalDevice = mongoose.model('MedicalDevice', MedicalDeviceSchema);

// =============== 새로운 모델: 알림 ===============
const AlertSchema = new mongoose.Schema({
  type: { type: String, enum: ['security', 'system', 'access', 'policy', 'device'], required: true },
  severity: { type: String, enum: ['낮음', '중간', '높음', '긴급'], required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  source: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  status: { type: String, enum: ['active', 'acknowledged', 'resolved', 'dismissed'], default: 'active' },
  relatedEntity: {
    entityType: { type: String },
    entityId: { type: mongoose.Schema.Types.ObjectId }
  },
  recipients: [{
    type: { type: String, enum: ['user', 'role', 'department', 'all'] },
    value: { type: String }
  }],
  acknowledgements: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date },
    notes: { type: String }
  }],
  autoResolveAfter: { type: Date },
  escalation: {
    threshold: { type: Number }, // 시간(분)
    nextLevel: { type: String },
    escalated: { type: Boolean, default: false },
    escalatedAt: { type: Date }
  },
  tags: [{ type: String }]
});

const Alert = mongoose.model('Alert', AlertSchema);

// 모델 내보내기
module.exports = {
  User,
  Threat,
  AccessLog,
  Simulation,
  Patient,
  Department,
  SecurityPolicy,
  MedicalDevice,
  Alert
};
