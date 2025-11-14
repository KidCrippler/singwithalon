import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getVideoById, getAllVideos } from '../../data/videos';

// Generate static params for all video IDs at build time
export async function generateStaticParams() {
  const videos = getAllVideos();

  return videos.map((video) => ({
    videoId: video.id,
  }));
}

// Generate metadata for each video page
export async function generateMetadata({ params }) {
  const { videoId } = await params;
  const video = getVideoById(videoId);

  if (!video) {
    return {
      title: 'וידאו לא נמצא',
    };
  }

  return {
    title: `${video.title} | שרים עם אלון כהן`,
    description: video.description,
    keywords: video.keywords,
    authors: [{ name: 'אלון כהן' }],
    creator: 'אלון כהן',
    publisher: 'שרים עם אלון כהן',
    robots: 'index, follow',
    openGraph: {
      title: video.title,
      description: video.description,
      url: `https://singwithalon.com/video/${video.id}`,
      siteName: 'שרים עם אלון כהן',
      images: [
        {
          url: `https://singwithalon.com${video.posterUrl}`,
          width: video.width,
          height: video.height,
          alt: video.title,
        },
      ],
      locale: 'he_IL',
      type: 'video.other',
    },
    twitter: {
      card: 'player',
      title: video.title,
      description: video.description,
      images: [`https://singwithalon.com${video.posterUrl}`],
    },
  };
}

export default async function VideoPage({ params }) {
  const { videoId } = await params;
  const video = getVideoById(videoId);

  // If video not found, show 404
  if (!video) {
    notFound();
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
        "url": "https://singwithalon.com/assets/logo.webp"
      }
    }
  };

  return (
    <>
      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaMarkup) }}
      />

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
              href="/"
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
