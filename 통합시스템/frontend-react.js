// src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/auth/PrivateRoute';
import DashboardLayout from './components/layouts/DashboardLayout';

// 공개 페이지
import HomePage from './pages/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// 인증이 필요한 페이지
import DashboardPage from './pages/dashboard/DashboardPage';
import PatientsPage from './pages/patients/PatientsPage';
import PatientDetailPage from './pages/patients/PatientDetailPage';
import DrugsPage from './pages/drugs/DrugsPage';
import DrugDetailPage from './pages/drugs/DrugDetailPage';
import PrescriptionsPage from './pages/prescriptions/PrescriptionsPage';
import PrescriptionDetailPage from './pages/prescriptions/PrescriptionDetailPage';
import SimulationsPage from './pages/simulations/SimulationsPage';
import SimulationDetailPage from './pages/simulations/SimulationDetailPage';
import ProfilePage from './pages/auth/ProfilePage';

import './styles/main.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* 공개 라우트 */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* 인증이 필요한 라우트 */}
          <Route path="/dashboard" element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
            <Route index element={<DashboardPage />} />
            <Route path="patients" element={<PatientsPage />} />
            <Route path="patients/:id" element={<PatientDetailPage />} />
            <Route path="drugs" element={<DrugsPage />} />
            <Route path="drugs/:id" element={<DrugDetailPage />} />
            <Route path="prescriptions" element={<PrescriptionsPage />} />
            <Route path="prescriptions/:id" element={<PrescriptionDetailPage />} />
            <Route path="simulations" element={<SimulationsPage />} />
            <Route path="simulations/:type/:id" element={<SimulationDetailPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

// src/contexts/AuthContext.js
import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 로컬 스토리지에서 토큰 확인
    const token = localStorage.getItem('token');
    if (token) {
      // 토큰이 있으면 사용자 프로필 로드
      loadUserProfile(token);
    } else {
      setLoading(false);
    }
  }, []);

  const loadUserProfile = async (token) => {
    try {
      // API 헤더에 토큰 설정
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // 사용자 프로필 요청
      const response = await api.get('/auth/profile');
      setCurrentUser(response.data.user);
      setError(null);
    } catch (error) {
      console.error('사용자 프로필 로드 오류:', error);
      setError('세션이 만료되었거나 유효하지 않습니다. 다시 로그인해주세요.');
      // 오류 시 토큰 제거
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { username, password });
      const { token, user } = response.data;
      
      // 토큰 저장 및 API 헤더 설정
      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setCurrentUser(user);
      setError(null);
      return true;
    } catch (error) {
      console.error('로그인 오류:', error);
      setError(error.response?.data?.message || '로그인에 실패했습니다. 사용자 이름과 비밀번호를 확인해주세요.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    try {
      await api.post('/auth/register', userData);
      setError(null);
      return true;
    } catch (error) {
      console.error('회원가입 오류:', error);
      setError(error.response?.data?.message || '회원가입에 실패했습니다. 입력 정보를 확인해주세요.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    // 토큰 제거 및 사용자 상태 초기화
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setCurrentUser(null);
  };

  const value = {
    currentUser,
    loading,
    error,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// src/components/auth/PrivateRoute.js
import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';

const PrivateRoute = ({ children }) => {
  const { currentUser, loading } = useContext(AuthContext);
  const location = useLocation();

  if (loading) {
    return <div className="loading">로딩 중...</div>;
  }

  if (!currentUser) {
    // 인증되지 않은 사용자를 로그인 페이지로 리디렉션
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default PrivateRoute;

// src/components/layouts/DashboardLayout.js
import React, { useContext, useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';

const DashboardLayout = () => {
  const { currentUser, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="dashboard-layout">
      <header className="dashboard-header">
        <div className="header-container">
          <div className="logo">
            <Link to="/">유체역학 기반 의료 시스템</Link>
          </div>
          <div className="mobile-menu-button" onClick={toggleMobileMenu}>
            <span></span>
            <span></span>
            <span></span>
          </div>
          <nav className={`main-nav ${isMobileMenuOpen ? 'open' : ''}`}>
            <ul>
              <li><Link to="/dashboard">대시보드</Link></li>
              {(currentUser.role === 'Admin' || currentUser.role === 'Doctor' || currentUser.role === 'Nurse') && (
                <li><Link to="/dashboard/patients">환자 관리</Link></li>
              )}
              <li><Link to="/dashboard/drugs">약물 정보</Link></li>
              {(currentUser.role === 'Admin' || currentUser.role === 'Doctor' || currentUser.role === 'Pharmacist') && (
                <li><Link to="/dashboard/prescriptions">처방전</Link></li>
              )}
              {(currentUser.role === 'Admin' || currentUser.role === 'Doctor' || currentUser.role === 'Researcher') && (
                <li><Link to="/dashboard/simulations">시뮬레이션</Link></li>
              )}
            </ul>
          </nav>
          <div className="user-menu">
            <span className="username">{currentUser.username}</span>
            <div className="dropdown">
              <button className="dropdown-toggle">
                <i className="fas fa-user-circle"></i>
              </button>
              <div className="dropdown-menu">
                <Link to="/dashboard/profile">내 프로필</Link>
                <button onClick={handleLogout}>로그아웃</button>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <main className="dashboard-content">
        <Outlet />
      </main>
      
      <footer className="dashboard-footer">
        <div className="footer-container">
          <p>&copy; 2025 유체역학 기반 의료 시스템. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default DashboardLayout;

// src/pages/HomePage.js
import React from 'react';
import { Link } from 'react-router-dom';

const HomePage = () => {
  return (
    <div className="home-page">
      <header className="home-header">
        <div className="header-container">
          <div className="logo">
            <Link to="/">유체역학 기반 의료 시스템</Link>
          </div>
          <nav className="main-nav">
            <ul>
              <li><a href="#overview">개요</a></li>
              <li><a href="#features">주요 기능</a></li>
              <li><a href="#technology">기술 소개</a></li>
              <li><a href="#contact">문의하기</a></li>
            </ul>
          </nav>
          <div className="auth-buttons">
            <Link to="/login" className="btn btn-primary">로그인</Link>
            <Link to="/register" className="btn btn-outline">회원가입</Link>
          </div>
        </div>
      </header>
      
      <section className="hero">
        <div className="hero-container">
          <h1>유체역학 기반 의료 시스템</h1>
          <p>나비에-스톡스 방정식, 블록체인, 마이크로서비스를 활용한 혁신적인 의료 시스템</p>
          <Link to="/register" className="btn btn-large btn-primary">시작하기</Link>
        </div>
      </section>
      
      <section id="overview" className="overview">
        <div className="section-container">
          <h2>시스템 개요</h2>
          <p>이 시스템은 유체역학 원리를 의료 분야에 적용하여 약물 전달, 심혈관 질환 예측, 그리고 다양한 의료 응용 프로그램을 개발하는 통합 아키텍처입니다.</p>
          <div className="cards">
            <div className="card">
              <div className="card-icon">
                <i className="fas fa-pills"></i>
              </div>
              <h3>약물 전달 시스템</h3>
              <p>유체역학 원리를 적용한 효율적인 약물 전달 시스템</p>
            </div>
            <div className="card">
              <div className="card-icon">
                <i className="fas fa-heartbeat"></i>
              </div>
              <h3>심혈관 시스템</h3>
              <p>심혈관 질환 위험 예측 및 분석</p>
            </div>
            <div className="card">
              <div className="card-icon">
                <i className="fas fa-project-diagram"></i>
              </div>
              <h3>다중물리 통합</h3>
              <p>복잡한 의료 시스템의 통합적 모델링</p>
            </div>
          </div>
        </div>
      </section>
      
      <section id="features" className="features">
        <div className="section-container">
          <h2>주요 기능</h2>
          <div className="feature-list">
            <div className="feature">
              <div className="feature-icon">
                <i className="fas fa-wave-square"></i>
              </div>
              <div className="feature-content">
                <h3>나비에-스톡스 시뮬레이션</h3>
                <p>정확한 유체 흐름 시뮬레이션으로 의료 응용 프로그램 개발</p>
              </div>
            </div>
            <div className="feature">
              <div className="feature-icon">
                <i className="fas fa-chart-line"></i>
              </div>
              <div className="feature-content">
                <h3>와도 분석</h3>
                <p>유체의 와도를 분석하여 중요한 패턴 감지</p>
              </div>
            </div>
            <div className="feature">
              <div className="feature-icon">
                <i className="fas fa-brain"></i>
              </div>
              <div className="feature-content">
                <h3>유체 패턴 인식</h3>
                <p>기계 학습을 활용한 유체 패턴 인식 및 이상 감지</p>
              </div>
            </div>
            <div className="feature">
              <div className="feature-icon">
                <i className="fas fa-lock"></i>
              </div>
              <div className="feature-content">
                <h3>블록체인 통합</h3>
                <p>의료 데이터의 안전한 저장 및 추적을 위한 블록체인 기술</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <section id="technology" className="technology">
        <div className="section-container">
          <h2>기술 소개</h2>
          <div className="tech-cards">
            <div className="tech-card">
              <h3>나비에-스톡스 방정식</h3>
              <p>유체의 흐름을 정확하게 모델링하기 위한 편미분 방정식 시스템</p>
            </div>
            <div className="tech-card">
              <h3>확장 포아죄유 법칙</h3>
              <p>약물 전달 시스템에서의 유체 흐름 모델링</p>
            </div>
            <div className="tech-card">
              <h3>진동 전단 지수</h3>
              <p>심혈관 질환 위험 예측을 위한 혈류 패턴 분석</p>
            </div>
            <div className="tech-card">
              <h3>시스템 해밀토니안</h3>
              <p>다양한 물리적 현상의 통합적 모델링</p>
            </div>
          </div>
        </div>
      </section>
      
      <section id="contact" className="contact">
        <div className="section-container">
          <h2>문의하기</h2>
          <p>더 많은 정보나 문의 사항이 있으시면 아래 양식을 작성해주세요.</p>
          <form className="contact-form">
            <div className="form-group">
              <label htmlFor="name">이름</label>
              <input type="text" id="name" name="name" required />
            </div>
            <div className="form-group">
              <label htmlFor="email">이메일</label>
              <input type="email" id="email" name="email" required />
            </div>
            <div className="form-group">
              <label htmlFor="message">메시지</label>
              <textarea id="message" name="message" rows="5" required></textarea>
            </div>
            <button type="submit" className="btn btn-primary">보내기</button>
          </form>
        </div>
      </section>
      
      <footer className="home-footer">
        <div className="footer-container">
          <div className="footer-logo">
            <Link to="/">유체역학 기반 의료 시스템</Link>
          </div>
          <div className="footer-links">
            <div className="footer-section">
              <h3>페이지</h3>
              <ul>
                <li><a href="#overview">개요</a></li>
                <li><a href="#features">주요 기능</a></li>
                <li><a href="#technology">기술 소개</a></li>
                <li><a href="#contact">문의하기</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h3>계정</h3>
              <ul>
                <li><Link to="/login">로그인</Link></li>
                <li><Link to="/register">회원가입</Link></li>
              </ul>
            </div>
            <div className="footer-section">
              <h3>연락처</h3>
              <ul>
                <li>이메일: info@fluidmedical.kr</li>
                <li>전화: 02-123-4567</li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 유체역학 기반 의료 시스템. All Rights Reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;

// src/pages/auth/LoginPage.js
import React, { useState, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, error, loading } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  
  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await login(username, password);
    
    if (success) {
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="auth-page login-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h2>로그인</h2>
            <p>계정에 로그인하여 의료 시스템에 접속하세요</p>
          </div>
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">사용자 이름</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">비밀번호</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary full-width"
              disabled={loading}
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>
          <div className="auth-footer">
            <p>계정이 없으신가요? <Link to="/register">회원가입</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

// src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터
api.interceptors.request.use(
  (config) => {
    // 요청 보내기 전 작업
    return config;
  },
  (error) => {
    // 요청 에러 처리
    return Promise.reject(error);
  }
);

// 응답 인터셉터
api.interceptors.response.use(
  (response) => {
    // 응답 데이터 처리
    return response;
  },
  (error) => {
    // HTTP 상태 코드에 따른 처리
    if (error.response) {
      // 서버가 응답한 경우
      const { status } = error.response;
      
      // 401 Unauthorized: 사용자 인증 실패
      if (status === 401) {
        localStorage.removeItem('token');
        // 로그인 페이지로 리디렉션하거나 다른 처리
      }
      
      // 403 Forbidden: 권한 없음
      if (status === 403) {
        // 적절한 처리
      }
      
      // 500 Internal Server Error: 서버 오류
      if (status >= 500) {
        console.error('서버 오류가 발생했습니다.');
      }
    } else if (error.request) {
      // 요청은 전송됐지만 응답을 받지 못한 경우
      console.error('서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.');
    } else {
      // 요청 설정 중 오류가 발생한 경우
      console.error('요청 설정 중 오류가 발생했습니다:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default api;

// src/styles/main.css
:root {
  --primary-color: #1976D2;
  --secondary-color: #388E3C;
  --implementation-color: #D32F2F;
  --verification-color: #7B1FA2;
  --maintenance-color: #F57C00;
  --fluid-medical-color: #E91E63;
  --dark-text: #333;
  --light-text: #fff;
  --light-bg: #f5f5f5;
  --card-bg: #fff;
  --border-radius: 8px;
  --box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  --transition: all 0.3s ease;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Noto Sans KR', Arial, sans-serif;
  background-color: var(--light-bg);
  color: var(--dark-text);
  line-height: 1.6;
}

a {
  text-decoration: none;
  color: var(--primary-color);
}

ul {
  list-style-type: none;
}

.btn {
  display: inline-block;
  padding: 10px 20px;
  border-radius: var(--border-radius);
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
  border: none;
  text-align: center;
}

.btn-primary {
  background-color: var(--primary-color);
  color: var(--light-text);
}

.btn-primary:hover {
  background-color: #1565C0;
}

.btn-outline {
  background-color: transparent;
  border: 1px solid var(--primary-color);
  color: var(--primary-color);
}

.btn-outline:hover {
  background-color: var(--primary-color);
  color: var(--light-text);
}

.btn-large {
  padding: 12px 24px;
  font-size: 1.1rem;
}

.full-width {
  width: 100%;
}

.section-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 4rem 1rem;
}

/* 헤더 스타일 */
.home-header, .dashboard-header {
  background-color: var(--dark-text);
  color: var(--light-text);
  padding: 1rem 0;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo a {
  color: var(--light-text);
  font-size: 1.5rem;
  font-weight: 700;
}

.main-nav ul {
  display: flex;
  gap: 1.5rem;
}

.main-nav a {
  color: var(--light-text);
  transition: var(--transition);
}

.main-nav a:hover {
  color: var(--primary-color);
}

.auth-buttons {
  display: flex;
  gap: 1rem;
}

/* 히어로 섹션 */
.hero {
  background: linear-gradient(135deg, var(--primary-color), var(--fluid-medical-color));
  color: var(--light-text);
  text-align: center;
  padding: 5rem 1rem;
}

.hero-container {
  max-width: 800px;
  margin: 0 auto;
}

.hero h1 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.hero p {
  font-size: 1.2rem;
  margin-bottom: 2rem;
}

/* 카드 스타일 */
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2rem;
  margin-top: 2rem;
}

.card {
  background-color: var(--card-bg);
  border-radius: var(--border-radius);
  box-shadow: var(--box-shadow);
  padding: 2rem;
  transition: var(--transition);
}

.card:hover {
  transform: translateY(-5px);
}

.card-icon {
  font-size: 2rem;
  color: var(--primary-color);
  margin-bottom: 1rem;
}

.card h3 {
  margin-bottom: 0.5rem;
}

/* 특징 섹션 */
.features {
  background-color: var(--light-bg);
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  margin-top: 2rem;
}

.feature {
  display: flex;
  gap: 2rem;
  align-items: flex-start;
}

.feature-icon {
  font-size: 2rem;
  color: var(--primary-color);
  flex-shrink: 0;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(25, 118, 210, 0.1);
  border-radius: 50%;
}

.feature-content h3 {
  margin-bottom: 0.5rem;
}

/* 기술 소개 섹션 */
.technology {
  background-color: var(--card-bg);
}

.tech-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 2rem;
  margin-top: 2rem;
}

.tech-card {
  background-color: var(--light-bg);
  border-radius: var(--border-radius);
  padding: 1.5rem;
  transition: var(--transition);
}

.tech-card:hover {
  transform: translateY(-5px);
  box-shadow: var(--box-shadow);
}

.tech-card h3 {
  margin-bottom: 0.5rem;
  color: var(--primary-color);
}

/* 문의하기 섹션 */
.contact {
  background-color: var(--light-bg);
}

.contact-form {
  max-width: 600px;
  margin: 2rem auto 0;
  background-color: var(--card-bg);
  padding: 2rem;
  border-radius: var(--border-radius);
  box-shadow: var(--box-shadow);
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: var(--border-radius);
  font-family: inherit;
  font-size: 1rem;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--primary-color);
}

/* 푸터 스타일 */
.home-footer, .dashboard-footer {
  background-color: var(--dark-text);
  color: var(--light-text);
  padding: 3rem 0 1rem;
}

.footer-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

.footer-logo {
  margin-bottom: 2rem;
}

.footer-logo a {
  color: var(--light-text);
  font-size: 1.5rem;
  font-weight: 700;
}

.footer-links {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 2rem;
  margin-bottom: 2rem;
}

.footer-section h3 {
  margin-bottom: 1rem;
  color: var(--primary-color);
}

.footer-section ul li {
  margin-bottom: 0.5rem;
}

.footer-section a {
  color: var(--light-text);
  opacity: 0.8;
  transition: var(--transition);
}

.footer-section a:hover {
  opacity: 1;
  color: var(--primary-color);
}

.footer-bottom {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 1rem;
  text-align: center;
  opacity: 0.8;
}

/* 대시보드 레이아웃 */
.dashboard-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.dashboard-content {
  flex: 1;
  padding: 2rem 1rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.user-menu {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.username {
  display: none;
}

.dropdown {
  position: relative;
}

.dropdown-toggle {
  background: none;
  border: none;
  color: var(--light-text);
  font-size: 1.5rem;
  cursor: pointer;
}

.dropdown-menu {
  position: absolute;
  right: 0;
  top: 100%;
  background-color: var(--card-bg);
  border-radius: var(--border-radius);
  box-shadow: var(--box-shadow);
  width: 200px;
  z-index: 10;
  display: none;
}

.dropdown:hover .dropdown-menu {
  display: block;
}

.dropdown-menu a,
.dropdown-menu button {
  display: block;
  width: 100%;
  padding: 0.75rem 1rem;
  text-align: left;
  background: none;
  border: none;
  color: var(--dark-text);
  cursor: pointer;
  transition: var(--transition);
}

.dropdown-menu a:hover,
.dropdown-menu button:hover {
  background-color: var(--light-bg);
  color: var(--primary-color);
}

/* 인증 페이지 */
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--primary-color), var(--fluid-medical-color));
}

.auth-container {
  max-width: 500px;
  width: 100%;
  padding: 1rem;
}

.auth-card {
  background-color: var(--card-bg);
  border-radius: var(--border-radius);
  box-shadow: var(--box-shadow);
  padding: 2rem;
}

.auth-header {
  text-align: center;
  margin-bottom: 2rem;
}

.auth-header h2 {
  margin-bottom: 0.5rem;
}

.auth-form {
  margin-bottom: 1.5rem;
}

.error-message {
  background-color: rgba(211, 47, 47, 0.1);
  color: #D32F2F;
  padding: 1rem;
  border-radius: var(--border-radius);
  margin-bottom: 1.5rem;
}

.auth-footer {
  text-align: center;
}

/* 모바일 메뉴 버튼 */
.mobile-menu-button {
  display: none;
  flex-direction: column;
  justify-content: space-between;
  width: 30px;
  height: 20px;
  cursor: pointer;
}

.mobile-menu-button span {
  height: 2px;
  width: 100%;
  background-color: var(--light-text);
  border-radius: 2px;
}

/* 반응형 스타일 */
@media (max-width: 992px) {
  .username {
    display: none;
  }
  
  .feature {
    flex-direction: column;
    gap: 1rem;
  }
  
  .feature-icon {
    margin-right: 0;
  }
}

@media (max-width: 768px) {
  .mobile-menu-button {
    display: flex;
  }
  
  .main-nav {
    position: fixed;
    top: 60px;
    left: 0;
    width: 100%;
    background-color: var(--dark-text);
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease;
  }
  
  .main-nav.open {
    max-height: 300px;
  }
  
  .main-nav ul {
    flex-direction: column;
    gap: 0;
  }
  
  .main-nav li {
    width: 100%;
  }
  
  .main-nav a {
    display: block;
    padding: 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .hero h1 {
    font-size: 2rem;
  }
  
  .hero p {
    font-size: 1rem;
  }
  
  .auth-buttons {
    display: none;
  }
}