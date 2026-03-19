describe('identity api config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('reads the environment with defaults', async () => {
    process.env.JWT_SECRET = 'secret';
    process.env.JWT_EXPIRATION = '2h';
    process.env.PORT_IDENTITY = '5000';
    process.env.PORT_IDENTITY_TCP = '5002';

    const apiConfig = (await import('./api.config')).default;

    expect(apiConfig()).toEqual({
      jwtSecret: 'secret',
      jwtExpiration: '2h',
      PORT_IDENTITY: 5000,
      PORT_IDENTITY_TCP: 5002,
    });
  });

  it('falls back to default ports and expiration', async () => {
    delete process.env.JWT_EXPIRATION;
    delete process.env.PORT_IDENTITY;
    delete process.env.PORT_IDENTITY_TCP;

    const apiConfig = (await import('./api.config')).default;

    expect(apiConfig()).toEqual({
      jwtSecret: undefined,
      jwtExpiration: '1h',
      PORT_IDENTITY: 4000,
      PORT_IDENTITY_TCP: 4002,
    });
  });
});
