import { useParams, Link, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getVideoById } from '../data/videos';

function VideoPage() {
  const { videoId } = useParams();
  const video = getVideoById(videoId);

  // If video not found, redirect to home
  if (!video) {
    return <Navigate to="/" replace />;
  }

  // Schema.org JSON-LD for SEO
  const schemaMarkup = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "name": video.title,
    "description": video.description,
    "thumbnailUrl": `https://singwithalon.com${video.posterUrl}`,
    "contentUrl": video.videoUrl,
    "embedUrl": `https://singwithalon.com/video/${video.id}`,
    "duration": video.duration,
    "genre": video.genre,
    "inLanguage": "he",
    "creator": {
      "@type": "Person",
      "name": "אלון כהן",
      "url": "https://singwithalon.com"
    },
    "publisher": {
      "@type": "Organization",
      "name": "שרים עם אלון כהן",
      "logo": {
        "@type": "ImageObject",
        "url": `https://singwithalon.com${import.meta.env.BASE_URL}assets/logo.webp`
      }
    }
  };

  return (
    <>
      <Helmet>
        <title>{video.title} | שרים עם אלון כהן</title>
        <meta name="description" content={video.description} />

        {/* SEO Meta Tags */}
        <meta name="keywords" content={video.keywords} />
        <meta name="author" content="אלון כהן" />
        <meta name="robots" content="index, follow" />

        {/* Open Graph Meta Tags */}
        <meta property="og:title" content={video.title} />
        <meta property="og:description" content={video.description} />
        <meta property="og:type" content="video.other" />
        <meta property="og:url" content={`https://singwithalon.com/video/${video.id}`} />
        <meta property="og:image" content={`https://singwithalon.com${video.posterUrl}`} />
        <meta property="og:video" content={video.videoUrl} />
        <meta property="og:locale" content="he_IL" />
        <meta property="og:site_name" content="שרים עם אלון כהן" />

        {/* Twitter Card Meta Tags */}
        <meta name="twitter:card" content="player" />
        <meta name="twitter:title" content={video.title} />
        <meta name="twitter:description" content={video.description} />
        <meta name="twitter:image" content={`https://singwithalon.com${video.posterUrl}`} />
        <meta name="twitter:player" content={video.videoUrl} />

        {/* Canonical URL */}
        <link rel="canonical" href={`https://singwithalon.com/video/${video.id}`} />

        {/* Schema.org JSON-LD */}
        <script type="application/ld+json">
          {JSON.stringify(schemaMarkup)}
        </script>
      </Helmet>

      <div className="min-h-screen bg-[#1a1a1a] text-white">
        <div className="max-w-[1000px] mx-auto px-5 py-5 sm:py-8">

          {/* Video Header */}
          <div className="text-center mb-5">
            <h1 className="font-['Secular_One'] text-[1.8rem] sm:text-[2rem] lg:text-[2.2rem] text-[#8b5fbf] mb-4 leading-[1.3]">
              {video.title}
            </h1>
            <p className="text-base text-[#cccccc] leading-relaxed">
              {video.description}
            </p>
          </div>

          {/* Video Player */}
          <div className="mb-5 rounded-lg overflow-hidden bg-black">
            <video
              controls
              autoPlay
              preload="metadata"
              poster={video.posterUrl}
              width={video.width}
              height={video.height}
              className="w-full h-auto min-h-[200px] object-contain"
            >
              <source src={video.videoUrl} type="video/mp4" />
              <track kind="captions" src="#" srcLang="he" label="עברית" default />
              הדפדפן שלך אינו תומך בתגי וידאו.
            </video>
          </div>

          {/* Back to Site Button */}
          <div className="text-center py-5">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#8b5fbf] hover:bg-[#9d6fd4] text-white font-bold text-base rounded-md transition-colors duration-300 no-underline"
            >
              <i className="fas fa-arrow-right transform scale-x-[-1] text-base"></i>
              <span>חזרה לאתר הראשי</span>
            </Link>
          </div>

        </div>
      </div>
    </>
  );
}

export default VideoPage;
