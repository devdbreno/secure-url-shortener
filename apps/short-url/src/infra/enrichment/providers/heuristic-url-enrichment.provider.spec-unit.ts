import { HeuristicUrlEnrichmentProvider } from '@infra/enrichment/providers/heuristic-url-enrichment.provider';

describe('HeuristicUrlEnrichmentProvider', () => {
  const provider = new HeuristicUrlEnrichmentProvider();

  it('categorizes content and produces a clean slug', () => {
    const result = provider.enrich({
      origin: 'https://video.example.test/watch/123',
      pageTitle: 'Amazing video tutorial',
      pageDescription: 'Learn with this tutorial',
    });

    expect(result.category).toBe('video');
    expect(result.alternativeSlug).toContain('video');
    expect(result.provider).toBe('heuristic');
    expect(result.tags.length).toBeGreaterThan(0);
  });

  it('uses a fallback summary when no page metadata exists', () => {
    const result = provider.enrich({
      origin: 'https://docs.example.test/reference',
    });

    expect(result.summary).toContain('docs.example.test');
    expect(result.riskLevel).toBe('low');
  });

  it('handles root paths without polluting the slug', () => {
    const result = provider.enrich({
      origin: 'https://example.test/',
    });

    expect(result.alternativeSlug).toBe('example-test');
  });
});
