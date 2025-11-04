import Navigation from './components/Navigation';
import Hero from './components/Hero';
import VideoGallery from './components/VideoGallery';
import ContactForm from './components/ContactForm';

function App() {
  return (
    <>
      <Navigation />
      <Hero />

      {/* About Section */}
      <section id="about" className="about">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">אודות אלון</h2>
            <p className="section-subtitle">מוזיקאי, נגן וזמר מקצועי עם תשוקה למוזיקה ישראלית</p>
          </div>
          <div className="about-content">
            <div className="about-text">
              {/* Mobile image - shows only on mobile devices */}
              <div className="about-image-mobile">
                <img src="/assets/about_en.webp" alt="אלון כהן - קלידן, גיטריסט וזמר" className="about-img-mobile" width="1076" height="1020" loading="lazy" />
              </div>
              <div className="about-story">
                <h3>הסיפור שלי</h3>
                <p>
                  לפני הכל אני קלידן המתמחה בהובלת שירה בציבור, אבל גם נגן גיטרה וזמר עם נסיון רב. האהבה האמיתית שלי היא שירי ארץ ישראל הישנה והטובה של פעם
                  שמביאים את כולם לשיר יחד.
                </p>
                <p>
                  אני מאמין שמוזיקה היא השפה האוניברסלית שמחברת בין הדורות. בכל <a href="#services">מופע שלי</a>, אני מוביל שירה בציבור שמביאה שמחה, נוסטלגיה ותחושת קהילה
                  שמאחדת את כל המשתתפים. <a href="#videos">צפו בסרטונים שלי</a> כדי לראות את האווירה המיוחדת שנוצרת.
                </p>
              </div>
              <div className="about-highlights">
                <div className="highlight-item">
                  <div className="highlight-icon">
                    <i className="fas fa-compact-disc"></i>
                  </div>
                  <div className="highlight-content">
                    <h4>מעל 200 מופעים</h4>
                    <p>ניסיון רב בביצועים בכל סוגי האירועים</p>
                  </div>
                </div>
                <div className="highlight-item">
                  <div className="highlight-icon">
                    <i className="fas fa-mobile-alt"></i>
                  </div>
                  <div className="highlight-content">
                    <h4>מערכת בחירה אינטראקטיבית</h4>
                    <p>הקהל בוחר בזמן אמת מתוך מאות שירים ברפרטואר</p>
                  </div>
                </div>
                <div className="highlight-item">
                  <div className="highlight-icon">
                    <i className="fas fa-music"></i>
                  </div>
                  <div className="highlight-content">
                    <h4>מוביל שירה בציבור</h4>
                    <p>מיקרופונים אלחוטיים, הקרנת מילים וליווי מוזיקלי מלא - כולם שרים יחד!</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="about-image">
              <img src="/assets/about_en.webp" alt="אלון כהן - קלידן, גיטריסט וזמר" className="about-img" width="1076" height="1020" loading="lazy" />
            </div>
          </div>
        </div>
      </section>

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
      <section id="testimonials" className="testimonials">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">מה אומרים עליי</h2>
            <p className="section-subtitle">המלצות מלקוחות מרוצים</p>
          </div>
          <div className="swiper-container mySwiper">
            <div className="swiper-wrapper">
              {/* Testimonials will be dynamically generated here */}
            </div>
            <div className="swiper-pagination"></div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <ContactForm />

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-logo">
              <picture>
                <source srcSet="/assets/logo.webp" type="image/webp" />
                <img src="/assets/logo.webp" alt="שרים עם אלון כהן" width="68" height="60" loading="lazy" />
              </picture>
              <p>קלידן, גיטריסט וזמר - שירי ארץ ישראל הישנה והטובה עם מערכת בחירה אינטראקטיבית</p>
            </div>
            <div className="footer-links">
              <h4>קישורים מהירים</h4>
              <ul>
                <li><a href="#home">בית</a></li>
                <li><a href="#about">אודות</a></li>
                <li><a href="#videos">וידאו</a></li>
                <li><a href="#services">שירותים</a></li>
                <li><a href="#contact">צור קשר</a></li>
              </ul>
            </div>
            <div className="footer-contact">
              <h4>צור קשר</h4>
              <p dir="ltr">052-896-2110</p>
              <p dir="ltr">contact@singwithalon.com</p>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 שרים עם אלון כהן. כל הזכויות שמורות.</p>
          </div>
        </div>
      </footer>

      {/* Video Modal */}
      <div id="video-modal" className="video-modal">
        <div className="video-modal-content">
          <button className="video-modal-close" aria-label="סגור חלון וידאו">&times;</button>
          <video id="modal-video" controls>
            <source src="" type="video/mp4" />
            <track kind="captions" src="#" srcLang="he" label="עברית" default />
          </video>
        </div>
      </div>

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
