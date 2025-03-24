// utils/validation.js
const Joi = require('joi');
const { sanitize } = require('sanitize-html');
const validator = require('validator');

// 환자 스키마 검증
const patientSchema = Joi.object({
  first_name: Joi.string().trim().min(1).max(50).required()
    .pattern(/^[가-힣a-zA-Z\s]+$/)
    .message('이름은 한글, 영문 및 공백만 포함할 수 있습니다.'),
  
  last_name: Joi.string().trim().min(1).max(50).required()
    .pattern(/^[가-힣a-zA-Z\s]+$/)
    .message('성은 한글, 영문 및 공백만 포함할 수 있습니다.'),
  
  birth_date: Joi.date().iso().required()
    .max(new Date())
    .message('생년월일은 과거 날짜여야 합니다.'),
  
  gender: Joi.string().valid('M', 'F', 'O').required(),
  
  blood_type: Joi.string().pattern(/^(A|B|AB|O)[+-]$/).allow(null),
  
  address: Joi.string().trim().max(200).allow(null, ''),
  
  phone: Joi.string().pattern(/^[0-9-+\s()]+$/).max(20)
    .message('유효한 전화번호 형식이 아닙니다.'),
  
  email: Joi.string().email().max(100).allow(null, '')
    .message('유효한 이메일 형식이 아닙니다.'),
  
  emergency_contact: Joi.string().pattern(/^[0-9-+\s()]+$/).max(100).allow(null, '')
    .message('유효한 비상 연락처 형식이 아닙니다.'),
  
  insurance_id: Joi.string().alphanum().max(50).allow(null, '')
});

// 약물 스키마 검증
const drugSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  
  generic_name: Joi.string().trim().max(100).allow(null, ''),
  
  manufacturer: Joi.string().trim().max(100).allow(null, ''),
  
  description: Joi.string().trim().max(2000).allow(null, ''),
  
  dosage_form: Joi.string().trim().max(50).allow(null, ''),
  
  strength: Joi.string().trim().max(50).allow(null, ''),
  
  route_of_administration: Joi.string().trim().max(50).allow(null, ''),
  
  viscosity: Joi.number().positive().max(100).allow(null),
  
  density: Joi.number().positive().max(100).allow(null)
});

// 처방전 스키마 검증
const prescriptionSchema = Joi.object({
  patient_id: Joi.number().integer().positive().required(),
  
  prescription_date: Joi.date().iso().max(new Date()).required(),
  
  notes: Joi.string().trim().max(2000).allow(null, ''),
  
  details: Joi.array().items(
    Joi.object({
      drug_id: Joi.number().integer().positive().required(),
      
      dosage: Joi.string().trim().min(1).max(50).required(),
      
      frequency: Joi.string().trim().min(1).max(50).required(),
      
      duration: Joi.string().trim().max(50).allow(null, ''),
      
      instructions: Joi.string().trim().max(2000).allow(null, '')
    })
  ).min(1).required()
});

// 약물 전달 시뮬레이션 스키마 검증
const drugDeliverySimulationSchema = Joi.object({
  patient_id: Joi.number().integer().positive().required(),
  
  drug_id: Joi.number().integer().positive().required(),
  
  target_organ: Joi.string().trim().min(1).max(50).required(),
  
  injection_site: Joi.string().trim().min(1).max(50).required(),
  
  flow_rate: Joi.number().positive().max(10).required(),
  
  simulation_parameters: Joi.object({
    viscosity: Joi.number().positive().max(10).required(),
    
    grid_resolution: Joi.string()
      .pattern(/^\d+x\d+x\d+$/)
      .required(),
    
    time_steps: Joi.number().integer().min(100).max(10000).required()
  }).required()
});

// 인증 관련 스키마 검증
const loginSchema = Joi.object({
  username: Joi.string().trim().min(3).max(50).required()
    .pattern(/^[a-zA-Z0-9._-]+$/)
    .message('사용자명은 영문, 숫자, 점, 밑줄, 하이픈만 포함할 수 있습니다.'),
  
  password: Joi.string().min(8).max(100).required()
});

const registerSchema = Joi.object({
  username: Joi.string().trim().min(3).max(50).required()
    .pattern(/^[a-zA-Z0-9._-]+$/)
    .message('사용자명은 영문, 숫자, 점, 밑줄, 하이픈만 포함할 수 있습니다.'),
  
  email: Joi.string().email().required()
    .message('유효한 이메일 형식이 아닙니다.'),
  
  password: Joi.string().min(8).max(100).required()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .message('비밀번호는 최소 8자 이상이며, 대문자, 소문자, 숫자, 특수문자를 포함해야 합니다.'),
  
  role: Joi.string().valid('Admin', 'Doctor', 'Nurse', 'Pharmacist', 'Researcher', 'Patient').required()
});

// HTML 입력 정화 함수
const sanitizeHtml = (html) => {
  return sanitize(html, {
    allowedTags: ['b', 'i', 'u', 'p', 'br', 'ul', 'ol', 'li'],
    allowedAttributes: {},
    disallowedTagsMode: 'escape'
  });
};

// SQL 인젝션 패턴 검사
const hasSqlInjection = (input) => {
  if (typeof input !== 'string') return false;
  
  const sqlPatterns = [
    /(\b(union|select|insert|update|delete|drop|alter|create|exec|into|from|where)\b)/i,
    /'--/i,
    /\/\*/i,
    /;\s*$/i,
    /';/i,
    /--/i
  ];
  
  return sqlPatterns.some(pattern => pattern.test(input));
};

// 입력값 정화 함수
const sanitizeInput = (data) => {
  if (typeof data === 'string') {
    return validator.escape(data.trim());
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeInput(item));
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized = {};
    for (const key in data) {
      sanitized[key] = sanitizeInput(data[key]);
    }
    return sanitized;
  }
  
  return data;
};

// 숫자 입력값 검증
const isValidNumber = (num, options = {}) => {
  const { min, max, isInteger } = options;
  
  if (typeof num !== 'number' || isNaN(num)) return false;
  
  if (min !== undefined && num < min) return false;
  if (max !== undefined && num > max) return false;
  if (isInteger && !Number.isInteger(num)) return false;
  
  return true;
};

// 날짜 입력값 검증
const isValidDate = (dateStr) => {
  try {
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  } catch (error) {
    return false;
  }
};

// XSS 취약점 패턴 검사
const hasXssVulnerability = (input) => {
  if (typeof input !== 'string') return false;
  
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/i,
    /javascript:/i,
    /on\w+=/i,
    /<img[^>]+src=[^>]+>/i,
    /<iframe[^>]+src=[^>]+>/i,
    /<[^>]+style=[^>]+expression\([^>]+>/i
  ];
  
  return xssPatterns.some(pattern => pattern.test(input));
};

module.exports = {
  patientSchema,
  drugSchema,
  prescriptionSchema,
  drugDeliverySimulationSchema,
  loginSchema,
  registerSchema,
  sanitizeHtml,
  hasSqlInjection,
  sanitizeInput,
  isValidNumber,
  isValidDate,
  hasXssVulnerability
};