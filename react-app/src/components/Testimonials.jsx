import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay, Keyboard, A11y } from 'swiper/modules';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/pagination';

// Testimonials data
const testimonialsData = [
  {
    stars: 5,
    text: "חגגנו יום הולדת 70 עם חברים ומשפחה מגיל 3 עד 73, ואלון הוביל ערב קסום של שירה בציבור! הוא חיבר בין כל הגילאים עם נגינה נהדרת על קלידים וגיטרה, קטעי סולו מרגשים, והמון הומור וקצב. כולנו שרנו, רקדנו וחייכנו בלי הפסקה - ערב מיוחד שמילא את הלב בשמחה!",
    author: "שוש וישי אלבוים, הוד השרון",
    event: "יום הולדת 70",
    icon: "fas fa-birthday-cake"
  },
  {
    stars: 5,
    text: "הזמנו את אלון ליום הולדת 65 של אמא. הוא הביא את כל שירי ארץ ישראל הישנים שאמא כל כך אוהבת - שלמה ארצי, יהורם גאון, הדודאים. הכל היה מושלם! האווירה הייתה חמה ונוסטלגית בדיוק כמו שרצינו.",
    author: "משפחת רוזנברג",
    event: "מסיבת יום הולדת פרטית",
    icon: "fas fa-birthday-cake"
  },
  {
    stars: 5,
    text: "זה פשוט לא להאמין איך אלון הצליח ליצור תחושה של להקה שלמה לגמרי לבד! הקלידים, הגיטרה, התופים - הכל בסינכרון מושלם. ובנוסף הוא גם הנחה את הערב בצורה כל כך כייפית. ממליצים בחום!",
    author: "מרים ויעקב אבני",
    event: "אירוע משפחתי קטן",
    icon: "fas fa-heart"
  },
  {
    stars: 5,
    text: "הזמנו את אלון לאירוע השנתי של החברה שלנו. מה שהכי הפתיע אותנו זה איך הוא הצליח לחבר בין הדורות - הצעירים שרו עם המבוגרים באותה התלהבות. המערכת הדיגיטלית שלו מאפשרת לכל אחד לתרום לאווירה. בסוף כולם ביקשו לדעת מתי האירוע הבא!",
    author: "צוות שימור לקוחות, ויזה כאל",
    event: "אירוע חברה - 60 משתתפים",
    icon: "fas fa-building"
  },
  {
    stars: 5,
    text: "בטקס יום הזיכרון שלנו אלון הביא בדיוק את מה שרצינו - ליווי פסנתר רגיש וחם שהתאים בצורה מושלמת לכל זמר וזמרת בהתאם לסגנון ולאופי הייחודי של כל אחד. הוא הצליח ליצור אווירה מרגשת ומכובדת, ובאותו הזמן, כשזה הגיע לשלב שירי הקהל, הוא הוביל אותנו עם הזמר שלו בצורה מרוממת שחיברה את כולם ויצרה רגש אמיתי של אחדות וזיכרון.",
    author: "קהילת ״בני ברית״, רמת גן",
    event: "טקס יום הזיכרון",
    icon: "fas fa-flag"
  }
];

function Testimonials() {
  // Create stars HTML
  const createStars = (count) => {
    return Array(count).fill(0).map((_, index) => (
      <i key={index} className="fas fa-star"></i>
    ));
  };

  return (
    <section id="testimonials" className="testimonials">
      <div className="testimonials-musical-notes">
        <div className="testimonials-note">♪</div>
      </div>
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">מה אומרים עליי</h2>
          <p className="section-subtitle">המלצות מלקוחות מרוצים</p>
        </div>

        <Swiper
          modules={[Pagination, Autoplay, Keyboard, A11y]}
          slidesPerView={3}
          spaceBetween={5}
          direction="horizontal"
          allowTouchMove={true}
          reverseDirection={true} // For RTL
          pagination={{
            el: '.testimonials .swiper-pagination',
            clickable: true,
          }}
          autoplay={{
            delay: 7000,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          }}
          breakpoints={{
            300: {
              slidesPerView: 1,
              spaceBetween: 10
            },
            501: {
              slidesPerView: 1,
              spaceBetween: 10
            },
            769: {
              slidesPerView: 1.20,
              spaceBetween: 10
            },
            1025: {
              slidesPerView: 1.15,
              spaceBetween: 10
            },
          }}
          a11y={{
            prevSlideMessage: 'המלצה קודמת',
            nextSlideMessage: 'המלצה הבאה',
            paginationBulletMessage: 'עבור להמלצה {{index}}',
          }}
          keyboard={{
            enabled: true,
            onlyInViewport: true,
          }}
          mousewheel={{
            enabled: false,
          }}
          loop={true}
          speed={500}
          effect="slide"
          grabCursor={true}
          centeredSlides={false}
          watchOverflow={true}
          className="mySwiper"
        >
          {testimonialsData.map((testimonial, index) => (
            <SwiperSlide key={index}>
              <div className="testimonial-content">
                <div className="quote-mark">"</div>
                <div className="testimonial-header">
                  <div className="testimonial-left">
                    <div className="profile-image">
                      <i className={testimonial.icon}></i>
                    </div>
                  </div>
                  <div className="author-info">
                    <h3 className="author-name">{testimonial.author}</h3>
                    <p className="author-event">{testimonial.event}</p>
                  </div>
                </div>
                <div className="testimonial-content-area">
                  <div className="stars">
                    {createStars(testimonial.stars)}
                  </div>
                  <p className="testimonial-text">{testimonial.text}</p>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Swiper Pagination */}
        <div className="swiper-pagination"></div>
      </div>
      <div className="testimonials-musical-notes">
        <div className="testimonials-note">♫</div>
      </div>
    </section>
  );
}

export default Testimonials;
