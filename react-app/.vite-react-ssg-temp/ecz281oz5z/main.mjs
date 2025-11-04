import { jsxs, Fragment, jsx } from "react/jsx-runtime";
import { ViteReactSSG } from "vite-react-ssg/single-page";
function App() {
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("nav", { className: "navbar", id: "navbar", children: /* @__PURE__ */ jsxs("div", { className: "nav-container", children: [
      /* @__PURE__ */ jsx("div", { className: "nav-logo", children: /* @__PURE__ */ jsx("img", { src: "/assets/logo_png.webp", alt: "שרים עם אלון כהן", className: "logo", width: "3000", height: "2633" }) }),
      /* @__PURE__ */ jsxs("ul", { className: "nav-menu", id: "nav-menu", children: [
        /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx("a", { href: "#home", className: "nav-link", children: "בית" }) }),
        /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx("a", { href: "#about", className: "nav-link", children: "אודות" }) }),
        /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx("a", { href: "#videos", className: "nav-link", children: "וידאו" }) }),
        /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx("a", { href: "#services", className: "nav-link", children: "שירותים" }) }),
        /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx("a", { href: "#testimonials", className: "nav-link", children: "המלצות" }) }),
        /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx("a", { href: "#contact", className: "nav-link", children: "צור קשר" }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "hamburger", id: "hamburger", children: [
        /* @__PURE__ */ jsx("span", {}),
        /* @__PURE__ */ jsx("span", {}),
        /* @__PURE__ */ jsx("span", {})
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs("section", { id: "home", className: "hero", children: [
      /* @__PURE__ */ jsx("div", { className: "parallax-layer parallax-stars", "data-speed": "0.25" }),
      /* @__PURE__ */ jsx("div", { className: "parallax-layer parallax-mountains-behind", "data-speed": "0.5" }),
      /* @__PURE__ */ jsx("div", { className: "parallax-layer parallax-moon", "data-speed": "1.05" }),
      /* @__PURE__ */ jsx("div", { className: "parallax-layer parallax-mountains-front", "data-speed": "0" }),
      /* @__PURE__ */ jsxs("div", { className: "musical-notes-layer", children: [
        /* @__PURE__ */ jsx("div", { className: "floating-note note-1", children: "♪" }),
        /* @__PURE__ */ jsx("div", { className: "floating-note note-2", children: "♫" }),
        /* @__PURE__ */ jsx("div", { className: "floating-note note-3", children: "♬" }),
        /* @__PURE__ */ jsx("div", { className: "floating-note note-4", children: "♪" }),
        /* @__PURE__ */ jsx("div", { className: "floating-note note-5", children: "♫" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "hero-overlay" }),
      /* @__PURE__ */ jsxs("div", { className: "hero-content", children: [
        /* @__PURE__ */ jsxs("div", { className: "hero-text", children: [
          /* @__PURE__ */ jsxs("h1", { className: "hero-title", style: { fontSize: "2.5rem" }, children: [
            /* @__PURE__ */ jsx("span", { className: "title-main", children: "שרים עם אלון כהן" }),
            /* @__PURE__ */ jsx("span", { className: "title-subtitle", children: "שירה בציבור - מוזיקה ישראלית מכל התקופות" })
          ] }),
          /* @__PURE__ */ jsx("p", { className: "hero-description", children: "מוביל שירה בציבור עם רפרטואר עשיר של מאות רבות של שירים ישראליים מכל התקופות ומערכת בחירה אינטראקטיבית ייחודית המאפשרת לקהל לבחור ולשיר יחד איתי בזמן אמת." }),
          /* @__PURE__ */ jsxs("div", { className: "hero-buttons", children: [
            /* @__PURE__ */ jsx("a", { href: "#contact", className: "btn btn-primary", children: "הזמן שירה בציבור" }),
            /* @__PURE__ */ jsx("a", { href: "#videos", className: "btn btn-secondary", children: "צפה בסרטונים" })
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "hero-video", children: /* @__PURE__ */ jsxs("div", { className: "video-container", children: [
          /* @__PURE__ */ jsxs(
            "video",
            {
              id: "hero-video",
              controls: true,
              preload: "none",
              loading: "lazy",
              poster: "/assets/tadmit_poster.webp",
              width: "1920",
              height: "1080",
              children: [
                /* @__PURE__ */ jsx("source", { src: "https://pub-c512c10de2ad4c37a4e4998b005da1e8.r2.dev/tadmit.mp4", type: "video/mp4" }),
                /* @__PURE__ */ jsx("track", { kind: "captions", src: "#", srcLang: "he", label: "עברית", default: true }),
                "הדפדפן שלך אינו תומך בתגי וידאו."
              ]
            }
          ),
          /* @__PURE__ */ jsx("div", { className: "video-overlay", children: /* @__PURE__ */ jsx("button", { className: "video-play-btn", id: "video-play-btn", "aria-label": "נגן את הסרטון הראשי", children: /* @__PURE__ */ jsx("i", { className: "fas fa-play" }) }) })
        ] }) })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "scroll-indicator", children: /* @__PURE__ */ jsx("div", { className: "scroll-arrow", children: /* @__PURE__ */ jsx("i", { className: "fas fa-music" }) }) })
    ] }),
    /* @__PURE__ */ jsx("section", { id: "about", className: "about", children: /* @__PURE__ */ jsxs("div", { className: "container", children: [
      /* @__PURE__ */ jsxs("div", { className: "section-header", children: [
        /* @__PURE__ */ jsx("h2", { className: "section-title", children: "אודות אלון" }),
        /* @__PURE__ */ jsx("p", { className: "section-subtitle", children: "מוזיקאי, נגן וזמר מקצועי עם תשוקה למוזיקה ישראלית" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "about-content", children: [
        /* @__PURE__ */ jsxs("div", { className: "about-text", children: [
          /* @__PURE__ */ jsx("div", { className: "about-image-mobile", children: /* @__PURE__ */ jsx("img", { src: "/assets/about_en.webp", alt: "אלון כהן - קלידן, גיטריסט וזמר", className: "about-img-mobile", width: "1076", height: "1020", loading: "lazy" }) }),
          /* @__PURE__ */ jsxs("div", { className: "about-story", children: [
            /* @__PURE__ */ jsx("h3", { children: "הסיפור שלי" }),
            /* @__PURE__ */ jsx("p", { children: "לפני הכל אני קלידן המתמחה בהובלת שירה בציבור, אבל גם נגן גיטרה וזמר עם נסיון רב. האהבה האמיתית שלי היא שירי ארץ ישראל הישנה והטובה של פעם שמביאים את כולם לשיר יחד." }),
            /* @__PURE__ */ jsxs("p", { children: [
              "אני מאמין שמוזיקה היא השפה האוניברסלית שמחברת בין הדורות. בכל ",
              /* @__PURE__ */ jsx("a", { href: "#services", children: "מופע שלי" }),
              ", אני מוביל שירה בציבור שמביאה שמחה, נוסטלגיה ותחושת קהילה שמאחדת את כל המשתתפים. ",
              /* @__PURE__ */ jsx("a", { href: "#videos", children: "צפו בסרטונים שלי" }),
              " כדי לראות את האווירה המיוחדת שנוצרת."
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "about-highlights", children: [
            /* @__PURE__ */ jsxs("div", { className: "highlight-item", children: [
              /* @__PURE__ */ jsx("div", { className: "highlight-icon", children: /* @__PURE__ */ jsx("i", { className: "fas fa-compact-disc" }) }),
              /* @__PURE__ */ jsxs("div", { className: "highlight-content", children: [
                /* @__PURE__ */ jsx("h4", { children: "מעל 200 מופעים" }),
                /* @__PURE__ */ jsx("p", { children: "ניסיון רב בביצועים בכל סוגי האירועים" })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "highlight-item", children: [
              /* @__PURE__ */ jsx("div", { className: "highlight-icon", children: /* @__PURE__ */ jsx("i", { className: "fas fa-mobile-alt" }) }),
              /* @__PURE__ */ jsxs("div", { className: "highlight-content", children: [
                /* @__PURE__ */ jsx("h4", { children: "מערכת בחירה אינטראקטיבית" }),
                /* @__PURE__ */ jsx("p", { children: "הקהל בוחר בזמן אמת מתוך מאות שירים ברפרטואר" })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "highlight-item", children: [
              /* @__PURE__ */ jsx("div", { className: "highlight-icon", children: /* @__PURE__ */ jsx("i", { className: "fas fa-music" }) }),
              /* @__PURE__ */ jsxs("div", { className: "highlight-content", children: [
                /* @__PURE__ */ jsx("h4", { children: "מוביל שירה בציבור" }),
                /* @__PURE__ */ jsx("p", { children: "מיקרופונים אלחוטיים, הקרנת מילים וליווי מוזיקלי מלא - כולם שרים יחד!" })
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "about-image", children: /* @__PURE__ */ jsx("img", { src: "/assets/about_en.webp", alt: "אלון כהן - קלידן, גיטריסט וזמר", className: "about-img", width: "1076", height: "1020", loading: "lazy" }) })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx("section", { id: "videos", className: "videos", children: /* @__PURE__ */ jsxs("div", { className: "container", children: [
      /* @__PURE__ */ jsxs("div", { className: "section-header", children: [
        /* @__PURE__ */ jsx("h2", { className: "section-title", children: "גלריית וידאו" }),
        /* @__PURE__ */ jsx("p", { className: "section-subtitle", children: "צפו בביצועים שלי וקבלו טעימה מהמופעים" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "videos-grid", children: [
        /* @__PURE__ */ jsxs("div", { className: "video-card", children: [
          /* @__PURE__ */ jsxs("div", { className: "video-thumbnail", children: [
            /* @__PURE__ */ jsxs("picture", { children: [
              /* @__PURE__ */ jsx("source", { srcSet: "/assets/rony_poster.webp", type: "image/webp" }),
              /* @__PURE__ */ jsx("img", { src: "/assets/rony_poster.webp", alt: "שירי רוק פופ", width: "640", height: "352", loading: "lazy" })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "play-overlay", children: /* @__PURE__ */ jsx("button", { className: "play-btn", "data-video": "https://pub-c512c10de2ad4c37a4e4998b005da1e8.r2.dev/rony.mp4", "aria-label": "נגן וידאו - שירי רוק פופ", children: /* @__PURE__ */ jsx("i", { className: "fas fa-play" }) }) }),
            /* @__PURE__ */ jsx("div", { className: "video-duration", children: "1:11" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "video-info", children: [
            /* @__PURE__ */ jsx("h3", { children: "אנרגיה ישראלית" }),
            /* @__PURE__ */ jsx("p", { children: "״רוני״ של גזוז - שמח ומשמח!" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "video-card", children: [
          /* @__PURE__ */ jsxs("div", { className: "video-thumbnail", children: [
            /* @__PURE__ */ jsxs("picture", { children: [
              /* @__PURE__ */ jsx("source", { srcSet: "/assets/jam_toren_poster.webp", type: "image/webp" }),
              /* @__PURE__ */ jsx("img", { src: "/assets/jam_toren_poster.webp", alt: "ביצוע אקוסטי", width: "640", height: "304", loading: "lazy" })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "play-overlay", children: /* @__PURE__ */ jsx("button", { className: "play-btn", "data-video": "https://pub-c512c10de2ad4c37a4e4998b005da1e8.r2.dev/jam_toren.mp4", "aria-label": "נגן וידאו - ביצוע אקוסטי", children: /* @__PURE__ */ jsx("i", { className: "fas fa-play" }) }) }),
            /* @__PURE__ */ jsx("div", { className: "video-duration", children: "1:37" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "video-info", children: [
            /* @__PURE__ */ jsx("h3", { children: "ביצוע אקוסטי" }),
            /* @__PURE__ */ jsx("p", { children: "לבן על לבן - מג׳מג׳ם ספונטנית עם דן תורן ז״ל" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "video-card", children: [
          /* @__PURE__ */ jsxs("div", { className: "video-thumbnail", children: [
            /* @__PURE__ */ jsxs("picture", { children: [
              /* @__PURE__ */ jsx("source", { srcSet: "/assets/borot_poster.webp", type: "image/webp" }),
              /* @__PURE__ */ jsx("img", { src: "/assets/borot_poster.webp", alt: "שירי ארץ ישראל", width: "1280", height: "720", loading: "lazy" })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "play-overlay", children: /* @__PURE__ */ jsx("button", { className: "play-btn", "data-video": "https://pub-c512c10de2ad4c37a4e4998b005da1e8.r2.dev/borot.mp4", "aria-label": "נגן וידאו - שירי ארץ ישראל", children: /* @__PURE__ */ jsx("i", { className: "fas fa-play" }) }) }),
            /* @__PURE__ */ jsx("div", { className: "video-duration", children: "3:16" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "video-info", children: [
            /* @__PURE__ */ jsx("h3", { children: "שירי ארץ ישראל" }),
            /* @__PURE__ */ jsx("p", { children: "אל בורות המים - קלאסיקה של נעמי שמר" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "video-card", children: [
          /* @__PURE__ */ jsxs("div", { className: "video-thumbnail", children: [
            /* @__PURE__ */ jsxs("picture", { children: [
              /* @__PURE__ */ jsx("source", { srcSet: "/assets/kvar_avar_poster.webp", type: "image/webp" }),
              /* @__PURE__ */ jsx("img", { src: "/assets/kvar_avar_poster.webp", alt: "שירי זיכרון", width: "848", height: "478", loading: "lazy" })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "play-overlay", children: /* @__PURE__ */ jsx("button", { className: "play-btn", "data-video": "https://pub-c512c10de2ad4c37a4e4998b005da1e8.r2.dev/kvar_avar.mp4", "aria-label": "נגן וידאו - שירי זיכרון", children: /* @__PURE__ */ jsx("i", { className: "fas fa-play" }) }) }),
            /* @__PURE__ */ jsx("div", { className: "video-duration", children: "5:07" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "video-info", children: [
            /* @__PURE__ */ jsx("h3", { children: "שירי זיכרון" }),
            /* @__PURE__ */ jsx("p", { children: "קאבר גיטרה - מה רצינו להגיד (שלמה ארצי)" })
          ] })
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx("section", { id: "services", className: "services", children: /* @__PURE__ */ jsxs("div", { className: "container", children: [
      /* @__PURE__ */ jsx("div", { className: "section-header", children: /* @__PURE__ */ jsx("h2", { className: "section-title", children: "מוזיקה לכל סוגי האירועים" }) }),
      /* @__PURE__ */ jsxs("div", { className: "services-grid", children: [
        /* @__PURE__ */ jsxs("div", { className: "service-card featured", children: [
          /* @__PURE__ */ jsx("div", { className: "service-badge", children: "הייחודיות שלי" }),
          /* @__PURE__ */ jsx("div", { className: "service-icon", children: /* @__PURE__ */ jsx("i", { className: "fas fa-music" }) }),
          /* @__PURE__ */ jsx("h3", { children: "הופעה אינטראקטיבית משולבת קהל" }),
          /* @__PURE__ */ jsx("p", { children: "חידוש יחיד מסוגו! הקהל נכנס לאתר ובוחר שירים בזמן אמת מתוך מאות שירים ברפרטואר. כל אורח יכול להזמין את השיר שהוא הכי אוהב והוא יבוצע במהלך הערב!" }),
          /* @__PURE__ */ jsxs("ul", { className: "service-features", children: [
            /* @__PURE__ */ jsx("li", { children: "מאות שירים זמינים לבחירה" }),
            /* @__PURE__ */ jsx("li", { children: "מערכת הזמנות שירים בזמן אמת" }),
            /* @__PURE__ */ jsx("li", { children: "אווירה אינטראקטיבית ייחודית" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "service-card", children: [
          /* @__PURE__ */ jsx("div", { className: "service-icon", children: /* @__PURE__ */ jsx("i", { className: "fas fa-users" }) }),
          /* @__PURE__ */ jsx("h3", { children: "שירה בציבור מקצועית" }),
          /* @__PURE__ */ jsx("p", { children: "הובלת שירה בציבור עם כל הציוד הדרוש - מיקרופונים אלחוטיים לקהל, הקרנת מילים והגברה מקצועית. כולם שרים יחד בקלות ובכיף!" }),
          /* @__PURE__ */ jsxs("ul", { className: "service-features", children: [
            /* @__PURE__ */ jsx("li", { children: "מיקרופונים אלחוטיים לקהל" }),
            /* @__PURE__ */ jsx("li", { children: "הקרנת מילים מקצועית" }),
            /* @__PURE__ */ jsx("li", { children: "הגברה מותאמת לגודל הקבוצה" }),
            /* @__PURE__ */ jsx("li", { children: "ליווי מוזיקלי מלא לכל שיר" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "service-card", children: [
          /* @__PURE__ */ jsx("div", { className: "service-icon", children: /* @__PURE__ */ jsx("i", { className: "fas fa-microphone-alt" }) }),
          /* @__PURE__ */ jsx("h3", { children: "הפקת שירים ואולפן ביתי" }),
          /* @__PURE__ */ jsx("p", { children: "הקלטת קאברים מקצועית באולפן פרטי ברמת גן עם ציוד חדיש ויחס אישי. מפיק מוזיקלי מנוסה שיוצר איתכם קאבר תפור למידה - מפלייבק מקורי או חדש שנבנה מאפס." }),
          /* @__PURE__ */ jsxs("ul", { className: "service-features", children: [
            /* @__PURE__ */ jsx("li", { children: "אולפן מאובזר וחדיש ברמת גן" }),
            /* @__PURE__ */ jsx("li", { children: "הקלטה על פלייבק מקורי או חדש" }),
            /* @__PURE__ */ jsx("li", { children: "קאברים לאירועים מיוחדים" }),
            /* @__PURE__ */ jsx("li", { children: "שירים עם מילים מותאמות אישית" }),
            /* @__PURE__ */ jsx("li", { children: "מחירים מיוחדים ללקוחות מופעים" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "service-card", children: [
          /* @__PURE__ */ jsx("div", { className: "service-icon", children: /* @__PURE__ */ jsx("i", { className: "fas fa-guitar" }) }),
          /* @__PURE__ */ jsx("h3", { children: "אופציות נוספות" }),
          /* @__PURE__ */ jsxs("p", { children: [
            "ניתן להוסיף נגנים נוספים לאווירה מלאה יותר, או להזמין שירותי קייטרינג משלימים לאירוע המושלם דרך ",
            /* @__PURE__ */ jsx("a", { href: "https://greendaytlv.com", target: "_blank", rel: "noopener", children: "גרין דיי" }),
            "."
          ] }),
          /* @__PURE__ */ jsxs("ul", { className: "service-features", children: [
            /* @__PURE__ */ jsx("li", { children: "אופציה להוספת נגנים" }),
            /* @__PURE__ */ jsxs("li", { children: [
              "שירותי קייטרינג (בשיתוף עם ",
              /* @__PURE__ */ jsx("a", { href: "https://greendaytlv.com", target: "_blank", rel: "noopener", children: "גרין דיי" }),
              ")"
            ] }),
            /* @__PURE__ */ jsx("li", { children: "תכנון וייעוץ לאירוע" }),
            /* @__PURE__ */ jsx("li", { children: "הוספת שירים מיוחדים לרפרטואר" })
          ] })
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx("section", { id: "testimonials", className: "testimonials", children: /* @__PURE__ */ jsxs("div", { className: "container", children: [
      /* @__PURE__ */ jsxs("div", { className: "section-header", children: [
        /* @__PURE__ */ jsx("h2", { className: "section-title", children: "מה אומרים עליי" }),
        /* @__PURE__ */ jsx("p", { className: "section-subtitle", children: "המלצות מלקוחות מרוצים" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "swiper-container mySwiper", children: [
        /* @__PURE__ */ jsx("div", { className: "swiper-wrapper" }),
        /* @__PURE__ */ jsx("div", { className: "swiper-pagination" })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx("section", { id: "contact", className: "contact", children: /* @__PURE__ */ jsxs("div", { className: "container", children: [
      /* @__PURE__ */ jsxs("div", { className: "section-header", children: [
        /* @__PURE__ */ jsx("h2", { className: "section-title", children: "בואו נתחיל לתכנן את האירוע שלכם" }),
        /* @__PURE__ */ jsx("p", { className: "section-subtitle", children: "צרו איתי קשר ונבנה יחד את החוויה המוזיקלית המושלמת עבורכם" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "contact-content", children: [
        /* @__PURE__ */ jsxs("div", { className: "contact-info", children: [
          /* @__PURE__ */ jsxs("div", { className: "contact-item", children: [
            /* @__PURE__ */ jsx("div", { className: "contact-icon", children: /* @__PURE__ */ jsx("i", { className: "fas fa-phone" }) }),
            /* @__PURE__ */ jsxs("div", { className: "contact-details", children: [
              /* @__PURE__ */ jsx("h3", { children: "טלפון" }),
              /* @__PURE__ */ jsx("p", { children: /* @__PURE__ */ jsx("a", { href: "tel:+972528962110", dir: "ltr", children: "052-896-2110" }) })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "contact-item", children: [
            /* @__PURE__ */ jsx("div", { className: "contact-icon", children: /* @__PURE__ */ jsx("i", { className: "fas fa-envelope" }) }),
            /* @__PURE__ */ jsxs("div", { className: "contact-details", children: [
              /* @__PURE__ */ jsx("h3", { children: "אימייל" }),
              /* @__PURE__ */ jsx("p", { children: /* @__PURE__ */ jsx("a", { href: "mailto:contact@singwithalon.com", dir: "ltr", children: "contact@singwithalon.com" }) })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "contact-item", children: [
            /* @__PURE__ */ jsx("div", { className: "contact-icon", children: /* @__PURE__ */ jsx("i", { className: "fab fa-whatsapp" }) }),
            /* @__PURE__ */ jsxs("div", { className: "contact-details", children: [
              /* @__PURE__ */ jsx("h3", { children: "WhatsApp" }),
              /* @__PURE__ */ jsx("p", { children: /* @__PURE__ */ jsx("a", { href: "https://wa.me/972528962110", dir: "ltr", children: "052-896-2110" }) })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "contact-form", children: /* @__PURE__ */ jsxs("form", { id: "contact-form", children: [
          /* @__PURE__ */ jsxs("div", { className: "form-row", children: [
            /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
              /* @__PURE__ */ jsx("label", { htmlFor: "name", children: "שם מלא" }),
              /* @__PURE__ */ jsx("input", { type: "text", id: "name", name: "name", required: true })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
              /* @__PURE__ */ jsx("label", { htmlFor: "phone", children: "טלפון" }),
              /* @__PURE__ */ jsx("input", { type: "tel", id: "phone", name: "phone", required: true })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsx("label", { htmlFor: "date", children: "תאריך מועדף" }),
            /* @__PURE__ */ jsx("input", { type: "date", id: "date", name: "date", required: true })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
            /* @__PURE__ */ jsx("label", { htmlFor: "message", children: "פרטים נוספים על האירוע" }),
            /* @__PURE__ */ jsx("textarea", { id: "message", name: "message", rows: "4", placeholder: "ספרו לי קצת על האירוע - מספר אורחים, מיקום, סוג האירוע, שירים מיוחדים שתרצו לשמוע..." })
          ] }),
          /* @__PURE__ */ jsxs("button", { type: "submit", className: "btn btn-primary", "aria-label": "שלח הודעה", children: [
            /* @__PURE__ */ jsx("i", { className: "fab fa-whatsapp" }),
            "שלח הודעת WhatsApp"
          ] })
        ] }) })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx("footer", { className: "footer", children: /* @__PURE__ */ jsxs("div", { className: "container", children: [
      /* @__PURE__ */ jsxs("div", { className: "footer-content", children: [
        /* @__PURE__ */ jsxs("div", { className: "footer-logo", children: [
          /* @__PURE__ */ jsxs("picture", { children: [
            /* @__PURE__ */ jsx("source", { srcSet: "/assets/logo.webp", type: "image/webp" }),
            /* @__PURE__ */ jsx("img", { src: "/assets/logo.webp", alt: "שרים עם אלון כהן", width: "68", height: "60", loading: "lazy" })
          ] }),
          /* @__PURE__ */ jsx("p", { children: "קלידן, גיטריסט וזמר - שירי ארץ ישראל הישנה והטובה עם מערכת בחירה אינטראקטיבית" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "footer-links", children: [
          /* @__PURE__ */ jsx("h4", { children: "קישורים מהירים" }),
          /* @__PURE__ */ jsxs("ul", { children: [
            /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx("a", { href: "#home", children: "בית" }) }),
            /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx("a", { href: "#about", children: "אודות" }) }),
            /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx("a", { href: "#videos", children: "וידאו" }) }),
            /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx("a", { href: "#services", children: "שירותים" }) }),
            /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx("a", { href: "#contact", children: "צור קשר" }) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "footer-contact", children: [
          /* @__PURE__ */ jsx("h4", { children: "צור קשר" }),
          /* @__PURE__ */ jsx("p", { dir: "ltr", children: "052-896-2110" }),
          /* @__PURE__ */ jsx("p", { dir: "ltr", children: "contact@singwithalon.com" })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "footer-bottom", children: /* @__PURE__ */ jsx("p", { children: "© 2025 שרים עם אלון כהן. כל הזכויות שמורות." }) })
    ] }) }),
    /* @__PURE__ */ jsx("div", { id: "video-modal", className: "video-modal", children: /* @__PURE__ */ jsxs("div", { className: "video-modal-content", children: [
      /* @__PURE__ */ jsx("button", { className: "video-modal-close", "aria-label": "סגור חלון וידאו", children: "×" }),
      /* @__PURE__ */ jsxs("video", { id: "modal-video", controls: true, children: [
        /* @__PURE__ */ jsx("source", { src: "", type: "video/mp4" }),
        /* @__PURE__ */ jsx("track", { kind: "captions", src: "#", srcLang: "he", label: "עברית", default: true })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs("div", { id: "chatbot-widget", className: "chatbot-widget", children: [
      /* @__PURE__ */ jsxs("button", { id: "chat-toggle", className: "chat-toggle", "aria-label": "פתח צ'אט", children: [
        /* @__PURE__ */ jsx("i", { className: "fas fa-comments" }),
        /* @__PURE__ */ jsx("i", { className: "fas fa-times" }),
        /* @__PURE__ */ jsx("div", { className: "chat-notification-badge", children: "💬" })
      ] }),
      /* @__PURE__ */ jsx("div", { id: "chat-tooltip", className: "chat-tooltip", children: "יש לכם שאלות? אני כאן לעזור! 🎵" }),
      /* @__PURE__ */ jsxs("div", { id: "chat-modal", className: "chat-modal", children: [
        /* @__PURE__ */ jsxs("div", { className: "chat-header", children: [
          /* @__PURE__ */ jsx("div", { className: "chat-avatar", children: /* @__PURE__ */ jsx("i", { className: "fas fa-music" }) }),
          /* @__PURE__ */ jsxs("div", { className: "chat-info", children: [
            /* @__PURE__ */ jsx("h4", { children: "אלון כהן" }),
            /* @__PURE__ */ jsx("span", { className: "chat-status", children: "זמין לשיחה" })
          ] }),
          /* @__PURE__ */ jsx("button", { id: "chat-close", className: "chat-close", "aria-label": "סגור צ'אט", children: /* @__PURE__ */ jsx("i", { className: "fas fa-times" }) })
        ] }),
        /* @__PURE__ */ jsx("div", { id: "chat-messages", className: "chat-messages", children: /* @__PURE__ */ jsxs("div", { className: "message bot-message", children: [
          /* @__PURE__ */ jsx("div", { className: "message-avatar", children: /* @__PURE__ */ jsx("i", { className: "fas fa-music" }) }),
          /* @__PURE__ */ jsxs("div", { className: "message-content", children: [
            /* @__PURE__ */ jsx("p", { children: "שלום! אני כאן לעזור לכם עם כל שאלה על השירותים המוזיקליים שלי. איך אוכל לעזור?" }),
            /* @__PURE__ */ jsx("span", { className: "message-time", children: "עכשיו" })
          ] })
        ] }) }),
        /* @__PURE__ */ jsxs("div", { className: "chat-input-container", children: [
          /* @__PURE__ */ jsxs("div", { className: "chat-typing", id: "chat-typing", style: { display: "none" }, children: [
            /* @__PURE__ */ jsxs("div", { className: "typing-indicator", children: [
              /* @__PURE__ */ jsx("span", {}),
              /* @__PURE__ */ jsx("span", {}),
              /* @__PURE__ */ jsx("span", {})
            ] }),
            /* @__PURE__ */ jsx("span", { children: "אלון מקליד..." })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "chat-input", children: [
            /* @__PURE__ */ jsx("input", { type: "text", id: "chat-input-field", placeholder: "כתבו את השאלה שלכם...", maxLength: "500" }),
            /* @__PURE__ */ jsx("button", { id: "chat-send", className: "chat-send", disabled: true, "aria-label": "שלח הודעה בצ'אט", children: /* @__PURE__ */ jsx("i", { className: "fas fa-paper-plane" }) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "chat-suggestions", children: [
            /* @__PURE__ */ jsx("button", { className: "suggestion-btn", "aria-label": "שאל על מה כלול במופע אינטראקטיבי", children: "מה כלול במופע אינטראקטיבי?" }),
            /* @__PURE__ */ jsx("button", { className: "suggestion-btn", "aria-label": "שאל על מחיר מופע לאירוע של 50 איש", children: "כמה עולה מופע לאירוע של 50 איש?" }),
            /* @__PURE__ */ jsx("button", { className: "suggestion-btn", "aria-label": "שאל על מערכת בחירת השירים", children: "איך פועלת מערכת בחירת השירים?" })
          ] })
        ] })
      ] })
    ] })
  ] });
}
const createRoot = ViteReactSSG(/* @__PURE__ */ jsx(App, {}));
export {
  createRoot
};
