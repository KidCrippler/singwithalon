function Services() {
  return (
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
  );
}

export default Services;
