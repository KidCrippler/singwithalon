export const metadata = {
  title: 'אלון כהן - מוזיקה ישראלית מקורית',
  description: 'אלון כהן - מוזיקאי ומבצע ישראלי מקצועי',
}

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  )
}
