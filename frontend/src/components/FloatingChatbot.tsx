import { useState, useRef, useEffect } from 'react';
import type { Incident, DashboardStats } from '../types';
import './FloatingChatbot.css';

const API_URL = import.meta.env.DEV ? 'http://localhost:3001/api' : 'https://aws-project-asa-backend.onrender.com/api';

interface FloatingChatbotProps {
  incidents: Incident[];
  stats: DashboardStats | null;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

const PRESET_QUESTIONS = [
  '📋 Summarize all present issues',
  '🚨 Which issue is the most dangerous?',
  '📊 Show severity breakdown',
  '🛡️ What top actions should I take?'
];

export const FloatingChatbot: React.FC<FloatingChatbotProps> = ({ incidents, stats }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isTechnicalMode, setIsTechnicalMode] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: "👋 Hi! I'm **ASA**, your automated Cloud Security Assistant.\n\nAsk me anything about active security threats, overall risk levels, or recommended containment steps across your AWS infrastructure!",
      timestamp: new Date()
    }
  ]);
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isThinking, isOpen]);

  const handleSend = async (queryText?: string) => {
    const messageToSend = (queryText || inputMessage).trim();
    if (!messageToSend || isThinking) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: messageToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    if (!queryText) setInputMessage('');
    setIsThinking(true);

    try {
      const res = await fetch(`${API_URL}/chat/global`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageToSend,
          incidents,
          stats,
          isTechnicalMode
        })
      });

      if (!res.ok) throw new Error('API error');
      const data = await res.json();

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: data.reply || 'No reply generated.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: '⚠️ Unable to connect to ASA security AI backend. Please verify your connection.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="floating-chatbot-container">
      {/* Hover Greeting Tooltip */}
      {isHovered && !isOpen && (
        <div className="chatbot-greeting-tooltip">
          <span>🤖</span> Hi, I'm ASA! Ask me about active security issues 👋
        </div>
      )}

      {/* Floating Trigger Button */}
      <button
        className={`chatbot-trigger-btn ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label="Toggle ASA Security Assistant"
      >
        <span className="chatbot-trigger-icon">{isOpen ? '✕' : '🛡️'}</span>
        <span className="chatbot-online-dot" />
      </button>

      {/* Floating Chat Window */}
      {isOpen && (
        <div className="chatbot-window">
          {/* Header */}
          <div className="chatbot-window-header">
            <div className="chatbot-header-info">
              <div className="chatbot-header-avatar">🤖</div>
              <div className="chatbot-header-title">
                <h4>
                  ASA Security Assistant
                  <span style={{ fontSize: 9, background: 'rgba(100,255,218,0.2)', color: '#64ffda', padding: '2px 6px', borderRadius: 10, fontWeight: 700 }}>AI ONLINE</span>
                </h4>
                <div className="chatbot-header-subtitle">Real-time Cloud Security Intelligence</div>
              </div>
            </div>
            <div className="chatbot-header-controls">
              <button
                onClick={() => setIsTechnicalMode(!isTechnicalMode)}
                title={isTechnicalMode ? "Switch to Simple Mode" : "Switch to Technical Mode"}
                style={{
                  background: isTechnicalMode ? 'rgba(255, 100, 100, 0.2)' : 'rgba(100, 255, 218, 0.2)',
                  color: isTechnicalMode ? '#ff6464' : '#64ffda',
                  border: 'none',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginRight: '8px',
                  transition: 'all 0.2s'
                }}
              >
                {isTechnicalMode ? 'TECHNICAL' : 'SIMPLE'}
              </button>
              <button
                className="chatbot-control-btn"
                onClick={() => setMessages([messages[0]])}
                title="Clear Chat History"
              >
                🗑️
              </button>
              <button
                className="chatbot-control-btn"
                onClick={() => setIsOpen(false)}
                title="Close Chat"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="chatbot-messages-body">
            {messages.map((msg) => (
              <div key={msg.id} className={`chatbot-msg-row ${msg.sender}`}>
                <div className="chatbot-msg-sender">{msg.sender === 'user' ? 'SOC Analyst' : 'ASA AI'}</div>
                <div className="chatbot-msg-bubble">{msg.text}</div>
              </div>
            ))}

            {isThinking && (
              <div className="chatbot-msg-row ai">
                <div className="chatbot-msg-sender">ASA AI</div>
                <div className="chatbot-msg-bubble">
                  <div className="chatbot-typing-dots">
                    <span className="chatbot-typing-dot" />
                    <span className="chatbot-typing-dot" />
                    <span className="chatbot-typing-dot" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips */}
          <div className="chatbot-quick-chips">
            {PRESET_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                className="chatbot-chip-btn"
                onClick={() => handleSend(q)}
                disabled={isThinking}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <div className="chatbot-input-footer">
            <input
              type="text"
              className="chatbot-input-field"
              placeholder="Ask ASA about present security issues..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={isThinking}
            />
            <button
              className="chatbot-send-btn"
              onClick={() => handleSend()}
              disabled={isThinking || !inputMessage.trim()}
              title="Send Message"
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
