import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { UrlPageContentFetcherService } from '@infra/enrichment/services/url-page-content-fetcher.service';

const mockImpitFetch = jest.fn();

jest.mock('impit', () => ({
  Impit: jest.fn().mockImplementation(() => ({
    fetch: mockImpitFetch,
  })),
}));

type UrlPageContentFetcherServiceInternals = {
  extractTag(html: string, tag: string): string | null;
  extractMetaDescription(html: string): string | null;
  stripHtml(html: string): string;
  isUnsafeHostname(hostname: string): boolean;
};

describe('UrlPageContentFetcherService', () => {
  let loggerWarnSpy: jest.SpyInstance;
  let loggerLogSpy: jest.SpyInstance;

  const createService = () =>
    new UrlPageContentFetcherService({
      get: jest.fn((key: string) => {
        if (key === 'api.aiPageMaxChars') return 200;
        if (key === 'api.aiPageFetchTimeoutMs') return 1000;

        return undefined;
      }),
    } as unknown as ConfigService);

  beforeEach(() => {
    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    loggerWarnSpy.mockRestore();
    loggerLogSpy.mockRestore();
    jest.clearAllMocks();
    mockImpitFetch.mockReset();
  });

  it('rejects unsupported protocols', async () => {
    const service = createService();

    await expect(service.fetch('ftp://example.com')).rejects.toThrow(
      'Origin protocol is not supported for enrichment.',
    );
  });

  it('rejects unsafe hosts', async () => {
    const service = createService();

    await expect(service.fetch('http://localhost/test')).rejects.toThrow(
      'Origin host is not eligible for server-side enrichment.',
    );
  });

  it('returns fallback content for non-html responses', async () => {
    mockImpitFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: jest.fn().mockReturnValue('application/json') },
    });

    const service = createService();

    await expect(service.fetch('https://api.example.test/metadata')).resolves.toEqual({
      title: 'api.example.test',
      content: 'api.example.test /metadata',
      description: null,
    });

    expect(mockImpitFetch).toHaveBeenCalledTimes(1);
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      'Origin returned application/json for https://api.example.test/metadata, expected text/html.',
    );
  });

  it('treats a missing content-type header as a non-html response', async () => {
    mockImpitFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: jest.fn().mockReturnValue(null) },
    });

    const service = createService();

    await expect(service.fetch('https://api.example.test/metadata')).resolves.toEqual({
      title: 'api.example.test',
      content: 'api.example.test /metadata',
      description: null,
    });

    expect(mockImpitFetch).toHaveBeenCalledTimes(1);
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      'Origin returned  for https://api.example.test/metadata, expected text/html.',
    );
  });

  it('extracts title, description and cleaned content from html', async () => {
    mockImpitFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: jest.fn().mockReturnValue('text/html; charset=utf-8') },
      text: jest
        .fn()
        .mockResolvedValueOnce(
          '<html><head><title>Example Docs</title><meta name="description" content="Reference portal"></head><body><script>ignore</script><p>Hello&nbsp;world</p></body></html>',
        ),
    });

    const service = createService();

    await expect(service.fetch('https://example.test')).resolves.toEqual({
      title: 'Example Docs',
      description: 'Reference portal',
      content: 'Example Docs Hello world',
    });

    expect(mockImpitFetch).toHaveBeenCalledTimes(1);
  });

  it('uses the standard page fetch to load html content', async () => {
    mockImpitFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: jest.fn().mockReturnValue('text/html; charset=utf-8') },
      text: jest
        .fn()
        .mockResolvedValueOnce(
          '<html><head><title>Sports Hub</title><meta name="description" content="Sports"></head><body><p>Live scores</p></body></html>',
        ),
    });

    const service = createService();

    await expect(service.fetch('https://sports.example.test/#/HO/')).resolves.toEqual({
      title: 'Sports Hub',
      description: 'Sports',
      content: 'Sports Hub Live scores',
    });
    expect(mockImpitFetch).toHaveBeenCalledTimes(1);
    expect(loggerWarnSpy).not.toHaveBeenCalled();
  });

  it('returns minimal metadata when the page fetch returns a non-success status', async () => {
    mockImpitFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      headers: { get: jest.fn().mockReturnValue('text/html; charset=utf-8') },
      text: jest.fn(),
    });

    const service = createService();

    await expect(service.fetch('https://sports.example.test/#/HO/')).resolves.toEqual({
      title: 'sports.example.test',
      content: 'sports.example.test /',
      description: null,
    });

    expect(loggerWarnSpy).toHaveBeenCalledWith('Page fetch returned 403 for https://sports.example.test/.');
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      'Falling back to minimal page metadata for https://sports.example.test/#/HO/.',
    );
  });

  it('returns minimal metadata when the page fetch throws', async () => {
    mockImpitFetch.mockRejectedValueOnce(new Error('blocked'));

    const service = createService();

    await expect(service.fetch('https://docs.example.test/reference')).resolves.toEqual({
      title: 'docs.example.test',
      content: 'docs.example.test /reference',
      description: null,
    });

    expect(loggerWarnSpy).toHaveBeenCalledWith('Page fetch failed for https://docs.example.test/reference: blocked');
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      'Falling back to minimal page metadata for https://docs.example.test/reference.',
    );
  });

  it('uses the unknown error fallback when the page fetch throws a non-Error value', async () => {
    mockImpitFetch.mockRejectedValueOnce('boom');

    const service = createService();

    await expect(service.fetch('https://docs.example.test/reference')).resolves.toEqual({
      title: 'docs.example.test',
      content: 'docs.example.test /reference',
      description: null,
    });

    expect(loggerWarnSpy).toHaveBeenCalledWith(
      'Page fetch failed for https://docs.example.test/reference: Unknown page fetch error.',
    );
  });

  it('returns null when metadata tags are absent', () => {
    const service = createService();

    const internals = service as unknown as UrlPageContentFetcherServiceInternals;

    expect(internals.extractTag('<html></html>', 'title')).toBeNull();
    expect(internals.extractMetaDescription('<html></html>')).toBeNull();
    expect(internals.stripHtml('<p>Hello</p>')).toBe('Hello');
    expect(internals.isUnsafeHostname('10.0.0.1')).toBe(true);
  });
});
