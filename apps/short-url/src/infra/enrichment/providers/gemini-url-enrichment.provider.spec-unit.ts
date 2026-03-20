import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { GeminiUrlEnrichmentProvider } from '@infra/enrichment/providers/gemini-url-enrichment.provider';

const generateContentMock = jest.fn();

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContent: generateContentMock,
    },
  })),
}));

describe('GeminiUrlEnrichmentProvider', () => {
  let loggerError: jest.SpyInstance;

  const configServiceMock = {
    get: jest.fn((key: string) => {
      if (key === 'gemini.apiKey') return 'api-key';
      if (key === 'gemini.model') return 'gemini-model';
      if (key === 'api.aiPageMaxChars') return 100;

      return undefined;
    }),
  } as unknown as ConfigService;

  beforeEach(() => {
    loggerError = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.clearAllMocks();
  });

  afterEach(() => {
    loggerError.mockRestore();
  });

  it('normalizes the ai response payload', async () => {
    generateContentMock.mockResolvedValueOnce({
      text: JSON.stringify({
        summary: '',
        category: '',
        tags: 'invalid',
        alternativeSlug: '',
        riskLevel: 'unknown',
      }),
    });

    const provider = new GeminiUrlEnrichmentProvider(configServiceMock);

    await expect(
      provider.enrich({
        origin: 'https://example.test',
        pageContent: 'content',
      }),
    ).resolves.toEqual({
      summary: 'Summary unavailable',
      category: 'website',
      tags: [],
      alternativeSlug: 'link',
      riskLevel: 'low',
    });
  });

  it('preserves valid ai fields when the payload is well formed', async () => {
    generateContentMock.mockResolvedValueOnce({
      text: JSON.stringify({
        summary: 'AI summary',
        category: 'docs',
        tags: ['ai'],
        alternativeSlug: 'example-docs',
        riskLevel: 'high',
      }),
    });

    const provider = new GeminiUrlEnrichmentProvider(configServiceMock);

    await expect(provider.enrich({ origin: 'https://docs.example.test/reference' })).resolves.toEqual({
      summary: 'AI summary',
      category: 'docs',
      tags: ['ai'],
      alternativeSlug: 'example-docs',
      riskLevel: 'high',
    });
  });

  it('throws when the ai response is not valid json', async () => {
    generateContentMock.mockResolvedValueOnce({
      text: 'not json',
    });

    const provider = new GeminiUrlEnrichmentProvider(configServiceMock);

    await expect(provider.enrich({ origin: 'https://example.test' })).rejects.toThrow(SyntaxError);

    expect(loggerError).toHaveBeenCalledWith('Failed to parse Gemini response', expect.any(SyntaxError));
  });
});
