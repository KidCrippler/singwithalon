'use client'

import { useState, useEffect } from 'react';
import { getAssetPath } from '../utils/assets.js';

function Navigation() {
  const logoAvif = getAssetPath('logo_png.avif');
  const logoWebp = getAssetPath('logo_png.webp');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [isScrolled, setIsScrolled] = useState(false);

  // Handle hamburger menu toggle
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const navbar = document.getElementById('navbar');
      if (isMenuOpen && navbar && !navbar.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Handle scroll effects
  useEffect(() => {
    const handleScroll = () => {
      // Navbar background change
      setIsScrolled(window.scrollY > 50);

      // Active section highlighting
      const sections = ['home', 'about', 'videos', 'services', 'testimonials', 'contact'];
      const scrollPosition = window.scrollY + 100;

      for (const sectionId of sections) {
        const section = document.getElementById(sectionId);
        if (section) {
          const { offsetTop, offsetHeight } = section;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Call once on mount

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Smooth scroll to section
  const scrollToSection = (sectionId, event) => {
    event.preventDefault();
    const section = document.getElementById(sectionId);

    if (section) {
      const navbarHeight = document.getElementById('navbar')?.offsetHeight || 80;
      const targetPosition = section.offsetTop - navbarHeight;

      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });

      // Close mobile menu after clicking
      setIsMenuOpen(false);
    }
  };

  return (
    <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`} id="navbar">
      <div className="nav-container">
        <div className="nav-logo">
          <picture>
            <source srcSet={logoAvif} type="image/avif" />
            <source srcSet={logoWebp} type="image/webp" />
            <img src={logoWebp} alt="שרים עם אלון כהן" className="logo" width="600" height="527" />
          </picture>
        </div>

        <ul className={`nav-menu ${isMenuOpen ? 'active' : ''}`} id="nav-menu">
          <li>
            <a
              href="#home"
              className={`nav-link ${activeSection === 'home' ? 'active' : ''}`}
              onClick={(e) => scrollToSection('home', e)}
            >
              בית
            </a>
          </li>
          <li>
            <a
              href="#about"
              className={`nav-link ${activeSection === 'about' ? 'active' : ''}`}
              onClick={(e) => scrollToSection('about', e)}
            >
              אודות
            </a>
          </li>
          <li>
            <a
              href="#videos"
              className={`nav-link ${activeSection === 'videos' ? 'active' : ''}`}
              onClick={(e) => scrollToSection('videos', e)}
            >
              וידאו
            </a>
          </li>
          <li>
            <a
              href="#services"
              className={`nav-link ${activeSection === 'services' ? 'active' : ''}`}
              onClick={(e) => scrollToSection('services', e)}
            >
              שירותים
            </a>
          </li>
          <li>
            <a
              href="#testimonials"
              className={`nav-link ${activeSection === 'testimonials' ? 'active' : ''}`}
              onClick={(e) => scrollToSection('testimonials', e)}
            >
              המלצות
            </a>
          </li>
          <li>
            <a
              href="#contact"
              className={`nav-link ${activeSection === 'contact' ? 'active' : ''}`}
              onClick={(e) => scrollToSection('contact', e)}
            >
              צור קשר
            </a>
          </li>
        </ul>

        <div
          className={`hamburger ${isMenuOpen ? 'active' : ''}`}
          onClick={toggleMenu}
          id="hamburger"
        >
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </nav>
  );
}

export default Navigation;
