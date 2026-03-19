describe('identity db config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('maps the database environment variables', async () => {
    process.env.DB_IDENTITY_HOST = 'localhost';
    process.env.DB_IDENTITY_PORT = '5432';
    process.env.DB_IDENTITY_NAME = 'identity';
    process.env.DB_IDENTITY_USER = 'postgres';
    process.env.DB_IDENTITY_PASSWORD = 'postgres';

    const dbConfig = (await import('./db.config')).default;

    expect(dbConfig()).toEqual({
      host: 'localhost',
      port: 5432,
      name: 'identity',
      user: 'postgres',
      password: 'postgres',
    });
  });
});
