import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { UrlEnrichmentWorker } from '@infra/enrichment/workers/url-enrichment.worker';

describe('UrlEnrichmentWorker', () => {
  let loggerLogSpy: jest.SpyInstance;
  let loggerWarnSpy: jest.SpyInstance;

  const configServiceMock = {
    get: jest.fn(),
  } as unknown as jest.Mocked<ConfigService>;
  const pageContentFetcherMock = {
    fetch: jest.fn(),
  };
  const urlRepoMock = {
    completeEnrichment: jest.fn(),
    failEnrichment: jest.fn(),
  };
  const enrichmentProviderMock = {
    enrich: jest.fn(),
  };

  const worker = new UrlEnrichmentWorker(
    configServiceMock,
    pageContentFetcherMock as never,
    urlRepoMock as never,
    enrichmentProviderMock as never,
  );

  beforeEach(() => {
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.clearAllMocks();
  });

  afterEach(() => {
    loggerLogSpy.mockRestore();
    loggerWarnSpy.mockRestore();
  });

  it('exits early when ai enrichment is disabled', async () => {
    configServiceMock.get = jest.fn().mockReturnValue(false);

    await expect(
      worker.process({ data: { urlId: '1', origin: 'https://openai.com' } } as never),
    ).resolves.toBeUndefined();
    expect(pageContentFetcherMock.fetch).not.toHaveBeenCalled();
    expect(loggerLogSpy).toHaveBeenCalledWith('AI enrichment worker is disabled.');
  });

  it('completes the enrichment when processing succeeds', async () => {
    configServiceMock.get = jest.fn().mockReturnValue(true);
    pageContentFetcherMock.fetch.mockResolvedValueOnce({
      title: 'OpenAI',
      description: 'AI platform',
      content: 'content',
    });
    enrichmentProviderMock.enrich.mockResolvedValueOnce({
      summary: 'summary',
      category: 'docs',
      tags: ['ai'],
      alternativeSlug: 'openai',
      riskLevel: 'low',
    });

    await worker.process({ data: { urlId: '1', origin: 'https://openai.com' } } as never);

    expect(urlRepoMock.completeEnrichment).toHaveBeenCalledWith('1', {
      summary: 'summary',
      category: 'docs',
      tags: ['ai'],
      alternativeSlug: 'openai',
      riskLevel: 'low',
    });
    expect(loggerLogSpy).toHaveBeenCalledWith('Processing enrichment for URL 1 (https://openai.com)');
    expect(loggerLogSpy).toHaveBeenCalledWith('Successfully enriched URL 1');
  });

  it('fails the enrichment and rethrows when processing raises an error', async () => {
    configServiceMock.get = jest.fn().mockReturnValue(true);
    pageContentFetcherMock.fetch.mockRejectedValueOnce(new Error('fetch failed'));

    await expect(worker.process({ data: { urlId: '1', origin: 'https://openai.com' } } as never)).rejects.toThrow(
      'fetch failed',
    );

    expect(urlRepoMock.failEnrichment).toHaveBeenCalledWith('1', 'fetch failed');
    expect(loggerWarnSpy).toHaveBeenCalledWith('Failed to enrich URL 1: fetch failed');
  });

  it('uses the fallback message when a non-Error value is thrown', async () => {
    configServiceMock.get = jest.fn().mockReturnValue(true);
    pageContentFetcherMock.fetch.mockRejectedValueOnce('boom');

    await expect(worker.process({ data: { urlId: '1', origin: 'https://openai.com' } } as never)).rejects.toBe('boom');

    expect(urlRepoMock.failEnrichment).toHaveBeenCalledWith('1', 'Unknown enrichment error.');
    expect(loggerWarnSpy).toHaveBeenCalledWith('Failed to enrich URL 1: Unknown enrichment error.');
  });
});
