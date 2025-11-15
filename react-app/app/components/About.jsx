'use client'
import { SectionHeader } from './ui/SectionHeader';

import { getAssetPath } from '../utils/assets';

/**
 * About component with Tailwind styling
 * Replaces .about, .about-content, .about-story, .about-highlights, .highlight-item, .about-image from legacy CSS
 * Musical note decorations use custom .about-musical-notes class from globals.css
 */

function About() {
  const aboutImageAvif = getAssetPath('about_en.avif');
  const aboutImageWebp = getAssetPath('about_en.webp');

  return (
    <section
      id="about"
      className="relative py-[100px] about-musical-notes z-10"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        backgroundImage: 'linear-gradient(0deg, rgba(139, 95, 191, 0.02) 1px, transparent 1px)',
        backgroundSize: '20px 60px'
      }}
    >
      <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
        <SectionHeader
          title="אודות אלון"
          subtitle="מוזיקאי, נגן וזמר מקצועי עם תשוקה למוזיקה ישראלית"
        />

        {/* Grid layout - 2 columns on desktop, 1 on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-[60px] items-center">
          {/* Text content column */}
          <div>
            {/* Mobile image - shows only on mobile devices */}
            <div className="block md:hidden mb-[30px] rounded-[20px] overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.1),0_4px_15px_rgba(0,0,0,0.08)]">
              <picture>
                <source srcSet={aboutImageAvif} type="image/avif" />
                <source srcSet={aboutImageWebp} type="image/webp" />
                <img
                  src={aboutImageWebp}
                  alt="אלון כהן - קלידן, גיטריסט וזמר"
                  className="w-full h-[350px] md:h-[400px] object-cover object-center block m-0 p-0"
                  width="1076"
                  height="1020"
                  loading="lazy"
                />
              </picture>
            </div>

            {/* Story section */}
            <div>
              <h3 className="text-primary text-[1.8rem] mb-5">הסיפור שלי</h3>
              <p className="text-lg leading-relaxed mb-6">
                לפני הכל אני קלידן המתמחה בהובלת שירה בציבור, אבל גם נגן גיטרה וזמר עם נסיון רב. האהבה האמיתית שלי היא שירי ארץ ישראל הישנה והטובה של פעם
                שמביאים את כולם לשיר יחד.
              </p>
              <p className="text-lg leading-relaxed mb-6">
                אני מאמין שמוזיקה היא השפה האוניברסלית שמחברת בין הדורות. בכל <a href="#services" className="text-primary hover:underline">מופע שלי</a>, אני מוביל שירה בציבור שמביאה שמחה, נוסטלגיה ותחושת קהילה
                שמאחדת את כל המשתתפים. <a href="#videos" className="text-primary hover:underline">צפו בסרטונים שלי</a> כדי לראות את האווירה המיוחדת שנוצרת.
              </p>
            </div>

            {/* Highlights section */}
            <div className="mt-10 flex flex-col gap-6">
              {/* Highlight item 1 */}
              <div className="flex items-center gap-5 p-5 bg-[#f8f9fa] rounded-[15px] transition-transform duration-300 hover:-translate-y-[5px]">
                <div className="w-[60px] h-[60px] bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center text-white text-2xl flex-shrink-0">
                  <i className="fas fa-compact-disc"></i>
                </div>
                <div>
                  <h4 className="text-[#2c3e50] mb-1 font-semibold">מעל 200 מופעים</h4>
                  <p className="text-[#666] m-0">ניסיון רב בביצועים בכל סוגי האירועים</p>
                </div>
              </div>

              {/* Highlight item 2 */}
              <div className="flex items-center gap-5 p-5 bg-[#f8f9fa] rounded-[15px] transition-transform duration-300 hover:-translate-y-[5px]">
                <div className="w-[60px] h-[60px] bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center text-white text-2xl flex-shrink-0">
                  <i className="fas fa-mobile-alt"></i>
                </div>
                <div>
                  <h4 className="text-[#2c3e50] mb-1 font-semibold">מערכת בחירה אינטראקטיבית</h4>
                  <p className="text-[#666] m-0">הקהל בוחר בזמן אמת מתוך מאות שירים ברפרטואר</p>
                </div>
              </div>

              {/* Highlight item 3 */}
              <div className="flex items-center gap-5 p-5 bg-[#f8f9fa] rounded-[15px] transition-transform duration-300 hover:-translate-y-[5px]">
                <div className="w-[60px] h-[60px] bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center text-white text-2xl flex-shrink-0">
                  <i className="fas fa-music"></i>
                </div>
                <div>
                  <h4 className="text-[#2c3e50] mb-1 font-semibold">מוביל שירה בציבור</h4>
                  <p className="text-[#666] m-0">מיקרופונים אלחוטיים, הקרנת מילים וליווי מוזיקלי מלא - כולם שרים יחד!</p>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop image column - hidden on mobile */}
          <div className="hidden md:block relative rounded-[20px] overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.1),0_4px_15px_rgba(0,0,0,0.08)] m-0 p-0 transition-all duration-300 hover:shadow-[0_20px_50px_rgba(0,0,0,0.15),0_8px_25px_rgba(0,0,0,0.12)] hover:-translate-y-[5px]">
            <picture>
              <source srcSet={aboutImageAvif} type="image/avif" />
              <source srcSet={aboutImageWebp} type="image/webp" />
              <img
                src={aboutImageWebp}
                alt="אלון כהן - קלידן, גיטריסט וזמר"
                className="w-full h-[500px] object-cover object-center block m-0 p-0"
                width="1076"
                height="1020"
                loading="lazy"
              />
            </picture>
          </div>
        </div>
      </div>
    </section>
  );
}

export default About;
