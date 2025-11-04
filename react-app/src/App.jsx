import Navigation from './components/Navigation';
import Hero from './components/Hero';

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

      {/* Videos Section */}
      <section id="videos" className="videos">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">גלריית וידאו</h2>
            <p className="section-subtitle">צפו בביצועים שלי וקבלו טעימה מהמופעים</p>
          </div>
          <div className="videos-grid">
            <div className="video-card">
              <div className="video-thumbnail">
                <picture>
                  <source srcSet="/assets/rony_poster.webp" type="image/webp" />
                  <img src="/assets/rony_poster.webp" alt="שירי רוק פופ" width="640" height="352" loading="lazy" />
                </picture>
                <div className="play-overlay">
                  <button className="play-btn" data-video="https://pub-c512c10de2ad4c37a4e4998b005da1e8.r2.dev/rony.mp4" aria-label="נגן וידאו - שירי רוק פופ">
                    <i className="fas fa-play"></i>
                  </button>
                </div>
                <div className="video-duration">1:11</div>
              </div>
              <div className="video-info">
                <h3>אנרגיה ישראלית</h3>
                <p>״רוני״ של גזוז - שמח ומשמח!</p>
              </div>
            </div>

            <div className="video-card">
              <div className="video-thumbnail">
                <picture>
                  <source srcSet="/assets/jam_toren_poster.webp" type="image/webp" />
                  <img src="/assets/jam_toren_poster.webp" alt="ביצוע אקוסטי" width="640" height="304" loading="lazy" />
                </picture>
                <div className="play-overlay">
                  <button className="play-btn" data-video="https://pub-c512c10de2ad4c37a4e4998b005da1e8.r2.dev/jam_toren.mp4" aria-label="נגן וידאו - ביצוע אקוסטי">
                    <i className="fas fa-play"></i>
                  </button>
                </div>
                <div className="video-duration">1:37</div>
              </div>
              <div className="video-info">
                <h3>ביצוע אקוסטי</h3>
                <p>לבן על לבן - מג׳מג׳ם ספונטנית עם דן תורן ז״ל</p>
              </div>
            </div>

            <div className="video-card">
              <div className="video-thumbnail">
                <picture>
                  <source srcSet="/assets/borot_poster.webp" type="image/webp" />
                  <img src="/assets/borot_poster.webp" alt="שירי ארץ ישראל" width="1280" height="720" loading="lazy" />
                </picture>
                <div className="play-overlay">
                  <button className="play-btn" data-video="https://pub-c512c10de2ad4c37a4e4998b005da1e8.r2.dev/borot.mp4" aria-label="נגן וידאו - שירי ארץ ישראל">
                    <i className="fas fa-play"></i>
                  </button>
                </div>
                <div className="video-duration">3:16</div>
              </div>
              <div className="video-info">
                <h3>שירי ארץ ישראל</h3>
                <p>אל בורות המים - קלאסיקה של נעמי שמר</p>
              </div>
            </div>

            <div className="video-card">
              <div className="video-thumbnail">
                <picture>
                  <source srcSet="/assets/kvar_avar_poster.webp" type="image/webp" />
                  <img src="/assets/kvar_avar_poster.webp" alt="שירי זיכרון" width="848" height="478" loading="lazy" />
                </picture>
                <div className="play-overlay">
                  <button className="play-btn" data-video="https://pub-c512c10de2ad4c37a4e4998b005da1e8.r2.dev/kvar_avar.mp4" aria-label="נגן וידאו - שירי זיכרון">
                    <i className="fas fa-play"></i>
                  </button>
                </div>
                <div className="video-duration">5:07</div>
              </div>
              <div className="video-info">
                <h3>שירי זיכרון</h3>
                <p>קאבר גיטרה - מה רצינו להגיד (שלמה ארצי)</p>
              </div>
            </div>
          </div>
        </div>
      </section>

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
      <section id="contact" className="contact">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">בואו נתחיל לתכנן את האירוע שלכם</h2>
            <p className="section-subtitle">צרו איתי קשר ונבנה יחד את החוויה המוזיקלית המושלמת עבורכם</p>
          </div>
          <div className="contact-content">
            <div className="contact-info">
              <div className="contact-item">
                <div className="contact-icon">
                  <i className="fas fa-phone"></i>
                </div>
                <div className="contact-details">
                  <h3>טלפון</h3>
                  <p><a href="tel:+972528962110" dir="ltr">052-896-2110</a></p>
                </div>
              </div>

              <div className="contact-item">
                <div className="contact-icon">
                  <i className="fas fa-envelope"></i>
                </div>
                <div className="contact-details">
                  <h3>אימייל</h3>
                  <p><a href="mailto:contact@singwithalon.com" dir="ltr">contact@singwithalon.com</a></p>
                </div>
              </div>

              <div className="contact-item">
                <div className="contact-icon">
                  <i className="fab fa-whatsapp"></i>
                </div>
                <div className="contact-details">
                  <h3>WhatsApp</h3>
                  <p><a href="https://wa.me/972528962110" dir="ltr">052-896-2110</a></p>
                </div>
              </div>
            </div>

            <div className="contact-form">
              <form id="contact-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="name">שם מלא</label>
                    <input type="text" id="name" name="name" required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="phone">טלפון</label>
                    <input type="tel" id="phone" name="phone" required />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="date">תאריך מועדף</label>
                  <input type="date" id="date" name="date" required />
                </div>

                <div className="form-group">
                  <label htmlFor="message">פרטים נוספים על האירוע</label>
                  <textarea id="message" name="message" rows="4" placeholder="ספרו לי קצת על האירוע - מספר אורחים, מיקום, סוג האירוע, שירים מיוחדים שתרצו לשמוע..."></textarea>
                </div>

                <button type="submit" className="btn btn-primary" aria-label="שלח הודעה">
                  <i className="fab fa-whatsapp"></i>
                  שלח הודעת WhatsApp
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

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
