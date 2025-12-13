'use client'

import { getAssetPath } from '../utils/assets';

/**
 * Footer component with Tailwind styling
 * Replaces .footer, .footer-content, .footer-logo, .footer-links, .footer-contact, .footer-bottom from legacy CSS
 */

function Footer() {
  const logoAvif = getAssetPath('logo.avif');
  const logoWebp = getAssetPath('logo.webp');

  return (
    <footer className="bg-[#2c3e50] text-white pt-[60px] pb-[30px]">
      <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
        {/* Footer content - responsive grid */}
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-10 mb-10 text-center md:text-right">
          {/* Logo section */}
          <div className="flex flex-col items-center">
            <picture className="mb-5">
              <source srcSet={logoAvif} type="image/avif" />
              <source srcSet={logoWebp} type="image/webp" />
              <img
                src={logoWebp}
                alt="שרים עם אלון כהן"
                width="2048"
                height="2080"
                loading="lazy"
                className="w-[100px] h-[100px] md:w-[140px] md:h-[140px] object-contain rounded-lg"
              />
            </picture>
            <p className="text-[#bdc3c7] leading-relaxed">
              קלידן, גיטריסט וזמר - שירי ארץ ישראל הישנה והטובה עם מערכת בחירה אינטראקטיבית
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-white mb-5 font-semibold">קישורים מהירים</h4>
            <ul className="list-none">
              <li className="mb-2.5">
                <a href="#home" className="text-[#bdc3c7] no-underline transition-colors duration-300 hover:text-primary">
                  בית
                </a>
              </li>
              <li className="mb-2.5">
                <a href="#about" className="text-[#bdc3c7] no-underline transition-colors duration-300 hover:text-primary">
                  אודות
                </a>
              </li>
              <li className="mb-2.5">
                <a href="#videos" className="text-[#bdc3c7] no-underline transition-colors duration-300 hover:text-primary">
                  וידאו
                </a>
              </li>
              <li className="mb-2.5">
                <a href="#services" className="text-[#bdc3c7] no-underline transition-colors duration-300 hover:text-primary">
                  שירותים
                </a>
              </li>
              <li className="mb-2.5">
                <a href="#contact" className="text-[#bdc3c7] no-underline transition-colors duration-300 hover:text-primary">
                  צור קשר
                </a>
              </li>
            </ul>
          </div>

          {/* Contact info */}
          <div>
            <h4 className="text-white mb-5 font-semibold">צור קשר</h4>
            <p className="text-[#bdc3c7] mb-2.5" dir="ltr">052-896-2110</p>
            <p className="text-[#bdc3c7] mb-2.5" dir="ltr">contact@singwithalon.com</p>
          </div>
        </div>

        {/* Footer bottom */}
        <div className="text-center pt-[30px] border-t border-[#34495e]">
          <p className="text-[#bdc3c7] m-0">
            &copy; 2025 שרים עם אלון כהן. כל הזכויות שמורות.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
