describe('gemini config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('maps gemini configuration with defaults', async () => {
    process.env.GEMINI_API_KEY = 'gemini-key';

    const geminiConfig = (await import('./gemini.config')).default;

    expect(geminiConfig()).toEqual({
      apiKey: 'gemini-key',
      model: 'gemini-3-flash-preview',
    });
  });
});
