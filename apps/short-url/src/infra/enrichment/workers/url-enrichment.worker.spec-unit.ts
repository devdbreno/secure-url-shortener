import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { UrlEnrichmentWorker } from '@infra/enrichment/workers/url-enrichment.worker';
import { UrlEnrichmentJobPayload } from '@application/ports/outbound/url-enrichment-job-dispatcher.port';

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

    const job = {
      data: { urlId: '1', origin: 'https://example.test' },
      attemptsStarted: 1,
    } as Job<UrlEnrichmentJobPayload>;

    await expect(worker.process(job)).resolves.toBeUndefined();

    expect(pageContentFetcherMock.fetch).not.toHaveBeenCalled();
    expect(loggerLogSpy).toHaveBeenCalledWith('AI enrichment worker is disabled.');
  });

  it('completes the enrichment when processing succeeds', async () => {
    configServiceMock.get = jest.fn().mockReturnValue(true);

    pageContentFetcherMock.fetch.mockResolvedValueOnce({
      title: 'Example Docs',
      description: 'Reference portal',
      content: 'content',
    });

    enrichmentProviderMock.enrich.mockResolvedValueOnce({
      summary: 'summary',
      category: 'docs',
      tags: ['ai'],
      alternativeSlug: 'example-docs',
      riskLevel: 'low',
      provider: 'gemini',
    });

    const job = {
      data: { urlId: '1', origin: 'https://example.test' },
      attemptsStarted: 1,
    } as Job<UrlEnrichmentJobPayload>;

    await worker.process(job);

    expect(urlRepoMock.completeEnrichment).toHaveBeenCalledWith(
      '1',
      {
        summary: 'summary',
        category: 'docs',
        tags: ['ai'],
        alternativeSlug: 'example-docs',
        riskLevel: 'low',
        provider: 'gemini',
      },
      1,
    );
    expect(loggerLogSpy).toHaveBeenCalledWith('Processing enrichment for URL 1 (https://example.test)');
    expect(loggerLogSpy).toHaveBeenCalledWith('Successfully enriched URL 1');
  });

  it('fails the enrichment and rethrows when processing raises an error', async () => {
    configServiceMock.get = jest.fn().mockReturnValue(true);
    pageContentFetcherMock.fetch.mockRejectedValueOnce(new Error('fetch failed'));

    const job = {
      data: { urlId: '1', origin: 'https://example.test' },
      attemptsStarted: 1,
    } as Job<UrlEnrichmentJobPayload>;

    await expect(worker.process(job)).rejects.toThrow('fetch failed');

    expect(urlRepoMock.failEnrichment).toHaveBeenCalledWith('1', 'fetch failed', 1);
    expect(loggerWarnSpy).toHaveBeenCalledWith('Failed to enrich URL 1: fetch failed');
  });

  it('uses the fallback message when a non-Error value is thrown', async () => {
    configServiceMock.get = jest.fn().mockReturnValue(true);
    pageContentFetcherMock.fetch.mockRejectedValueOnce('boom');

    const job = {
      data: { urlId: '1', origin: 'https://example.test' },
      attemptsStarted: 1,
    } as Job<UrlEnrichmentJobPayload>;

    await expect(worker.process(job)).rejects.toBe('boom');

    expect(urlRepoMock.failEnrichment).toHaveBeenCalledWith('1', 'Unknown enrichment error.', 1);
    expect(loggerWarnSpy).toHaveBeenCalledWith('Failed to enrich URL 1: Unknown enrichment error.');
  });
});
