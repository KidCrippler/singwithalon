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
    cookieSecret: process.env.COOKIE_SECRET || 'change-this-secret',
    cookieName: 'singalong_session',
  },
  songs: {
    // Can be a URL or a local file path
    jsonUrl: process.env.SONGS_JSON_URL || 'https://raw.githubusercontent.com/KidCrippler/songs/master/songs.json',
    // Optional: local file path (takes precedence over URL if set)
    localPath: process.env.SONGS_LOCAL_PATH || '',
  },
  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'changeme',
  },
};

