'use client'

import { useState, useEffect, useRef } from 'react';

/**
 * Chatbot component with Tailwind styling
 * Replaces all .chatbot-*, .chat-*, .message*, .typing*, .suggestion* classes from legacy CSS
 * Complex animations use custom classes from globals.css + Tailwind animations
 * Features: AI chat integration, typing indicators, quick replies, WhatsApp fallback
 */

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
    <div
      id="chatbot-widget"
      className="chatbot-widget fixed bottom-5 right-5 z-[9999] font-sans rtl chatbot-musical-note"
    >
      {/* Chat Toggle Button */}
      <button
        ref={chatToggleRef}
        id="chat-toggle"
        className={`chat-toggle chat-toggle-ring relative w-[60px] h-[60px] rounded-full bg-gradient-to-br from-[#7a4db0] via-primary to-primary-light border-2 border-white/30 text-white text-2xl cursor-pointer shadow-chat-toggle transition-all duration-300 flex items-center justify-center will-change-transform hover:-translate-y-0.5 hover:scale-105 hover:border-white/50 hover:shadow-chat-toggle-hover ${isOpen ? 'active' : ''} max-md:w-[55px] max-md:h-[55px] max-md:text-xl`}
        aria-label="פתח צ'אט"
        onClick={toggleChat}
        disabled={toggleDisabled}
      >
        <i className="fas fa-comments absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-300 opacity-100 chat-toggle-icon-enter"></i>
        <i className="fas fa-times absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-300 opacity-0 rotate-90 chat-toggle-icon-exit"></i>

        {/* Notification Badge */}
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-[#4CAF50] to-[#45a049] border-2 border-white rounded-full flex items-center justify-center text-[11px] z-[3] animate-notification-bounce shadow-chat-badge">
          💬
        </div>
      </button>

      {/* Tooltip */}
      <div
        id="chat-tooltip"
        className={`chat-tooltip-arrow absolute bottom-[75px] right-[-20px] bg-gradient-to-br from-primary to-primary-light text-white py-3 px-4 rounded-[15px] text-sm font-medium whitespace-nowrap transition-all duration-300 ease-out pointer-events-none shadow-chat-tooltip z-[2] max-md:bottom-[70px] max-md:-right-[15px] max-md:text-[13px] max-md:py-2.5 max-md:px-3.5 ${
          showTooltip
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 translate-y-2.5 scale-80'
        }`}
      >
        יש לכם שאלות? אני כאן לעזור! 🎵
      </div>

      {/* Chat Modal */}
      <div
        id="chat-modal"
        className={`absolute bottom-20 right-0 w-[380px] max-w-[calc(100vw-40px)] h-[500px] bg-white rounded-[20px] shadow-chat-modal transition-all duration-300 ease-out overflow-hidden border border-primary/10 max-md:w-[calc(100vw-30px)] max-md:h-[70vh] max-md:max-h-[500px] max-md:bottom-[70px] max-sm:w-[calc(100vw-20px)] max-sm:-right-[5px] max-sm:bottom-[65px] ${
          isOpen
            ? 'open translate-y-0 opacity-100 pointer-events-auto'
            : 'translate-y-5 opacity-0 pointer-events-none'
        }`}
      >
        {/* Chat Header */}
        <div className="bg-gradient-to-br from-primary to-primary-light p-5 text-white flex items-center gap-3 relative">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg">
            <i className="fas fa-music"></i>
          </div>
          <div className="flex-1">
            <h4 className="m-0 text-base font-semibold">אלון כהן</h4>
            <span className="text-xs opacity-90">זמין לשיחה</span>
          </div>
          <button
            id="chat-close"
            className="absolute top-[15px] right-[15px] bg-transparent border-none text-white text-lg cursor-pointer w-[30px] h-[30px] rounded-full flex items-center justify-center transition-colors duration-200 hover:bg-white/20"
            aria-label="סגור צ'אט"
            onClick={closeChat}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Chat Messages */}
        <div
          id="chat-messages"
          className="chat-scrollbar h-[340px] overflow-y-auto p-5 bg-[#f8f9fa] max-md:h-[calc(70vh-160px)] max-md:max-h-[340px]"
          ref={messagesRef}
        >
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-2.5 mb-4 animate-message-slide-in ${
                message.sender === 'user' ? 'flex-row-reverse' : ''
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
                message.sender === 'bot'
                  ? 'bg-gradient-to-br from-primary to-primary-light text-white'
                  : 'bg-[#e9ecef] text-[#6c757d]'
              }`}>
                <i className={`fas ${message.sender === 'bot' ? 'fa-music' : 'fa-user'}`}></i>
              </div>
              <div className={`bg-white py-3 px-4 rounded-[18px] max-w-[250px] relative shadow-chat-message max-sm:max-w-[200px] ${
                message.sender === 'bot'
                  ? 'rounded-bl-[6px]'
                  : 'bg-gradient-to-br from-primary to-primary-light text-white rounded-br-[6px]'
              }`}>
                <p
                  className="m-0 text-sm leading-[1.4]"
                  dangerouslySetInnerHTML={{
                    __html: message.sender === 'bot' ? processTextForLinks(message.text) : message.text
                  }}
                />
                <span className="text-[11px] opacity-70 mt-1 block">{message.time}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Chat Input Container */}
        <div className="bg-white border-t border-[#eee]">
          {/* Typing Indicator */}
          <div
            className={`py-3 px-5 items-center gap-2 text-xs text-[#6c757d] bg-[#f8f9fa] ${
              isTyping ? 'flex' : 'hidden'
            }`}
            id="chat-typing"
          >
            <div className="flex gap-0.5">
              <span className="w-1 h-1 rounded-full bg-primary animate-typing-dots"></span>
              <span className="w-1 h-1 rounded-full bg-primary animate-typing-dots [animation-delay:0.2s]"></span>
              <span className="w-1 h-1 rounded-full bg-primary animate-typing-dots [animation-delay:0.4s]"></span>
            </div>
            <span>אלון מקליד...</span>
          </div>

          {/* Chat Input */}
          <div className="flex p-[15px_20px] gap-2.5 items-center">
            <input
              type="text"
              id="chat-input-field"
              placeholder={inputDisabled ? 'הגעתם למגבלת 10 הודעות - צרו קשר בוואטסאפ' : 'כתבו את השאלה שלכם...'}
              maxLength="500"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={inputDisabled}
              className="flex-1 border border-[#ddd] rounded-[25px] py-3 px-4 text-sm outline-none transition-colors duration-200 focus:border-primary rtl text-right placeholder:text-[#999]"
            />
            <button
              id="chat-send"
              className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-light border-none text-white cursor-pointer flex items-center justify-center transition-all duration-200 text-sm hover:scale-105 disabled:bg-[#ccc] disabled:cursor-not-allowed"
              disabled={isSendDisabled()}
              aria-label="שלח הודעה בצ'אט"
              onClick={sendMessage}
            >
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>

          {/* Chat Suggestions */}
          <div className="p-[10px_20px_20px] flex flex-col gap-2 rtl">
            <button
              className="bg-transparent border border-primary text-primary py-2 px-3 rounded-[20px] text-xs cursor-pointer transition-all duration-200 text-right hover:bg-primary hover:text-white"
              aria-label="שאל על מה כלול במופע אינטראקטיבי"
              onClick={() => handleSuggestionClick('מה כלול במופע אינטראקטיבי?')}
            >
              מה כלול במופע אינטראקטיבי?
            </button>
            <button
              className="bg-transparent border border-primary text-primary py-2 px-3 rounded-[20px] text-xs cursor-pointer transition-all duration-200 text-right hover:bg-primary hover:text-white"
              aria-label="שאל על מחיר מופע לאירוע של 50 איש"
              onClick={() => handleSuggestionClick('כמה עולה מופע לאירוע של 50 איש?')}
            >
              כמה עולה מופע לאירוע של 50 איש?
            </button>
            <button
              className="bg-transparent border border-primary text-primary py-2 px-3 rounded-[20px] text-xs cursor-pointer transition-all duration-200 text-right hover:bg-primary hover:text-white"
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
