import { useState, useEffect, useRef } from 'react';

function VideoGallery() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentVideo, setCurrentVideo] = useState('');
  const videoRef = useRef(null);
  const modalRef = useRef(null);

  const videos = [
    {
      poster: '/assets/rony_poster.webp',
      alt: 'שירי רוק פופ',
      width: 640,
      height: 352,
      src: 'https://pub-c512c10de2ad4c37a4e4998b005da1e8.r2.dev/rony.mp4',
      duration: '1:11',
      title: 'אנרגיה ישראלית',
      description: '״רוני״ של גזוז - שמח ומשמח!',
      ariaLabel: 'נגן וידאו - שירי רוק פופ'
    },
    {
      poster: '/assets/jam_toren_poster.webp',
      alt: 'ביצוע אקוסטי',
      width: 640,
      height: 304,
      src: 'https://pub-c512c10de2ad4c37a4e4998b005da1e8.r2.dev/jam_toren.mp4',
      duration: '1:37',
      title: 'ביצוע אקוסטי',
      description: 'לבן על לבן - מג׳מג׳ם ספונטנית עם דן תורן ז״ל',
      ariaLabel: 'נגן וידאו - ביצוע אקוסטי'
    },
    {
      poster: '/assets/borot_poster.webp',
      alt: 'שירי ארץ ישראל',
      width: 1280,
      height: 720,
      src: 'https://pub-c512c10de2ad4c37a4e4998b005da1e8.r2.dev/borot.mp4',
      duration: '3:16',
      title: 'שירי ארץ ישראל',
      description: 'אל בורות המים - קלאסיקה של נעמי שמר',
      ariaLabel: 'נגן וידאו - שירי ארץ ישראל'
    },
    {
      poster: '/assets/kvar_avar_poster.webp',
      alt: 'שירי זיכרון',
      width: 848,
      height: 478,
      src: 'https://pub-c512c10de2ad4c37a4e4998b005da1e8.r2.dev/kvar_avar.mp4',
      duration: '5:07',
      title: 'שירי זיכרון',
      description: 'קאבר גיטרה - מה רצינו להגיד (שלמה ארצי)',
      ariaLabel: 'נגן וידאו - שירי זיכרון'
    }
  ];

  // Open video modal
  const openVideoModal = (videoSrc) => {
    setCurrentVideo(videoSrc);
    setIsModalOpen(true);
    document.body.style.overflow = 'hidden';

    // Auto-play the video
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.play().catch(e => {
          console.log('Auto-play prevented:', e);
        });
      }
    }, 100);
  };

  // Close video modal
  const closeVideoModal = () => {
    setIsModalOpen(false);
    setCurrentVideo('');
    document.body.style.overflow = 'auto';

    // Pause and reset video
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = '';
    }
  };

  // Handle Escape key and click outside
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isModalOpen) {
        closeVideoModal();
      }
    };

    const handleClickOutside = (e) => {
      if (modalRef.current && e.target === modalRef.current) {
        closeVideoModal();
      }
    };

    if (isModalOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isModalOpen]);

  return (
    <>
      {/* Videos Section */}
      <section id="videos" className="videos">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">גלריית וידאו</h2>
            <p className="section-subtitle">צפו בביצועים שלי וקבלו טעימה מהמופעים</p>
          </div>
          <div className="videos-grid">
            {videos.map((video, index) => (
              <div key={index} className="video-card">
                <div className="video-thumbnail">
                  <picture>
                    <source srcSet={video.poster} type="image/webp" />
                    <img
                      src={video.poster}
                      alt={video.alt}
                      width={video.width}
                      height={video.height}
                      loading="lazy"
                    />
                  </picture>
                  <div className="play-overlay">
                    <button
                      className="play-btn"
                      onClick={() => openVideoModal(video.src)}
                      aria-label={video.ariaLabel}
                    >
                      <i className="fas fa-play"></i>
                    </button>
                  </div>
                  <div className="video-duration">{video.duration}</div>
                </div>
                <div className="video-info">
                  <h3>{video.title}</h3>
                  <p>{video.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Video Modal */}
      {isModalOpen && (
        <div
          id="video-modal"
          className="video-modal"
          ref={modalRef}
          style={{ display: 'block' }}
        >
          <div className="video-modal-content">
            <button
              className="video-modal-close"
              onClick={closeVideoModal}
              aria-label="סגור חלון וידאו"
            >
              &times;
            </button>
            <video
              ref={videoRef}
              id="modal-video"
              controls
              src={currentVideo}
            >
              <track kind="captions" src="#" srcLang="he" label="עברית" default />
            </video>
          </div>
        </div>
      )}
    </>
  );
}

export default VideoGallery;
