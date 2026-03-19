describe('short-url api config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('reads the environment and applies defaults', async () => {
    process.env.JWT_SECRET = 'secret';
    process.env.JWT_EXPIRATION = '2h';
    process.env.PORT_SHORT_URL = '5001';
    process.env.HOST_IDENTITY_TCP = 'identity';
    process.env.PORT_IDENTITY_TCP = '5002';
    process.env.AI_PAGE_MAX_CHARS = '6000';
    process.env.AI_ENRICHMENT_ENABLED = 'true';
    process.env.AI_PAGE_FETCH_TIMEOUT_MS = '12000';

    const apiConfig = (await import('./api.config')).default;

    expect(apiConfig()).toEqual({
      jwtSecret: 'secret',
      jwtExpiration: '2h',
      PORT_SHORT_URL: 5001,
      HOST_IDENTITY_TCP: 'identity',
      PORT_IDENTITY_TCP: 5002,
      aiPageMaxChars: 6000,
      aiEnrichmentEnabled: true,
      aiPageFetchTimeoutMs: 12000,
    });
  });

  it('falls back to the default values when environment variables are absent', async () => {
    delete process.env.JWT_EXPIRATION;
    delete process.env.PORT_SHORT_URL;
    delete process.env.HOST_IDENTITY_TCP;
    delete process.env.PORT_IDENTITY_TCP;
    delete process.env.AI_PAGE_MAX_CHARS;
    delete process.env.AI_ENRICHMENT_ENABLED;
    delete process.env.AI_PAGE_FETCH_TIMEOUT_MS;

    const apiConfig = (await import('./api.config')).default;

    expect(apiConfig()).toEqual({
      jwtSecret: undefined,
      jwtExpiration: '1h',
      PORT_SHORT_URL: 4001,
      HOST_IDENTITY_TCP: 'localhost',
      PORT_IDENTITY_TCP: 4002,
      aiPageMaxChars: 5000,
      aiEnrichmentEnabled: false,
      aiPageFetchTimeoutMs: 10000,
    });
  });
});
