import { registerAs } from '@nestjs/config';

export default registerAs('short_url_db', () => ({
  host: process.env.DB_SHORT_URL_HOST,
  port: parseInt(process.env.DB_SHORT_URL_PORT, 10),
  name: process.env.DB_SHORT_URL_NAME,
  user: process.env.DB_SHORT_URL_USER,
  password: process.env.DB_SHORT_URL_PASSWORD,
}));
