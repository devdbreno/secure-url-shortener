describe('redis config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('maps redis configuration with defaults', async () => {
    process.env.REDIS_HOST = 'redis';
    process.env.REDIS_PORT = '6380';
    process.env.REDIS_PASSWORD = 'secret';

    const redisConfig = (await import('./redis.config')).default;

    expect(redisConfig()).toEqual({
      host: 'redis',
      port: 6380,
      password: 'secret',
    });
  });

  it('falls back to default redis values', async () => {
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_PORT;
    delete process.env.REDIS_PASSWORD;

    const redisConfig = (await import('./redis.config')).default;

    expect(redisConfig()).toEqual({
      host: 'localhost',
      port: 6379,
      password: null,
    });
  });
});
