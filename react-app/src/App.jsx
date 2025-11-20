import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Navigation from './components/Navigation';
import Hero from './components/Hero';
import About from './components/About';
import VideoGallery from './components/VideoGallery';
import Services from './components/Services';
import ContactForm from './components/ContactForm';
import Testimonials from './components/Testimonials';
import Footer from './components/Footer';
import Chatbot from './components/Chatbot';

// Lazy load VideoPage for better initial load performance
const VideoPage = lazy(() => import('./components/VideoPage'));

// HomePage component - all main sections
function HomePage() {
  return (
    <>
      <Helmet>
        <title>שירה בציבור מקצועית | אלון כהן - קלידן ומוביל שירה</title>
        <meta name="description" content="★ שירה בציבור מקצועית עם גיטרה, קלידים וזמר ★ אלון כהן מוביל אירועים עם מערכת בחירה אינטראקטיבית ✓ 200+ מופעים ✓ הזמינו עכשיו!" />

        {/* SEO Meta Tags */}
        <meta name="keywords" content="שירה בציבור, גיטרה, קלידים, זמר, אירועים" />
        <meta name="author" content="אלון כהן" />
        <meta name="robots" content="index, follow" />

        {/* Open Graph Meta Tags */}
        <meta property="og:title" content="שירה בציבור מקצועית | אלון כהן - קלידן מוביל שירה" />
        <meta property="og:description" content="★ שירה בציבור מקצועית עם גיטרה, קלידים וזמר ★ מוביל אירועים עם מערכת בחירה אינטראקטיבית ✓ 200+ מופעים" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://singwithalon.com" />
        <meta property="og:image" content="https://singwithalon.com/assets/logo.webp" />
        <meta property="og:locale" content="he_IL" />
        <meta property="og:site_name" content="שרים עם אלון כהן" />

        {/* Twitter Card Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="שירה בציבור מקצועית | אלון כהן - קלידן מוביל שירה" />
        <meta name="twitter:description" content="★ שירה בציבור מקצועית עם גיטרה, קלידים וזמר ★ מוביל אירועים עם מערכת בחירה אינטראקטיבית" />
        <meta name="twitter:image" content="https://singwithalon.com/assets/logo.webp" />

        {/* Canonical URL */}
        <link rel="canonical" href="https://singwithalon.com/" />

        {/* Language and Regional Targeting */}
        <link rel="alternate" hreflang="he" href="https://singwithalon.com/" />
        <link rel="alternate" hreflang="he-IL" href="https://singwithalon.com/" />
        <link rel="alternate" hreflang="x-default" href="https://singwithalon.com/" />

        {/* Preload Critical Image for LCP */}
        <link rel="preload" as="image" href="/assets/tadmit_poster.webp" fetchpriority="high" />
      </Helmet>

      <Navigation />
      <Hero />
      <About />
      <VideoGallery />
      <Services />
      <Testimonials />
      <ContactForm />
      <Footer />
      <Chatbot />
    </>
  );
}

function App() {
  return (
    <Routes>
      {/* Main homepage */}
      <Route path="/" element={<HomePage />} />

      {/* Video pages - lazy loaded */}
      <Route
        path="/video/:videoId"
        element={
          <Suspense fallback={<div style={{minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>טוען...</div>}>
            <VideoPage />
          </Suspense>
        }
      />
    </Routes>
  );
}

export default App
