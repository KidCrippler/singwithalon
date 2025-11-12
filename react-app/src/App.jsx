import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
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
