import { UrlEnrichment } from '@domain/entities/url-enrichment.entity';
import { Url } from '@domain/entities/url.entity';

describe('Domain entities', () => {
  it('creates a url enrichment with default tags and attempts', () => {
    const createdAt = new Date('2026-03-19T00:00:00.000Z');
    const updatedAt = new Date('2026-03-19T00:00:01.000Z');

    const enrichment = new UrlEnrichment('enrichment-id', 'url-id', 'pending', createdAt, updatedAt);

    expect(enrichment).toEqual({
      id: 'enrichment-id',
      urlId: 'url-id',
      status: 'pending',
      createdAt,
      updatedAt,
      summary: undefined,
      category: undefined,
      tags: [],
      alternativeSlug: undefined,
      riskLevel: undefined,
      enrichedAt: undefined,
      error: undefined,
      attempts: 0,
    });
  });

  it('creates a url enrichment with explicit optional values', () => {
    const createdAt = new Date('2026-03-19T00:00:00.000Z');
    const updatedAt = new Date('2026-03-19T00:00:01.000Z');
    const enrichedAt = new Date('2026-03-19T00:00:02.000Z');

    const enrichment = new UrlEnrichment(
      'enrichment-id',
      'url-id',
      'completed',
      createdAt,
      updatedAt,
      'summary',
      'docs',
      ['ai'],
      'openai-docs',
      'low',
      enrichedAt,
      null,
      2,
    );

    expect(enrichment).toEqual({
      id: 'enrichment-id',
      urlId: 'url-id',
      status: 'completed',
      createdAt,
      updatedAt,
      summary: 'summary',
      category: 'docs',
      tags: ['ai'],
      alternativeSlug: 'openai-docs',
      riskLevel: 'low',
      enrichedAt,
      error: null,
      attempts: 2,
    });
  });

  it('creates a url entity with the provided values', () => {
    const createdAt = new Date('2026-03-19T00:00:00.000Z');
    const updatedAt = new Date('2026-03-19T00:00:01.000Z');
    const enrichment = new UrlEnrichment('enrichment-id', 'url-id', 'completed', createdAt, updatedAt);

    const url = new Url(
      'url-id',
      'https://openai.com',
      3,
      'user-id',
      'abc12345',
      createdAt,
      updatedAt,
      undefined,
      enrichment,
    );

    expect(url).toEqual({
      id: 'url-id',
      origin: 'https://openai.com',
      clicks: 3,
      userId: 'user-id',
      code: 'abc12345',
      createdAt,
      updatedAt,
      deletedAt: undefined,
      enrichment,
    });
  });
});
