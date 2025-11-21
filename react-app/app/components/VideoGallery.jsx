'use client'
import { SectionHeader } from './ui/SectionHeader';

import { useState, useEffect, useRef } from 'react';

/**
 * VideoGallery component with Tailwind styling
 * Replaces .videos, .videos-grid, .video-card, .video-thumbnail, .play-overlay, .video-modal from legacy CSS
 * Musical decorations use custom .videos-musical-icons class from globals.css
 */

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
      <section id="videos" className="relative py-[100px] bg-[rgba(248,249,250,0.96)] videos-musical-icons">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
          <SectionHeader
            title="גלריית וידאו"
            subtitle="צפו בביצועים שלי וקבלו טעימה מהמופעים"
          />

          {/* Video Grid - 2 columns on desktop, 1 on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-[30px]">
            {videos.map((video, index) => (
              <div
                key={index}
                className="bg-white rounded-[15px] md:rounded-[20px] overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.1)] transition-all duration-300 md:duration-300 flex flex-col h-fit hover:md:-translate-y-[10px] hover:md:shadow-[0_20px_50px_rgba(139,95,191,0.2)] active:scale-[0.98] active:shadow-[0_5px_20px_rgba(139,95,191,0.2)] md:active:scale-100"
              >
                {/* Video Thumbnail */}
                <div className="relative aspect-video overflow-hidden">
                  <picture>
                    <source srcSet={video.poster} type="image/webp" />
                    <img
                      src={video.poster}
                      alt={video.alt}
                      width={video.width}
                      height={video.height}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    />
                  </picture>

                  {/* Play Overlay */}
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300">
                    <button
                      className="w-[70px] h-[70px] bg-white border-0 rounded-full text-primary text-2xl cursor-pointer transition-transform duration-300 hover:scale-110 flex items-center justify-center"
                      onClick={() => openVideoModal(video.src)}
                      aria-label={video.ariaLabel}
                    >
                      <i className="fas fa-play"></i>
                    </button>
                  </div>

                  {/* Video Duration Badge */}
                  <div className="absolute bottom-2.5 left-2.5 bg-black/80 text-white px-2 py-1 rounded text-xs font-bold">
                    {video.duration}
                  </div>
                </div>

                {/* Video Info */}
                <div className="p-5 flex flex-col justify-center flex-grow">
                  <h3 className="text-[#2c3e50] mb-2 text-[1.2rem] leading-tight">{video.title}</h3>
                  <p className="text-[#666] m-0 text-sm leading-snug">{video.description}</p>
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
          className="fixed z-[2000] inset-0 bg-black/90"
          ref={modalRef}
          style={{ display: 'block' }}
        >
          <div className="relative my-[10%] md:my-[5%] mx-auto w-[95%] md:w-4/5 max-w-[800px]">
            <button
              className="absolute top-[-35px] left-0 md:top-[-40px] md:left-[-40px] text-white text-[35px] font-bold bg-transparent border-0 cursor-pointer opacity-100 hover:opacity-70 transition-opacity"
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
              className="w-full h-auto rounded-[10px]"
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
