function Hero() {

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

  return (
    <section id="home" className="hero">
      {/* Static Background Layers */}
      <div className="parallax-layer parallax-stars"></div>
      <div className="parallax-layer parallax-mountains-behind"></div>
      <div className="parallax-layer parallax-moon"></div>
      <div className="parallax-layer parallax-mountains-front"></div>

      {/* Musical Note Animations */}
      <div className="musical-notes-layer">
        <div className="floating-note note-1">♪</div>
        <div className="floating-note note-2">♫</div>
        <div className="floating-note note-3">♬</div>
        <div className="floating-note note-4">♪</div>
        <div className="floating-note note-5">♫</div>
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
              poster="/assets/tadmit_poster.webp"
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
