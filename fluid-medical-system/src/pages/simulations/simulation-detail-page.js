// src/pages/simulations/FluidSimulationDetailPage.js
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import FluidSimulation from '../../components/simulations/FluidSimulation';
import '../../components/simulations/FluidSimulation.css';

const FluidSimulationDetailPage = () => {
  const { id } = useParams();
  const [simulation, setSimulation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('visualization');

  useEffect(() => {
    const fetchSimulationData = async () => {
      try {
        setLoading(true);
        
        // 시뮬레이션 결과 가져오기
        const response = await api.get(`/simulations/fluid/${id}`);
        setSimulation(response.data);
        
        setLoading(false);
      } catch (error) {
        console.error('시뮬레이션 데이터 로드 오류:', error);
        setLoading(false);
      }
    };
    
    fetchSimulationData();
  }, [id]);

  // 로딩 중 상태 표시
  if (loading) {
    return <div className="loading">시뮬레이션 데이터를 불러오는 중...</div>;
  }

  // 시뮬레이션 데이터가 없는 경우
  if (!simulation) {
    return <div className="error-message">시뮬레이션 데이터를 찾을 수 없습니다.</div>;
  }

  return (
    <div className="simulation-detail-page">
      <header className="page-header">
        <div className="breadcrumbs">
          <Link to="/dashboard/simulations">시뮬레이션</Link> &gt; 
          <Link to="/dashboard/simulations/fluid">유체역학 시뮬레이션</Link> &gt; 
          {id}
        </div>
        <h1>유체역학 기반 의료정보 보안 시뮬레이션</h1>
      </header>
      
      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === 'visualization' ? 'active' : ''}`}
          onClick={() => setActiveTab('visualization')}
        >
          데이터 시각화
        </button>
        <button
          className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          분석 보고서
        </button>
        <button
          className={`tab-btn ${activeTab === 'equations' ? 'active' : ''}`}
          onClick={() => setActiveTab('equations')}
        >
          수학적 모델
        </button>
      </div>
      
      <div className="tab-content">
        {activeTab === 'visualization' && (
          <div className="tab-pane">
            <FluidSimulation />
          </div>
        )}
        
        {activeTab === 'analytics' && (
          <div className="tab-pane">
            <div className="analytics-container">
              <div className="analytics-card">
                <h3>보안 위협 요약</h3>
                <div className="analytics-content">
                  <p>이 시뮬레이션에서는 유체역학 모델을 사용하여 의료 시스템 내의 데이터 흐름을 분석하고 잠재적인 보안 취약점을 식별했습니다.</p>
                  
                  <div className="analytics-stats">
                    <div className="stat-item">
                      <div className="stat-label">감지된 위협</div>
                      <div className="stat-value">{simulation.threatCount || 3}</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-label">위험 수준</div>
                      <div className="stat-value threat-medium">{simulation.riskLevel || '중간'}</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-label">영향받는 시스템</div>
                      <div className="stat-value">{simulation.affectedSystems || 2}</div>
                    </div>
                  </div>
                  
                  <h4>주요 발견사항</h4>
                  <ul className="findings-list">
                    <li>환자 데이터베이스와 의료영상 시스템 간의 비정상적인 데이터 흐름 패턴이 감지되었습니다.</li>
                    <li>전자의무기록 시스템에서 예상치 못한 와류 패턴이 관찰되었으며, 이는 잠재적인 데이터 유출 시도를 나타낼 수 있습니다.</li>
                    <li>의료장비 네트워크에서 발생하는 높은 레이놀즈 수는 비정상적인 네트워크 활동을 나타냅니다.</li>
                  </ul>
                </div>
              </div>
              
              <div className="analytics-card">
                <h3>유체역학 패턴 분석</h3>
                <div className="analytics-content">
                  <p>나비에-스톡스 방정식을 기반으로 하는 유체역학 모델은 의료 시스템 내의 데이터 흐름 패턴을 정확하게 식별합니다.</p>
                  
                  <div className="pattern-items">
                    <div className="pattern-item">
                      <h4>와류 형성</h4>
                      <p>EMR 시스템 주변에서 감지된 와류 패턴은 데이터가 원래의 목적지 외에 다른 곳으로 전송되고 있음을 나타냅니다.</p>
                      <div className="pattern-metrics">
                        <div className="metric">
                          <span className="metric-label">와도 강도</span>
                          <span className="metric-value">{simulation.vorticityIntensity || '0.78'}</span>
                        </div>
                        <div className="metric">
                          <span className="metric-label">회전 방향</span>
                          <span className="metric-value">{simulation.rotationDirection || '반시계방향'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pattern-item">
                      <h4>난류 패턴</h4>
                      <p>의료장비 네트워크에서 감지된 난류 패턴은 기기가 잠재적으로 악의적인 명령을 수신하고 있음을 나타냅니다.</p>
                      <div className="pattern-metrics">
                        <div className="metric">
                          <span className="metric-label">레이놀즈 수</span>
                          <span className="metric-value">{simulation.reynoldsNumber || '4580'}</span>
                        </div>
                        <div className="metric">
                          <span className="metric-label">지속 시간</span>
                          <span className="metric-value">{simulation.turbulenceDuration || '28분'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'equations' && (
          <div className="tab-pane">
            <div className="equations-container">
              <div className="equation-card">
                <h3>나비에-스톡스 방정식</h3>
                <div className="equation-content">
                  <p>데이터 흐름을 모델링하기 위해 다음과 같은 나비에-스톡스 방정식을 사용합니다:</p>
                  
                  <div className="equation">
                    <p>ρ(∂u/∂t + u·∇u) = -∇p + μ∇²u + F</p>
                  </div>
                  
                  <div className="equation-description">
                    <p>여기서:</p>
                    <ul>
                      <li>ρ: 데이터 밀도 (정보의 중요도에 비례)</li>
                      <li>u: 데이터 흐름 속도 벡터</li>
                      <li>p: 네트워크 압력 (시스템 부하)</li>
                      <li>μ: 데이터 점성 (데이터 보안 정책의 엄격성)</li>
                      <li>F: 외부 힘 (사용자 활동, API 호출 등)</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="equation-card">
                <h3>정보 와도 지수 (IVI)</h3>
                <div className="equation-content">
                  <p>정보 흐름의 회전 패턴을 측정하기 위한 지표로, 비정상적인 데이터 접근 패턴을 감지합니다:</p>
                  
                  <div className="equation">
                    <p>ω = ∇ × u</p>
                  </div>
                  
                  <p>정보 와도 지수가 임계값을 초과하면 잠재적인 보안 위협으로 플래그가 지정됩니다.</p>
                  
                  <div className="threshold-info">
                    <div className="threshold-item">
                      <span className="threshold-label">안전 임계값:</span>
                      <span className="threshold-value">&lt; 0.3</span>
                    </div>
                    <div className="threshold-item">
                      <span className="threshold-label">경고 임계값:</span>
                      <span className="threshold-value">0.3 - 0.7</span>
                    </div>
                    <div className="threshold-item">
                      <span className="threshold-label">위험 임계값:</span>
                      <span className="threshold-value">&gt; 0.7</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="equation-card">
                <h3>보안 확산 모델</h3>
                <div className="equation-content">
                  <p>정보 유출 가능성을 예측하기 위한 확산 방정식:</p>
                  
                  <div className="equation">
                    <p>∂c/∂t = D∇²c - v·∇c + R</p>
                  </div>
                  
                  <div className="equation-description">
                    <p>여기서:</p>
                    <ul>
                      <li>c: 정보 농도</li>
                      <li>D: 확산 계수 (시스템 취약성에 비례)</li>
                      <li>v: 정보 이동 속도</li>
                      <li>R: 소스/싱크 항 (정보 생성 또는 소비)</li>
                    </ul>
                  </div>
                  
                  <p>이 모델은 특정 시스템의 경계를 넘어 정보가 얼마나 빨리 확산될 수 있는지를 예측합니다.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FluidSimulationDetailPage;
