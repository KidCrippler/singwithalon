'use client'

import { useState, useEffect } from 'react';
import { getAssetPath } from '../utils/assets';

/**
 * Navigation component with Tailwind styling
 * Replaces .navbar, .nav-container, .nav-logo, .nav-menu, .nav-link, .hamburger from legacy CSS
 * Underline animation uses custom .nav-link-underline class from globals.css
 */

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
    <nav
      className={`fixed top-0 w-full bg-white/95 backdrop-blur-[10px] z-[1000] transition-all duration-300 ${
        isScrolled ? 'py-[10px] shadow-[0_2px_20px_rgba(0,0,0,0.1)]' : 'py-[15px]'
      }`}
      id="navbar"
    >
      <div className="max-w-[1200px] mx-auto px-5 flex justify-between items-center">
        {/* Logo */}
        <div>
          <picture>
            <source srcSet={logoAvif} type="image/avif" />
            <source srcSet={logoWebp} type="image/webp" />
            <img
              src={logoWebp}
              alt="שרים עם אלון כהן"
              className="h-[55px] w-auto"
              width="600"
              height="527"
            />
          </picture>
        </div>

        {/* Navigation Menu */}
        <ul
          className={`list-none m-0 fixed top-[80px] w-full text-center transition-all duration-300 shadow-[0_10px_27px_rgba(139,95,191,0.1)] py-5 gap-[15px] bg-white flex-col md:static md:flex-row md:bg-transparent md:w-auto md:text-right md:shadow-none md:py-0 md:gap-[30px] ${
            isMenuOpen ? 'right-0 flex' : '-right-full flex'
          } md:flex`}
          id="nav-menu"
        >
          <li>
            <a
              href="#home"
              className={`no-underline text-[#333] font-medium transition-colors duration-300 relative nav-link-underline hover:text-primary ${
                activeSection === 'home' ? 'active text-primary' : ''
              }`}
              onClick={(e) => scrollToSection('home', e)}
            >
              בית
            </a>
          </li>
          <li>
            <a
              href="#about"
              className={`no-underline text-[#333] font-medium transition-colors duration-300 relative nav-link-underline hover:text-primary ${
                activeSection === 'about' ? 'active text-primary' : ''
              }`}
              onClick={(e) => scrollToSection('about', e)}
            >
              אודות
            </a>
          </li>
          <li>
            <a
              href="#videos"
              className={`no-underline text-[#333] font-medium transition-colors duration-300 relative nav-link-underline hover:text-primary ${
                activeSection === 'videos' ? 'active text-primary' : ''
              }`}
              onClick={(e) => scrollToSection('videos', e)}
            >
              וידאו
            </a>
          </li>
          <li>
            <a
              href="#services"
              className={`no-underline text-[#333] font-medium transition-colors duration-300 relative nav-link-underline hover:text-primary ${
                activeSection === 'services' ? 'active text-primary' : ''
              }`}
              onClick={(e) => scrollToSection('services', e)}
            >
              שירותים
            </a>
          </li>
          <li>
            <a
              href="#testimonials"
              className={`no-underline text-[#333] font-medium transition-colors duration-300 relative nav-link-underline hover:text-primary ${
                activeSection === 'testimonials' ? 'active text-primary' : ''
              }`}
              onClick={(e) => scrollToSection('testimonials', e)}
            >
              המלצות
            </a>
          </li>
          <li>
            <a
              href="#contact"
              className={`no-underline text-[#333] font-medium transition-colors duration-300 relative nav-link-underline hover:text-primary ${
                activeSection === 'contact' ? 'active text-primary' : ''
              }`}
              onClick={(e) => scrollToSection('contact', e)}
            >
              צור קשר
            </a>
          </li>
        </ul>

        {/* Hamburger Menu */}
        <div
          className="flex md:hidden flex-col cursor-pointer gap-1"
          onClick={toggleMenu}
          id="hamburger"
        >
          <span className="w-[25px] h-[3px] bg-primary transition-all duration-300 rounded-sm"></span>
          <span className="w-[25px] h-[3px] bg-primary transition-all duration-300 rounded-sm"></span>
          <span className="w-[25px] h-[3px] bg-primary transition-all duration-300 rounded-sm"></span>
        </div>
      </div>
    </nav>
  );
}

export default Navigation;
