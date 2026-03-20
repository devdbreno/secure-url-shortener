import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { FallbackUrlEnrichmentProvider } from '@infra/enrichment/providers/fallback-url-enrichment.provider';

describe('FallbackUrlEnrichmentProvider', () => {
  const input = { origin: 'https://example.test' };
  let loggerWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    loggerWarnSpy.mockRestore();
    jest.clearAllMocks();
  });

  it('uses the ai provider when ai enrichment is enabled', async () => {
    const provider = new FallbackUrlEnrichmentProvider(
      {
        get: jest.fn().mockReturnValue(true),
      } as unknown as ConfigService,
      {
        enrich: jest
          .fn()
          .mockResolvedValue({ summary: 'ai', category: 'docs', tags: [], alternativeSlug: 'ai', riskLevel: 'low' }),
      } as never,
      {
        enrich: jest.fn(),
      } as never,
    );

    await expect(provider.enrich(input)).resolves.toMatchObject({ summary: 'ai' });
  });

  it('falls back to the heuristic provider when ai is disabled', async () => {
    const heuristic = {
      enrich: jest.fn().mockReturnValue({
        summary: 'heuristic',
        category: 'website',
        tags: [],
        alternativeSlug: 'heuristic',
        riskLevel: 'low',
      }),
    };
    const provider = new FallbackUrlEnrichmentProvider(
      {
        get: jest.fn().mockReturnValue(false),
      } as unknown as ConfigService,
      {
        enrich: jest.fn(),
      } as never,
      heuristic as never,
    );

    await expect(provider.enrich(input)).resolves.toMatchObject({ summary: 'heuristic' });
    expect(heuristic.enrich).toHaveBeenCalledWith(input);
  });

  it('falls back to the heuristic provider when ai throws', async () => {
    const heuristic = {
      enrich: jest.fn().mockReturnValue({
        summary: 'heuristic',
        category: 'website',
        tags: [],
        alternativeSlug: 'heuristic',
        riskLevel: 'low',
      }),
    };
    const provider = new FallbackUrlEnrichmentProvider(
      {
        get: jest.fn().mockReturnValue(true),
      } as unknown as ConfigService,
      {
        enrich: jest.fn().mockRejectedValue(new Error('gemini failed')),
      } as never,
      heuristic as never,
    );

    await expect(provider.enrich(input)).resolves.toMatchObject({ summary: 'heuristic' });
    expect(loggerWarnSpy).toHaveBeenCalledWith('AI Provider failed, falling back to heuristic: gemini failed');
  });
});
