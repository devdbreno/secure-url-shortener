export type UrlEnrichmentStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type UrlEnrichmentProvider = 'gemini' | 'heuristic';

export class UrlEnrichment {
  constructor(
    public id: string,
    public urlId: string,
    public status: UrlEnrichmentStatus,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public summary?: string | null,
    public category?: string | null,
    public tags: string[] = [],
    public alternativeSlug?: string | null,
    public provider?: UrlEnrichmentProvider | null,
    public riskLevel?: string | null,
    public enrichedAt?: Date | null,
    public error?: string | null,
    public attempts = 0,
  ) {}
}
