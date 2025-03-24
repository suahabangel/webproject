-- 데이터베이스 생성
CREATE DATABASE fluid_medical_system;
USE fluid_medical_system;

-- 1. 환자 테이블
CREATE TABLE patients (
    patient_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    birth_date DATE NOT NULL,
    gender ENUM('M', 'F', 'O') NOT NULL,
    blood_type VARCHAR(5),
    address VARCHAR(200),
    phone VARCHAR(20),
    email VARCHAR(100),
    emergency_contact VARCHAR(100),
    insurance_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. 의료 전문가 테이블
CREATE TABLE medical_professionals (
    professional_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    specialty VARCHAR(100) NOT NULL,
    license_number VARCHAR(50) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    department VARCHAR(50),
    position VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3. 약물 테이블
CREATE TABLE drugs (
    drug_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    generic_name VARCHAR(100),
    manufacturer VARCHAR(100),
    description TEXT,
    dosage_form VARCHAR(50),
    strength VARCHAR(50),
    route_of_administration VARCHAR(50),
    viscosity FLOAT, -- 약물의 점성 (유체역학 속성)
    density FLOAT,   -- 약물의 밀도 (유체역학 속성)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 4. 약물 상호작용 테이블
CREATE TABLE drug_interactions (
    interaction_id INT AUTO_INCREMENT PRIMARY KEY,
    drug_id_1 INT NOT NULL,
    drug_id_2 INT NOT NULL,
    interaction_type ENUM('Major', 'Moderate', 'Minor', 'None') NOT NULL,
    description TEXT,
    FOREIGN KEY (drug_id_1) REFERENCES drugs(drug_id),
    FOREIGN KEY (drug_id_2) REFERENCES drugs(drug_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 5. 진단 테이블
CREATE TABLE diagnoses (
    diagnosis_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    professional_id INT NOT NULL,
    diagnosis_date DATE NOT NULL,
    diagnosis_code VARCHAR(20),
    diagnosis_description TEXT,
    notes TEXT,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (professional_id) REFERENCES medical_professionals(professional_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 6. 처방전 테이블
CREATE TABLE prescriptions (
    prescription_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    professional_id INT NOT NULL,
    prescription_date DATE NOT NULL,
    status ENUM('Active', 'Completed', 'Cancelled') DEFAULT 'Active',
    notes TEXT,
    blockchain_hash VARCHAR(256), -- 블록체인 해시 저장
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (professional_id) REFERENCES medical_professionals(professional_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 7. 처방전 상세 테이블
CREATE TABLE prescription_details (
    detail_id INT AUTO_INCREMENT PRIMARY KEY,
    prescription_id INT NOT NULL,
    drug_id INT NOT NULL,
    dosage VARCHAR(50) NOT NULL,
    frequency VARCHAR(50) NOT NULL,
    duration VARCHAR(50),
    instructions TEXT,
    FOREIGN KEY (prescription_id) REFERENCES prescriptions(prescription_id),
    FOREIGN KEY (drug_id) REFERENCES drugs(drug_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 8. 약물 전달 시뮬레이션 결과 테이블
CREATE TABLE drug_delivery_simulations (
    simulation_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    drug_id INT NOT NULL,
    professional_id INT,
    simulation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    target_organ VARCHAR(50),
    injection_site VARCHAR(50),
    flow_rate FLOAT,
    reynolds_number FLOAT, -- 레이놀즈 수
    effective_viscosity FLOAT, -- 유효 점성도
    delivery_efficiency FLOAT, -- 전달 효율성 (%)
    simulation_data JSON, -- 시뮬레이션 상세 데이터
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (drug_id) REFERENCES drugs(drug_id),
    FOREIGN KEY (professional_id) REFERENCES medical_professionals(professional_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 9. 심혈관 시뮬레이션 결과 테이블
CREATE TABLE cardiovascular_simulations (
    simulation_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    professional_id INT,
    simulation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    blood_viscosity FLOAT, -- 혈액 점성도
    vessel_diameter FLOAT, -- 혈관 직경
    flow_rate FLOAT, -- 혈류 속도
    pressure_gradient FLOAT, -- 압력 구배
    oscillatory_shear_index FLOAT, -- 진동 전단 지수
    risk_assessment ENUM('Low', 'Medium', 'High') NOT NULL,
    simulation_data JSON, -- 시뮬레이션 상세 데이터
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (professional_id) REFERENCES medical_professionals(professional_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 10. 나비에-스톡스 시뮬레이션 결과 테이블
CREATE TABLE navier_stokes_simulations (
    simulation_id INT AUTO_INCREMENT PRIMARY KEY,
    simulation_type ENUM('Drug Delivery', 'Cardiovascular', 'General') NOT NULL,
    reference_id INT, -- 참조 ID (약물 전달 또는 심혈관 시뮬레이션 ID)
    simulation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    grid_resolution VARCHAR(20), -- 그리드 해상도
    time_steps INT, -- 시간 단계
    boundary_conditions TEXT, -- 경계 조건
    initial_conditions TEXT, -- 초기 조건
    convergence_criteria FLOAT, -- 수렴 기준
    execution_time FLOAT, -- 실행 시간 (초)
    vorticity_data JSON, -- 와도 데이터
    velocity_field_data JSON, -- 속도장 데이터
    pressure_field_data JSON, -- 압력장 데이터
    anomaly_detected BOOLEAN DEFAULT FALSE, -- 이상 감지 여부
    anomaly_description TEXT, -- 이상 설명
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 11. 사용자 계정 테이블
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    role ENUM('Admin', 'Doctor', 'Nurse', 'Pharmacist', 'Researcher', 'Patient') NOT NULL,
    related_id INT, -- 의사/환자 ID 참조
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 12. 액세스 로그 테이블
CREATE TABLE access_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50),
    resource_id INT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    request_details JSON,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- 13. 시스템 설정 테이블
CREATE TABLE system_settings (
    setting_id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(50) NOT NULL UNIQUE,
    setting_value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX idx_patients_name ON patients(last_name, first_name);
CREATE INDEX idx_drugs_name ON drugs(name);
CREATE INDEX idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX idx_prescriptions_date ON prescriptions(prescription_date);
CREATE INDEX idx_drug_delivery_simulations_patient ON drug_delivery_simulations(patient_id);
CREATE INDEX idx_cardiovascular_simulations_patient ON cardiovascular_simulations(patient_id);
CREATE INDEX idx_navier_stokes_simulations_type ON navier_stokes_simulations(simulation_type);
