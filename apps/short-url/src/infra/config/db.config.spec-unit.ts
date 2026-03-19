describe('short-url db config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('maps the database environment variables', async () => {
    process.env.DB_SHORT_URL_HOST = 'localhost';
    process.env.DB_SHORT_URL_PORT = '5432';
    process.env.DB_SHORT_URL_NAME = 'short_url';
    process.env.DB_SHORT_URL_USER = 'postgres';
    process.env.DB_SHORT_URL_PASSWORD = 'postgres';

    const dbConfig = (await import('./db.config')).default;

    expect(dbConfig()).toEqual({
      host: 'localhost',
      port: 5432,
      name: 'short_url',
      user: 'postgres',
      password: 'postgres',
    });
  });
});
