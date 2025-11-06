import Navigation from './components/Navigation';
import Hero from './components/Hero';
import About from './components/About';
import VideoGallery from './components/VideoGallery';
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

      {/* Services Section */}
      <section id="services" className="services">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">מוזיקה לכל סוגי האירועים</h2>
          </div>
          <div className="services-grid">
            <div className="service-card featured">
              <div className="service-badge">הייחודיות שלי</div>
              <div className="service-icon">
                <i className="fas fa-music"></i>
              </div>
              <h3>הופעה אינטראקטיבית משולבת קהל</h3>
              <p>חידוש יחיד מסוגו! הקהל נכנס לאתר ובוחר שירים בזמן אמת מתוך מאות שירים ברפרטואר.
                 כל אורח יכול להזמין את השיר שהוא הכי אוהב והוא יבוצע במהלך הערב!</p>
              <ul className="service-features">
                <li>מאות שירים זמינים לבחירה</li>
                <li>מערכת הזמנות שירים בזמן אמת</li>
                <li>אווירה אינטראקטיבית ייחודית</li>
              </ul>
            </div>

            <div className="service-card">
              <div className="service-icon">
                <i className="fas fa-users"></i>
              </div>
              <h3>שירה בציבור מקצועית</h3>
              <p>הובלת שירה בציבור עם כל הציוד הדרוש - מיקרופונים אלחוטיים לקהל, הקרנת מילים והגברה מקצועית.
                 כולם שרים יחד בקלות ובכיף!</p>
              <ul className="service-features">
                <li>מיקרופונים אלחוטיים לקהל</li>
                <li>הקרנת מילים מקצועית</li>
                <li>הגברה מותאמת לגודל הקבוצה</li>
                <li>ליווי מוזיקלי מלא לכל שיר</li>
              </ul>
            </div>

            <div className="service-card">
              <div className="service-icon">
                <i className="fas fa-microphone-alt"></i>
              </div>
              <h3>הפקת שירים ואולפן ביתי</h3>
              <p>הקלטת קאברים מקצועית באולפן פרטי ברמת גן עם ציוד חדיש ויחס אישי.
                 מפיק מוזיקלי מנוסה שיוצר איתכם קאבר תפור למידה - מפלייבק מקורי או חדש שנבנה מאפס.</p>
              <ul className="service-features">
                <li>אולפן מאובזר וחדיש ברמת גן</li>
                <li>הקלטה על פלייבק מקורי או חדש</li>
                <li>קאברים לאירועים מיוחדים</li>
                <li>שירים עם מילים מותאמות אישית</li>
                <li>מחירים מיוחדים ללקוחות מופעים</li>
              </ul>
            </div>

            <div className="service-card">
              <div className="service-icon">
                <i className="fas fa-guitar"></i>
              </div>
              <h3>אופציות נוספות</h3>
              <p>ניתן להוסיף נגנים נוספים לאווירה מלאה יותר, או להזמין שירותי קייטרינג
                 משלימים לאירוע המושלם דרך <a href="https://greendaytlv.com" target="_blank" rel="noopener">גרין דיי</a>.</p>
              <ul className="service-features">
                <li>אופציה להוספת נגנים</li>
                <li>שירותי קייטרינג (בשיתוף עם <a href="https://greendaytlv.com" target="_blank" rel="noopener">גרין דיי</a>)</li>
                <li>תכנון וייעוץ לאירוע</li>
                <li>הוספת שירים מיוחדים לרפרטואר</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
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
