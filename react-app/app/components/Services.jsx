'use client'
import { SectionHeader } from './ui/SectionHeader';

/**
 * Services component with Tailwind styling
 * Replaces .services, .services-grid, .service-card, .service-icon, .service-badge, .service-features from legacy CSS
 * Musical icon decorations use custom .services-musical-icons class from globals.css
 * Featured card uses custom .featured-card-notes class and animate-musical-glow animation
 */

function Services() {
  return (
    <section
      id="services"
      className="relative py-[100px] services-musical-icons"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.96)'
      }}
    >
      <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
        <SectionHeader
          title="מוזיקה לכל סוגי האירועים"
        />

        {/* Services Grid - 2 columns on desktop, 1 on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-[40px]">

          {/* Featured Service Card - Interactive Performance */}
          <div className="relative overflow-visible bg-gradient-to-br from-primary to-primary-light text-white py-[40px] px-[30px] rounded-[20px] text-center scale-105 animate-musical-glow featured-card-notes">
            <div className="absolute -top-[10px] right-[15px] bg-[#ff6b6b] text-white py-[6px] px-3 rounded-[20px] text-[11px] font-semibold whitespace-nowrap">
              הייחודיות שלי
            </div>
            <div className="w-[80px] h-[80px] bg-white rounded-full flex items-center justify-center text-primary text-[32px] mx-auto mb-[25px]">
              <i className="fas fa-music"></i>
            </div>
            <h3 className="text-white mb-5 text-2xl">הופעה אינטראקטיבית משולבת קהל</h3>
            <p className="text-white mb-[25px] leading-[1.7]">
              חידוש יחיד מסוגו! הקהל נכנס לאתר ובוחר שירים בזמן אמת מתוך מאות שירים ברפרטואר.
              כל אורח יכול להזמין את השיר שהוא הכי אוהב והוא יבוצע במהלך הערב!
            </p>
            <ul className="list-none text-right">
              <li className="text-white mb-[10px] relative pr-[25px] before:content-['✓'] before:absolute before:right-0 before:text-white before:font-bold">
                ✓ מאות שירים זמינים לבחירה
              </li>
              <li className="text-white mb-[10px] relative pr-[25px] before:content-['✓'] before:absolute before:right-0 before:text-white before:font-bold">
                ✓ מערכת הזמנות שירים בזמן אמת
              </li>
              <li className="text-white mb-[10px] relative pr-[25px] before:content-['✓'] before:absolute before:right-0 before:text-white before:font-bold">
                ✓ אווירה אינטראקטיבית ייחודית
              </li>
            </ul>
          </div>

          {/* Regular Service Card - Public Singing */}
          <div className="bg-[#f8f9fa] py-[40px] px-[30px] rounded-[20px] text-center relative transition-transform duration-300 border-2 border-transparent hover:-translate-y-[10px] hover:border-primary hover:shadow-[0_15px_35px_rgba(139,95,191,0.15)]">
            <div className="w-[80px] h-[80px] bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center text-white text-[32px] mx-auto mb-[25px]">
              <i className="fas fa-users"></i>
            </div>
            <h3 className="text-[#2c3e50] mb-5 text-2xl">שירה בציבור מקצועית</h3>
            <p className="text-[#666] mb-[25px] leading-[1.7]">
              הובלת שירה בציבור עם כל הציוד הדרוש - מיקרופונים אלחוטיים לקהל, הקרנת מילים והגברה מקצועית.
              כולם שרים יחד בקלות ובכיף!
            </p>
            <ul className="list-none text-right">
              <li className="text-[#555] mb-[10px] relative pr-[25px] before:content-['✓'] before:absolute before:right-0 before:text-primary before:font-bold">
                ✓ מיקרופונים אלחוטיים לקהל
              </li>
              <li className="text-[#555] mb-[10px] relative pr-[25px] before:content-['✓'] before:absolute before:right-0 before:text-primary before:font-bold">
                ✓ הקרנת מילים מקצועית
              </li>
              <li className="text-[#555] mb-[10px] relative pr-[25px] before:content-['✓'] before:absolute before:right-0 before:text-primary before:font-bold">
                ✓ הגברה מותאמת לגודל הקבוצה
              </li>
              <li className="text-[#555] mb-[10px] relative pr-[25px] before:content-['✓'] before:absolute before:right-0 before:text-primary before:font-bold">
                ✓ ליווי מוזיקלי מלא לכל שיר
              </li>
            </ul>
          </div>

          {/* Regular Service Card - Studio Recording */}
          <div className="bg-[#f8f9fa] py-[40px] px-[30px] rounded-[20px] text-center relative transition-transform duration-300 border-2 border-transparent hover:-translate-y-[10px] hover:border-primary hover:shadow-[0_15px_35px_rgba(139,95,191,0.15)]">
            <div className="w-[80px] h-[80px] bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center text-white text-[32px] mx-auto mb-[25px]">
              <i className="fas fa-microphone-alt"></i>
            </div>
            <h3 className="text-[#2c3e50] mb-5 text-2xl">הפקת שירים ואולפן ביתי</h3>
            <p className="text-[#666] mb-[25px] leading-[1.7]">
              הקלטת קאברים מקצועית באולפן פרטי ברמת גן עם ציוד חדיש ויחס אישי.
              מפיק מוזיקלי מנוסה שיוצר איתכם קאבר תפור למידה - מפלייבק מקורי או חדש שנבנה מאפס.
            </p>
            <ul className="list-none text-right">
              <li className="text-[#555] mb-[10px] relative pr-[25px] before:content-['✓'] before:absolute before:right-0 before:text-primary before:font-bold">
                ✓ אולפן מאובזר וחדיש ברמת גן
              </li>
              <li className="text-[#555] mb-[10px] relative pr-[25px] before:content-['✓'] before:absolute before:right-0 before:text-primary before:font-bold">
                ✓ הקלטה על פלייבק מקורי או חדש
              </li>
              <li className="text-[#555] mb-[10px] relative pr-[25px] before:content-['✓'] before:absolute before:right-0 before:text-primary before:font-bold">
                ✓ קאברים לאירועים מיוחדים
              </li>
              <li className="text-[#555] mb-[10px] relative pr-[25px] before:content-['✓'] before:absolute before:right-0 before:text-primary before:font-bold">
                ✓ שירים עם מילים מותאמות אישית
              </li>
              <li className="text-[#555] mb-[10px] relative pr-[25px] before:content-['✓'] before:absolute before:right-0 before:text-primary before:font-bold">
                ✓ מחירים מיוחדים ללקוחות מופעים
              </li>
            </ul>
          </div>

          {/* Regular Service Card - Additional Options */}
          <div className="bg-[#f8f9fa] py-[40px] px-[30px] rounded-[20px] text-center relative transition-transform duration-300 border-2 border-transparent hover:-translate-y-[10px] hover:border-primary hover:shadow-[0_15px_35px_rgba(139,95,191,0.15)]">
            <div className="w-[80px] h-[80px] bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center text-white text-[32px] mx-auto mb-[25px]">
              <i className="fas fa-guitar"></i>
            </div>
            <h3 className="text-[#2c3e50] mb-5 text-2xl">אופציות נוספות</h3>
            <p className="text-[#666] mb-[25px] leading-[1.7]">
              ניתן להוסיף נגנים נוספים לאווירה מלאה יותר, או להזמין שירותי קייטרינג
              משלימים לאירוע המושלם דרך <a href="https://greendaytlv.com" target="_blank" rel="noopener" className="text-primary hover:underline">גרין דיי</a>.
            </p>
            <ul className="list-none text-right">
              <li className="text-[#555] mb-[10px] relative pr-[25px] before:content-['✓'] before:absolute before:right-0 before:text-primary before:font-bold">
                ✓ אופציה להוספת נגנים
              </li>
              <li className="text-[#555] mb-[10px] relative pr-[25px] before:content-['✓'] before:absolute before:right-0 before:text-primary before:font-bold">
                ✓ שירותי קייטרינג (בשיתוף עם <a href="https://greendaytlv.com" target="_blank" rel="noopener" className="text-primary hover:underline">גרין דיי</a>)
              </li>
              <li className="text-[#555] mb-[10px] relative pr-[25px] before:content-['✓'] before:absolute before:right-0 before:text-primary before:font-bold">
                ✓ תכנון וייעוץ לאירוע
              </li>
              <li className="text-[#555] mb-[10px] relative pr-[25px] before:content-['✓'] before:absolute before:right-0 before:text-primary before:font-bold">
                ✓ הוספת שירים מיוחדים לרפרטואר
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Services;
