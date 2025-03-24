// config/azure.js - Azure 서비스 통합 설정
const { DefaultAzureCredential } = require('@azure/identity');
const { SecretClient } = require('@azure/keyvault-secrets');
const { BlobServiceClient } = require('@azure/storage-blob');
const { ConfidentialClientApplication } = require('@azure/msal-node');
const { createClient } = require('redis');

// Azure 인증 정보
const credential = new DefaultAzureCredential();

// Key Vault 설정
const vaultUrl = process.env.AZURE_KEYVAULT_URL || 'https://fluid-medical-vault.vault.azure.net/';
const secretClient = new SecretClient(vaultUrl, credential);

// Blob Storage 설정
const blobServiceClient = new BlobServiceClient(
  process.env.AZURE_STORAGE_CONNECTION_STRING || 
  `https://${process.env.AZURE_STORAGE_ACCOUNT}.blob.core.windows.net`,
  credential
);

// Azure AD 인증 설정
const msalConfig = {
  auth: {
    clientId: process.env.AZURE_AD_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}`,
    clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
  },
  system: {
    loggerOptions: {
      loggerCallback(loglevel, message, containsPii) {
        console.log(message);
      },
      piiLoggingEnabled: false,
      logLevel: process.env.NODE_ENV === 'development' ? 'Verbose' : 'Warning',
    }
  }
};

const msalClient = new ConfidentialClientApplication(msalConfig);

// Redis 클라이언트 설정
let redisClient;
if (process.env.AZURE_REDIS_CONNECTION_STRING) {
  redisClient = createClient({
    url: process.env.AZURE_REDIS_CONNECTION_STRING,
    socket: {
      tls: process.env.NODE_ENV === 'production',
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    }
  });
  
  redisClient.on('error', (err) => {
    console.error('Redis 클라이언트 오류:', err);
  });
  
  // Redis 연결은 함수 호출 시점에서 해야 함
}

// 비밀 가져오기 함수
async function getSecrets() {
  try {
    const secrets = {};
    
    // 필요한 비밀들 가져오기
    const dbPasswordSecret = await secretClient.getSecret('DB-PASSWORD');
    const jwtSecretSecret = await secretClient.getSecret('JWT-SECRET');
    const encryptionKeySecret = await secretClient.getSecret('ENCRYPTION-KEY');
    
    secrets.dbPassword = dbPasswordSecret.value;
    secrets.jwtSecret = jwtSecretSecret.value;
    secrets.encryptionKey = encryptionKeySecret.value;
    
    return secrets;
  } catch (error) {
    console.error('Azure Key Vault에서 비밀 가져오기 오류:', error);
    throw new Error('비밀 가져오기 실패');
  }
}

// Redis 연결 함수
async function connectRedis() {
  if (!redisClient) return null;
  
  try {
    await redisClient.connect();
    console.log('Redis 연결 성공');
    return redisClient;
  } catch (error) {
    console.error('Redis 연결 오류:', error);
    return null;
  }
}

// 시뮬레이션 결과 저장 함수
async function saveSimulationResult(simulationId, data) {
  try {
    const containerClient = blobServiceClient.getContainerClient('simulation-results');
    await containerClient.createIfNotExists();
    
    const blobClient = containerClient.getBlockBlobClient(`simulation-${simulationId}.json`);
    await blobClient.upload(JSON.stringify(data), JSON.stringify(data).length);
    
    return blobClient.url;
  } catch (error) {
    console.error('시뮬레이션 결과 저장 오류:', error);
    throw new Error('시뮬레이션 결과 저장 실패');
  }
}

// 시뮬레이션 결과 가져오기 함수
async function getSimulationResult(simulationId) {
  try {
    const containerClient = blobServiceClient.getContainerClient('simulation-results');
    const blobClient = containerClient.getBlockBlobClient(`simulation-${simulationId}.json`);
    
    const downloadBlockBlobResponse = await blobClient.download(0);
    const downloaded = await streamToBuffer(downloadBlockBlobResponse.readableStreamBody);
    
    return JSON.parse(downloaded.toString());
  } catch (error) {
    console.error('시뮬레이션 결과 가져오기 오류:', error);
    throw new Error('시뮬레이션 결과 가져오기 실패');
  }
}

// 스트림을 버퍼로 변환하는 함수
async function streamToBuffer(readableStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readableStream.on('data', (data) => {
      chunks.push(data instanceof Buffer ? data : Buffer.from(data));
    });
    readableStream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    readableStream.on('error', reject);
  });
}

module.exports = {
  getSecrets,
  connectRedis,
  saveSimulationResult,
  getSimulationResult,
  msalClient,
  redisClient
};
