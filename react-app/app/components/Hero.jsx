'use client'

import { useState, useEffect } from 'react';
import { getAssetPath } from '../utils/assets';
import { ButtonPrimary, ButtonSecondary } from './ui/Button';

function Hero() {
  const tadmitPosterAvif = getAssetPath('tadmit_poster.avif');
  const tadmitPosterWebp = getAssetPath('tadmit_poster.webp');
  const [particles, setParticles] = useState({ back: [], mid: [], front: [] });

  // Scroll indicator click handler
  const handleScrollIndicatorClick = () => {
    const aboutSection = document.getElementById('about');
    if (aboutSection) {
      aboutSection.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  // Smooth scroll to sections
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
    }
  };

  // Generate particles for the orchestra background (client-side only to avoid hydration mismatch)
  useEffect(() => {
    const generateParticles = (count, layer) => {
      const particles = [];
      const symbols = ['♪', '♫', '♬', '●', '○'];

      for (let i = 0; i < count; i++) {
        const symbol = symbols[Math.floor(Math.random() * symbols.length)];
        const size = Math.random() * 1.5 + 0.5; // 0.5rem to 2rem
        const left = Math.random() * 100; // 0% to 100%
        const top = Math.random() * 100; // 0% to 100%
        const duration = Math.random() * 15 + 10; // 10s to 25s
        const delay = Math.random() * 5; // 0s to 5s
        const glowDuration = Math.random() * 4 + 3; // 3s to 7s
        const glowDelay = Math.random() * 3; // 0s to 3s

        particles.push(
          <div
            key={`${layer}-${i}`}
            className={`particle particle-${layer} absolute pointer-events-none animate-particle-float`}
            style={{
              left: `${left}%`,
              top: `${top}%`,
              fontSize: `${size}rem`,
              animationDuration: `${duration}s, ${glowDuration}s`,
              animationDelay: `${delay}s, ${glowDelay}s`,
              animationName: 'particleFloat, particleGlow',
            }}
          >
            {symbol}
          </div>
        );
      }
      return particles;
    };

    setParticles({
      back: generateParticles(18, 'back'),
      mid: generateParticles(25, 'mid'),
      front: generateParticles(17, 'front'),
    });
  }, []);

  return (
    <section id="home" className="min-h-screen flex items-center relative bg-gradient-to-br from-primary to-primary-light overflow-hidden">
      {/* Particle Orchestra Background - 3 Layers for Depth */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Background layer: slow, subtle */}
        <div className="absolute inset-0 pointer-events-none z-[1] opacity-40">
          {particles.back}
        </div>

        {/* Mid layer: medium speed */}
        <div className="absolute inset-0 pointer-events-none z-[2] opacity-60">
          {particles.mid}
        </div>

        {/* Foreground layer: faster, brighter */}
        <div className="absolute inset-0 pointer-events-none z-[3] opacity-80">
          {particles.front}
        </div>
      </div>

      <div className="absolute inset-0 bg-black/30 z-[5]"></div>
      <div className="relative z-[6] w-full max-w-7xl mx-auto px-5 pt-[100px] pb-[50px] grid grid-cols-2 gap-[60px] items-center max-md:grid-cols-1 max-md:gap-10 max-md:text-center">
        <div className="text-white">
          <h1 className="mb-[30px]">
            <span className="title-main block text-[3.8rem] font-normal mb-[15px] text-white animate-musical-breathe tracking-wide max-md:text-[2.5rem] max-md:animate-none max-sm:text-[2rem]">שרים עם אלון כהן</span>
            <span className="title-subtitle block text-[1.3rem] font-light font-sans text-[#E6D7FF] opacity-95 [word-spacing:3px]">שירה בציבור - מוזיקה ישראלית מכל התקופות</span>
          </h1>
          <p className="hero-description text-xl leading-relaxed mb-10 text-[#F5F0FF] opacity-90 max-sm:text-base">
            מוביל שירה בציבור עם רפרטואר עשיר של מאות רבות של שירים ישראליים מכל התקופות ומערכת בחירה אינטראקטיבית ייחודית המאפשרת לקהל לבחור ולשיר יחד איתי בזמן אמת.
          </p>
          <div className="flex gap-5 flex-wrap max-md:justify-center">
            <ButtonPrimary
              href="#contact"
              onClick={(e) => scrollToSection('contact', e)}
            >
              הזמן שירה בציבור
            </ButtonPrimary>
            <ButtonSecondary
              href="#videos"
              onClick={(e) => scrollToSection('videos', e)}
            >
              צפה בסרטונים
            </ButtonSecondary>
          </div>
        </div>
        <div className="relative">
          <div className="video-container relative rounded-[20px] overflow-hidden shadow-hero-video aspect-video max-w-[700px] w-full">
            <video
              id="hero-video"
              controls
              preload="none"
              loading="lazy"
              poster={tadmitPosterWebp}
              width="1920"
              height="1080"
              className="w-full h-full object-cover">
              <source src="https://pub-c512c10de2ad4c37a4e4998b005da1e8.r2.dev/tadmit.mp4" type="video/mp4" />
              <track kind="captions" src="#" srcLang="he" label="עברית" default />
              הדפדפן שלך אינו תומך בתגי וידאו.
            </video>
            <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none">
              <button className="hidden" id="video-play-btn" aria-label="נגן את הסרטון הראשי">
                <i className="fas fa-play"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-[30px] left-1/2 -translate-x-1/2 z-[7] cursor-pointer max-md:bottom-[10px]" onClick={handleScrollIndicatorClick}>
        <div className="scroll-arrow text-white text-2xl animate-musical-pulse">
          <i className="fas fa-music"></i>
        </div>
      </div>
    </section>
  );
}

export default Hero;
