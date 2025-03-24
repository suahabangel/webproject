// routes/auth-azure.js - Azure AD 인증 라우트
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { msalClient } = require('../config/azure');
const { generateToken, checkRole } = require('../middleware/auth');
const { promisify } = require('util');

// Azure 로그인 페이지로 리디렉션
router.get('/login', (req, res) => {
  // 로그인 후 리디렉션할 URL
  const redirectUrl = req.query.redirect || '/dashboard';
  
  // 세션에 리디렉션 URL 저장
  req.session.redirectUrl = redirectUrl;
  
  const authCodeUrlParameters = {
    scopes: ['user.read'],
    redirectUri: `${process.env.APP_URL}/api/auth/azure/callback`,
    state: Buffer.from(JSON.stringify({ redirectUrl })).toString('base64')
  };

  msalClient.getAuthCodeUrl(authCodeUrlParameters)
    .then((url) => {
      res.redirect(url);
    })
    .catch((error) => {
      console.error('Azure AD 인증 URL 생성 오류:', error);
      res.status(500).json({ 
        message: '인증 서비스 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        error: 'auth_service_error'
      });
    });
});

// Azure 로그인 콜백 처리
router.get('/callback', async (req, res) => {
  // 오류 처리
  if (req.query.error) {
    console.error('Azure AD 콜백 오류:', req.query.error_description);
    return res.redirect('/auth/error?message=로그인 중 오류가 발생했습니다');
  }
  
  // state 파라미터에서 리디렉션 URL 가져오기
  let redirectUrl = '/dashboard';
  try {
    const state = JSON.parse(Buffer.from(req.query.state, 'base64').toString());
    if (state.redirectUrl) {
      redirectUrl = state.redirectUrl;
    }
  } catch (e) {
    console.error('state 파라미터 파싱 오류:', e);
  }
  
  // 인증 코드 교환
  try {
    const tokenRequest = {
      code: req.query.code,
      scopes: ['user.read'],
      redirectUri: `${process.env.APP_URL}/api/auth/azure/callback`,
    };

    const response = await msalClient.acquireTokenByCode(tokenRequest);
    
    // 사용자 프로필 정보
    const userId = response.uniqueId;
    const username = response.account.username;
    const name = response.account.name || username;
    
    // DB에서 사용자 역할 조회 또는 기본 역할 설정
    // 여기서는 간단하게 기본 역할을 설정하지만, 실제로는 DB 조회 필요
    const userRole = 'User'; // 기본 역할
    
    // JWT 토큰 생성
    const token = generateToken({
      id: userId,
      username: username,
      name: name,
      role: userRole
    });
    
    // 쿠키에 토큰 저장
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000 // 1시간
    });
    
    // 리디렉션
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Azure AD 토큰 교환 오류:', error);
    res.redirect('/auth/error?message=인증 처리 중 오류가 발생했습니다');
  }
});

// 토큰 검증 엔드포인트
router.get('/verify', async (req, res) => {
  try {
    const token = req.cookies.auth_token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        authenticated: false, 
        message: '인증 토큰이 필요합니다' 
      });
    }
    
    // 토큰 검증
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    
    // 사용자 정보 반환
    res.json({
      authenticated: true,
      user: {
        id: decoded.id,
        username: decoded.username,
        name: decoded.name,
        role: decoded.role
      }
    });
  } catch (error) {
    res.status(401).json({ 
      authenticated: false, 
      message: '유효하지 않은 토큰입니다' 
    });
  }
});

// 로그아웃 엔드포인트
router.get('/logout', (req, res) => {
  // 쿠키 삭제
  res.clearCookie('auth_token');
  
  // 프론트엔드 로그인 페이지로 리디렉션
  res.redirect('/auth/login');
});

// 보호된 API 테스트 엔드포인트
router.get('/protected', checkRole(['Admin', 'User']), (req, res) => {
  res.json({
    message: '보호된 리소스 접근 성공',
    user: req.user
  });
});

module.exports = router;
