// config/database.js - 보안 강화 버전
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const crypto = require('crypto');

dotenv.config();

// 데이터베이스 연결 설정
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'fluid_medical_user',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'fluid_medical_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // 보안 강화 설정
  ssl: process.env.NODE_ENV === 'production' ? {
    // 프로덕션 환경에서 SSL 사용
    ca: process.env.DB_SSL_CA,
    key: process.env.DB_SSL_KEY,
    cert: process.env.DB_SSL_CERT,
    rejectUnauthorized: true
  } : undefined,
  // 연결 타임아웃 설정
  connectTimeout: 10000, // 10초
  // 쿼리 타임아웃 설정
  maxQueryTime: 30000 // 30초
});

// 쿼리 실행 래퍼 함수 (보안 강화)
const query = async (sql, params = []) => {
  // SQL 인젝션 취약점 기본 검사
  if (typeof sql !== 'string') {
    throw new Error('SQL 쿼리는 문자열이어야 합니다.');
  }

  // 위험한 SQL 패턴 검사
  const dangerousPatterns = [
    /\bUNION\b/i,
    /\bSELECT\b.*\bFROM\b.*\bINFORMATION_SCHEMA\b/i,
    /\bDROP\b/i,
    /\bALTER\b/i,
    /\bTRUNCATE\b/i,
    /\bEXEC\b/i,
    /\bXP_\w+/i, // SQL Server 확장 프로시저
    /--/,  // SQL 주석
    /\/\*.*\*\//  // SQL 블록 주석
  ];

  // 관리자 전용 쿼리가 아닌 경우 위험한 패턴 체크
  const isAdminQuery = sql.includes('-- ADMIN QUERY');
  if (!isAdminQuery) {
    for (const pattern of dangerousPatterns) {
      if (pattern.test(sql)) {
        throw new Error('잠재적인 SQL 인젝션 시도가 감지되었습니다.');
      }
    }
  }

  // 실제 쿼리 실행 로직
  let connection;
  try {
    // 로깅용 쿼리 ID 생성
    const queryId = crypto.randomBytes(8).toString('hex');
    const queryStartTime = Date.now();
    
    // 연결 획득
    connection = await pool.getConnection();
    
    // 쿼리 실행
    console.log(`[DB:${queryId}] 쿼리 시작: ${sql.substring(0, 100)}${sql.length > 100 ? '...' : ''}`);
    
    const [results] = await connection.execute(sql, params);
    
    // 실행 시간 계산 및 로깅
    const queryTime = Date.now() - queryStartTime;
    console.log(`[DB:${queryId}] 쿼리 완료: ${queryTime}ms`);
    
    // 느린 쿼리 로깅
    if (queryTime > 1000) {
      console.warn(`[DB:${queryId}] 느린 쿼리 감지: ${queryTime}ms, SQL: ${sql}`);
    }
    
    return results;
  } catch (error) {
    // 오류 로깅
    console.error('데이터베이스 오류:', error.message);
    
    // 오류 메시지에서 민감한 정보 제거
    const sanitizedError = new Error('데이터베이스 작업 중 오류가 발생했습니다.');
    sanitizedError.code = error.code;
    sanitizedError.errno = error.errno;
    
    throw sanitizedError;
  } finally {
    // 연결 해제
    if (connection) {
      connection.release();
    }
  }
};

// 민감한 데이터 암호화/복호화 유틸리티
const encryption = {
  // 암호화
  encrypt: (text) => {
    if (!text) return null;
    
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.ENCRYPTION_KEY || '', 'hex');
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  },
  
  // 복호화
  decrypt: (text) => {
    if (!text) return null;
    
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.ENCRYPTION_KEY || '', 'hex');
    
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
};

// 데이터베이스 연결 테스트
const testConnection = async () => {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log('데이터베이스 연결 성공!');
    return true;
  } catch (error) {
    console.error('데이터베이스 연결 오류:', error.message);
    return false;
  } finally {
    if (connection) connection.release();
  }
};

// 데이터베이스 연결 풀 종료 (정상 종료용)
const closePool = async () => {
  try {
    await pool.end();
    console.log('데이터베이스 연결 풀이 정상적으로 종료되었습니다.');
  } catch (error) {
    console.error('데이터베이스 연결 풀 종료 오류:', error.message);
  }
};

// 안전한 쿼리 실행 함수
const safeQuery = async (sql, params = [], options = {}) => {
  const { retries = 3, retryDelay = 1000 } = options;
  let lastError;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await query(sql, params);
    } catch (error) {
      lastError = error;
      
      // 재시도 가능한 오류인지 확인
      const retryableErrors = ['ECONNRESET', 'ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT'];
      const canRetry = retryableErrors.includes(error.code);
      
      if (!canRetry || attempt >= retries) {
        break;
      }
      
      console.warn(`쿼리 실패, 재시도 중... (${attempt}/${retries})`);
      
      // 재시도 전 대기
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  
  throw lastError;
};

// 트랜잭션 지원 함수
const transaction = async (callback) => {
  let connection;
  try {
    connection = await pool.getConnection();
    
    // 트랜잭션 시작
    await connection.beginTransaction();
    
    // 사용자 정의 함수 실행
    const result = await callback({
      query: async (sql, params = []) => {
        const [results] = await connection.execute(sql, params);
        return results;
      }
    });
    
    // 트랜잭션 커밋
    await connection.commit();
    
    return result;
  } catch (error) {
    // 트랜잭션 롤백
    if (connection) {
      try {
        await connection.rollback();
        console.log('트랜잭션이 롤백되었습니다.');
      } catch (rollbackError) {
        console.error('트랜잭션 롤백 오류:', rollbackError.message);
      }
    }
    
    // 오류 전파
    throw error;
  } finally {
    // 연결 해제
    if (connection) {
      connection.release();
    }
  }
};

module.exports = {
  pool,
  query,
  encryption,
  testConnection,
  closePool,
  safeQuery,
  transaction
};
