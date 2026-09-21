'use client'

import { useState, useEffect, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { SectionHeader } from './ui/SectionHeader';

// Testimonials data
const testimonialsData = [
  {
    stars: 5,
    text: "חגגנו יום הולדת 70 עם חברים ומשפחה מגיל 3 עד 73, ואלון הוביל ערב קסום של שירה בציבור! הוא חיבר בין כל הגילאים עם נגינה נהדרת על קלידים וגיטרה, קטעי סולו מרגשים, והמון הומור וקצב. כולנו שרנו, רקדנו וחייכנו בלי הפסקה - ערב מיוחד שמילא את הלב בשמחה!",
    author: "שוש וישי אלבוים, הוד השרון",
    event: "יום הולדת 70",
    icon: "🎂"
  },
  {
    stars: 5,
    text: "הזמנו את אלון ליום הולדת 65 של אמא. הוא הביא את כל שירי ארץ ישראל הישנים שאמא כל כך אוהבת - שלמה ארצי, יהורם גאון, הדודאים. הכל היה מושלם! האווירה הייתה חמה ונוסטלגית בדיוק כמו שרצינו.",
    author: "משפחת רוזנברג",
    event: "מסיבת יום הולדת פרטית",
    icon: "🎂"
  },
  {
    stars: 5,
    text: "זה פשוט לא להאמין איך אלון הצליח ליצור תחושה של להקה שלמה לגמרי לבד! הקלידים, הגיטרה, התופים - הכל בסינכרון מושלם. ובנוסף הוא גם הנחה את הערב בצורה כל כך כייפית. ממליצים בחום!",
    author: "מרים ויעקב אבני",
    event: "אירוע משפחתי קטן",
    icon: "❤️"
  },
  {
    stars: 5,
    text: "הזמנו את אלון לאירוע השנתי של החברה שלנו. מה שהכי הפתיע אותנו זה איך הוא הצליח לחבר בין הדורות - הצעירים שרו עם המבוגרים באותה התלהבות. המערכת הדיגיטלית שלו מאפשרת לכל אחד לתרום לאווירה. בסוף כולם ביקשו לדעת מתי האירוע הבא!",
    author: "צוות שימור לקוחות, ויזה כאל",
    event: "אירוע חברה - 60 משתתפים",
    icon: "🏢"
  },
  {
    stars: 5,
    text: "בטקס יום הזיכרון שלנו אלון הביא בדיוק את מה שרצינו - ליווי פסנתר רגיש וחם שהתאים בצורה מושלמת לכל זמר וזמרת בהתאם לסגנון ולאופי הייחודי של כל אחד. הוא הצליח ליצור אווירה מרגשת ומכובדת, ובאותו הזמן, כשזה הגיע לשלב שירי הקהל, הוא הוביל אותנו עם הזמר שלו בצורה מרוממת שחיברה את כולם ויצרה רגש אמיתי של אחדות וזיכרון.",
    author: "קהילת ״בני ברית״, רמת גן",
    event: "טקס יום הזיכרון",
    icon: "🇮🇱"
  }
];

function Testimonials() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  // Configure Embla with RTL support and autoplay
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { 
      loop: true, 
      direction: 'rtl',
      align: 'start',
    },
    [
      Autoplay({ 
        delay: 7000,
        stopOnInteraction: false,
        stopOnMouseEnter: true,
      })
    ]
  );

  // Update selected index when carousel changes
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  // Set up event listeners
  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    return () => emblaApi.off('select', onSelect);
  }, [emblaApi, onSelect]);

  // Navigation handlers
  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback((index) => {
    if (emblaApi) emblaApi.scrollTo(index);
  }, [emblaApi]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!emblaApi) return;
      
      // Check if carousel is in viewport
      const emblaElement = emblaApi.rootNode();
      if (!emblaElement) return;
      
      const rect = emblaElement.getBoundingClientRect();
      const isInViewport = rect.top < window.innerHeight && rect.bottom > 0;
      
      if (!isInViewport) return;
      
      // RTL: Right arrow = previous, Left arrow = next
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        scrollPrev();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        scrollNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [emblaApi, scrollPrev, scrollNext]);

  // Create stars
  const createStars = (count) => {
    return Array(count).fill(0).map((_, index) => (
      <span key={index} className="text-yellow-400 text-lg drop-shadow-sm">⭐</span>
    ));
  };

  return (
    <section id="testimonials" className="testimonials-gradient-bg relative py-24 md:py-32 overflow-hidden">
      <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
        <SectionHeader
          title="מה אומרים עליי"
          subtitle="המלצות מלקוחות מרוצים"
        />

        {/* Embla Carousel */}
        <div className="relative">
          <div className="embla" ref={emblaRef} dir="rtl">
            <div className="embla__container">
              {testimonialsData.map((testimonial, index) => (
                <div key={index} className="embla__slide">
                  <div className="testimonial-card relative w-full bg-white rounded-3xl p-8 md:p-10 min-h-[400px] md:min-h-[450px] flex flex-col shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden">

                    {/* Decorative quote glyph */}
                    <span className="absolute top-4 left-6 text-[7rem] leading-none font-display text-primary/10 select-none pointer-events-none z-0">
                      &rdquo;
                    </span>

                    {/* Header with profile and author info */}
                    <div className="flex items-start gap-4 mb-6 relative z-10">
                      {/* Profile icon */}
                      <div className="relative flex-shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-4xl md:text-5xl shadow-lg border-4 border-white">
                        {testimonial.icon}
                        <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-br from-primary-light to-primary flex items-center justify-center text-xs border-2 border-white animate-pulse">
                          ♪
                        </div>
                      </div>
                      
                      {/* Author info */}
                      <div className="flex-1 text-right">
                        <h3 className="font-display text-xl md:text-2xl font-bold text-gray-900 mb-1 leading-tight">
                          {testimonial.author}
                        </h3>
                        <p className="text-base md:text-lg text-gray-600 font-sans flex items-center justify-end gap-2">
                          <span>{testimonial.event}</span>
                          <span className="text-sm">🎵</span>
                        </p>
                      </div>
                    </div>

                    {/* Content area */}
                    <div className="flex-1 flex flex-col relative z-10">
                      {/* Stars */}
                      <div className="flex justify-end gap-1 mb-4">
                        {createStars(testimonial.stars)}
                      </div>
                      
                      {/* Testimonial text */}
                      <p className="text-base md:text-lg leading-relaxed text-gray-800 font-sans text-right" dir="rtl">
                        {testimonial.text}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation arrows */}
          <button
            onClick={scrollPrev}
            aria-label="הקודם"
            className="absolute top-1/2 -translate-y-1/2 -right-4 md:-right-6 w-12 h-12 md:w-14 md:h-14 rounded-full bg-white shadow-xl hover:shadow-2xl border-2 border-primary/20 hover:border-primary hover:bg-primary hover:text-white flex items-center justify-center text-primary text-2xl transition-all duration-300 z-10 hover:scale-110"
          >
            ‹
          </button>
          <button
            onClick={scrollNext}
            aria-label="הבא"
            className="absolute top-1/2 -translate-y-1/2 -left-4 md:-left-6 w-12 h-12 md:w-14 md:h-14 rounded-full bg-white shadow-xl hover:shadow-2xl border-2 border-primary/20 hover:border-primary hover:bg-primary hover:text-white flex items-center justify-center text-primary text-2xl transition-all duration-300 z-10 hover:scale-110"
          >
            ›
          </button>
        </div>

        {/* Pagination dots */}
        <div className="flex justify-center gap-3 mt-10">
          {testimonialsData.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              aria-label={`עבור להמלצה ${index + 1}`}
              className={`transition-all duration-300 rounded-full ${
                index === selectedIndex
                  ? 'bg-primary w-8 h-3 shadow-lg'
                  : 'bg-primary/30 hover:bg-primary/50 w-3 h-3'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default Testimonials;
