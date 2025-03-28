
import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:4000');

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [msg, setMsg] = useState('');
  const [name, setName] = useState('의료진');

  useEffect(() => {
    socket.on('chat-message', (data) => {
      setMessages((prev) => [...prev, data]);
    });

    return () => socket.disconnect();
  }, []);

  const sendMessage = () => {
    if (!msg.trim()) return;
    socket.emit('chat-message', { name, message: msg });
    setMessages((prev) => [...prev, { name, message: msg }]);
    setMsg('');
  };

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: 20 }}>
      <h2>💬 실시간 의료진 채팅</h2>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="닉네임"
        style={{ marginBottom: 10, padding: 6 }}
      />
      <div style={{ height: 300, overflowY: 'scroll', border: '1px solid #ccc', padding: 10, marginBottom: 10 }}>
        {messages.map((m, idx) => (
          <div key={idx}><strong>{m.name}:</strong> {m.message}</div>
        ))}
      </div>
      <input
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        placeholder="메시지 입력"
        style={{ width: '80%', padding: 6 }}
      />
      <button onClick={sendMessage} style={{ padding: 6, marginLeft: 10 }}>전송</button>
    </div>
  );
}
