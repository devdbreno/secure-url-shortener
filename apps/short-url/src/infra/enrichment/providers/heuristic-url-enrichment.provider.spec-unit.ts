import { HeuristicUrlEnrichmentProvider } from '@infra/enrichment/providers/heuristic-url-enrichment.provider';

describe('HeuristicUrlEnrichmentProvider', () => {
  const provider = new HeuristicUrlEnrichmentProvider();

  it('categorizes content and produces a clean slug', () => {
    const result = provider.enrich({
      origin: 'https://www.youtube.com/watch?v=123',
      pageTitle: 'Amazing video tutorial',
      pageDescription: 'Learn with this tutorial',
    });

    expect(result.category).toBe('video');
    expect(result.alternativeSlug).toContain('youtube');
    expect(result.tags.length).toBeGreaterThan(0);
  });

  it('uses a fallback summary when no page metadata exists', () => {
    const result = provider.enrich({
      origin: 'https://docs.example.com/reference',
    });

    expect(result.summary).toContain('docs.example.com');
    expect(result.riskLevel).toBe('low');
  });

  it('handles root paths without polluting the slug', () => {
    const result = provider.enrich({
      origin: 'https://example.com/',
    });

    expect(result.alternativeSlug).toBe('example-com');
  });
});
