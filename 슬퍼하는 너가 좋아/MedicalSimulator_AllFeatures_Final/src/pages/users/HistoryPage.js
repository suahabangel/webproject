
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const HistoryPage = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    if (!user?._id) return;
    fetch(`http://localhost:4000/api/simulations/${user._id}`)
      .then(res => res.json())
      .then(data => setLogs(data))
      .catch(err => console.error('히스토리 로딩 실패', err));
  }, [user]);

  return (
    <div style={{ maxWidth: 800, margin: '40px auto' }}>
      <h2>📂 내 시뮬레이션 히스토리</h2>
      {logs.length === 0 ? (
        <p>시뮬레이션 기록이 없습니다.</p>
      ) : (
        logs.map((log, idx) => (
          <div key={idx} style={{
            border: '1px solid #ccc', padding: '12px', marginBottom: '12px',
            borderRadius: '8px', background: '#f9f9f9'
          }}>
            <strong>질병:</strong> {log.scenario || '일반'}<br />
            <strong>SpO₂:</strong> {log.spo2}, HR: {log.hr}, RR: {log.rr}<br />
            <strong>FiO₂:</strong> {log.fio2}, 유량: {log.flow}<br />
            <strong>산소량:</strong> {(log.fio2 * log.flow).toFixed(2)} L/min<br />
            <strong>작성일:</strong> {new Date(log.createdAt).toLocaleString()}<br />
            <strong>의료진:</strong> {log.provider || '-'}<br />
            <strong>노트:</strong> {log.note || '-'}<br />
          </div>
        ))
      )}
    </div>
  );
};

export default HistoryPage;
