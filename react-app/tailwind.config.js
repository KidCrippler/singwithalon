/** @type {import('tailwindcss').Config} */
export default {
  important: true, // Ensures Tailwind utilities always override legacy CSS
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Musical purple color scheme from the original site
        primary: {
          light: '#b19cd9',
          DEFAULT: '#8b5fbf',
          dark: '#6b4596',
        },
        accent: {
          light: '#d4b3ff',
          DEFAULT: '#9370db',
        }
      },
      fontFamily: {
        // Hebrew fonts from original site
        sans: ['Heebo', 'sans-serif'],
        display: ['Secular One', 'sans-serif'],
      },
      boxShadow: {
        'musical': '0 10px 40px -10px rgba(139, 95, 191, 0.6)',
        'musical-glow': '0 0 30px rgba(139, 95, 191, 0.5)',
        'btn-primary': '0 4px 20px rgba(139, 95, 191, 0.3)',
        'btn-primary-hover': '0 8px 30px rgba(139, 95, 191, 0.4)',
        'btn-secondary': '0 8px 25px rgba(139, 95, 191, 0.3)',
        // Chatbot specific shadows
        'chat-toggle': '0 4px 15px rgba(139, 95, 191, 0.4), 0 0 20px rgba(177, 156, 217, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
        'chat-toggle-hover': '0 6px 25px rgba(139, 95, 191, 0.5), 0 0 30px rgba(177, 156, 217, 0.3), 0 0 0 3px rgba(139, 95, 191, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
        'chat-modal': '0 20px 60px rgba(0, 0, 0, 0.15)',
        'chat-message': '0 2px 8px rgba(0, 0, 0, 0.1)',
        'chat-tooltip': '0 8px 25px rgba(139, 95, 191, 0.3)',
        'chat-badge': '0 2px 8px rgba(76, 175, 80, 0.4)',
        // Hero specific shadows
        'hero-video': '0 20px 60px rgba(0, 0, 0, 0.3)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #8b5fbf 0%, #b19cd9 100%)',
      },
      animation: {
        'musical-glow': 'musical-glow 4s ease-in-out infinite',
        // Chatbot animations
        'message-slide-in': 'messageSlideIn 0.3s ease',
        'typing-dots': 'typingDots 1.4s infinite',
        'gentle-glow': 'gentle-glow 2s ease-in-out',
        'notification-bounce': 'notification-bounce 2s infinite',
        'gentle-note-float': 'gentle-note-float 6s infinite ease-in-out',
        'gentle-ring-glow': 'gentle-ring-glow 4s linear infinite',
        // Hero animations
        'particle-float': 'particleFloat 20s ease-in-out infinite',
        'particle-glow': 'particleGlow 5s ease-in-out infinite',
        'musical-breathe': 'musicalBreathe 6s ease-in-out infinite',
        'musical-pulse': 'musicalPulse 1.5s ease-in-out infinite',
      },
      keyframes: {
        'musical-glow': {
          '0%, 100%': { boxShadow: '0 15px 35px rgba(139, 95, 191, 0.3)' },
          '50%': { boxShadow: '0 20px 45px rgba(177, 156, 217, 0.4)' },
        },
        // Chatbot keyframes
        'messageSlideIn': {
          'from': { opacity: '0', transform: 'translateY(10px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        'typingDots': {
          '0%, 60%, 100%': { transform: 'translateY(0)', opacity: '0.4' },
          '30%': { transform: 'translateY(-8px)', opacity: '1' },
        },
        'gentle-glow': {
          '0%, 100%': {
            boxShadow: '0 4px 15px rgba(139, 95, 191, 0.4), 0 0 20px rgba(177, 156, 217, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
          },
          '50%': {
            boxShadow: '0 6px 25px rgba(139, 95, 191, 0.6), 0 0 30px rgba(177, 156, 217, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.35)'
          },
        },
        'notification-bounce': {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '25%': { transform: 'translateY(-3px) scale(1.1)' },
          '50%': { transform: 'translateY(0) scale(1)' },
          '75%': { transform: 'translateY(-2px) scale(1.05)' },
        },
        'gentle-note-float': {
          '0%, 85%, 100%': { opacity: '0', transform: 'translateY(0) scale(0.8)' },
          '15%, 70%': { opacity: '0.5', transform: 'translateY(-8px) scale(1)' },
        },
        'gentle-ring-glow': {
          '0%': { transform: 'rotate(0deg)', opacity: '0.4' },
          '50%': { opacity: '0.6' },
          '100%': { transform: 'rotate(360deg)', opacity: '0.4' },
        },
        // Hero keyframes
        'particleFloat': {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) rotate(0deg)' },
          '25%': { transform: 'translate3d(-20px, -30px, 0) rotate(5deg)' },
          '50%': { transform: 'translate3d(15px, -15px, 0) rotate(-3deg)' },
          '75%': { transform: 'translate3d(-10px, -40px, 0) rotate(7deg)' },
        },
        'particleGlow': {
          '0%, 100%': {
            opacity: '0.3',
            textShadow: '0 0 10px rgba(177, 156, 217, 0.6), 0 0 20px rgba(139, 95, 191, 0.4), 0 0 30px rgba(139, 95, 191, 0.2)',
          },
          '50%': {
            opacity: '1',
            textShadow: '0 0 20px rgba(177, 156, 217, 1), 0 0 40px rgba(139, 95, 191, 0.8), 0 0 60px rgba(139, 95, 191, 0.6)',
          },
        },
        'musicalBreathe': {
          '0%, 100%': {
            transform: 'scale(1)',
            textShadow: '0 3px 6px rgba(0, 0, 0, 0.6), 0 6px 15px rgba(139, 95, 191, 0.4), 0 0 40px rgba(255, 255, 255, 0.3), 0 1px 0 rgba(255, 255, 255, 0.2)',
          },
          '50%': {
            transform: 'scale(1.02)',
            textShadow: '0 3px 8px rgba(0, 0, 0, 0.7), 0 8px 20px rgba(139, 95, 191, 0.5), 0 0 50px rgba(255, 255, 255, 0.4), 0 1px 0 rgba(255, 255, 255, 0.3)',
          },
        },
        'musicalPulse': {
          '0%, 100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
          '25%': { transform: 'translateY(-8px) scale(1.1)', opacity: '0.8' },
          '50%': { transform: 'translateY(-12px) scale(1.2)', opacity: '0.9' },
          '75%': { transform: 'translateY(-8px) scale(1.1)', opacity: '0.8' },
        },
      },
    },
  },
  plugins: [],
}
