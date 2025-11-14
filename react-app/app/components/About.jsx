'use client'

import { getAssetPath } from '../utils/assets.js';

function About() {
  const aboutImageAvif = getAssetPath('about_en.avif');
  const aboutImageWebp = getAssetPath('about_en.webp');

  return (
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
              <picture>
                <source srcSet={aboutImageAvif} type="image/avif" />
                <source srcSet={aboutImageWebp} type="image/webp" />
                <img src={aboutImageWebp} alt="אלון כהן - קלידן, גיטריסט וזמר" className="about-img-mobile" width="1076" height="1020" loading="lazy" />
              </picture>
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
            <picture>
              <source srcSet={aboutImageAvif} type="image/avif" />
              <source srcSet={aboutImageWebp} type="image/webp" />
              <img src={aboutImageWebp} alt="אלון כהן - קלידן, גיטריסט וזמר" className="about-img" width="1076" height="1020" loading="lazy" />
            </picture>
          </div>
        </div>
      </div>
    </section>
  );
}

export default About;
