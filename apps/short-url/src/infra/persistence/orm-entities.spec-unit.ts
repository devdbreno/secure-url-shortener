import { UrlEnrichmentOrm } from '@infra/persistence/url-enrichment.orm.entity';
import { UrlOrm } from '@infra/persistence/url.orm.entity';

describe('Persistence orm entities', () => {
  it('creates and links url orm entities', () => {
    const url = new UrlOrm();
    url.id = 'url-id';
    url.origin = 'https://openai.com';
    url.code = 'abc12345';
    url.clicks = 5;
    url.userId = 'user-id';
    url.createdAt = new Date('2026-03-19T00:00:00.000Z');
    url.updatedAt = new Date('2026-03-19T00:00:01.000Z');
    url.deletedAt = undefined;

    const enrichment = new UrlEnrichmentOrm();
    enrichment.id = 'enrichment-id';
    enrichment.urlId = 'url-id';
    enrichment.status = 'completed';
    enrichment.summary = 'summary';
    enrichment.category = 'docs';
    enrichment.tags = ['ai'];
    enrichment.alternativeSlug = 'openai-docs';
    enrichment.riskLevel = 'low';
    enrichment.error = null;
    enrichment.attempts = 1;
    enrichment.enrichedAt = new Date('2026-03-19T00:00:02.000Z');
    enrichment.createdAt = new Date('2026-03-19T00:00:00.000Z');
    enrichment.updatedAt = new Date('2026-03-19T00:00:01.000Z');
    enrichment.url = url;

    url.enrichment = enrichment;

    expect(url.enrichment).toBe(enrichment);
    expect(enrichment.url).toBe(url);
    expect(enrichment.urlId).toBe('url-id');
    expect(enrichment.tags).toEqual(['ai']);
  });
});
