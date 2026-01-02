import { useState, useRef, useEffect } from "react";
import "./App.css";

const API = "https://xoto.ae";

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [recording, setRecording] = useState(false);

  // async function convertToWav(audioBlob) {
  //   const arrayBuffer = await audioBlob.arrayBuffer();
  //   const audioCtx = new AudioContext();
  //   const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

  //   const numOfChan = audioBuffer.numberOfChannels;
  //   const length = audioBuffer.length * numOfChan * 2;
  //   const buffer = new ArrayBuffer(44 + length);
  //   const view = new DataView(buffer);

  //   let offset = 0;

  //   const writeString = (s) => {
  //     for (let i = 0; i < s.length; i++) {
  //       view.setUint8(offset++, s.charCodeAt(i));
  //     }
  //   };

  //   writeString("RIFF");
  //   view.setUint32(offset, 36 + length, true);
  //   offset += 4;
  //   writeString("WAVE");
  //   writeString("fmt ");
  //   view.setUint32(offset, 16, true);
  //   offset += 4;
  //   view.setUint16(offset, 1, true);
  //   offset += 2;
  //   view.setUint16(offset, numOfChan, true);
  //   offset += 2;
  //   view.setUint32(offset, audioBuffer.sampleRate, true);
  //   offset += 4;
  //   view.setUint32(offset, audioBuffer.sampleRate * 2 * numOfChan, true);
  //   offset += 4;
  //   view.setUint16(offset, numOfChan * 2, true);
  //   offset += 2;
  //   view.setUint16(offset, 16, true);
  //   offset += 2;
  //   writeString("data");
  //   view.setUint32(offset, length, true);
  //   offset += 4;

  //   const channels = [];
  //   for (let i = 0; i < numOfChan; i++) {
  //     channels.push(audioBuffer.getChannelData(i));
  //   }

  //   let interleaved;
  //   if (numOfChan === 2) {
  //     interleaved = new Float32Array(audioBuffer.length * 2);
  //     let idx = 0;
  //     for (let i = 0; i < audioBuffer.length; i++) {
  //       interleaved[idx++] = channels[0][i];
  //       interleaved[idx++] = channels[1][i];
  //     }
  //   } else {
  //     interleaved = channels[0];
  //   }

  //   for (let i = 0; i < interleaved.length; i++) {
  //     const sample = Math.max(-1, Math.min(1, interleaved[i]));
  //     view.setInt16(
  //       offset,
  //       sample < 0 ? sample * 0x8000 : sample * 0x7fff,
  //       true
  //     );
  //     offset += 2;
  //   }

  //   return new Blob([view], { type: "audio/wav" });
  // }

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch(`${API}/api/ai/chat/get-all-messages`);
        const data = await res.json();

        const formatted = data.map((msg) => ({
          id: msg._id,
          role: msg.sender === "user" ? "user" : "bot",
          text: msg.text,
          audioUrl: msg.audioUrl,
          type: msg.type,
          timestamp: new Date(msg.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        }));

        setMessages(formatted);
      } catch (err) {
        console.error("Failed to load messages", err);
      }
    };

    fetchMessages();
  }, []);

  // useEffect(() => {
  //   return () => {
  //     messages.forEach((m) => {
  //       if (m.audioUrl?.startsWith("blob:")) {
  //         URL.revokeObjectURL(m.audioUrl);
  //       }
  //     });
  //   };
  // }, [messages]);

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
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // 2️⃣ Send to backend
      const formData = new FormData();
      formData.append("message", userMsg.text);

      const res = await fetch(`${API}/api/ai/chat`, {
        method: "POST",
        body: formData,
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
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const sendAudioMessage = async (audioBlob) => {
    const localAudioUrl = URL.createObjectURL(audioBlob);



    try {
      const formData = new FormData();

      // ⚠️ FIELD NAME MUST MATCH BACKEND / POSTMAN
      formData.append("audio", audioBlob, "voice.webm");
      // formData.append("audio", audioBlob, "voice.wav");

      const res = await fetch("http://localhost:3000/api/chat", {
        method: "POST",
        body: formData,
      });

      // 🔥 NEVER blindly do res.json()
      const raw = await res.text();

      if (!res.ok) {
        console.error("Backend error:", raw);
        return;
      }

      const data = JSON.parse(raw);

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "bot",
          text: data.ai?.text || "",
          audioUrl: data.ai?.audioUrl || null,
          type: data.ai?.audioUrl ? "audio" : "text",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    } catch (err) {
      console.error("Audio upload failed:", err);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";

    const mediaRecorder = new MediaRecorder(stream, { mimeType });

    mediaRecorderRef.current = mediaRecorder;
    audioChunksRef.current = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        audioChunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = async () => {
  try {
    // 1️⃣ WebM blob from MediaRecorder
    const webmBlob = new Blob(audioChunksRef.current, {
      type: mimeType
    });

    console.log("WebM size:", webmBlob.size);

    if (webmBlob.size < 1000) {
      console.error("❌ Empty or too short audio");
      return;
    }


    // 3️⃣ Create URL for UI playback
    const audioUrl = URL.createObjectURL(webmBlob);

    // 4️⃣ Show user audio in UI (perfect playback)
    setMessages(prev => [
      ...prev,
      {
        id: Date.now(),
        role: "user",
        audioUrl,
        type: "audio",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit"
        })
      }
    ]);

    // 5️⃣ Send WAV to backend (STT works properly)
    sendAudioMessage(webmBlob);

      stream.getTracks().forEach((t) => t.stop());
  audioChunksRef.current = [];

  } catch (err) {
    console.error("Recording stop error:", err);
  }
};


    mediaRecorder.start();
    setRecording(true);
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current) return;

    mediaRecorderRef.current.stop();
    setRecording(false);
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
              className={`message ${m.role} ${m.audioUrl ? "has-audio" : ""}`}
            >
              {m.audioUrl ? (
                // Audio messages - don't show text
                <div className="audio-container">
                  <div className="audio-indicator">
                    {m.role === "user" ? "Your audio message" : "AI response"}
                  </div>
                  <audio controls src={m.audioUrl} className="audio-player" />
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
            onClick={() => (recording ? stopRecording() : startRecording())}
          >
            {recording ? "⏹ Stop" : "🎤 Record"}
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
