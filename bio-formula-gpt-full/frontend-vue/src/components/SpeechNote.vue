
import React, { useEffect, useState } from 'react';

const SpeechNote = () => {
  const [note, setNote] = useState('');
  const [listening, setListening] = useState(false);
  let recognition;

  if ('webkitSpeechRecognition' in window) {
    const SpeechRecognition = window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join('');
      setNote((prev) => prev + ' ' + transcript);
    };

    recognition.onerror = (e) => {
      console.error('🎙 음성 인식 오류:', e.error);
    };
  }

  const toggleListening = () => {
    if (!recognition) return;
    if (listening) {
      recognition.stop();
      setListening(false);
    } else {
      recognition.start();
      setListening(true);
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: '0 auto' }}>
      <h3>🎙 진료 메모 (음성 입력 지원)</h3>
      <textarea
        rows={6}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        style={{ width: '100%', marginBottom: 10 }}
        placeholder="여기에 음성으로 입력됩니다..."
      />
      <button onClick={toggleListening}>
        {listening ? '🛑 중지' : '🎤 음성 입력 시작'}
      </button>
    </div>
  );
};

export default SpeechNote;
