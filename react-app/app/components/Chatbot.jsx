'use client'

import { useState, useEffect, useRef } from 'react';

function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([
    {
      text: 'שלום! אני כאן לעזור לכם עם כל שאלה על השירותים המוזיקליים שלי. איך אוכל לעזור?',
      sender: 'bot',
      time: 'עכשיו'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [sessionMessageCount, setSessionMessageCount] = useState(0);
  const [inputDisabled, setInputDisabled] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [toggleDisabled, setToggleDisabled] = useState(false);

  const messagesRef = useRef(null);
  const sessionIdRef = useRef(null);
  const conversationHistoryRef = useRef([]);
  const chatToggleRef = useRef(null);

  const API_BASE_URL = 'https://singwithalon-ai-chat-production.up.railway.app';
  const USE_BACKEND_API = true;
  const MAX_MESSAGES_PER_SESSION = 10;

  // Generate session ID on mount
  useEffect(() => {
    const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    sessionIdRef.current = sessionId;
    localStorage.setItem('chat_session_id', sessionId);
  }, []);

  // Setup tooltip introduction
  useEffect(() => {
    const showTimer = setTimeout(() => {
      setShowTooltip(true);

      const hideTimer = setTimeout(() => {
        setShowTooltip(false);
      }, 3000);

      return () => clearTimeout(hideTimer);
    }, 3000);

    return () => clearTimeout(showTimer);
  }, []);

  // Setup periodic glow effect
  useEffect(() => {
    const glowInterval = setInterval(() => {
      if (!isOpen && chatToggleRef.current) {
        chatToggleRef.current.classList.add('glow-effect');

        setTimeout(() => {
          if (chatToggleRef.current) {
            chatToggleRef.current.classList.remove('glow-effect');
          }
        }, 1500);
      }
    }, 8000);

    return () => clearInterval(glowInterval);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        closeChat();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const scrollToBottom = () => {
    if (messagesRef.current) {
      setTimeout(() => {
        messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
      }, 100);
    }
  };

  const isMobileDevice = () => {
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  const processTextForLinks = (text) => {
    const isMobile = isMobileDevice();
    const phonePattern = /(0\d{1,2}-?\d{3}-?\d{4})/g;
    const whatsappPattern = /(https?:\/\/(?:wa\.me|api\.whatsapp\.com)\/[^\s]+)/g;

    let processedText = text;

    processedText = processedText.replace(whatsappPattern, (match) => {
      return `<a href="${match}" target="_blank" style="color: #25D366; text-decoration: underline;">צור קשר בוואטסאפ</a>`;
    });

    processedText = processedText.replace(phonePattern, (match) => {
      const cleanPhone = match.replace(/-/g, '');
      if (isMobile) {
        return `<a href="tel:${cleanPhone}" style="color: #007bff; text-decoration: underline;">${match}</a>`;
      } else {
        return `<span style="color: #007bff; font-weight: bold;">${match}</span>`;
      }
    });

    return processedText;
  };

  const toggleChat = () => {
    if (toggleDisabled) return;

    if (isOpen) {
      closeChat();
    } else {
      openChat();
    }
  };

  const openChat = () => {
    setIsOpen(true);
    setShowTooltip(false);
    setToggleDisabled(true);

    setTimeout(() => {
      setToggleDisabled(false);
    }, 300);
  };

  const closeChat = () => {
    setIsOpen(false);
    setToggleDisabled(true);

    setTimeout(() => {
      setToggleDisabled(false);
    }, 300);
  };

  const handleOutsideClick = (e) => {
    if (isOpen && !e.target.closest('.chatbot-widget')) {
      closeChat();
    }
  };

  useEffect(() => {
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [isOpen]);

  const canSendMessage = () => {
    return sessionMessageCount < MAX_MESSAGES_PER_SESSION;
  };

  const addMessage = (text, sender) => {
    const time = new Date().toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit'
    });

    setMessages(prev => [...prev, { text, sender, time }]);
  };

  const sendMessage = async () => {
    const text = inputValue.trim();
    if (!text || isTyping) return;

    if (!canSendMessage()) {
      addMessage('מצטער, הגעתם למגבלת 10 הודעות לשיחה. אשמח אם תצרו קשר ישירות בוואטסאפ: 052-896-2110', 'bot');
      setInputDisabled(true);
      return;
    }

    setSessionMessageCount(prev => prev + 1);
    const newCount = sessionMessageCount + 1;

    if (newCount >= MAX_MESSAGES_PER_SESSION) {
      setTimeout(() => {
        setInputDisabled(true);
      }, 2000);
    }

    addMessage(text, 'user');
    setInputValue('');

    conversationHistoryRef.current.push({ role: 'user', parts: [{ text: text }] });

    setIsTyping(true);
    await getAIResponse(text);
  };

  const getAIResponse = async (userMessage) => {
    if (USE_BACKEND_API) {
      await getBackendResponse(userMessage);
    } else {
      await getFallbackResponse(userMessage);
    }
  };

  const getBackendResponse = async (userMessage) => {
    try {
      const requestBody = {
        messages: conversationHistoryRef.current,
        session_id: sessionIdRef.current
      };

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );

      const fetchPromise = fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const response = await Promise.race([fetchPromise, timeoutPromise]);

      if (!response.ok) {
        throw new Error(`Backend API Error: ${response.status}`);
      }

      const data = await response.json();

      if (data.session_id && data.session_id !== sessionIdRef.current) {
        sessionIdRef.current = data.session_id;
        localStorage.setItem('chat_session_id', data.session_id);
      }

      conversationHistoryRef.current.push({ role: 'assistant', parts: [{ text: data.response }] });

      if (conversationHistoryRef.current.length > 10) {
        conversationHistoryRef.current = conversationHistoryRef.current.slice(-8);
      }

      setIsTyping(false);
      addMessage(data.response, 'bot');

    } catch (error) {
      console.error('Backend API Error:', error);
      setIsTyping(false);

      if (error.message.includes('429')) {
        addMessage('הגעתם למגבלת ההודעות השעתית. אשמח אם תצרו קשר ישירות בוואטסאפ: 052-896-2110', 'bot');
      } else if (error.message.includes('500')) {
        addMessage('יש בעיה זמנית במערכת. אני זמין בוואטסאפ לכל שאלה: 052-896-2110', 'bot');
      } else {
        await getFallbackResponse(userMessage);
      }
    }
  };

  const getFallbackResponse = async (userMessage) => {
    const responses = {
      'מה כלול במופע אינטראקטיבי': 'במופע האינטראקטיבי שלי כלול: מערכת בחירת שירים בזמן אמת, ליווי מוזיקלי מלא, מיקרופונים אלחוטיים לקהל, הקרנת מילים, והגברה מקצועית. הקהל בוחר מתוך מאות שירים ברפרטואר!',
      'כמה עולה מופע': 'המחיר תלוי במספר גורמים כמו מספר האורחים, משך הזמן, והמיקום. אשמח לתת לכם הצעת מחיר מדויקת לאחר שתספרו לי על האירוע שלכם. בואו נעבור לוואטסאפ לפרטים? 052-896-2110',
      'איך פועלת מערכת בחירת השירים': 'המערכת שלי פשוטה וכיפית! האורחים נכנסים לאתר באמצעות QR קוד, רואים רשימה של מאות שירים לבחירה, ובוחרים את השירים שהם הכי אוהבים. אני רואה את הבקשות בזמן אמת ובונה את המופע בהתאם!',
      'default': [
        'אשמח לעזור לכם עם האירוע! בואו נדבר יותר בפירוט בוואטסאפ: 052-896-2110',
        'שאלה מעולה! אני זמין לענות על כל השאלות שלכם בוואטסאפ: 052-896-2110',
        'אשמח לעזור לכם לתכנן את האירוע המושלם! בואו נמשיך בוואטסאפ: 052-896-2110'
      ]
    };

    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

    const lowerMessage = userMessage.toLowerCase();
    let response = null;

    for (const [key, responseText] of Object.entries(responses)) {
      if (key !== 'default' && lowerMessage.includes(key)) {
        response = responseText;
        break;
      }
    }

    if (!response) {
      if (lowerMessage.includes('מחיר') || lowerMessage.includes('עולה') || lowerMessage.includes('עלות')) {
        response = responses['כמה עולה מופע'];
      } else if (lowerMessage.includes('שיר') || lowerMessage.includes('רפרטואר') || lowerMessage.includes('מוזיקה')) {
        response = 'ברפרטואר שלי יש מאות שירים מכל התקופות: שירי ארץ ישראל הישנים, שלמה ארצי, יהורם גאון, הדודאים, עד שירים מודרניים יותר. במערכת האינטראקטיבית האורחים יכולים לראות את כל הרשימה ולבחור!';
      }
    }

    if (!response) {
      const defaultResponses = responses['default'];
      response = defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
    }

    setIsTyping(false);
    addMessage(response, 'bot');
  };

  const handleSuggestionClick = (question) => {
    setInputValue(question);
    setTimeout(() => {
      sendMessage();
    }, 0);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && inputValue.trim()) {
      e.preventDefault();
      sendMessage();
    }
  };

  const isSendDisabled = () => {
    return !inputValue.trim() || isTyping || !canSendMessage() || inputDisabled;
  };

  return (
    <div id="chatbot-widget" className="chatbot-widget">
      <button
        ref={chatToggleRef}
        id="chat-toggle"
        className={`chat-toggle ${isOpen ? 'active' : ''}`}
        aria-label="פתח צ'אט"
        onClick={toggleChat}
        disabled={toggleDisabled}
      >
        <i className="fas fa-comments"></i>
        <i className="fas fa-times"></i>
        <div className="chat-notification-badge">💬</div>
      </button>

      <div id="chat-tooltip" className={`chat-tooltip ${showTooltip ? 'show' : ''}`}>
        יש לכם שאלות? אני כאן לעזור! 🎵
      </div>

      <div id="chat-modal" className={`chat-modal ${isOpen ? 'open' : ''}`}>
        <div className="chat-header">
          <div className="chat-avatar">
            <i className="fas fa-music"></i>
          </div>
          <div className="chat-info">
            <h4>אלון כהן</h4>
            <span className="chat-status">זמין לשיחה</span>
          </div>
          <button
            id="chat-close"
            className="chat-close"
            aria-label="סגור צ'אט"
            onClick={closeChat}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div id="chat-messages" className="chat-messages" ref={messagesRef}>
          {messages.map((message, index) => (
            <div key={index} className={`message ${message.sender}-message`}>
              <div className="message-avatar">
                <i className={`fas ${message.sender === 'bot' ? 'fa-music' : 'fa-user'}`}></i>
              </div>
              <div className="message-content">
                <p dangerouslySetInnerHTML={{
                  __html: message.sender === 'bot' ? processTextForLinks(message.text) : message.text
                }} />
                <span className="message-time">{message.time}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="chat-input-container">
          <div
            className="chat-typing"
            id="chat-typing"
            style={{ display: isTyping ? 'flex' : 'none' }}
          >
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span>אלון מקליד...</span>
          </div>
          <div className="chat-input">
            <input
              type="text"
              id="chat-input-field"
              placeholder={inputDisabled ? 'הגעתם למגבלת 10 הודעות - צרו קשר בוואטסאפ' : 'כתבו את השאלה שלכם...'}
              maxLength="500"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={inputDisabled}
            />
            <button
              id="chat-send"
              className="chat-send"
              disabled={isSendDisabled()}
              aria-label="שלח הודעה בצ'אט"
              onClick={sendMessage}
            >
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>
          <div className="chat-suggestions">
            <button
              className="suggestion-btn"
              aria-label="שאל על מה כלול במופע אינטראקטיבי"
              onClick={() => handleSuggestionClick('מה כלול במופע אינטראקטיבי?')}
            >
              מה כלול במופע אינטראקטיבי?
            </button>
            <button
              className="suggestion-btn"
              aria-label="שאל על מחיר מופע לאירוע של 50 איש"
              onClick={() => handleSuggestionClick('כמה עולה מופע לאירוע של 50 איש?')}
            >
              כמה עולה מופע לאירוע של 50 איש?
            </button>
            <button
              className="suggestion-btn"
              aria-label="שאל על מערכת בחירת השירים"
              onClick={() => handleSuggestionClick('איך פועלת מערכת בחירת השירים?')}
            >
              איך פועלת מערכת בחירת השירים?
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Chatbot;
