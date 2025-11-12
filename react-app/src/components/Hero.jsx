import { getAssetPath } from '../utils/assets.js';

function Hero() {
  const tadmitPosterAvif = getAssetPath('tadmit_poster.avif');
  const tadmitPosterWebp = getAssetPath('tadmit_poster.webp');

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

  // Generate particles for the orchestra background
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
          className={`particle particle-${layer}`}
          style={{
            left: `${left}%`,
            top: `${top}%`,
            fontSize: `${size}rem`,
            animationDuration: `${duration}s, ${glowDuration}s`,
            animationDelay: `${delay}s, ${glowDelay}s`,
          }}
        >
          {symbol}
        </div>
      );
    }
    return particles;
  };

  return (
    <section id="home" className="hero">
      {/* Particle Orchestra Background - 3 Layers for Depth */}
      <div className="particle-orchestra">
        {/* Background layer: slow, subtle */}
        <div className="particle-layer particle-layer-back">
          {generateParticles(18, 'back')}
        </div>

        {/* Mid layer: medium speed */}
        <div className="particle-layer particle-layer-mid">
          {generateParticles(25, 'mid')}
        </div>

        {/* Foreground layer: faster, brighter */}
        <div className="particle-layer particle-layer-front">
          {generateParticles(17, 'front')}
        </div>
      </div>

      <div className="hero-overlay"></div>
      <div className="hero-content">
        <div className="hero-text">
          <h1 className="hero-title" style={{fontSize: '2.5rem'}}>
            <span className="title-main">שרים עם אלון כהן</span>
            <span className="title-subtitle">שירה בציבור - מוזיקה ישראלית מכל התקופות</span>
          </h1>
          <p className="hero-description">
            מוביל שירה בציבור עם רפרטואר עשיר של מאות רבות של שירים ישראליים מכל התקופות ומערכת בחירה אינטראקטיבית ייחודית המאפשרת לקהל לבחור ולשיר יחד איתי בזמן אמת.
          </p>
          <div className="hero-buttons">
            <a
              href="#contact"
              className="btn btn-primary"
              onClick={(e) => scrollToSection('contact', e)}
            >
              הזמן שירה בציבור
            </a>
            <a
              href="#videos"
              className="btn btn-secondary"
              onClick={(e) => scrollToSection('videos', e)}
            >
              צפה בסרטונים
            </a>
          </div>
        </div>
        <div className="hero-video">
          <div className="video-container">
            <video
              id="hero-video"
              controls
              preload="none"
              loading="lazy"
              poster={tadmitPosterWebp}
              width="1920"
              height="1080">
              <source src="https://pub-c512c10de2ad4c37a4e4998b005da1e8.r2.dev/tadmit.mp4" type="video/mp4" />
              <track kind="captions" src="#" srcLang="he" label="עברית" default />
              הדפדפן שלך אינו תומך בתגי וידאו.
            </video>
            <div className="video-overlay">
              <button className="video-play-btn" id="video-play-btn" aria-label="נגן את הסרטון הראשי">
                <i className="fas fa-play"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="scroll-indicator" onClick={handleScrollIndicatorClick}>
        <div className="scroll-arrow">
          <i className="fas fa-music"></i>
        </div>
      </div>
    </section>
  );
}

export default Hero;
