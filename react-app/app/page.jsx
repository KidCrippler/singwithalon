import Navigation from './components/Navigation'
import Hero from './components/Hero'
import About from './components/About'
import VideoGallery from './components/VideoGallery'
import Services from './components/Services'
import Testimonials from './components/Testimonials'
import ContactForm from './components/ContactForm'
import Footer from './components/Footer'
import Chatbot from './components/Chatbot'

export default function Home() {
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
  )
}
