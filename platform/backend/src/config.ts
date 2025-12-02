import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3001', 10),
    host: process.env.HOST || '0.0.0.0',
  },
  database: {
    path: process.env.DATABASE_PATH || join(__dirname, '../../database/singalong.db'),
  },
  auth: {
    cookieSecret: process.env.COOKIE_SECRET || '',
    cookieName: 'singalong_session',
  },
  songs: {
    // Can be a URL or a local file path
    jsonUrl: process.env.SONGS_JSON_URL || 'https://raw.githubusercontent.com/KidCrippler/songs/master/songs.json',
    // Optional: local file path (takes precedence over URL if set)
    localPath: process.env.SONGS_LOCAL_PATH || '',
  },
  // Admin users seeded on startup (format: "user1:pass1,user2:pass2")
  adminUsers: process.env.ADMIN_USERS || '',
  // Fallback admin password (used only if ADMIN_USERS is empty and no admins exist)
  defaultAdminPassword: process.env.DEFAULT_ADMIN_PASSWORD || '',
};

