import { useState, useRef, useEffect } from "react";
import "./App.css";

const API = "http://localhost:3000";

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch(`${API}/api/chat/get-all-messages`);
        const data = await res.json();

        const formatted = data.map(msg => ({
          id: msg._id,
          role: msg.sender === "user" ? "user" : "bot",
          text: msg.text,
          audioUrl: msg.audioUrl,
          type: msg.type,
          timestamp: new Date(msg.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })
        }));

        setMessages(formatted);
      } catch (err) {
        console.error("Failed to load messages", err);
      }
    };

    fetchMessages();
  }, []);

  useEffect(() => {
  return () => {
    messages.forEach(m => {
      if (m.audioUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(m.audioUrl);
      }
    });
  };
}, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    // 1️⃣ Show user message immediately
    const userMsg = {
      id: `${Date.now()}-${Math.random()}`,
      role: "user",
      text: input,
      audioUrl: null,
      type: "text",
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // 2️⃣ Send to backend
      const formData = new FormData();
      formData.append("message", userMsg.text);

      const res = await fetch(`${API}/api/chat`, {
        method: "POST",
        body: formData
      });

      const data = await res.json();

      // 3️⃣ Add AI response
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random()}` + 1,
          role: "bot",
          text: data.ai.text,
          audioUrl: data.ai.audioUrl,
          type: data.ai.audioUrl ? "audio" : "text",
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })
        }
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const sendAudioMessage = async (audioBlob) => {
    const localAudioUrl = URL.createObjectURL(audioBlob);

    // show user audio instantly
    const userMsg = {
      id: `${Date.now()}-${Math.random()}`,
      role: "user",
      text: null,
      audioUrl: localAudioUrl,
      type: "audio",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      })
    };

    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "voice-message.webm");

      const res = await fetch(`${API}/api/chat`, {
        method: "POST",
        body: formData
      });

      const data = await res.json();

      setMessages(prev => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random()}` + 1,
          role: "bot",
          text: data.ai.text,
          audioUrl: data.ai.audioUrl,
          type: data.ai.audioUrl ? "audio" : "text",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
          })
        }
      ]);
    } catch (err) {
      console.error("Audio upload failed", err);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);


  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm"
        });

        sendAudioMessage(audioBlob);

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setRecording(true);
    } catch (err) {
      console.error("Mic permission denied", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };


  return (
    <div className="app">
      <div className="chat-container">
        <div className="chat-header">🤖 XOTO Assistant</div>

        <div className="chat-body">
          {messages.length === 0 && (
            <div className="empty-state">
              <p>Ask anything. I'm here to help.</p>
              <p style={{ fontSize: "14px", marginTop: "8px", opacity: 0.7 }}>
                Your conversation will be displayed here
              </p>
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={`message ${m.role} ${m.audioUrl ? 'has-audio' : ''}`}
            >
              {m.audioUrl ? (
                // Audio messages - don't show text
                <div className="audio-container">
                  <div className="audio-indicator">
                    {m.role === 'user' ? 'Your audio message' : 'AI response'}
                  </div>
                  <audio
                    controls
                    src={m.audioUrl}
                    className="audio-player"
                  />
                  <div className="message-time">{m.timestamp}</div>
                </div>
              ) : (
                // Text messages
                <>
                  <p>{m.text}</p>
                  <div className="message-time">{m.timestamp}</div>
                </>
              )}
            </div>
          ))}

          {loading && (
            <div className="message bot thinking">
              <p>Thinking...</p>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        <div className="chat-input">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            disabled={loading || recording}
          />

          {/* 🎤 Voice button */}
          <button
            className={`mic-btn ${recording ? "recording" : ""}`}
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            disabled={loading}
          >
            🎤
          </button>

          {/* ➤ Send text */}
          <button
            className="send-btn"
            onClick={sendMessage}
            disabled={!input.trim() || loading}
          >
            ➤
          </button>
        </div>

      </div>
    </div>
  );
}

export default App;