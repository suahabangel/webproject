// 필요한 패키지 설치 명령어
// npm init -y
// npm install express mysql2 bcrypt jsonwebtoken cors helmet express-rate-limit dotenv winston axios

// 파일: server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const winston = require('winston');

// 환경 변수 로드
dotenv.config();

// 로거 설정
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Express 앱 생성
const app = express();

// 기본 미들웨어
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API 속도 제한 설정
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100 // IP당 최대 요청 수
});
app.use('/api/', limiter);

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

// 에러 핸들링 미들웨어
app.use((err, req, res, next) => {
  logger.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  
  res.status(err.status || 500).json({
    message: err.message,
    error: process.env.NODE_ENV === 'production' ? {} : err
  });
});

// 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다`);
  logger.info(`서버가 포트 ${PORT}에서 실행 중입니다`);
});

// 파일: config/database.js
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'fluid_medical_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;

// 파일: middleware/auth.js
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: '인증 토큰이 필요합니다' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: '유효하지 않은 토큰입니다' });
    }
    req.user = user;
    next();
  });
};

const checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: '인증이 필요합니다' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: '권한이 없습니다' });
    }
    
    next();
  };
};

module.exports = { authenticateToken, checkRole };

// 파일: routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// 사용자 등록
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    
    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const connection = await pool.getConnection();
    
    // 사용자 중복 확인
    const [existingUsers] = await connection.execute(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    
    if (existingUsers.length > 0) {
      connection.release();
      return res.status(409).json({ message: '이미 존재하는 사용자명 또는 이메일입니다' });
    }
    
    // 사용자 등록
    const [result] = await connection.execute(
      'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, role]
    );
    
    connection.release();
    
    res.status(201).json({
      message: '사용자가 성공적으로 등록되었습니다',
      userId: result.insertId
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '서버 오류', error: error.message });
  }
});

// 로그인
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const connection = await pool.getConnection();
    
    // 사용자 확인
    const [users] = await connection.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    
    connection.release();
    
    if (users.length === 0) {
      return res.status(401).json({ message: '인증 실패: 사용자를 찾을 수 없습니다' });
    }
    
    const user = users[0];
    
    // 비밀번호 확인
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ message: '인증 실패: 잘못된 비밀번호' });
    }
    
    // JWT 토큰 생성
    const token = jwt.sign(
      { id: user.user_id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    // 마지막 로그인 시간 업데이트
    await connection.execute(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = ?',
      [user.user_id]
    );
    
    res.status(200).json({
      message: '로그인 성공',
      token,
      user: {
        id: user.user_id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '서버 오류', error: error.message });
  }
});

// 사용자 프로필 조회
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const connection = await pool.getConnection();
    
    const [users] = await connection.execute(
      'SELECT user_id, username, email, role, created_at, last_login FROM users WHERE user_id = ?',
      [userId]
    );
    
    connection.release();
    
    if (users.length === 0) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
    }
    
    res.status(200).json({ user: users[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '서버 오류', error: error.message });
  }
});

module.exports = router;

// 파일: routes/patients.js
const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, checkRole } = require('../middleware/auth');

// 환자 목록 조회
router.get('/', authenticateToken, checkRole(['Admin', 'Doctor', 'Nurse']), async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [patients] = await connection.execute('SELECT * FROM patients');
    connection.release();
    
    res.status(200).json({ patients });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '서버 오류', error: error.message });
  }
});

// 환자 상세 조회
router.get('/:id', authenticateToken, checkRole(['Admin', 'Doctor', 'Nurse']), async (req, res) => {
  try {
    const patientId = req.params.id;
    const connection = await pool.getConnection();
    
    const [patients] = await connection.execute(
      'SELECT * FROM patients WHERE patient_id = ?',
      [patientId]
    );
    
    if (patients.length === 0) {
      connection.release();
      return res.status(404).json({ message: '환자를 찾을 수 없습니다' });
    }
    
    // 진단 내역 조회
    const [diagnoses] = await connection.execute(
      'SELECT d.*, mp.first_name as doctor_first_name, mp.last_name as doctor_last_name ' +
      'FROM diagnoses d ' +
      'JOIN medical_professionals mp ON d.professional_id = mp.professional_id ' +
      'WHERE d.patient_id = ?',
      [patientId]
    );
    
    // 처방전 내역 조회
    const [prescriptions] = await connection.execute(
      'SELECT p.*, mp.first_name as doctor_first_name, mp.last_name as doctor_last_name ' +
      'FROM prescriptions p ' +
      'JOIN medical_professionals mp ON p.professional_id = mp.professional_id ' +
      'WHERE p.patient_id = ?',
      [patientId]
    );
    
    connection.release();
    
    res.status(200).json({
      patient: patients[0],
      diagnoses,
      prescriptions
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '서버 오류', error: error.message });
  }
});

// 환자 등록
router.post('/', authenticateToken, checkRole(['Admin', 'Doctor']), async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      birth_date,
      gender,
      blood_type,
      address,
      phone,
      email,
      emergency_contact,
      insurance_id
    } = req.body;
    
    const connection = await pool.getConnection();
    
    const [result] = await connection.execute(
      `INSERT INTO patients (
        first_name, last_name, birth_date, gender, blood_type, 
        address, phone, email, emergency_contact, insurance_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        first_name, last_name, birth_date, gender, blood_type,
        address, phone, email, emergency_contact, insurance_id
      ]
    );
    
    connection.release();
    
    res.status(201).json({
      message: '환자가 성공적으로 등록되었습니다',
      patientId: result.insertId
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '서버 오류', error: error.message });
  }
});

// 환자 정보 수정
router.put('/:id', authenticateToken, checkRole(['Admin', 'Doctor']), async (req, res) => {
  try {
    const patientId = req.params.id;
    const {
      first_name,
      last_name,
      birth_date,
      gender,
      blood_type,
      address,
      phone,
      email,
      emergency_contact,
      insurance_id
    } = req.body;
    
    const connection = await pool.getConnection();
    
    const [result] = await connection.execute(
      `UPDATE patients SET
        first_name = ?, last_name = ?, birth_date = ?, gender = ?, blood_type = ?,
        address = ?, phone = ?, email = ?, emergency_contact = ?, insurance_id = ?
      WHERE patient_id = ?`,
      [
        first_name, last_name, birth_date, gender, blood_type,
        address, phone, email, emergency_contact, insurance_id,
        patientId
      ]
    );
    
    connection.release();
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: '환자를 찾을 수 없습니다' });
    }
    
    res.status(200).json({ message: '환자 정보가 성공적으로 수정되었습니다' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '서버 오류', error: error.message });
  }
});

module.exports = router;

// 파일: routes/drugs.js 
const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, checkRole } = require('../middleware/auth');



// 약물 목록 조회
router.get('/', authenticateToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [drugs] = await connection.execute('SELECT * FROM drugs');
    connection.release();
    
    res.status(200).json({ drugs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '서버 오류', error: error.message });
  }
});

// 약물 상세 조회
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const drugId = req.params.id;
    const connection = await pool.getConnection();
    
    // 약물 정보 조회
    const [drugs] = await connection.execute(
      'SELECT * FROM drugs WHERE drug_id = ?',
      [drugId]
    );
    
    if (drugs.length === 0) {
      connection.release();
      return res.status(404).json({ message: '약물을 찾을 수 없습니다' });
    }
    
    // 약물 상호작용 정보 조회
    const [interactions] = await connection.execute(
      `SELECT di.*, d.name as interacting_drug_name 
       FROM drug_interactions di
       JOIN drugs d ON di.drug_id_2 = d.drug_id
       WHERE di.drug_id_1 = ?
       UNION
       SELECT di.*, d.name as interacting_drug_name
       FROM drug_interactions di
       JOIN drugs d ON di.drug_id_1 = d.drug_id
       WHERE di.drug_id_2 = ?`,
      [drugId, drugId]
    );
    
    connection.release();
    
    res.status(200).json({
      drug: drugs[0],
      interactions
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '서버 오류', error: error.message });
  }
});

// 약물 등록
router.post('/', authenticateToken, checkRole(['Admin', 'Pharmacist']), async (req, res) => {
  try {
    const {
      name,
      generic_name,
      manufacturer,
      description,
      dosage_form,
      strength,
      route_of_administration,
      viscosity,
      density
    } = req.body;
    
    const connection = await pool.getConnection();
    
    const [result] = await connection.execute(
      `INSERT INTO drugs (
        name, generic_name, manufacturer, description, dosage_form,
        strength, route_of_administration, viscosity, density
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name, generic_name, manufacturer, description, dosage_form,
        strength, route_of_administration, viscosity, density
      ]
    );
    
    connection.release();
    
    res.status(201).json({
      message: '약물이 성공적으로 등록되었습니다',
      drugId: result.insertId
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '서버 오류', error: error.message });
  }
});

// 약물 상호작용 등록
router.post('/interactions', authenticateToken, checkRole(['Admin', 'Pharmacist']), async (req, res) => {
  try {
    const {
      drug_id_1,
      drug_id_2,
      interaction_type,
      description
    } = req.body;
    
    const connection = await pool.getConnection();
    
    // 약물 존재 확인
    const [drugs1] = await connection.execute(
      'SELECT * FROM drugs WHERE drug_id = ?',
      [drug_id_1]
    );
    
    const [drugs2] = await connection.execute(
      'SELECT * FROM drugs WHERE drug_id = ?',
      [drug_id_2]
    );
    
    if (drugs1.length === 0 || drugs2.length === 0) {
      connection.release();
      return res.status(404).json({ message: '약물을 찾을 수 없습니다' });
    }
    
    // 상호작용 중복 확인
    const [existingInteractions] = await connection.execute(
      `SELECT * FROM drug_interactions 
       WHERE (drug_id_1 = ? AND drug_id_2 = ?) OR (drug_id_1 = ? AND drug_id_2 = ?)`,
      [drug_id_1, drug_id_2, drug_id_2, drug_id_1]
    );
    
    if (existingInteractions.length > 0) {
      connection.release();
      return res.status(409).json({ message: '이미 등록된 약물 상호작용입니다' });
    }
    
    // 상호작용 등록
    const [result] = await connection.execute(
      `INSERT INTO drug_interactions (drug_id_1, drug_id_2, interaction_type, description)
       VALUES (?, ?, ?, ?)`,
      [drug_id_1, drug_