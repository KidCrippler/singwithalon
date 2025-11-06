import Navigation from './components/Navigation';
import Hero from './components/Hero';
import About from './components/About';
import VideoGallery from './components/VideoGallery';
import Services from './components/Services';
import ContactForm from './components/ContactForm';
import Testimonials from './components/Testimonials';
import Footer from './components/Footer';

function App() {
  return (
    <>
      <Navigation />
      <Hero />
      <About />
      <VideoGallery />
      <Services />
      <Testimonials />

      {/* Contact Section */}
      <ContactForm />
      <Footer />

      {/* Chatbot Widget */}
      <div id="chatbot-widget" className="chatbot-widget">
        {/* Chat Toggle Button */}
        <button id="chat-toggle" className="chat-toggle" aria-label="פתח צ'אט">
          <i className="fas fa-comments"></i>
          <i className="fas fa-times"></i>
          <div className="chat-notification-badge">💬</div>
        </button>

        {/* Hebrew Tooltip */}
        <div id="chat-tooltip" className="chat-tooltip">
          יש לכם שאלות? אני כאן לעזור! 🎵
        </div>

        {/* Chat Modal */}
        <div id="chat-modal" className="chat-modal">
          <div className="chat-header">
            <div className="chat-avatar">
              <i className="fas fa-music"></i>
            </div>
            <div className="chat-info">
              <h4>אלון כהן</h4>
              <span className="chat-status">זמין לשיחה</span>
            </div>
            <button id="chat-close" className="chat-close" aria-label="סגור צ'אט">
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div id="chat-messages" className="chat-messages">
            <div className="message bot-message">
              <div className="message-avatar">
                <i className="fas fa-music"></i>
              </div>
              <div className="message-content">
                <p>שלום! אני כאן לעזור לכם עם כל שאלה על השירותים המוזיקליים שלי. איך אוכל לעזור?</p>
                <span className="message-time">עכשיו</span>
              </div>
            </div>
          </div>

          <div className="chat-input-container">
            <div className="chat-typing" id="chat-typing" style={{display: 'none'}}>
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span>אלון מקליד...</span>
            </div>
            <div className="chat-input">
              <input type="text" id="chat-input-field" placeholder="כתבו את השאלה שלכם..." maxLength="500" />
              <button id="chat-send" className="chat-send" disabled aria-label="שלח הודעה בצ'אט">
                <i className="fas fa-paper-plane"></i>
              </button>
            </div>
            <div className="chat-suggestions">
              <button className="suggestion-btn" aria-label="שאל על מה כלול במופע אינטראקטיבי">מה כלול במופע אינטראקטיבי?</button>
              <button className="suggestion-btn" aria-label="שאל על מחיר מופע לאירוע של 50 איש">כמה עולה מופע לאירוע של 50 איש?</button>
              <button className="suggestion-btn" aria-label="שאל על מערכת בחירת השירים">איך פועלת מערכת בחירת השירים?</button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default App
