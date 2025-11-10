# שרים עם אלון כהן - אתר נחיתה

אתר נחיתה מקצועי עבור אלון כהן - זמר וגיטריסט מקצועי המתמחה במוזיקה ישראלית.

## תכונות

- **React 19** - אפליקציית React מודרנית עם Vite
- **עיצוב RTL מלא** - תמיכה בעברית מ-HTML ועד CSS
- **עיצוב רספונסיבי** - נראה מושלם בכל המכשירים
- **גלריית וידאו** - הצגה מקצועית של קטעי וידאו עם modal
- **טופס יצירת קשר** - אינטגרציה עם WhatsApp
- **אנימציות חלקות** - חוויית משתמש מתקדמת
- **Prerendering אוטומטי** - SEO מושלם עם Puppeteer
- **ביצועים מותאמים** - טעינה מהירה ואופטימיזציה

## מבנה הקבצים

```
singwithalon/
├── react-app/              # אפליקציית React
│   ├── src/
│   │   ├── components/    # קומפוננטות React
│   │   ├── App.jsx       # קומפוננטת האפליקציה הראשית
│   │   └── main.jsx      # נקודת הכניסה
│   ├── public/
│   │   ├── assets/       # תמונות ומדיה
│   │   ├── CNAME        # הגדרת דומיין מותאם
│   │   ├── robots.txt   # SEO
│   │   └── sitemap.xml  # SEO
│   ├── scripts/
│   │   └── prerender.js # סקריפט prerendering
│   ├── package.json
│   └── vite.config.js
├── video/                 # דפי וידאו נפרדים (SEO)
├── CLAUDE.md             # הוראות למערכת Claude Code
└── README.md            # הקובץ הזה
```

## פיתוח מקומי

### התקנה ראשונית

```bash
cd react-app
npm install --legacy-peer-deps
```

### הרצת שרת פיתוח

```bash
cd react-app
npm run dev
```

האתר יהיה זמין ב-`http://localhost:5173`

### בניית האפליקציה

```bash
cd react-app
npm run build
```

הפקודה תייצר:
1. Build של Vite → תיקיית `dist/`
2. Prerendering אוטומטי עם Puppeteer → `dist/index.html` מלא בתוכן

## פרסום ל-GitHub Pages

האתר מפורסם אוטומטית ל-GitHub Pages בדומיין המותאם `singwithalon.com`.

### פרסום לפרודקשן

```bash
cd react-app
npm run deploy
```

הפקודה תבצע:
1. בנייה מלאה עם prerendering
2. פרסום לענף `gh-pages`
3. האתר יתעדכן ב-`singwithalon.com` תוך דקה-שתיים

### הגדרות GitHub Pages

בהגדרות ה-repository:
- **Source**: Deploy from branch `gh-pages`
- **Folder**: `/ (root)`
- **Custom domain**: `singwithalon.com`

### הגדרות DNS (Cloudflare)

רשומות DNS:
- `A` records ל-GitHub Pages IPs (DNS-only, לא Proxied)
- `CNAME` record: `www` → `kidcrippler.github.io`

## עריכת תוכן

### עדכון טקסטים

כל התוכן נמצא בקומפוננטות React ב-`react-app/src/components/`:
- `Hero.jsx` - סקשן ראשי
- `About.jsx` - סקשן אודות
- `VideoGallery.jsx` - גלריית וידאו
- `Services.jsx` - שירותים
- `Testimonials.jsx` - המלצות
- `ContactForm.jsx` - טופס יצירת קשר
- `Footer.jsx` - פוטר

### הוספת תמונות

הוסף תמונות ל-`react-app/public/assets/` ועדכן את הקומפוננטות בהתאם.

**חשוב:** השתמש ב-`import.meta.env.BASE_URL` לנתיבי תמונות:
```jsx
<img src={`${import.meta.env.BASE_URL}assets/my-image.webp`} />
```

## תכונות טכניות

האתר נבנה עם:
- **React 19.1** - ספריית UI מודרנית
- **Vite 7** - כלי build מהיר
- **Tailwind CSS** - עיצוב utility-first
- **Embla Carousel** - קרוסלת המלצות
- **Puppeteer** - prerendering לSEO
- **GitHub Pages** - אירוח סטטי
- **גופנים**: Heebo + Secular One עבור עברית

## רישיון

כל הזכויות שמורות לאלון כהן © 2024
