// src/components/simulations/FluidSimulation.js
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const FluidSimulation = () => {
  const canvasRef = useRef(null);
  const [isSimulating, setIsSimulating] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedNode, setSelectedNode] = useState(null);
  const [threatLevel, setThreatLevel] = useState('중간');
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());
  
  // 샘플 보안 노드 데이터
  const securityNodes = [
    { id: 1, name: '환자 데이터베이스', type: 'db', status: 'normal', x: 200, y: 150, size: 40 },
    { id: 2, name: '의료영상 시스템(PACS)', type: 'storage', status: 'warning', x: 400, y: 100, size: 35 },
    { id: 3, name: '전자의무기록(EMR)', type: 'app', status: 'critical', x: 300, y: 250, size: 45 },
    { id: 4, name: '처방 시스템', type: 'app', status: 'normal', x: 500, y: 200, size: 30 },
    { id: 5, name: '검사결과 저장소', type: 'storage', status: 'normal', x: 150, y: 300, size: 35 },
    { id: 6, name: '의료장비 네트워크', type: 'network', status: 'warning', x: 450, y: 300, size: 40 },
    { id: 7, name: '원격진료 서버', type: 'server', status: 'normal', x: 600, y: 150, size: 35 },
  ];

  // 유체역학 시뮬레이션을 위한 입자 상태
  const [particles, setParticles] = useState([]);
  
  // 위협 트래픽 데이터
  const threatTraffic = [
    { source: 2, target: 3, intensity: 0.7, color: '#ffbb33' },
    { source: 6, target: 1, intensity: 0.9, color: '#ff4444' },
    { source: 7, target: 4, intensity: 0.5, color: '#ffbb33' },
  ];
  
  // 시뮬레이션 초기화
  useEffect(() => {
    // 초기 입자 생성
    const initialParticles = [];
    for (let i = 0; i < 200; i++) {
      initialParticles.push({
        id: i,
        x: Math.random() * 800,
        y: Math.random() * 500,
        vx: Math.random() * 2 - 1,
        vy: Math.random() * 2 - 1,
        radius: Math.random() * 3 + 1,
        color: `rgba(75, 29, 149, ${Math.random() * 0.7 + 0.3})`,
        life: Math.random() * 100 + 100
      });
    }
    setParticles(initialParticles);
    
    // 위협 입자 생성
    threatTraffic.forEach(threat => {
      const source = securityNodes.find(node => node.id === threat.source);
      const target = securityNodes.find(node => node.id === threat.target);
      
      if (source && target) {
        for (let i = 0; i < 20 * threat.intensity; i++) {
          initialParticles.push({
            id: initialParticles.length + i,
            x: source.x + (Math.random() * 30 - 15),
            y: source.y + (Math.random() * 30 - 15),
            vx: (target.x - source.x) * 0.01 * threat.intensity,
            vy: (target.y - source.y) * 0.01 * threat.intensity,
            radius: Math.random() * 2 + 2,
            color: threat.color,
            life: Math.random() * 200 + 100,
            isThreat: true
          });
        }
      }
    });
  }, []);
  
  // 렌더링 루프
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    
    // 캔버스 크기 설정
    const setCanvasDimensions = () => {
      const container = canvas.parentNode;
      canvas.width = container.clientWidth;
      canvas.height = 500;
    };
    
    setCanvasDimensions();
    window.addEventListener('resize', setCanvasDimensions);
    
    // 시뮬레이션 스텝
    const step = () => {
      if (!isSimulating) {
        animationFrameId = requestAnimationFrame(step);
        return;
      }
      
      // 캔버스 지우기
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 배경 그리드 그리기
      drawGrid(ctx, canvas.width, canvas.height);
      
      // 노드 간 연결선 그리기
      drawConnections(ctx);
      
      // 노드 그리기
      drawNodes(ctx);
      
      // 입자 업데이트 및 그리기
      updateParticles(ctx);
      
      // 선택된 노드 정보 표시
      if (selectedNode) {
        drawNodeInfo(ctx, selectedNode);
      }
      
      animationFrameId = requestAnimationFrame(step);
    };
    
    const drawGrid = (ctx, width, height) => {
      ctx.save();
      ctx.strokeStyle = 'rgba(200, 200, 200, 0.2)';
      ctx.lineWidth = 1;
      
      // 수평선
      for (let y = 0; y < height; y += 25) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      
      // 수직선
      for (let x = 0; x < width; x += 25) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      ctx.restore();
    };
    
    const drawConnections = (ctx) => {
      ctx.save();
      ctx.globalAlpha = 0.5;
      
      // 일반 연결
      ctx.strokeStyle = '#6d28d9';
      ctx.lineWidth = 1;
      
      for (let i = 0; i < securityNodes.length; i++) {
        for (let j = i + 1; j < securityNodes.length; j++) {
          if ((i + j) % 3 === 0) { // 임의의 연결 패턴
            ctx.beginPath();
            ctx.moveTo(securityNodes[i].x, securityNodes[i].y);
            ctx.lineTo(securityNodes[j].x, securityNodes[j].y);
            ctx.stroke();
          }
        }
      }
      
      // 위협 트래픽 연결
      ctx.lineWidth = 2;
      
      threatTraffic.forEach(threat => {
        const source = securityNodes.find(node => node.id === threat.source);
        const target = securityNodes.find(node => node.id === threat.target);
        
        if (source && target) {
          // 그라데이션 생성
          const gradient = ctx.createLinearGradient(source.x, source.y, target.x, target.y);
          gradient.addColorStop(0, threat.color);
          gradient.addColorStop(1, `rgba(${parseInt(threat.color.slice(1, 3), 16)}, ${parseInt(threat.color.slice(3, 5), 16)}, ${parseInt(threat.color.slice(5, 7), 16)}, 0.3)`);
          
          ctx.strokeStyle = gradient;
          ctx.globalAlpha = 0.7;
          
          ctx.beginPath();
          ctx.moveTo(source.x, source.y);
          ctx.lineTo(target.x, target.y);
          ctx.stroke();
          
          // 화살표 그리기
          drawArrow(ctx, source.x, source.y, target.x, target.y, threat.color);
        }
      });
      
      ctx.restore();
    };
    
    const drawArrow = (ctx, fromX, fromY, toX, toY, color) => {
      const headLen = 10;
      const dx = toX - fromX;
      const dy = toY - fromY;
      const angle = Math.atan2(dy, dx);
      
      // 화살표 위치 조정 (끝에서 약간 앞으로)
      const arrowX = toX - Math.cos(angle) * 25;
      const arrowY = toY - Math.sin(angle) * 25;
      
      ctx.save();
      ctx.fillStyle = color;
      
      ctx.beginPath();
      ctx.moveTo(arrowX, arrowY);
      ctx.lineTo(arrowX - headLen * Math.cos(angle - Math.PI / 6), arrowY - headLen * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(arrowX - headLen * Math.cos(angle + Math.PI / 6), arrowY - headLen * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();
      
      ctx.restore();
    };
    
    const drawNodes = (ctx) => {
      securityNodes.forEach(node => {
        ctx.save();
        
        // 노드 바디
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size * zoomLevel, 0, Math.PI * 2);
        
        // 노드 상태에 따른 색상
        let fillColor;
        switch (node.status) {
          case 'critical':
            fillColor = 'rgba(220, 38, 38, 0.8)';
            break;
          case 'warning':
            fillColor = 'rgba(245, 158, 11, 0.8)';
            break;
          default:
            fillColor = 'rgba(79, 70, 229, 0.8)';
        }
        
        // 선택된 노드 강조
        if (selectedNode && selectedNode.id === node.id) {
          ctx.shadowColor = fillColor;
          ctx.shadowBlur = 15;
          ctx.lineWidth = 3;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();
        }
        
        ctx.fillStyle = fillColor;
        ctx.fill();
        
        // 노드 아이콘
        ctx.fillStyle = '#ffffff';
        ctx.font = `${Math.max(12, 14 * zoomLevel)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        let icon;
        switch (node.type) {
          case 'db':
            icon = '🗄️';
            break;
          case 'storage':
            icon = '💾';
            break;
          case 'app':
            icon = '📱';
            break;
          case 'network':
            icon = '🌐';
            break;
          case 'server':
            icon = '🖥️';
            break;
          default:
            icon = '📊';
        }
        
        ctx.fillText(icon, node.x, node.y);
        
        // 노드 라벨
        if (zoomLevel >= 0.8) {
          ctx.font = '12px sans-serif';
          ctx.fillStyle = '#1f2937';
          ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
          ctx.shadowBlur = 4;
          ctx.fillText(node.name, node.x, node.y + node.size * zoomLevel + 15);
        }
        
        ctx.restore();
      });
    };
    
    const updateParticles = (ctx) => {
      const updatedParticles = [];
      
      particles.forEach(particle => {
        if (particle.life <= 0) return;
        
        // 입자 위치 업데이트
        particle.x += particle.vx;
        particle.y += particle.vy;
        
        // 경계에서 반사
        if (particle.x <= 0 || particle.x >= canvas.width) {
          particle.vx *= -0.8;
        }
        if (particle.y <= 0 || particle.y >= canvas.height) {
          particle.vy *= -0.8;
        }
        
        // 노드 주변에서 속도 변화 (유체 효과)
        securityNodes.forEach(node => {
          const dx = node.x - particle.x;
          const dy = node.y - particle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < node.size * 2) {
            // 노드 주변에서 속도 변경
            const repelFactor = node.status === 'critical' ? 0.03 : 0.01;
            particle.vx -= dx * repelFactor / distance;
            particle.vy -= dy * repelFactor / distance;
            
            // 위협 노드 주변에서 입자 색상 변경
            if (node.status === 'critical' || node.status === 'warning') {
              if (!particle.isThreat && Math.random() > 0.9) {
                const statusColor = node.status === 'critical' ? '#ef4444' : '#f59e0b';
                particle.color = `${statusColor}${Math.floor(Math.random() * 50 + 30).toString(16)}`;
              }
            }
          }
        });
        
        // 속도 제한
        const speed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
        if (speed > 2) {
          particle.vx = (particle.vx / speed) * 2;
          particle.vy = (particle.vy / speed) * 2;
        }
        
        // 약간의 무작위 움직임 추가
        particle.vx += (Math.random() - 0.5) * 0.1;
        particle.vy += (Math.random() - 0.5) * 0.1;
        
        // 입자 그리기
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius * zoomLevel, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.fill();
        
        // 꼬리 효과 (위협 입자만)
        if (particle.isThreat && particle.life > 50) {
          ctx.beginPath();
          ctx.moveTo(particle.x, particle.y);
          ctx.lineTo(particle.x - particle.vx * 5, particle.y - particle.vy * 5);
          ctx.strokeStyle = particle.color;
          ctx.globalAlpha = 0.4;
          ctx.lineWidth = particle.radius * 0.8;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        
        // 수명 감소
        particle.life -= 1;
        
        if (particle.life > 0) {
          updatedParticles.push(particle);
        }
      });
      
      // 새 입자 추가 (일정 수 유지)
      const diff = 200 - updatedParticles.length;
      for (let i = 0; i < diff; i++) {
        updatedParticles.push({
          id: updatedParticles.length + i,
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: Math.random() * 2 - 1,
          vy: Math.random() * 2 - 1,
          radius: Math.random() * 3 + 1,
          color: `rgba(75, 29, 149, ${Math.random() * 0.7 + 0.3})`,
          life: Math.random() * 100 + 100
        });
      }
      
      // 위협 소스에서 새 위협 입자 생성
      threatTraffic.forEach(threat => {
        const source = securityNodes.find(node => node.id === threat.source);
        const target = securityNodes.find(node => node.id === threat.target);
        
        if (source && target && Math.random() < threat.intensity * 0.1) {
          updatedParticles.push({
            id: updatedParticles.length,
            x: source.x + (Math.random() * 20 - 10),
            y: source.y + (Math.random() * 20 - 10),
            vx: (target.x - source.x) * 0.01 * threat.intensity,
            vy: (target.y - source.y) * 0.01 * threat.intensity,
            radius: Math.random() * 2 + 2,
            color: threat.color,
            life: Math.random() * 200 + 100,
            isThreat: true
          });
        }
      });
      
      setParticles(updatedParticles);
    };
    
    const drawNodeInfo = (ctx, node) => {
      const infoWidth = 220;
      const infoHeight = 150;
      let x = node.x + 30;
      let y = node.y - 20;
      
      // 화면 경계 확인
      if (x + infoWidth > canvas.width) {
        x = node.x - infoWidth - 30;
      }
      if (y + infoHeight > canvas.height) {
        y = canvas.height - infoHeight - 10;
      }
      if (y < 10) {
        y = 10;
      }
      
      ctx.save();
      
      // 배경
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.beginPath();
      roundRect(ctx, x, y, infoWidth, infoHeight, 8);
      ctx.fill();
      
      // 테두리
      ctx.strokeStyle = node.status === 'critical' ? '#ef4444' : 
                        node.status === 'warning' ? '#f59e0b' : '#4f46e5';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // 헤더
      ctx.fillStyle = node.status === 'critical' ? '#ef4444' : 
                      node.status === 'warning' ? '#f59e0b' : '#4f46e5';
      ctx.beginPath();
      roundRect(ctx, x, y, infoWidth, 30, [8, 8, 0, 0]);
      ctx.fill();
      
      // 제목
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.name, x + 10, y + 15);
      
      // 상태 텍스트
      const statusText = node.status === 'critical' ? '심각' : 
                         node.status === 'warning' ? '경고' : '정상';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(statusText, x + infoWidth - 10, y + 15);
      
      // 컨텐츠
      ctx.fillStyle = '#1f2937';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'left';
      
      const contentY = y + 45;
      const lineHeight = 22;
      
      ctx.fillText(`유형: ${getNodeTypeName(node.type)}`, x + 12, contentY);
      ctx.fillText(`접근 권한: 4개 부서, 12명 사용자`, x + 12, contentY + lineHeight);
      ctx.fillText(`현재 접속: ${Math.floor(Math.random() * 8) + 1}명`, x + 12, contentY + lineHeight * 2);
      
      // 위협 상태 바
      const barWidth = infoWidth - 24;
      const barHeight = 8;
      const barX = x + 12;
      const barY = contentY + lineHeight * 3 + 5;
      
      // 배경 바
      ctx.fillStyle = '#e5e7eb';
      ctx.beginPath();
      roundRect(ctx, barX, barY, barWidth, barHeight, 4);
      ctx.fill();
      
      // 위협 레벨 바
      const threatWidth = node.status === 'critical' ? barWidth * 0.9 : 
                          node.status === 'warning' ? barWidth * 0.6 : 
                          barWidth * 0.15;
      
      const threatColor = node.status === 'critical' ? '#ef4444' : 
                          node.status === 'warning' ? '#f59e0b' : 
                          '#10b981';
      
      ctx.fillStyle = threatColor;
      ctx.beginPath();
      roundRect(ctx, barX, barY, threatWidth, barHeight, 4);
      ctx.fill();
      
      ctx.fillStyle = '#1f2937';
      ctx.fillText(`위협 수준: ${node.status === 'critical' ? '높음' : 
                                node.status === 'warning' ? '중간' : '낮음'}`, 
                   x + 12, barY + barHeight + 15);
      
      ctx.restore();
    };
    
    // roundRect 함수 폴리필 (CanvasRenderingContext2D에 있지 않을 수 있음)
    const roundRect = (ctx, x, y, width, height, radius) => {
      if (typeof radius === 'number') {
        radius = {tl: radius, tr: radius, br: radius, bl: radius};
      } else if (Array.isArray(radius)) {
        if (radius.length === 4) {
          radius = {tl: radius[0], tr: radius[1], br: radius[2], bl: radius[3]};
        } else if (radius.length === 2) {
          radius = {tl: radius[0], tr: radius[0], br: radius[1], bl: radius[1]};
        } else {
          radius = {tl: radius[0], tr: radius[0], br: radius[0], bl: radius[0]};
        }
      } else {
        radius = {tl: 0, tr: 0, br: 0, bl: 0};
      }
      
      ctx.beginPath();
      ctx.moveTo(x + radius.tl, y);
      ctx.lineTo(x + width - radius.tr, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
      ctx.lineTo(x + width, y + height - radius.br);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
      ctx.lineTo(x + radius.bl, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
      ctx.lineTo(x, y + radius.tl);
      ctx.quadraticCurveTo(x, y, x + radius.tl, y);
      ctx.closePath();
    };
    
    const getNodeTypeName = (type) => {
      switch (type) {
        case 'db': return '데이터베이스';
        case 'storage': return '저장소';
        case 'app': return '애플리케이션';
        case 'network': return '네트워크';
        case 'server': return '서버';
        default: return '기타';
      }
    };
    
    // 캔버스 클릭 이벤트
    const handleCanvasClick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // 노드 선택 체크
      let clickedNode = null;
      securityNodes.forEach(node => {
        const distance = Math.sqrt(Math.pow(x - node.x, 2) + Math.pow(y - node.y, 2));
        if (distance <= node.size) {
          clickedNode = node;
        }
      });
      
      setSelectedNode(clickedNode);
    };
    
    canvas.addEventListener('click', handleCanvasClick);
    
    // 시뮬레이션 시작
    step();
    
    // 클린업
    return () => {
      window.removeEventListener('resize', setCanvasDimensions);
      canvas.removeEventListener('click', handleCanvasClick);
      cancelAnimationFrame(animationFrameId);
    };
  }, [securityNodes, selectedNode, isSimulating, zoomLevel, particles]);
  
  // 줌인/줌아웃 처리
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.2, 2));
  };
  
  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.6));
  };
  
  // 시뮬레이션 제어
  const toggleSimulation = () => {
    setIsSimulating(prev => !prev);
  };
  
  // 새로고침
  const handleRefresh = () => {
    setLastUpdated(new Date().toLocaleTimeString());
    // 실제로는 데이터를 새로고침하는 API를 호출
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* 헤더 */}
      <div className="simulation-header">
        <div className="header-title">
          <i className="fas fa-shield-alt"></i>
          <h2>유체역학 기반 의료정보 위협 시각화</h2>
        </div>
        <div className="header-controls">
          <span>위협 수준:</span>
          <select 
            className="threat-level-select"
            value={threatLevel}
            onChange={(e) => setThreatLevel(e.target.value)}
          >
            <option value="높음">높음</option>
            <option value="중간">중간</option>
            <option value="낮음">낮음</option>
          </select>
        </div>
      </div>
      
      {/* 툴바 */}
      <div className="simulation-toolbar">
        <div className="toolbar-left">
          <button 
            className="toolbar-button"
            onClick={toggleSimulation}
          >
            <i className={`fas fa-${isSimulating ? 'pause' : 'play'}`}></i>
            <span>{isSimulating ? '일시정지' : '재생'}</span>
          </button>
          
          <div className="info-stats">
            <div className="info-stat">
              <span>보호된 노드:</span>
              <span className="stat-value">{securityNodes.filter(n => n.status === 'normal').length}/{securityNodes.length}</span>
            </div>
            <div className="info-stat">
              <span>활성 위협:</span>
              <span className="stat-value warning">{threatTraffic.length}</span>
            </div>
            <div className="info-stat">
              <span>비정상 트래픽 흐름:</span>
              <span className="stat-value critical">{particles.filter(p => p.isThreat).length}</span>
            </div>
          </div>
          <div className="info-footer">
            <p>
              {selectedNode ? 
                '노드를 클릭하여 상세 정보를 확인하세요.' : 
                '유체역학 패턴 분석으로 비정상 접근 및 데이터 흐름을 감지합니다.'}
            </p>
          </div className="zoom-controls">
            <button
              className="toolbar-button"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 0.6}
            >
              <i className="fas fa-search-minus"></i>
            </button>
            <span>{Math.round(zoomLevel * 100)}%</span>
            <button
              className="toolbar-button"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 2}
            >
              <i className="fas fa-search-plus"></i>
            </button>
          </div>
        </div>
        
        <div className="toolbar-right">
          <span className="update-time">마지막 업데이트: {lastUpdated}</span>
          <button 
            className="toolbar-button"
            onClick={handleRefresh}
          >
            <i className="fas fa-sync-alt"></i>
            <span>새로고침</span>
          </button>
          
          <button className="toolbar-button">
            <i className="fas fa-download"></i>
            <span>내보내기</span>
          </button>
        </div>
      </div>
      
      {/* 시각화 영역 */}
      <div className="simulation-canvas-container">
        <canvas ref={canvasRef} className="simulation-canvas"></canvas>
        
        {/* 범례 */}
        <div className="simulation-legend">
          <h3>범례</h3>
          <div className="legend-items">
            <div className="legend-item">
              <div className="legend-color normal"></div>
              <span>정상 노드</span>
            </div>
            <div className="legend-item">
              <div className="legend-color warning"></div>
              <span>경고 상태</span>
            </div>
            <div className="legend-item">
              <div className="legend-color critical"></div>
              <span>위험 상태</span>
            </div>
            <div className="legend-item">
              <div className="legend-line"></div>
              <span>위협 경로</span>
            </div>
          </div>
        </div>
        
        {/* 정보 패널 */}
        <div className="simulation-info-panel">
          <h3>의료정보 보안 상태</h3>
          <div