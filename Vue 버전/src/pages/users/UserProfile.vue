
import React from 'react';
import { useAuth } from '../../context/AuthContext';

const UserProfile = () => {
  const { user, logout } = useAuth();

  if (!user) return <p>로그인 상태가 아닙니다.</p>;

  return (
    <div className="profile-card">
      <h2>👤 사용자 정보</h2>
      <p><strong>이름:</strong> {user.name}</p>
      <p><strong>역할:</strong> {user.role}</p>
      <button onClick={logout}>로그아웃</button>
    </div>
  );
};

export default UserProfile;
