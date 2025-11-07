import Navigation from './components/Navigation';
import Hero from './components/Hero';
import About from './components/About';
import VideoGallery from './components/VideoGallery';
import Services from './components/Services';
import ContactForm from './components/ContactForm';
import Testimonials from './components/Testimonials';
import Footer from './components/Footer';
import Chatbot from './components/Chatbot';

function App() {
  return (
    <>
      <Navigation />
      <Hero />
      <About />
      <VideoGallery />
      <Services />
      <Testimonials />

      {/* Contact Section */}
      <ContactForm />
      <Footer />
      <Chatbot />
    </>
  )
}

export default App
