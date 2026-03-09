import React, { useState, useRef, useEffect } from 'react';
import './App.css';

const App = () => {
  const [transcript, setTranscript] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  const outputBoxRef = useRef(null);

  useEffect(() => {
    if (outputBoxRef.current) {
      outputBoxRef.current.scrollTop = outputBoxRef.current.scrollHeight;
    }
  }, [transcript]);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('このブラウザは音声認識に対応していません（Chrome / Edgeを使ってください）');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ja-JP';
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const finalText = result[0].transcript.trim();
          setTranscript((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.type === 'interim') {
              return [...prev.slice(0, -1), { type: 'final', text: finalText }, { type: 'break' }];
            }
            return [...prev, { type: 'final', text: finalText }, { type: 'break' }];
          });
        } else {
          interim += result[0].transcript;
        }
      }
      if (interim) {
        setTranscript((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.type === 'interim') {
            return [...prev.slice(0, -1), { type: 'interim', text: interim }];
          }
          return [...prev, { type: 'interim', text: interim }];
        });
      }
    };

    recognition.onerror = (event) => {
      if (event.error !== 'no-speech') {
        console.error('音声認識エラー:', event.error);
      }
    };

    recognition.onend = () => {
      if (isListeningRef.current) {
        recognition.start();
      }
    };

    recognitionRef.current = recognition;
    isListeningRef.current = true;
    recognition.start();
    setIsListening(true);
  };

  const stopListening = () => {
    isListeningRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setTranscript((prev) => prev.filter((item) => item.type !== 'interim'));
    setIsListening(false);
  };

  const saveAsTextFile = () => {
    const text = transcript
      .map((item) => {
        if (item.type === 'final') return item.text;
        if (item.type === 'break') return '\n';
        return '';
      })
      .join('')
      .trim();

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const fileName = `【${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}】文字起こし.txt`;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasFinalText = transcript.some((i) => i.type === 'final');

  const renderTranscript = () => {
    const elements = [];
    let lineBuffer = [];

    transcript.forEach((item, i) => {
      if (item.type === 'break') {
        if (lineBuffer.length > 0) {
          elements.push(<span key={`line-${i}`}>{lineBuffer}</span>);
          elements.push(<br key={`br-${i}`} />);
          lineBuffer = [];
        }
      } else if (item.type === 'interim') {
        lineBuffer.push(
          <span key={`interim-${i}`} className="text-gray-400">
            {item.text}
          </span>
        );
      } else {
        lineBuffer.push(<span key={`final-${i}`}>{item.text}</span>);
      }
    });

    if (lineBuffer.length > 0) {
      elements.push(<span key="last-line">{lineBuffer}</span>);
    }

    return elements;
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-start justify-center pt-16 px-4">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">音声文字起こし</h1>

        {/* 出力ボックス */}
        <div ref={outputBoxRef} className="h-80 overflow-y-auto border border-gray-300 rounded-lg p-4 bg-white text-gray-700 leading-relaxed text-base wrap-break-word whitespace-pre-wrap">
          {transcript.length === 0 ? (
            <span className="text-gray-400">「文字起こしを開始」を押して録音を始めてください</span>
          ) : (
            <p className="m-0">{renderTranscript()}</p>
          )}
        </div>

        {/* ボタン */}
        <div className="flex flex-wrap gap-3 mt-5">
          {!isListening ? (
            <button
              onClick={startListening}
              className="px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white font-bold rounded-md cursor-pointer transition-colors"
            >
              文字起こしを開始
            </button>
          ) : (
            <button
              onClick={stopListening}
              className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-md cursor-pointer transition-colors"
            >
              文字起こしを停止
            </button>
          )}
          <button
            onClick={saveAsTextFile}
            disabled={!hasFinalText}
            className={`px-6 py-2.5 bg-blue-600 text-white font-bold rounded-md transition-colors ${
              hasFinalText ? 'hover:bg-blue-700 cursor-pointer' : 'opacity-40 cursor-not-allowed'
            }`}
          >
            テキストファイルを保存
          </button>
        </div>

        {/* 録音中インジケーター */}
        {isListening && (
          <p className="flex items-center gap-2 mt-3 text-red-500 font-bold">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 blink" />
            録音中...
          </p>
        )}
      </div>
    </div>
  );
};

export default App;
