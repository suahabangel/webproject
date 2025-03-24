import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { getAuthToken, decodeToken } from './middleware/auth';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import HomePage from './pages/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import SimulationsPage from './pages/simulations/SimulationsPage';
import FluidSimulationDetailPage from './pages/simulations/FluidSimulationDetailPage';
import PatientsPage from './pages/patients/PatientsPage';
import PatientDetailPage from './pages/patients/PatientDetailPage';
import DrugsPage from './pages/drugs/DrugsPage';
import DrugDetailPage from './pages/drugs/DrugDetailPage';
import NotFoundPage from './pages/NotFoundPage';
import './App.css';

/**
 * 유체역학 기반 의료 시스템 애플리케이션 루트 컴포넌트
 * 라우터 설정, 인증 상태 관리, 보안 미들웨어 통합
 */
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // 사용자 인증 정보 확인
  useEffect(() => {
    const checkAuth = () => {
      const token = getAuthToken();
      if (token) {
        const decodedToken = decodeToken(token);
        if (decodedToken) {
          setUser(decodedToken);
        }
      }
      setLoading(false);
    };
    
    checkAuth();
  }, []);
  
  // 권한에 따른 경로 보호 컴포넌트
  const ProtectedRoute = ({ element, requiredRoles, redirectPath = '/login' }) => {
    if (loading) {
      return <div className="loading-screen">Loading...</div>;
    }
    
    if (!user) {
      return <Navigate to={redirectPath} replace />;
    }
    
    if (requiredRoles && !requiredRoles.includes(user.role)) {
      return <Navigate to="/unauthorized" replace />;
    }
    
    return element;
  };
  
  return (
    <Router>
      <div className="app">
        <Navbar user={user} setUser={setUser} />
        <main className="main-content">
          <Routes>
            {/* 공개 경로 */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage setUser={setUser} />} />
            <Route path="/register" element={<RegisterPage />} />
            
            {/* 보호된 경로 */}
            <Route 
              path="/simulations" 
              element={
                <ProtectedRoute 
                  element={<SimulationsPage />} 
                  requiredRoles={['admin', 'doctor', 'researcher']} 
                />
              } 
            />
            <Route 
              path="/simulations/:id" 
              element={
                <ProtectedRoute 
                  element={<FluidSimulationDetailPage />} 
                  requiredRoles={['admin', 'doctor', 'researcher']} 
                />
              } 
            />
            
            {/* 추가된 유체 시뮬레이션 라우트 */}
            <Route 
              path="/dashboard/simulations/fluid" 
              element={
                <ProtectedRoute 
                  element={<SimulationsPage type="fluid" />} 
                  requiredRoles={['admin', 'doctor', 'researcher']} 
                />
              } 
            />
            <Route 
              path="/dashboard/simulations/fluid/:id" 
              element={
                <ProtectedRoute 
                  element={<FluidSimulationDetailPage />} 
                  requiredRoles={['admin', 'doctor', 'researcher']} 
                />
              } 
            />
            
            <Route 
              path="/patients" 
              element={
                <ProtectedRoute 
                  element={<PatientsPage />} 
                  requiredRoles={['admin', 'doctor']} 
                />
              } 
            />
            <Route 
              path="/patients/:id" 
              element={
                <ProtectedRoute 
                  element={<PatientDetailPage />} 
                  requiredRoles={['admin', 'doctor']} 
                />
              } 
            />
            
            <Route 
              path="/drugs" 
              element={
                <ProtectedRoute 
                  element={<DrugsPage />} 
                  requiredRoles={['admin', 'doctor', 'researcher']} 
                />
              } 
            />
            <Route 
              path="/drugs/:id" 
              element={
                <ProtectedRoute 
                  element={<DrugDetailPage />} 
                  requiredRoles={['admin', 'doctor', 'researcher']} 
                />
              } 
            />
            
            {/* 에러 처리 경로 */}
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

// 권한 없음 페이지
const UnauthorizedPage = () => {
  return (
    <div className="error-page unauthorized">
      <h1>접근 권한이 없습니다</h1>
      <p>요청한 페이지에 접근할 권한이 없습니다.</p>
      <p>필요한 권한이 있는지 확인하거나 시스템 관리자에게 문의하세요.</p>
    </div>
  );
};

export default App;