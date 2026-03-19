import { registerAs } from '@nestjs/config';

export default registerAs('api', () => ({
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiration: process.env.JWT_EXPIRATION || '1h',
  PORT_SHORT_URL: parseInt(process.env.PORT_SHORT_URL, 10) || 4001,
  HOST_IDENTITY_TCP: process.env.HOST_IDENTITY_TCP || 'localhost',
  PORT_IDENTITY_TCP: parseInt(process.env.PORT_IDENTITY_TCP, 10) || 4002,
  aiPageMaxChars: parseInt(process.env.AI_PAGE_MAX_CHARS, 10) || 5000,
  aiEnrichmentEnabled: process.env.AI_ENRICHMENT_ENABLED === 'true',
  aiPageFetchTimeoutMs: parseInt(process.env.AI_PAGE_FETCH_TIMEOUT_MS, 10) || 10000,
}));
