import './globals.css'

export const metadata = {
  title: 'אלון כהן - מוזיקה ישראלית מקורית',
  description: 'אלון כהן - מוזיקאי ישראלי מקצועי מתמחה במוזיקה ישראלית מקורית. מופעים, אירועים פרטיים וחגיגות עם מגוון רחב של שירים ישראליים אהובים.',
  keywords: 'אלון כהן, מוזיקה ישראלית, זמר ישראלי, מופעים, אירועים, שירה בציבור, מוזיקאי, ביצועים חיים',
  authors: [{ name: 'אלון כהן' }],
  creator: 'אלון כהן',
  publisher: 'שרים עם אלון כהן',
  robots: 'index, follow',
  icons: {
    icon: '/assets/logo.webp',
    shortcut: '/assets/logo.webp',
    apple: '/assets/logo.webp',
  },
  openGraph: {
    title: 'אלון כהן - מוזיקה ישראלית מקורית',
    description: 'אלון כהן - מוזיקאי ישראלי מקצועי מתמחה במוזיקה ישראלית מקורית',
    url: 'https://singwithalon.com',
    siteName: 'שרים עם אלון כהן',
    locale: 'he_IL',
    type: 'website',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl">
      <head>
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
