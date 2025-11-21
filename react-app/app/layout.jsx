import './globals.css'

export const metadata = {
  title: 'שירה בציבור מקצועית | אלון כהן - קלידן ומוביל שירה',
  description: '★ שירה בציבור מקצועית עם גיטרה, קלידים וזמר ★ אלון כהן מוביל אירועים עם מערכת בחירה אינטראקטיבית ✓ 200+ מופעים ✓ הזמינו עכשיו!',
  keywords: 'שירה בציבור, גיטרה, קלידים, זמר, אירועים',
  authors: [{ name: 'אלון כהן' }],
  creator: 'אלון כהן',
  publisher: 'שרים עם אלון כהן',
  robots: 'index, follow',
  icons: {
    icon: '/assets/logo.webp',
    shortcut: '/assets/logo.webp',
    apple: '/assets/logo.webp',
  },
  alternates: {
    canonical: 'https://singwithalon.com/',
    languages: {
      'he': 'https://singwithalon.com/',
      'he-IL': 'https://singwithalon.com/',
      'x-default': 'https://singwithalon.com/',
    },
  },
  openGraph: {
    title: 'שירה בציבור מקצועית | אלון כהן - קלידן מוביל שירה',
    description: '★ שירה בציבור מקצועית עם גיטרה, קלידים וזמר ★ מוביל אירועים עם מערכת בחירה אינטראקטיבית ✓ 200+ מופעים',
    url: 'https://singwithalon.com',
    siteName: 'שרים עם אלון כהן',
    locale: 'he_IL',
    type: 'website',
    images: [
      {
        url: 'https://singwithalon.com/assets/logo.webp',
        alt: 'שרים עם אלון כהן',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'שירה בציבור מקצועית | אלון כהן - קלידן מוביל שירה',
    description: '★ שירה בציבור מקצועית עם גיטרה, קלידים וזמר ★ מוביל אירועים עם מערכת בחירה אינטראקטיבית',
    images: ['https://singwithalon.com/assets/logo.webp'],
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        {/* Preload Critical Image for LCP */}
        <link rel="preload" as="image" href="/assets/tadmit_poster.webp" fetchPriority="high" />

        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
          integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;700&family=Secular+One&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
