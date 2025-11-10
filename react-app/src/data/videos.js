import { getAssetPath } from '../utils/assets';

export const videosData = {
  tadmit: {
    id: 'tadmit',
    title: 'תדמית - אלון כהן מוביל שירה בציבור',
    description: 'סרטון תדמית המציג את אלון כהן בפעולה - שירה בציבור מקצועית עם מערכת בחירת שירים אינטראקטיבית ייחודית',
    videoUrl: 'https://pub-c512c10de2ad4c37a4e4998b005da1e8.r2.dev/tadmit.mp4',
    posterUrl: getAssetPath('tadmit_poster.webp'),
    duration: 'PT2M30S',
    durationDisplay: '2:30',
    genre: 'מוזיקה ישראלית',
    width: 1920,
    height: 1080,
    keywords: 'שירה בציבור, תדמית, אלון כהן, קלידן, מוביל שירה, וידאו'
  },
  rony: {
    id: 'rony',
    title: 'רוני - גזוז',
    description: 'ביצוע אנרגטי של השיר "רוני" של גזוז - שמח ומשמח!',
    videoUrl: 'https://pub-c512c10de2ad4c37a4e4998b005da1e8.r2.dev/rony.mp4',
    posterUrl: getAssetPath('rony_poster.webp'),
    duration: 'PT1M11S',
    durationDisplay: '1:11',
    genre: 'רוק פופ ישראלי',
    width: 640,
    height: 352,
    keywords: 'רוני, גזוז, שירה בציבור, אלון כהן, מוזיקה ישראלית, וידאו'
  },
  'jam-toren': {
    id: 'jam-toren',
    title: 'ג\'מגוג\'ם עם דן תורן ז"ל',
    description: 'ביצוע אקוסטי מרגש של שיר "לבן על לבן" - מג\'מג\'ם ספונטנית עם דן תורן ז"ל',
    videoUrl: 'https://pub-c512c10de2ad4c37a4e4998b005da1e8.r2.dev/jam_toren.mp4',
    posterUrl: getAssetPath('jam_toren_poster.webp'),
    duration: 'PT1M37S',
    durationDisplay: '1:37',
    genre: 'אקוסטי',
    width: 640,
    height: 304,
    keywords: 'דן תורן, ג\'מגוג\'ם, אקוסטי, אלון כהן, מוזיקה ישראלית, וידאו'
  },
  borot: {
    id: 'borot',
    title: 'אל בורות המים - נעמי שמר',
    description: 'ביצוע קלאסי של שיר ארץ ישראלי אהוב - "אל בורות המים" של נעמי שמר',
    videoUrl: 'https://pub-c512c10de2ad4c37a4e4998b005da1e8.r2.dev/borot.mp4',
    posterUrl: getAssetPath('borot_poster.webp'),
    duration: 'PT3M16S',
    durationDisplay: '3:16',
    genre: 'שירי ארץ ישראל',
    width: 1280,
    height: 720,
    keywords: 'נעמי שמר, אל בורות המים, שירי ארץ ישראל, אלון כהן, מוזיקה ישראלית, וידאו'
  },
  'kvar-avar': {
    id: 'kvar-avar',
    title: 'כבר עבר - שלמה ארצי',
    description: 'קאבר גיטרה מרגש לשיר "מה רצינו להגיד" (כבר עבר) של שלמה ארצי',
    videoUrl: 'https://pub-c512c10de2ad4c37a4e4998b005da1e8.r2.dev/kvar_avar.mp4',
    posterUrl: getAssetPath('kvar_avar_poster.webp'),
    duration: 'PT5M7S',
    durationDisplay: '5:07',
    genre: 'שירי זיכרון',
    width: 848,
    height: 478,
    keywords: 'שלמה ארצי, כבר עבר, קאבר, אלון כהן, מוזיקה ישראלית, וידאו'
  }
};

// Helper function to get video by ID
export const getVideoById = (id) => videosData[id];

// Get all videos as an array
export const getAllVideos = () => Object.values(videosData);
